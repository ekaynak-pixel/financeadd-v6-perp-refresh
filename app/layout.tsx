import './globals.css';import Link from 'next/link';
const site=process.env.SITE_URL||'https://financeadd.com';
export const metadata={title:'FinanceAdd — Smarter Finance Research',description:'US-focused finance search: credit cards, loans, insurance, investing. Google results first, then AI and curated web. Not financial advice.',metadataBase:new URL(site)};
export default function RootLayout({children}:{children:React.ReactNode}){
  const jsonLd={"@context":"https://schema.org","@type":"WebSite","name":"FinanceAdd","url":site,"potentialAction":{"@type":"SearchAction","target":`${site}/q/{search_term_string}`,"query-input":"required name=search_term_string"}};
  return(<html lang="en"><head><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/></head>
  <body><header className="container flex items-center justify-between py-4"><Link className="text-xl font-semibold" href="/">💹 FinanceAdd</Link>
  <nav className="flex gap-4"><Link href="/chat">Chat</Link><Link href="/discover">Discover</Link><Link href="/blog">Blog</Link><Link href="/admin">Admin</Link></nav></header><main className="container">{children}</main>
  <footer className="container py-10"><div className="fine">© {new Date().getFullYear()} FinanceAdd</div><div className="fine">Informational purposes only — not financial, legal, or tax advice.</div><div className="fine">Rates and offers may change. Always verify with the provider.</div></footer></body></html>);}
