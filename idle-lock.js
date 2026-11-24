export const IDLE_MS=15*60*1000;
export function createIdleLock({now=Date.now,schedule=setTimeout,cancel=clearTimeout,lastActivity=now(),onLock,onActivity=()=>{}}){
 let last=lastActivity,timer,locked=false;
 function check(){if(!locked&&now()-last>=IDLE_MS){locked=true;cancel(timer);onLock();}return locked;}
 function arm(){cancel(timer);if(!locked)timer=schedule(()=>{if(!check())arm();},Math.max(1,IDLE_MS-(now()-last)));}
 function activity(){if(check())return false;last=now();onActivity(last);arm();return true;}
 if(!check())arm();
 return {activity,check,dispose(){cancel(timer);},get lastActivity(){return last;}};
}
