const screen=document.getElementById('ift-startup');
const title=document.getElementById('ift-startup-title');
const detail=document.getElementById('ift-startup-detail');
let ready=false;
const timeout=setTimeout(()=>{if(!ready){title.textContent='IFT is taking longer to open';detail.textContent='Check your connection, or use Repair loading. Your saved records will stay intact.';}},20000);
window.addEventListener('ift:ready',()=>{ready=true;clearTimeout(timeout);screen.hidden=true;},{once:true});
import('./main.jsx').catch(()=>{
 if(ready)return;
 clearTimeout(timeout);
 title.textContent='IFT could not load';
 detail.textContent='Some app files could not be downloaded. Try Repair loading, then open the app again.';
});
