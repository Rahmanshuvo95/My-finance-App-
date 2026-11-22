let context;
export function playSound(kind='tap') {
 try {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  context ||= new Audio();
  if(context.state==='suspended') context.resume().catch(()=>{});
  const start=context.currentTime;
  const notes=kind==='success'?[660,880]:[520];
  notes.forEach((frequency,i)=>{
   const oscillator=context.createOscillator(), gain=context.createGain(), time=start+i*.09;
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,time);
   gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.035,time+.006);gain.gain.exponentialRampToValueAtTime(.0001,time+.095);
   oscillator.connect(gain);gain.connect(context.destination);oscillator.start(time);oscillator.stop(time+.1);
  });
 } catch { /* Sound is optional; financial actions must still work. */ }
}
