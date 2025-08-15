import { NextRequest } from 'next/server';
import { getDB, saveAnswer, getAnswer } from '../../../lib/db';

export const runtime = 'nodejs';

type Src = { title:string, url:string, snippet?:string };

async function aggregateWeb(q:string): Promise<Src[]>{
  // Reuse the same providers as /api/search
  const out:Src[] = [];
  const tryJson = async (url:string, headers?:Record<string,string>)=>{
    try{ const r=await fetch(url,{headers}); if(!r.ok) throw 0; return await r.json(); }catch{return null}
  };
  const tasks:Promise<void>[]=[];

  const BK=process.env.BING_SEARCH_KEY;const BE=process.env.BING_SEARCH_ENDPOINT||'https://api.bing.microsoft.com/v7.0/search';
  if(BK){ tasks.push((async()=>{ const d=await tryJson(`${BE}?q=${encodeURIComponent(q)}&count=6`,{'Ocp-Apim-Subscription-Key':BK}); (d?.webPages?.value||[]).forEach((it:any)=>out.push({title:it.name,url:it.url,snippet:it.snippet})) })()); }

  const SK=process.env.SERPAPI_KEY;
  if(SK){ tasks.push((async()=>{ const d=await tryJson(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&num=6&api_key=${SK}`); (d?.organic_results||[]).forEach((it:any)=>out.push({title:it.title,url:it.link,snippet:it.snippet})) })()); }

  const BRK=process.env.BRAVE_API_KEY;
  if(BRK){ tasks.push((async()=>{ const d=await tryJson(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=6`,{'X-Subscription-Token':BRK}); (d?.web?.results||[]).forEach((it:any)=>out.push({title:it.title,url:it.url,snippet:it.description})) })()); }

  const TV=process.env.TAVILY_API_KEY;
  if(TV){ tasks.push((async()=>{ const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${TV}`},body:JSON.stringify({query:q,max_results:6})}); const d=await r.json(); (d?.results||[]).forEach((it:any)=>out.push({title:it.title,url:it.url,snippet:it.content})) })()); }

  await Promise.all(tasks);
  if(out.length===0){
    // Fallback: Bing HTML
    try{
      const url=`https://www.bing.com/search?q=${encodeURIComponent(q)}&count=10`;
      const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept-Language':'en-US,en;q=0.9'}});
      const html=await r.text();
      const itemRe=/<li class="b_algo"[\s\S]*?<h2>[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
      let m:RegExpExecArray|null; let i=0;
      while((m=itemRe.exec(html)) && i<6){ out.push({url:m[1],title:m[2].replace(/<.*?>/g,''),snippet:m[3].replace(/<.*?>/g,'')}); i++; }
    }catch{}
  }
  // dedupe
  const seen=new Set<string>(); const dedup:Src[]=[];
  for(const s of out){ if(!seen.has(s.url)){ seen.add(s.url); dedup.push(s); if(dedup.length>=6) break; } }
  return dedup;
}

async function callProvider(prompt:string): Promise<string>{
  // try DB providers first (from admin)
  const db=getDB();
  const prov=db.prepare('SELECT * FROM api_keys WHERE enabled=1 ORDER BY priority ASC LIMIT 1').get();
  const base=prov?.base_url||'https://openrouter.ai/api/v1/chat/completions';
  const header=prov?.header_name||'Authorization';
  const key=prov?.api_key||(process.env.OPENROUTER_API_KEY?`Bearer ${process.env.OPENROUTER_API_KEY}`:'');
  const model=prov?.model||process.env.OPENROUTER_MODEL||'openrouter/auto';
  if(!key) return '';

  // Use streaming; but if provider doesn't support, we'll still read as text
  const body={model,stream:true,messages:[{role:'system',content:'You are an expert research assistant. Use numbered citations like [1], [2] that map to provided sources.'},{role:'user',content:prompt}],temperature:0.3};
  const res=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json',[header]:key},body:JSON.stringify(body)});
  if(!res.ok) return '';
  // If streaming SSE, return as string chunks; otherwise parse json
  const contentType = res.headers.get('content-type')||'';
  if(contentType.includes('text/event-stream')){
    // We'll aggregate here; actual streaming to client handled outside
    const reader=res.body!.getReader(); const dec=new TextDecoder();
    let full=''; while(true){ const {value,done}=await reader.read(); if(done) break; const chunk=dec.decode(value); for(const line of chunk.split('\n')){ const trimmed=line.trim(); if(trimmed.startsWith('data:')){ const data=trimmed.slice(5).trim(); if(data==='[DONE]') break; try{ const j=JSON.parse(data); const delta=j.choices?.[0]?.delta?.content||''; full += delta||''; }catch{} } } }
    return full;
  }else{
    const j=await res.json(); return j?.choices?.[0]?.message?.content||'';
  }
}

export async function POST(req:NextRequest){
  const {question} = await req.json();
  const q = (question||'').toString().slice(0,500);

  const sources = await aggregateWeb(q);
  const numbered = sources.map((s,i)=>`[${i+1}] ${s.title} — ${s.url}`).join('\n');

  const prompt = `Question: ${q}
Sources:
${numbered}
Instructions:
- Answer concisely in English.
- Use numbered citations [1], [2], ... that correspond to the Sources above.
- If uncertain, say so. Provide 3 short follow-up questions users might ask next.`;

  let text = await callProvider(prompt);
  if(!text){
    // offline fallback (very simple)
    text = 'AI is offline; showing search results only.';
  }

  // Ask model (or fallback) for follow-ups if not present
  const followups:string[] = [];
  const m = text.match(/Follow-?ups?:([\s\S]*)$/i);
  if(m){ followups.push(...m[1].split(/\n|•|-/).map(x=>x.trim()).filter(Boolean).slice(0,4)); }
  if(followups.length===0){
    // derive from related keywords heuristics
    const base = q.split(' ').slice(0,3).join(' ');
    followups.push(`${base} pros and cons`, `${base} vs alternatives`, `${base} latest rates`, `${base} how to qualify`);
  }

  // Stream to client: send text first, then append JSON block with sources & followups
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller){
      controller.enqueue(encoder.encode(text));
      const payload = JSON.stringify({ sources, followups });
      controller.enqueue(encoder.encode(`\n\n@@SOURCES@@\n${payload}\n@@END@@`));
      controller.close();
    }
  });
  return new Response(stream,{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
