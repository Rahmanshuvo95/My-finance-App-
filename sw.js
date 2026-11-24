const CACHE='ift-shell-v3-recovery';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ift-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function fetchPage(request){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),8000);
 try{return await fetch(request,{signal:controller.signal});}finally{clearTimeout(timer);}
}
async function navigate(request){
 try{return await fetchPage(request);}
 catch{
  // A transient navigation failure is not proof that the device is offline.
  try{return await fetchPage(new Request(request,{cache:'reload'}));}
  catch{return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>IFT - Connection interrupted</title><body style="font:17px/1.6 system-ui;color:#24344a;background:#edf3fc;max-width:460px;margin:12vh auto;padding:28px"><h1>IFT could not connect</h1><p>The page could not be downloaded. Check your connection and try again. Your saved records have not been changed.</p><button onclick="location.reload()" style="padding:12px 18px">Try again</button> <a href="/recover.html">Repair loading</a></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
 }
}
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate')event.respondWith(navigate(event.request));
});
// Never cache account pages, authenticated API responses, or private records.
