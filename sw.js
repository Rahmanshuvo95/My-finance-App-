const CACHE='ift-shell-v2-brand';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.add('/icon.svg')).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin) return;
 if(event.request.mode==='navigate') event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><meta name="viewport" content="width=device-width"><title>IFT · Offline</title><body style="font:18px system-ui;padding:40px"><h1>You’re offline.</h1><p>Reconnect to securely load and sync your accounts.</p><button onclick="location.reload()">Try again</button></body>',{headers:{'Content-Type':'text/html'}})));
});
