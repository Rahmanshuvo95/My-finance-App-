let token='';
export const setPinToken=value=>{token=value||'';};
export function createPinFetch(baseUrl,fetcher=globalThis.fetch){
 const origin=new URL(baseUrl).origin;
 return async function pinFetch(input,options={}){
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 const parsed=new URL(url);
 const rest=parsed.origin===origin&&parsed.pathname.startsWith('/rest/v1/');
 const headers=new Headers(typeof Request!=='undefined'&&input instanceof Request?input.headers:undefined);
 new Headers(options.headers).forEach((value,key)=>headers.set(key,value));
 if(rest&&token)headers.set('x-ift-unlock',token);
 const controller=rest&&url.includes('/rpc/ift_pin_')?new AbortController():null;
 const relay=()=>controller?.abort();
 if(controller&&options.signal){if(options.signal.aborted)controller.abort();else options.signal.addEventListener('abort',relay,{once:true});}
 const timer=controller?setTimeout(()=>controller.abort(),12000):null;
 try{
  const response=await fetcher(input,{...options,headers,...(controller?{signal:controller.signal}:{})});
  if(rest&&response.status===403){
   const body=await response.clone().json().catch(()=>({}));
   if(String(body.message||'').includes('IFT_PIN_LOCKED')&&typeof window!=='undefined')window.dispatchEvent(new Event('ift:pin-expired'));
  }
  return response;
 }finally{if(timer)clearTimeout(timer);options.signal?.removeEventListener('abort',relay);}
 };
}
