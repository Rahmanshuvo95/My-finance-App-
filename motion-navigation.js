export const SHEET_CLOSE_MS=240;
export const reduceMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
export function createPageNavigation({document:doc,commit,scroll=()=>{},reduced=reduceMotion,initial='home'}){
 let current=initial,active,version=0,disposed=false,mode='fallback';
 const direction=(from,to)=>to==='ledger'||to==='settings'?'forward':from==='ledger'||from==='settings'?'back':'tab';
 function navigate(next){
  if(disposed||next===current)return;
  const movement=direction(current,next),request=++version;current=next;
  active?.skipTransition();active=null;
  doc.documentElement.dataset.iftNavigation=movement;
  mode=!reduced()&&typeof doc.startViewTransition==='function'?'native':'fallback';
  let applied=false;
  const update=()=>{if(!disposed&&request===version&&!applied){applied=true;commit(next);scroll();}};
  if(mode==='fallback'){update();return;}
  try{
   const transition=doc.startViewTransition(update);active=transition;
   transition.ready.catch(()=>{});
   transition.updateCallbackDone.catch(()=>{if(!disposed&&request===version){mode='fallback';update();}});
   const finished=()=>{if(active===transition)active=null;};transition.finished.then(finished,finished);
  }catch{mode='fallback';update();}
 }
 return {navigate,get mode(){return mode;},dispose(){disposed=true;version++;active?.skipTransition();active=null;delete doc.documentElement.dataset.iftNavigation;}};
}
