import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {createIdleLock,IDLE_MS} from './idle-lock.js';
import {setPinToken} from './pin-session.js';
import logo from './ift-logo.png';
import './pin-lock.css';

const LockContext=createContext(null);
const key=uid=>'ift-pin-grant:'+uid;
function readGrant(uid){try{const g=JSON.parse(sessionStorage.getItem(key(uid))||'null');return g&&typeof g.token==='string'&&g.token.length===64&&Number.isFinite(g.lastActivity)&&Date.now()-g.lastActivity<IDLE_MS?g:null;}catch{return null;}}
function saveGrant(uid,g){try{if(g?.token)sessionStorage.setItem(key(uid),JSON.stringify({token:g.token,expires_at:g.expires_at,lastActivity:g.lastActivity}));else sessionStorage.removeItem(key(uid));}catch{}}
function message(data){return ({invalid_pin:'Incorrect PIN. Please try again.',rate_limited:'Too many incorrect PINs. Wait five minutes before trying again.',six_digits_required:'Use exactly six digits.',password_required:'Verify your account password again.',locked:'Enter your PIN to continue.'})[data?.error]||'Could not verify app lock. Check your connection and try again.';}

export function PinGate({db,demo,children}){
 const [identity,setIdentity]=useState(undefined),[gate,setGate]=useState(null),[problem,setProblem]=useState(''),[reset,setReset]=useState(false),[busy,setBusy]=useState(false);
 const uid=identity?.user.id;
 const grantRef=useRef(null),lastActivity=useRef(Date.now()),renewTimer=useRef(null),renewing=useRef(false),lastRenew=useRef(0),generation=useRef(0);
 const identityRef=useRef(identity);identityRef.current=identity;
 const gateRef=useRef(gate);gateRef.current=gate;
 useEffect(()=>{
  if(demo)return;
  let alive=true;
  db.auth.getSession().then(({data,error})=>{if(alive){if(error)setProblem('Could not restore your sign-in. Reload to try again.');else setIdentity(data.session);}}).catch(()=>{if(alive)setProblem('Could not restore your sign-in. Reload to try again.');});
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,s)=>{if(alive)setIdentity(s);});
  return()=>{alive=false;subscription.unsubscribe();};
 },[db,demo]);
 function apply(data,activity=Date.now()){
  if(data.error)throw Error(message(data));
  const current=identityRef.current?.user.id;if(!current)return;
  const g=data.enabled&&!data.locked?{token:data.token||grantRef.current?.token,expires_at:data.expires_at,lastActivity:activity}:null;
  grantRef.current=g;lastActivity.current=activity;setPinToken(g?.token);saveGrant(current,g);
  setGate({...data,token:g?.token});setProblem('');setReset(false);
 }
 async function refresh(){
  const current=identityRef.current?.user.id;if(!current)return;
  const request=++generation.current;setGate(null);setProblem('');
  const saved=readGrant(current);grantRef.current=saved;setPinToken(saved?.token);
  try{const {data,error}=await db.rpc('ift_pin_status');if(error)throw error;if(request!==generation.current)return;apply(data,saved?.lastActivity||Date.now());}
  catch{if(request===generation.current){setPinToken('');grantRef.current=null;setProblem('Connect to the internet to verify app lock. Your records are unchanged.');}}
 }
 useEffect(()=>{setReset(false);setGate(null);setProblem('');setPinToken('');grantRef.current=null;if(uid)refresh();else generation.current++;},[uid]);
 function lock(){
  if(!gateRef.current?.enabled||gateRef.current.locked)return;
  const retiringToken=grantRef.current?.token;
  generation.current++;clearTimeout(renewTimer.current);
  setPinToken('');grantRef.current=null;if(uid)saveGrant(uid,null);
  setGate({enabled:true,locked:true});setReset(false);setProblem('');
  Promise.resolve(db.rpc('ift_pin_lock_grant',{p_token:retiringToken||''})).catch(()=>{});
 }
 useEffect(()=>{if(demo)return;const expired=()=>lock();window.addEventListener('ift:pin-expired',expired);return()=>window.removeEventListener('ift:pin-expired',expired);},[uid,demo]);
 useEffect(()=>{
  if(demo||!uid||!gate?.enabled||gate.locked||!gate.token)return;
  async function renew(){
   clearTimeout(renewTimer.current);
   if(renewing.current||!navigator.onLine||!grantRef.current)return;
   renewing.current=true;lastRenew.current=Date.now();
   try{const {data,error}=await db.rpc('ift_pin_touch');if(!grantRef.current)return;if(data?.error==='locked'){lock();return;}
    if(!error&&data?.expires_at){grantRef.current={...grantRef.current,expires_at:data.expires_at,lastActivity:lastActivity.current};saveGrant(uid,grantRef.current);}
   }catch{}finally{renewing.current=false;}
  }
  const clock=createIdleLock({lastActivity:lastActivity.current,onLock:lock,onActivity:time=>{
   lastActivity.current=time;if(grantRef.current){grantRef.current.lastActivity=time;saveGrant(uid,grantRef.current);}
   clearTimeout(renewTimer.current);if(Date.now()-lastRenew.current>=30000)renew();else renewTimer.current=setTimeout(renew,1000);
  }});
  const activity=event=>{if(event.isTrusted)clock.activity();};
  const visible=()=>{if(document.visibilityState==='visible')clock.check();};
  const resume=()=>clock.check();
  for(const event of ['pointerdown','keydown','touchstart','scroll'])document.addEventListener(event,activity,{passive:true,capture:true});
  document.addEventListener('visibilitychange',visible);window.addEventListener('pageshow',resume);
  return()=>{clock.dispose();clearTimeout(renewTimer.current);for(const event of ['pointerdown','keydown','touchstart','scroll'])document.removeEventListener(event,activity,true);document.removeEventListener('visibilitychange',visible);window.removeEventListener('pageshow',resume);};
 },[uid,demo,gate?.enabled,gate?.locked,gate?.token]);
 async function unlock(pin){
  const unlockingUid=identityRef.current?.user.id;
  setBusy(true);setProblem('');
  try{const {data,error}=await db.rpc('ift_pin_unlock',{p_pin:pin});if(error)throw error;if(identityRef.current?.user.id===unlockingUid)apply(data);}
  catch(error){setProblem(error.message?.includes('IFT_PIN_LOCKED')?'Enter your PIN to continue.':error.message||'Could not unlock. Check your connection.');}
  finally{setBusy(false);}
 }
 async function configure({password,pin,disable}){
  const current=identityRef.current;if(!current)throw Error('Sign in again.');
  if(!disable&&!/^[0-9]{6}$/.test(pin))throw Error('Use exactly six digits.');
  const {error:authError}=await db.auth.signInWithPassword({email:current.user.email,password});if(authError)throw Error('Account password could not be verified.');
  const {data,error}=await db.rpc('ift_pin_configure',{p_new_pin:disable?null:pin});
  if(error||data?.error){lock();throw Error(error?.message||message(data));}
  apply(data);
 }
 const context={enabled:!!gate?.enabled,configure,lock,demo};
 if(demo)return <LockContext.Provider value={context}>{children}</LockContext.Provider>;
 if(identity===undefined||uid&&!gate)return <Screen><h1>Checking app security</h1><p>{problem||'Opening your private money space…'}</p>{problem&&<><button className="primary" onClick={()=>uid?refresh():location.reload()}>Try again</button><button className="secondary" onClick={()=>db.auth.signOut()}>Sign out</button></>}</Screen>;
 if(uid&&gate?.locked)return <LockContext.Provider value={context}><Screen><h1>{reset?'Reset app PIN':'Your money is locked'}</h1><p>{reset?'Verify your account password to choose a new PIN.':'Enter your six-digit PIN to continue.'}</p>{reset?<PinSettings recovery/>:<PinEntry busy={busy} onSubmit={unlock}/>} {problem&&<p className="alert" role="alert">{problem}</p>}<button type="button" className="text-button" onClick={()=>{setReset(!reset);setProblem('');}}>{reset?'Back to PIN':'Forgot PIN? Use account password'}</button><button type="button" className="text-button" onClick={()=>db.auth.signOut()}>Sign out</button><small>Locked after 15 minutes without activity.</small></Screen></LockContext.Provider>;
 return <LockContext.Provider value={context}>{children}</LockContext.Provider>;
}
function Screen({children}){return <main className="pin-screen"><section className="pin-card"><img src={logo} alt="IFT" className="pin-logo"/>{children}</section></main>;}
function PinEntry({busy,onSubmit}){
 const [pin,setPin]=useState('');
 return <form onSubmit={event=>{event.preventDefault();if(!busy&&/^[0-9]{6}$/.test(pin)){onSubmit(pin);setPin('');}}}><label>PIN<input aria-label="PIN" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} minLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} required/></label><button className="primary full-width" disabled={busy||pin.length!==6}>{busy?'Verifying…':'Unlock IFT'}</button></form>;
}
export function PinSettings({recovery=false}){
 const lock=useContext(LockContext),[editing,setEditing]=useState(recovery),[disable,setDisable]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 if(!lock)return null;
 async function submit(event){event.preventDefault();if(busy)return;const form=event.currentTarget,data=new FormData(form);setError('');setNotice('');
  if(!disable&&data.get('pin')!==data.get('confirm')){setError('PINs do not match.');return;}
  setBusy(true);try{await lock.configure({password:String(data.get('password')),pin:String(data.get('pin')||''),disable});form.reset();setEditing(false);setDisable(false);setNotice(disable?'App lock disabled.':'PIN saved. IFT locks after 15 minutes without activity.');}catch(e){setError(e.message||'Could not save PIN.');}finally{setBusy(false);}
 }
 const content=<><h2>{recovery?'Choose a new PIN':'App PIN lock'}</h2><p>{lock.demo?'Sign in to enable a private app PIN.':lock.enabled?'On: locks after 15 minutes without activity.':'Off: enable a six-digit PIN to protect your saved login.'}</p>
 {editing?<form onSubmit={submit}><label>Account password<input name="password" type="password" autoComplete="current-password" required/></label>{!disable&&<><label>New PIN<input name="pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required/></label><label>Confirm PIN<input name="confirm" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required/></label></>}<div className="pin-actions"><button type="button" className="secondary" onClick={()=>{setEditing(false);setDisable(false);setError('');}} disabled={busy}>Cancel</button><button className="primary" disabled={busy}>{busy?'Saving…':disable?'Disable PIN lock':'Save PIN'}</button></div></form>:<div className="pin-actions"><button type="button" className="primary" disabled={lock.demo} onClick={()=>{setEditing(true);setDisable(false);setError('');setNotice('');}}>{lock.enabled?'Change PIN':'Enable PIN lock'}</button>{lock.enabled&&<><button type="button" className="secondary" onClick={lock.lock}>Lock now</button><button type="button" className="text-button" onClick={()=>{setEditing(true);setDisable(true);setNotice('');}}>Disable PIN lock</button></>}</div>}
 {error&&<p className="alert" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}<small>PIN verification needs an internet connection. PIN changes require your account password.</small></>;
 return recovery?<div className="pin-settings">{content}</div>:<section className="panel settings-panel pin-settings">{content}</section>;
}
