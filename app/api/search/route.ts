import {NextRequest,NextResponse} from 'next/server';export const runtime='nodejs';
async function safeFetch(url:string,init?:RequestInit,timeoutMs=8000){const ctrl=new AbortController();const id=setTimeout(()=>ctrl.abort(),timeoutMs);try{const r=await fetch(url,{...init,signal:ctrl.signal});if(!r.ok) throw new Error(String(r.status));return await r.json()}finally{clearTimeout(id)}}

// Fallback: scrape Bing HTML if no API keys provided (best-effort, may break if markup changes)
async function bingScrape(q:string){
  try{
    const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=10`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language':'en-US,en;q=0.9' } });
    const html = await r.text();
    const out:any[] = [];
    const itemRe = /<li class="b_algo"[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
    let m:RegExpExecArray|null;
    while((m=itemRe.exec(html))){
      const h2 = m[1];
      const p = m[2].replace(/<.*?>/g,'').trim();
      const a = /<a href="([^"]+)"/.exec(h2);
      const t = h2.replace(/<.*?>/g,'').trim();
      if(a && a[1]) out.push({title:t, url:a[1], snippet:p, source:'Bing (HTML)'});
      if(out.length>=10) break;
    }
    // Related searches (optional)
    const rel:RegExpExecArray|null = /<div class="b_rs">([\s\S]*?)<\/div>/.exec(html);
    if(rel){
      const links=[...rel[1].matchAll(/<a[^>]+>(.*?)<\/a>/g)].map(x=>({title:x[1].replace(/<.*?>/g,'').trim(), url:`https://www.bing.com/search?q=${encodeURIComponent(x[1].replace(/<.*?>/g,''))}`, snippet:'', source:'Bing Related'}));
      out.push(...links.slice(0,6));
    }
    return out;
  }catch{return []}
}

export async function GET(req:NextRequest){const q=req.nextUrl.searchParams.get('q')||'';if(!q) return NextResponse.json([]);const tasks:Promise<any>[]=[];const out:any[]=[];
const BK=process.env.BING_SEARCH_KEY;const BE=process.env.BING_SEARCH_ENDPOINT||'https://api.bing.microsoft.com/v7.0/search';if(BK){tasks.push(safeFetch(`${BE}?q=${encodeURIComponent(q)}&count=6`,{headers:{'Ocp-Apim-Subscription-Key':BK}}).then(d=>(d.webPages?.value||[]).forEach((it:any)=>out.push({title:it.name,url:it.url,snippet:it.snippet,source:'Bing'}))).catch(()=>{}))}
const SK=process.env.SERPAPI_KEY;if(SK){tasks.push(safeFetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&num=6&api_key=${SK}`).then(d=>(d.organic_results||[]).forEach((it:any)=>out.push({title:it.title,url:it.link,snippet:it.snippet,source:'SerpAPI'}))).catch(()=>{}))}
const BRK=process.env.BRAVE_API_KEY;if(BRK){tasks.push(safeFetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=6`,{headers:{'X-Subscription-Token':BRK}}).then(d=>(d.web?.results||[]).forEach((it:any)=>out.push({title:it.title,url:it.url,snippet:it.description,source:'Brave'}))).catch(()=>{}))}
const TV=process.env.TAVILY_API_KEY;if(TV){tasks.push(fetch('https://api.tavily.com/search',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${TV}`},body:JSON.stringify({query:q,max_results:6})}).then(r=>r.json()).then(d=>(d.results||[]).forEach((it:any)=>out.push({title:it.title,url:it.url,snippet:it.content,source:'Tavily'}))).catch(()=>{}))}
await Promise.all(tasks);
  if(tasks.length===0){ out.push(...(await bingScrape(q))); }const seen=new Set<string>();const dedup=out.filter(x=>{if(seen.has(x.url)) return false;seen.add(x.url);return true}).slice(0,18);return NextResponse.json(dedup)}
