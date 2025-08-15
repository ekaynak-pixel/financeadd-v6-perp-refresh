import {NextResponse} from 'next/server';export const runtime='nodejs';export async function GET(){const base=process.env.SITE_URL||'https://financeadd.com';const text=`User-agent: *
Allow: /
Sitemap: ${base}/sitemap.xml`;return new NextResponse(text,{headers:{'Content-Type':'text/plain'}})}
