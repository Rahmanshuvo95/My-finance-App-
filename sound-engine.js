// An original, synthesized notification chime; no device system audio is loaded.
export function createSoundEngine({makeContext,visible=()=>true}){
 let context,enabled=true,resuming=null,primed=false;const voices=new Set();
 function stop(){for(const voice of voices)try{voice.stop();}catch{}voices.clear();}
 function prime(){
  if(!enabled)return Promise.resolve(false);
  try{
   if(!context||context.state==='closed'){context=makeContext();primed=false;}
   if(!context)return Promise.resolve(false);
   if(!primed){const source=context.createBufferSource();source.buffer=context.createBuffer(1,1,22050);source.connect(context.destination);source.onended=()=>source.disconnect();source.start();primed=true;}
   if(context.state==='running')return Promise.resolve(true);
   if(!resuming){const pending=Promise.resolve(context.resume()).then(()=>context.state==='running',()=>false);resuming=pending;pending.finally(()=>{if(resuming===pending)resuming=null;});}
   return resuming;
  }catch{return Promise.resolve(false);}
 }
 function note(frequency,time,duration,volume){
  const oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,time);
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  oscillator.connect(gain);gain.connect(context.destination);voices.add(oscillator);
  oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(time);oscillator.stop(time+duration+.02);
 }
 async function play(kind='tap'){
  if(!enabled||!context||!visible())return false;
  if(resuming)await resuming;
  if(!enabled||context.state!=='running'||!visible())return false;
  try{
   const time=context.currentTime+.005;
   if(kind==='success'){
    [[1046.5,0,.33,.036],[1568,.095,.4,.028],[2093,.095,.28,.008]].forEach(([frequency,delay,duration,volume])=>note(frequency,time+delay,duration,volume));
   }else note(780,time,.045,.009);
   return true;
  }catch{return false;}
 }
 return {prime,play,setEnabled(value){enabled=!!value;if(!enabled)stop();},get state(){return context?.state||'uninitialized';}};
}
