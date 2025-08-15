import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_req:NextRequest, ctx:{params?:{key?:string}}){
  const k = ctx?.params?.key;
  if(!k || k !== process.env.INDEXNOW_KEY) return new NextResponse('Not found', {status:404});
  return new NextResponse(k, {headers:{'Content-Type':'text/plain'}});
}
