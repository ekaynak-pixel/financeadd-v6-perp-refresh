'use client';
import React from 'react';

type Source = { title:string; url:string };
type Msg = { role:'user'|'assistant'; content:string; sources?:Source[]; followups?:string[] };

export default function ChatPage(){
  const [msgs,setMsgs]=React.useState<Msg[]>([]);
  const [q,setQ]=React.useState('');
  const [loading,setLoading]=React.useState(false);

  async function ask(e?:React.FormEvent){
    e?.preventDefault();
    if(!q) return;

    const m=[...msgs,{role:'user',content:q} as Msg];
    setMsgs(m);
    setQ('');
    setLoading(true);

    const res = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q, mode:'web'})});
    if(!res.ok){ setLoading(false); alert('Chat error'); return; }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let acc='';

    const msg:Msg = {role:'assistant',content:''};
    setMsgs(prev=>[...prev,msg]);

    while(true){
      const {value,done} = await reader.read();
      if(done) break;
      acc += decoder.decode(value,{stream:true});

      // Protocol: plain text content, then "\n\n@@SOURCES@@\n" + JSON + "\n@@END@@"
      const marker = '\n\n@@SOURCES@@\n';
      const endMarker = '\n@@END@@';
      const idx = acc.indexOf(marker);

      if(idx === -1){
        // Only content so far
        msg.content = acc;
      }else{
        msg.content = acc.slice(0, idx);
        const rest = acc.slice(idx + marker.length);
        const end = rest.indexOf(endMarker);
        if(end !== -1){
          const jsonStr = rest.slice(0, end);
          try{
            const meta = JSON.parse(jsonStr);
            msg.sources = meta.sources || [];
            msg.followups = meta.followups || [];
          }catch{}
        }
      }

      setMsgs(prev=>prev.map((x,i)=> i===prev.length-1 ? msg : x));
    }

    setLoading(false);
  }

  return (
    <div className="container max-w-3xl">
      <h1 className="text-2xl font-semibold my-4">Chat</h1>
      <div className="grid gap-4">
        {msgs.map((m,idx)=>(
          <div key={idx} className="card">
            <div className="small mb-1">{m.role==='user'?'You':'Assistant'}</div>
            <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html:(m.content||'').replace(/\n/g,'<br/>')}} />
            {m.sources && m.sources.length>0 && (
              <div className="mt-3 grid gap-1">
                {m.sources.map((s,i)=>(<a key={i} className="link small" href={`/r/${i+1}?url=${encodeURIComponent(s.url)}&t=${encodeURIComponent(s.title)}`}>[{i+1}] {s.title}</a>))}
              </div>
            )}
            {m.followups && m.followups.length>0 && (
              <div className="mt-2 flex flex-wrap gap-2">{m.followups.map((f,i)=>(<button key={i} className="badge" onClick={()=>{setQ(f);}}>{f}</button>))}</div>
            )}
          </div>
        ))}
        <form onSubmit={ask} className="card">
          <input className="input" placeholder="Ask anything…" value={q} onChange={e=>setQ(e.target.value)} />
          <div className="mt-2"><button className="btn" disabled={loading} type="submit">{loading?'Thinking…':'Send'}</button></div>
        </form>
      </div>
    </div>
  );
}
