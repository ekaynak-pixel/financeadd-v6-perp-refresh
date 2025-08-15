import Link from 'next/link';
import { getDB } from '../../lib/db';
export const dynamic='force-dynamic';
export default function Discover(){
  const db=getDB();
  const searches=db.prepare('SELECT term,created_at FROM searches ORDER BY created_at DESC LIMIT 30').all();
  const posts=db.prepare('SELECT slug,title,created_at FROM posts ORDER BY created_at DESC LIMIT 12').all();
  return (<div className="grid gap-6">
    <div className="card"><h1 className="text-2xl font-semibold mb-2">Discover</h1>
      <div className="small">Recent searches and blog posts (auto-generated).</div></div>
    <div className="card"><div className="text-lg font-semibold mb-2">Recent searches</div>
      <div className="flex flex-wrap gap-2">{searches.map((s:any)=>(<Link key={s.term} className="badge" href={`/q/${encodeURIComponent(s.term)}`}>{s.term}</Link>))}</div></div>
    <div className="card"><div className="text-lg font-semibold mb-2">Latest blog posts</div>
      <div className="grid gap-2">{posts.map((p:any)=>(<Link key={p.slug} className="link" href={`/blog/${p.slug}`}>{p.title} <span className="small">({new Date(p.created_at).toLocaleDateString()})</span></Link>))}</div></div>
  </div>)
}
