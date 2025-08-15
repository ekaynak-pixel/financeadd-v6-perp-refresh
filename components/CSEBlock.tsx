'use client';
import {useEffect,useState} from 'react';
declare global{interface Window{google?:any}}
export default function CSEBlock({query,resultsOnly=true}:{query:string;resultsOnly?:boolean}){
  const [loaded,setLoaded]=useState(false);
  if(!query) return null; // don't render until user searches
  const gname=`res-${btoa(unescape(encodeURIComponent(query))).slice(0,10)}`;
  useEffect(()=>{
    const cx=process.env.NEXT_PUBLIC_GOOGLE_CSE_CX;
    if(!cx) return;
    let script=document.getElementById('gcse-script') as HTMLScriptElement|null;
    if(!script){
      script=document.createElement('script');
      script.id='gcse-script';
      script.async=true;
      script.src=`https://cse.google.com/cse.js?cx=${cx}&hl=en`;
      script.onload=()=>setLoaded(true);
      document.body.appendChild(script);
    }else{
      setLoaded(true);
    }
    const t=setInterval(()=>{
      try{
        const google:(any)=(window as any).google;
        const el=google?.search?.cse?.element?.getElement(gname);
        if(el){ el.execute(query); clearInterval(t); }
      }catch{}
    },300);
    return ()=>clearInterval(t);
  },[query]);
  return resultsOnly?<div className="gcse-searchresults-only" data-gname={gname}></div>:<div className="gcse-search" data-gname={gname}></div>;
}
