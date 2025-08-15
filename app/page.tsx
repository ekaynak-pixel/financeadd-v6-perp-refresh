'use client';
import React from 'react';
import Link from 'next/link';
import CSEBlock from '../components/CSEBlock';
import UnifiedWebResults from '../components/UnifiedWebResults';

const chips = ['Research','Finance','Sports','Local','Plan'];

export default function Home(){
  const [query,setQuery]=React.useState('');
  const [answer,setAnswer]=React.useState('');
  const [loading,setLoading]=React.useState(false);

  async function doAsk(e?:any){
    e?.preventDefault();
    if(!query) return;
    setLoading(true); setAnswer('');
    const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`Answer the question: "${query}". Cite reputable sources.`})});
    const data=await r.json(); setAnswer(data.text||''); setLoading(false);
    window.history.pushState({},'',`/q/${encodeURIComponent(query)}`);
  }

  return (
    <div className="min-h-[70vh] flex items-start md:items-center justify-center">
      <div className="w-full max-w-3xl mt-16 md:mt-0">
        <div className="flex items-center justify-center mb-6 text-3xl font-semibold">perplexity<span className="text-emerald-400">•</span>style</div>
        <form onSubmit={doAsk} className="card p-4">
          <div className="flex gap-3 items-center">
            <input className="input flex-1 text-base" placeholder="Ask anything…" value={query} onChange={e=>setQuery(e.target.value)} />
            <button className="btn" type="submit">{loading?'Thinking…':'Search'}</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map(c => (
              <button key={c} type="button" className="badge" onClick={()=>setQuery(c.toLowerCase())}>{c}</button>
            ))}
          </div>
          <div className="small mt-2">Google results appear first; then AI and curated web. US-focused. Not financial advice.</div>
        </form>

        {query && (
          <div className="grid gap-6 mt-6">
            <div className="card">
              <div className="badge mb-2">Google results</div>
              <CSEBlock query={query} resultsOnly />
            </div>
            <div className="card">
              <div className="badge mb-2">AI answer</div>
              {loading ? <div>Generating…</div> : (answer ? <div className="prose prose-invert" dangerouslySetInnerHTML={{__html:answer.replace(/\n/g,'<br/>')}} /> : <div className="small">Type a question above.</div>)}
            </div>
            <div className="card">
              <div className="badge mb-2">Suggested web articles</div>
              <UnifiedWebResults term={query} />
            </div>
          </div>
        )}

        {!query && (
          <div className="card mt-6 small">
            <div className="mb-1">Tip: Try high-CPC US finance topics like <em>best travel credit cards</em>, <em>auto insurance quotes</em>, <em>mortgage refinance rates</em>.</div>
            <Link className="link" href="/blog">Go to Blog →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
