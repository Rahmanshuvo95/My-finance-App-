const screen=document.getElementById('ift-startup');
const title=document.getElementById('ift-startup-title');
const detail=document.getElementById('ift-startup-detail');
let ready=false;
const slow=setTimeout(()=>{if(!ready){title.textContent='Still opening IFT';detail.textContent='Check your connection. Your saved records have not been changed.';}},20000);
window.addEventListener('ift:ready',()=>{
 ready=true;clearTimeout(slow);screen.hidden=true;
 try{sessionStorage.removeItem('ift-startup-retry');}catch{}
},{once:true});
// Start updates even when the main application chunk cannot be downloaded.
if('serviceWorker' in navigator&&import.meta.env.PROD){
 const register=()=>navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>null);
 register();
 window.addEventListener('online',register);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')register();});
}
import('./main.jsx').catch(()=>{
 if(ready)return;
 clearTimeout(slow);
 title.textContent='IFT could not finish loading';
 detail.textContent='Some app files could not be downloaded. Reconnect, then reload. Your saved records are intact.';
 // One automatic retry for stale deployment chunks, never an endless loop.
 try{
  const previous=Number(sessionStorage.getItem('ift-startup-retry')||0);
  if(navigator.onLine&&Date.now()-previous>60000){
   sessionStorage.setItem('ift-startup-retry',String(Date.now()));
   const url=new URL(location.href);url.searchParams.set('ift-reload',String(Date.now()));
   location.replace(url.href);
  }
 }catch{}
});
