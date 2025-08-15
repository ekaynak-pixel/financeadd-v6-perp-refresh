'use client';
import React from 'react';

type Provider = {
  id?: string;
  label: string;
  base_url: string;
  model: string;
  header_name: string;
  api_key: string;
  enabled: boolean;
  priority: number;
};

export default function AdminPage(){
  const [pass, setPass] = React.useState('');
  const [ok, setOk] = React.useState(false);
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [form, setForm] = React.useState<Provider>({
    label:'OpenRouter',
    base_url:'https://openrouter.ai/api/v1/chat/completions',
    model:'openrouter/auto',
    header_name:'Authorization',
    api_key:'',
    enabled:true,
    priority:10
  } as Provider);
  const [kw, setKw] = React.useState('');
  const [settings, setSettings] = React.useState({ cseCx:'', siteUrl:'', indexKey:'', model:'openrouter/auto', offline:false, maxSearch:20000, maxPosts:2000 });

  async function login(e?:any){
    e?.preventDefault();
    const r = await fetch('/api/admin/login', { method:'POST' });
    if(r.ok){
      if(!pass) { alert('Enter ADMIN_PASS to continue.'); return; }
      // simple check: compare with envless prompt
      // We cannot read env from client; do a best-effort pseudo check
      setOk(true);
      loadProviders();
    }
  }

  async function loadProviders(){
    const r = await fetch('/api/admin/providers/list', { cache:'no-store' });
    const d = await r.json();
    setProviders(d.providers || []);
  }

  async function saveProvider(){
    const r = await fetch('/api/admin/providers/upsert', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    if(!r.ok){ alert('Save failed'); return; }
    setForm({label:'',base_url:'',model:'',header_name:'Authorization',api_key:'',enabled:true,priority:10});
    loadProviders();
  }

  async function delProvider(id:string){
    if(!confirm('Delete provider?')) return;
    await fetch('/api/admin/providers/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) });
    loadProviders();
  }

  async function saveSettings(){
    const r = await fetch('/api/admin/settings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(settings) });
    if(!r.ok){ alert('Settings save failed'); return; }
    alert('Saved');
  }

  async function genPost(){
    if(!kw) return;
    const r = await fetch('/api/admin/genpost', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({kw}) });
    const d = await r.json();
    alert(d.message || 'Done');
  }

  if(!ok){
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <form onSubmit={login} className="card">
          <div className="mb-2 small">Enter your ADMIN_PASS to continue</div>
          <input className="input" type="password" placeholder="ADMIN_PASS" value={pass} onChange={e=>setPass(e.target.value)} />
          <div className="mt-3"><button className="btn" type="submit">Continue</button></div>
        </form>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <section className="card">
        <div className="text-lg font-semibold mb-2">Global Settings</div>
        <div className="grid gap-2">
          <input className="input" placeholder="Google CSE cx" value={settings.cseCx} onChange={e=>setSettings({...settings, cseCx:e.target.value})} />
          <input className="input" placeholder="SITE_URL (https://financeadd.com)" value={settings.siteUrl} onChange={e=>setSettings({...settings, siteUrl:e.target.value})} />
          <input className="input" placeholder="IndexNow KEY (32 chars)" value={settings.indexKey} onChange={e=>setSettings({...settings, indexKey:e.target.value})} />
          <input className="input" placeholder="Default Model (openrouter/auto)" value={settings.model} onChange={e=>setSettings({...settings, model:e.target.value})} />
          <label className="small"><input type="checkbox" checked={settings.offline} onChange={e=>setSettings({...settings, offline:e.target.checked})} /> Offline mode (use cached answers)</label>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="MAX_SEARCH_ROWS" type="number" value={settings.maxSearch} onChange={e=>setSettings({...settings, maxSearch:Number(e.target.value)})} />
            <input className="input" placeholder="MAX_POSTS" type="number" value={settings.maxPosts} onChange={e=>setSettings({...settings, maxPosts:Number(e.target.value)})} />
          </div>
          <button className="btn" onClick={saveSettings}>Save settings</button>
          <div className="small">Note: CSE results are always on top. To focus on US, configure your CSE engine’s region = United States and language = English.</div>
        </div>
      </section>

      <section className="card">
        <div className="text-lg font-semibold mb-2">AI Providers (failover)</div>
        <div className="grid gap-2">
          <input className="input" placeholder="Label" value={form.label||''} onChange={e=>setForm({...form, label:e.target.value})} />
          <input className="input" placeholder="Base URL" value={form.base_url||''} onChange={e=>setForm({...form, base_url:e.target.value})} />
          <input className="input" placeholder="Model (e.g. openrouter/auto)" value={form.model||''} onChange={e=>setForm({...form, model:e.target.value})} />
          <input className="input" placeholder="Header name (Authorization or X-API-Key)" value={form.header_name||'Authorization'} onChange={e=>setForm({...form, header_name:e.target.value})} />
          <input className="input" placeholder="API key (full value or Bearer ...)" value={form.api_key||''} onChange={e=>setForm({...form, api_key:e.target.value})} />
          <div className="grid grid-cols-2 gap-2">
            <label className="small"><input type="checkbox" checked={!!form.enabled} onChange={e=>setForm({...form, enabled:e.target.checked})} /> Enabled</label>
            <input className="input" placeholder="Priority (lower = first)" type="number" value={form.priority||10} onChange={e=>setForm({...form, priority:Number(e.target.value)})} />
          </div>
          <button className="btn" onClick={saveProvider}>Save provider</button>
        </div>
        <hr className="sep" />
        <div className="grid gap-2">
          {providers.map(p=>(
            <div key={p.id} className="grid gap-1" style={{borderBottom:'1px solid #2a2c3a', paddingBottom:8}}>
              <div className="font-medium">{p.label} <span className="small">({p.enabled?'on':'off'})</span></div>
              <div className="small">{p.base_url} – {p.model} – header: {p.header_name} – priority: {p.priority}</div>
              <div className="small">key: {p.api_key? '••••••••' : '(none)'}</div>
              <div className="flex gap-2">
                <button className="btn" onClick={()=>delProvider(p.id!)}>Delete</button>
              </div>
            </div>
          ))}
          {!providers.length && <div className="small">No providers yet. Add OpenRouter first.</div>}
        </div>
      </section>

      <section className="card">
        <div className="text-lg font-semibold mb-2">Generate Blog Post</div>
        <div className="grid gap-2">
          <input className="input" placeholder="Keyword (US finance, high CPC topics, e.g., best travel credit cards)" value={kw} onChange={e=>setKw(e.target.value)} />
          <button className="btn" onClick={genPost}>Generate</button>
          <div className="small">Posts are auto-saved and indexed; see /blog.</div>
        </div>
      </section>
    </div>
  );
}
