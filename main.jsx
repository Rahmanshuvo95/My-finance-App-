import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from './config.js';
import { accountTypes, money, cents, balances, totals, validateTransaction, csvCell } from './ledger.js';
import './style.css';
import './premium.css';
import './liquid-glass.css';
import './account-cards.css';
import './branding.css';
import iftLogo from './ift-logo.png';
import {accountBrand} from './account-brand.js';
import cityLogo from './city-bank.webp';
import bkashLogo from './bkash.svg';
import seblLogo from './sebl.png';
import amexLogo from './amex-compact.avif';
import Insights from './Insights.jsx';
import {playSound} from './sounds.js';
import { accountLedger, localTransactionDate } from './account-ledger.js';
import { cardAmounts, fundSummary, creditCardPayload } from './card-balances.js';
import AvatarCropper from './AvatarCropper.jsx';

import {LoanPanel,LoanFields,loanEditItem} from './LoanPanel.jsx';
import {isLoanAccount,loanPayload} from './loans.js';
import {loanMeta,loanNote,loanLabel,isLoanOpening} from './loan-meta.js';
const db = createClient(supabaseUrl, supabaseKey);
const today = localTransactionDate;
const demo = new URLSearchParams(location.search).get('demo') === '1';
const icons = {home:<><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></>,accounts:<><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18m-5 5h2"/></>,activity:<><path d="M5 4h14v17l-4-2-3 2-3-2-4 2Z"/><path d="M8 8h8M8 12h5"/></>,settings:<><circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/></>,plus:<path d="M12 5v14M5 12h14"/>,refresh:<><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/></>,close:<path d="m6 6 12 12M18 6 6 18"/>,income:<path d="M12 4v16m-6-6 6 6 6-6"/>,expense:<path d="M12 20V4m-6 6 6-6 6 6"/>,transfer:<path d="M3 8h18l-5-5M21 16H3l5 5"/>,check:<path d="m5 12 4 4L19 6"/>,download:<><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></>,lock:<><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></>};
Object.assign(icons,{
 cash:<><rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/></>,
 bank:<><path d="m3 8 9-5 9 5M3 21h18M5 10v8m5-8v8m4-8v8m5-8v8M3 8h18"/></>,
 mobile_banking:<><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2M9 10h6m-3-3v6"/></>,
 credit_card:<><rect x="2" y="4" width="20" height="16" rx="4"/><path d="M2 9h20M6 15h4m5 0h3"/></>,
 savings:<><path d="M5 8h13l2 5h2v4h-3l-1 4h-3l-1-3H9l-1 3H5l-1-5-2-3 3-5Z"/><path d="M8 8V5h4m-3 6h4m4 2h.01"/></>,
 loan:<><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8m-8 4h5m-1 3v5m-2-2 2 2 2-2"/></>,
 receivable:<><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8m-8 4h5m-1 8v-5m-2 2 2-2 2 2"/></>
});
function Icon({name,...props}){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{icons[name]||icons.accounts}</svg>;}
function AccountLogo({account}) {
 const brand=accountBrand(account),src={city:cityLogo,bkash:bkashLogo,sebl:seblLogo,amex:amexLogo}[brand];
 const [failed,setFailed]=useState(false);
 return <span className={'account-card-logo '+(src&&!failed?'bank-logo':'color-logo')}>{src&&!failed?<img src={src} alt="" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<Icon name={account.type}/>}</span>;
}
function App(){
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('ift-theme')==='dark'?'dark':'light';}catch{return 'light';}});
 useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('ift-theme',theme);}catch{}},[theme]);
 const [soundEnabled,setSoundEnabled]=useState(()=>{try{return localStorage.getItem('ift-sound')!=='off';}catch{return true;}});
 useEffect(()=>{const tap=event=>{if(soundEnabled&&event.target.closest('button')&&!event.target.closest('button:disabled'))playSound();};document.addEventListener('click',tap);return()=>document.removeEventListener('click',tap);},[soundEnabled]);
 const [session,setSession]=useState(null),[boot,setBoot]=useState(!demo),[view,setView]=useState('home');const [profileMenuOpen,setProfileMenuOpen]=useState(false),[profileBusy,setProfileBusy]=useState(false),[avatarUrl,setAvatarUrl]=useState(''),[avatarBusy,setAvatarBusy]=useState(false),[avatarFile,setAvatarFile]=useState(null),[avatarError,setAvatarError]=useState('');
 const [selectedAccountId,setSelectedAccountId]=useState(null),[closing,setClosing]=useState(false);
 const closeTimer=useRef(null);
 const [accounts,setAccounts]=useState([]),[transactions,setTransactions]=useState([]),[loading,setLoading]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[modal,setModal]=useState(null),[saving,setSaving]=useState(false);
 const [month,setMonth]=useState(today().slice(0,7)),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[accountFilter,setAccountFilter]=useState('all');
 const sessionRef=useRef(null),requestRef=useRef(0),saveRef=useRef(false),dialogRef=useRef(null),previousFocus=useRef(null);
 const authenticated=demo||!!session;
 useEffect(()=>{
  if(demo){setAccounts([{id:'demo-cash',name:'Everyday cash',type:'cash',opening_balance:15000},{id:'demo-bank',name:'City Bank',type:'bank',opening_balance:42000},{id:'demo-card',name:'SEBL Credit Card',type:'credit_card',opening_balance:-8500,credit_limit:100000},{id:'demo-bkash',name:'bKash',type:'mobile_banking',opening_balance:4800},{id:'demo-amex',name:'City Bank Amex',type:'credit_card',opening_balance:-2500,credit_limit:50000},{id:'demo-receivable',name:'Loan Receivable',type:'receivable',opening_balance:0},{id:'demo-loan',name:'Loan Payable',type:'loan',opening_balance:0}]);setTransactions([['income','Salary',51000,'demo-bank'],['income','Business',12000,'demo-bank'],['expense','Food & drinks',8200,'demo-cash'],['expense','Shopping',6500,'demo-card'],['expense','Transport',3200,'demo-cash'],['expense','Bills',4500,'demo-bank'],['expense','Family',5000,'demo-bank']].map(([type,category,amount,account_id],i)=>({id:'demo-'+i,type,category,amount,account_id,transaction_date:today(),note:'Demo '+category})).concat([{"id":"loan-demo-0","type":"transfer","amount":10000,"account_id":"demo-bank","transfer_account_id":"demo-receivable","category":"Loan transfer","note":"[IFT-LOAN:1]{\"loanId\":\"demo-receivable\",\"person\":\"Rahim\",\"action\":\"lend\"}\n"},{"id":"loan-demo-1","type":"transfer","amount":5000,"account_id":"demo-bank","transfer_account_id":"demo-receivable","category":"Loan transfer","note":"[IFT-LOAN:1]{\"loanId\":\"demo-receivable\",\"person\":\"Karim\",\"action\":\"lend\"}\n"},{"id":"loan-demo-2","type":"transfer","amount":3000,"account_id":"demo-receivable","transfer_account_id":"demo-bkash","category":"Loan transfer","note":"[IFT-LOAN:1]{\"loanId\":\"demo-receivable\",\"person\":\"Rahim\",\"action\":\"collect\"}\n"},{"id":"loan-demo-3","type":"transfer","amount":20000,"account_id":"demo-loan","transfer_account_id":"demo-bank","category":"Loan transfer","note":"[IFT-LOAN:1]{\"loanId\":\"demo-loan\",\"person\":\"Hasan\",\"action\":\"borrow\"}\n"},{"id":"loan-demo-4","type":"transfer","amount":5000,"account_id":"demo-bank","transfer_account_id":"demo-loan","category":"Loan transfer","note":"[IFT-LOAN:1]{\"loanId\":\"demo-loan\",\"person\":\"Hasan\",\"action\":\"repay\"}\n"}].map(t=>({...t,transaction_date:today()}))));return;}
  let alive=true;
  db.auth.getSession().then(({data,error})=>{if(alive){if(error)setError(error.message);sessionRef.current=data.session;setSession(data.session);setBoot(false);}});
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,s)=>{sessionRef.current=s;setSession(s);setBoot(false);if(!s){requestRef.current++;setAccounts([]);setTransactions([]);}});
  return()=>{alive=false;subscription.unsubscribe();};
 },[]);
 async function load(){
  if(demo||!sessionRef.current)return;
  const uid=sessionRef.current.user.id,request=++requestRef.current;setLoading(true);setError('');
  try{
   const a=await db.from('accounts').select('*').eq('user_id',uid).order('created_at');if(a.error)throw a.error;
   let all=[];
   for(let offset=0;;offset+=1000){const t=await db.from('transactions').select('*').eq('user_id',uid).order('transaction_date',{ascending:false}).order('id',{ascending:false}).range(offset,offset+999);if(t.error)throw t.error;all.push(...t.data);if(t.data.length<1000)break;}
   if(request===requestRef.current&&sessionRef.current?.user.id===uid){setAccounts(a.data);setTransactions(all);}
  }catch(e){if(request===requestRef.current)setError(e.message||'Could not load your data. Try again.');}
  finally{if(request===requestRef.current)setLoading(false);}
 }
 useEffect(()=>{if(session?.user.id)load();},[session?.user.id]);function chooseAvatar(e){const input=e.currentTarget,file=input.files?.[0];input.value='';if(!file)return;setAvatarError('');if(!file.type.startsWith('image/')){setAvatarError('Choose an image file.');return;}if(file.size>20*1024*1024){setAvatarError('Choose a photo smaller than 20 MB.');return;}setAvatarFile(file);}async function saveAvatarCrop(blob){setAvatarError('');if(!(blob instanceof Blob)||!['image/webp','image/jpeg'].includes(blob.type)){setAvatarError('This browser could not prepare the photo. Try again.');return;}if(blob.size>2*1024*1024){setAvatarError('The cropped photo is still over 2 MB. Zoom in closer and try again.');return;}setAvatarBusy(true);try{if(demo)throw new Error('Sign in to update your profile picture.');const user=sessionRef.current?.user;if(!user)throw new Error('Please sign in again.');const extension=blob.type==='image/webp'?'webp':'jpg',path=user.id+'/avatar.'+extension;const {error:uploadError}=await db.storage.from('ift-avatars').upload(path,blob,{upsert:true,contentType:blob.type,cacheControl:'3600'});if(uploadError)throw uploadError;const {data,error}=await db.auth.updateUser({data:{avatar_path:path}});if(error)throw error;sessionRef.current={...sessionRef.current,user:data.user};setSession(sessionRef.current);const {data:signed,error:signedError}=await db.storage.from('ift-avatars').createSignedUrl(path,3600);if(signedError)throw signedError;setAvatarUrl(signed.signedUrl);setAvatarFile(null);setAvatarError('');setNotice('Profile picture updated.');}catch(error){setAvatarError(error.message||'Could not update your profile picture.');}finally{setAvatarBusy(false);}}async function updateProfile(e){e.preventDefault();setError('');setProfileBusy(true);const display=String(new FormData(e.currentTarget).get('display_name')||'').trim();try{if(!display)throw new Error('Enter your name.');if(demo)throw new Error('Sign in to update your profile.');const {data,error}=await db.auth.updateUser({data:{full_name:display}});if(error)throw error;setSession(current=>current?{...current,user:data.user}:current);setNotice('Profile updated.');}catch(error){setError(error.message||'Could not update your profile.');}finally{setProfileBusy(false);}}async function signOut(){setProfileMenuOpen(false);if(demo){location.href='/';return;}const {error}=await db.auth.signOut();if(error)setError(error.message);}
 useEffect(()=>{const reload=()=>{if(document.visibilityState==='visible')load();};document.addEventListener('visibilitychange',reload);window.addEventListener('online',reload);return()=>{document.removeEventListener('visibilitychange',reload);window.removeEventListener('online',reload);};},[]);
 useEffect(()=>{
  if(!modal)return;
  previousFocus.current=document.activeElement;dialogRef.current?.showModal();
  return()=>{dialogRef.current?.close();previousFocus.current?.focus();};
 },[modal]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);},[notice]);
 const values=balances(accounts,transactions);const displayName=demo?'Demo preview':(session?.user.user_metadata?.full_name||session?.user.email?.split('@')[0]||'Your profile');const initials=displayName.split(/[\s.@_-]+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();useEffect(()=>{let active=true;const path=session?.user.user_metadata?.avatar_path;if(!session?.user.id||!path){setAvatarUrl('');return()=>{active=false;};}db.storage.from('ift-avatars').createSignedUrl(path,3600).then(({data,error})=>{if(active)setAvatarUrl(error?'':data?.signedUrl||'');});return()=>{active=false;};},[session?.user.id,session?.user.user_metadata?.avatar_path]);
 const funds=fundSummary(accounts,values);
 const summary=totals(transactions,month),accountName=id=>accounts.find(a=>a.id===id)?.name||'Account';
 const rows=transactions.filter(t=>t.transaction_date.slice(0,7)===month&&(filter==='all'||t.type===filter)&&(accountFilter==='all'||t.account_id===accountFilter||t.transfer_account_id===accountFilter)&&`${loanLabel(t)} ${t.category||''} ${accountName(t.account_id)}`.toLowerCase().includes(search.toLowerCase()));
 const categories=Object.entries(transactions.filter(t=>t.type==='expense'&&!isLoanOpening(t)&&t.transaction_date.slice(0,7)===month).reduce((out,t)=>{out[t.category||'Other']=(out[t.category||'Other']||0)+cents(t.amount);return out;},{})).sort((a,b)=>b[1]-a[1]);
 function open(kind,item){
  if(kind==='transaction'&&item?.type==='transfer'&&!loanMeta(item)){
   const loan=accounts.find(a=>isLoanAccount(a)&&(a.id===item.account_id||a.id===item.transfer_account_id));
   const cashId=item.account_id===loan?.id?item.transfer_account_id:item.account_id;
   if(loan&&accounts.some(a=>a.id===cashId&&['cash','bank','mobile_banking'].includes(a.type))){
    const outward=item.account_id===loan.id,action=loan.type==='receivable'?(outward?'collect':'lend'):(outward?'borrow':'repay');
    item={id:item.id,loan_id:loan.id,action,cash_id:cashId,person:'',amount:item.amount,note:item.note||'',transaction_date:item.transaction_date};kind='loanTransaction';
   }
  }
  if(kind==='transaction'&&loanMeta(item||{})){item=loanEditItem(item);kind='loanTransaction';}
  clearTimeout(closeTimer.current);
  setClosing(false);
  setError('');
  if(kind==='transaction' && !item?.type) kind='chooseTransaction';
  setModal({kind,item});
 }
 function dismissModal(){
  setClosing(true);
  closeTimer.current=setTimeout(()=>{setModal(null);setClosing(false);setError('');},180);
 }
 function close(){if(!saveRef.current) dismissModal();}
 useEffect(()=>()=>clearTimeout(closeTimer.current),[]);
 async function save(e){
  e.preventDefault();if(saveRef.current||closing)return;
  saveRef.current=true;setSaving(true);setError('');
  const f=Object.fromEntries(new FormData(e.currentTarget)),existing=modal.item?.id?modal.item:null;
  try{
   let payload;
   if(modal.kind==='loanTransaction'){
    payload=loanPayload(f,accounts,transactions,values,existing);
   }else if(modal.kind==='account'){
    if(!f.name.trim())throw new Error('Enter an account name.');
    payload={name:f.name.trim(),type:f.type,opening_balance:cents(f.opening_balance||'0')/100,credit_limit:null};
    if(f.type==='credit_card') {
      Object.assign(payload, creditCardPayload(f.available_limit, f.outstanding, existing, values[existing?.id] || 0));
    }
   }else{
    payload={type:f.type,account_id:f.account_id,transfer_account_id:f.type==='transfer'?f.transfer_account_id:null,amount:cents(f.amount)/100,category:f.type==='transfer'?'Transfer':(f.category.trim()||'Other'),note:f.note.trim(),transaction_date:existing?.transaction_date || today()};
    validateTransaction(payload);
    if([payload.account_id,payload.transfer_account_id].some(id=>accounts.some(a=>a.id===id&&isLoanAccount(a))))throw Error('Open the loan account and use its lending, borrowing or return buttons to keep person balances correct.');
   }
   const table=modal.kind==='account'?'accounts':'transactions';
   if(demo){
    const update=table==='accounts'?setAccounts:setTransactions;
    update(old=>existing?old.map(x=>x.id===existing.id?{...x,...payload}:x):[{...payload,id:crypto.randomUUID(),created_at:new Date().toISOString()},...old]);
   }else{
    const uid=sessionRef.current?.user.id;if(!uid)throw new Error('Please sign in again.');
    const q=existing?db.from(table).update(payload).eq('id',existing.id).eq('user_id',uid).select('id'):db.from(table).insert({...payload,user_id:uid}).select('id');
    const result=await q;if(result.error)throw result.error;if(result.data?.length!==1)throw new Error('The record could not be saved. Refresh and try again.');
    await load();
   }
   if(soundEnabled)playSound('success');
   dismissModal();setNotice(demo?'Saved in this demo session only.':'Saved to your account.');
  }catch(e){setError(e.message||'Could not save. Please try again.');}
  finally{saveRef.current=false;setSaving(false);}
 }
 function exportCsv(){
  const data=[['Date','Type','Account','Destination','Category','Amount BDT','Note'],...rows.map(t=>[t.transaction_date,t.type,accountName(t.account_id),t.transfer_account_id?accountName(t.transfer_account_id):'',t.category,t.amount,loanMeta(t)?loanLabel(t)+" "+loanNote(t):t.note])];
  const url=URL.createObjectURL(new Blob(['\ufeff'+data.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');a.href=url;a.download=`ift-transactions-${month}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function accountList(){
  return accounts.length?<div className="account-cards" aria-label="Your accounts">{accounts.map(account=>{
   const card=cardAmounts(account,values[account.id]),brand=accountBrand(account);
   return <button type="button" className={'account-card brand-'+brand} key={account.id} aria-label={'Open ledger for '+account.name} onClick={()=>{setSelectedAccountId(account.id);setView('ledger');}}>
    <span className="account-card-top"><AccountLogo account={account}/><span className="account-card-arrow" aria-hidden="true">&#8599;</span></span>
    <span className="account-card-name">{account.name}</span><span className="account-card-type">{accountTypes[account.type]||account.type}</span>
    <span className="account-card-balance">{account.type==='credit_card'?<><small>Available limit</small><strong>{card.available===null?'Not set':money(card.available)}</strong><small>Outstanding <b className="negative">{money(card.outstanding)}</b></small></>:<><small>{account.type==='loan'?'Outstanding payable':account.type==='receivable'?'Outstanding receivable':'Current balance'}</small><strong className={account.type==='receivable'?'positive':account.type==='loan'?'negative':values[account.id]<0?'negative':''}>{money(account.type==='loan'?-values[account.id]:values[account.id])}</strong></>}</span>
    <span className="account-card-ledger">{isLoanAccount(account)?'People & ledger':'View ledger'} <span aria-hidden="true">&#8594;</span></span>
   </button>;
  })}</div>:<Empty title="Add your first account" text="Keep cash, bank accounts and cards together." button="Add account" onClick={()=>open('account')}/>;
 }
 function transactionList(list){return list.length?<div className="list">{list.map(t=><button className="transaction-row" key={t.id} onClick={()=>open('transaction',t)}><span className={`transaction-icon ${t.type}`}><Icon name={t.type}/></span><span className="row-label"><strong>{loanLabel(t)}</strong><small>{accountName(t.account_id)}{t.type==='transfer'?` → ${accountName(t.transfer_account_id)}`:''} · {new Date(t.transaction_date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</small></span><strong className={t.type==='income'?'positive':''}>{t.type==='income'?'+':t.type==='expense'?'−':''}{money(t.amount)}</strong></button>)}</div>:<Empty title="A fresh start" text="Your transactions for this month will appear here." button={accounts.length?'Add transaction':'Add an account'} onClick={()=>open(accounts.length?'transaction':'account')}/>;}
 if(boot)return <main className="boot"><div className="brand-mark"><img src={iftLogo} alt="IFT"/></div><p>Opening your money space…</p></main>;
 if(!authenticated)return <Auth error={error} setError={setError}/>;
 return <div className="app-shell">
  <aside className="sidebar"><a className="brand" href="/" aria-label="IFT home"><span className="brand-mark"><img src={iftLogo} alt="IFT"/></span><span>My money,<br/><b>simply.</b></span></a><nav aria-label="Main navigation">{[['home','Overview'],['accounts','Accounts'],['activity','Activity']].map(([id,label])=><button key={id} className={view===id?'nav-item active':'nav-item'} onClick={()=>setView(id)} aria-current={view===id?'page':undefined}><Icon name={id}/><span>{label}</span></button>)}</nav><div className="sidebar-foot"><Icon name="lock"/><p>Your money.<br/>Your private space.</p></div></aside>
  <main className="main" key={view}>
   {demo&&<div className="demo-banner">Demo preview · sample accounts · changes are temporary <a href="/">Sign in</a></div>}
   <header className="page-header"><div><div className="header-brand"><img src={iftLogo} alt="IFT"/><p className="eyebrow">INSTANT FINANCIAL TRACKER</p></div><h1>{({home:'A little more clarity.',accounts:'All your accounts.',activity:'Every little detail.',settings:'Make yourself at home.',ledger:accountName(selectedAccountId)})[view]}</h1><p className="subtitle">{({home:'Your everyday money, in one calm place.',accounts:'Cash, cards, savings and everything in between.',activity:'Know what came in and where it went.',settings:'A simple space. Entirely yours.',ledger:'Account ledger'})[view]}</p></div><div className="header-actions"><button className="icon-button refresh" onClick={load} disabled={loading||demo} aria-label="Refresh accounts"><Icon name="refresh" className={loading?'spinning':''}/></button><div className="profile-area" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setProfileMenuOpen(false);}}><button type="button" className="profile-trigger" aria-label="Open profile menu" aria-expanded={profileMenuOpen} onClick={()=>setProfileMenuOpen(value=>!value)}><span className="profile-avatar">{avatarUrl?<img src={avatarUrl} alt="Profile"/>:initials}</span><span className="profile-caret" aria-hidden="true">⌄</span></button>{profileMenuOpen&&<div className="profile-menu"><div className="profile-menu-identity"><span className="profile-avatar large">{avatarUrl?<img src={avatarUrl} alt="Profile"/>:initials}</span><span className="profile-identity-text"><span className="profile-identity-heading"><strong>{displayName}</strong><button type="button" className="profile-name-settings" aria-label="App settings" title="App settings" onClick={()=>{setView('settings');setProfileMenuOpen(false);}}><Icon name="settings"/></button></span><small>{demo?'Sample data · temporary':session?.user.email}</small></span></div><button type="button" className="profile-menu-item" onClick={()=>{setView('settings');setProfileMenuOpen(false);}}><Icon name="settings"/><span><strong>App Settings</strong><small>Appearance and preferences</small></span></button><div className="profile-menu-divider"/><button type="button" className="profile-menu-item logout" onClick={signOut}><Icon name="close"/><span><strong>Log out</strong></span></button></div>}</div></div></header>
   {error&&!modal&&<div role="alert" className="alert">{error}<button onClick={load}>Try again</button></div>}
   {notice&&<div className="toast" role="status"><Icon name="check"/>{notice}</div>}
   {loading&&!accounts.length&&<p role="status" className="muted">Loading your accounts…</p>}
   {view==='home'&&<>
    <section className="net-card"><div><span className="card-label">Available fund to use</span><h2 className="positive">{money(funds.available)}</h2><p>Cash, bank and mobile banking balances.</p></div><div className="net-footer"><span>Credit card outstanding <b className="negative">{money(funds.cards)}</b></span><span>Other liabilities <b className="negative">{money(funds.otherDebt)}</b></span></div></section>
    <div className="section-heading"><h2>This month</h2><input type="month" aria-label="Summary month" value={month} onChange={e=>setMonth(e.target.value)}/></div>
    <div className="summary-grid"><section className="metric"><span className="transaction-icon income"><Icon name="income"/></span><p>Money in</p><h3>{money(summary.income)}</h3></section><section className="metric"><span className="transaction-icon expense"><Icon name="expense"/></span><p>Money out</p><h3>{money(summary.expense)}</h3></section><section className="metric difference"><p>Left this month</p><h3>{money(summary.income-summary.expense)}</h3><small>Income less expenses</small></section></div>
    <div className="quick-actions"><button className="primary" onClick={()=>open(accounts.length?'transaction':'account')}><Icon name="plus"/>{accounts.length?'Add transaction':'Add account'}</button><button className="secondary" onClick={()=>open('transaction',{type:'transfer'})} disabled={accounts.length<2}><Icon name="transfer"/>Transfer</button></div>
    <Insights transactions={transactions} month={month}/><div className="overview-columns"><section><div className="section-heading"><h2>Your accounts <span className="count">{accounts.length}</span></h2><button className="text-button" onClick={()=>setView('accounts')}>View all</button></div>{accountList()}</section><section><div className="section-heading"><h2>Recent activity</h2><button className="text-button" onClick={()=>setView('activity')}>View all</button></div>{transactionList(rows.slice(0,5))}</section></div>
    {categories.length>0&&<section className="spending"><div className="section-heading"><h2>Where it went</h2><span className="muted">This month</span></div><div className="panel">{categories.slice(0,6).map(([name,amount])=><div className="category-row" key={name}><div><span>{name}</span><b>{money(amount/100)}</b></div><div className="bar-track"><span style={{width:`${summary.expense?amount/summary.expense:0}%`}}/></div></div>)}</div></section>}
   </>}
   {view==='accounts'&&<><div className="toolbar"><p className="muted">{accounts.length} accounts · Available fund to use {money(funds.available)}</p><button className="primary" onClick={()=>open('account')}><Icon name="plus"/>Add account</button></div>{accountList()}<p className="help-note">Tap any account card to open its ledger and account options.</p></>}
   {view==='ledger'&&isLoanAccount(accounts.find(a=>a.id===selectedAccountId))&&<LoanPanel key={selectedAccountId} account={accounts.find(a=>a.id===selectedAccountId)} transactions={transactions} balance={values[selectedAccountId]} accountName={accountName} onBack={()=>setView('accounts')} onEdit={()=>open('account',accounts.find(a=>a.id===selectedAccountId))} onOpen={(action,person)=>open('loanTransaction',{loan_id:selectedAccountId,action,person,transaction_date:today()})} onTransaction={row=>open('transaction',row)}/>}
   {view==='ledger'&&!isLoanAccount(accounts.find(a=>a.id===selectedAccountId))&&accounts.find(account=>account.id===selectedAccountId)&&<AccountLedger account={accounts.find(account=>account.id===selectedAccountId)} transactions={transactions} balance={values[selectedAccountId]} accountName={accountName} onBack={()=>setView('accounts')} onEdit={()=>open('account',accounts.find(account=>account.id===selectedAccountId))} onTransaction={row=>open('transaction',row)} onAdd={()=>open('chooseTransaction',{account_id:selectedAccountId})}/>}
   {view==='activity'&&<><div className="toolbar"><input className="search" type="search" placeholder="Search transactions" aria-label="Search transactions" value={search} onChange={e=>setSearch(e.target.value)}/><button className="primary" onClick={()=>open(accounts.length?'transaction':'account')}><Icon name="plus"/>Add new</button></div><div className="filters"><input type="month" aria-label="Transaction month" value={month} onChange={e=>setMonth(e.target.value)}/><select aria-label="Transaction type" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option></select><select aria-label="Filter by account" value={accountFilter} onChange={e=>setAccountFilter(e.target.value)}><option value="all">All accounts</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button className="secondary" onClick={exportCsv} disabled={!rows.length}><Icon name="download"/>Export CSV</button></div>{transactionList(rows)}<p className="help-note">{rows.length} transactions in this view. Tap any entry to edit it.</p></>}
   {view==='settings'&&<><section className="panel settings-panel"><h2>Your profile</h2><div className="avatar-settings-row"><span className="profile-avatar large">{avatarUrl?<img src={avatarUrl} alt="Profile"/>:initials}</span><label className="avatar-upload">{avatarBusy?'Uploading…':'Change profile picture'}<input type="file" accept="image/*" onChange={chooseAvatar} disabled={avatarBusy||demo}/></label>{demo&&<small className="muted">Sign in to upload a profile picture.</small>}</div><form className="profile-form" onSubmit={updateProfile}><label>Display name<input name="display_name" type="text" placeholder="Your name" defaultValue={session?.user.user_metadata?.full_name||''} maxLength="80" required/></label><button className="primary" disabled={profileBusy||demo}>{profileBusy?'Updating…':'Update profile'}</button>{demo&&<small className="muted">Sign in to update your profile.</small>}</form><div className="setting-line appearance-setting"><span>Appearance</span><div className="appearance-switch" role="group" aria-label="Color appearance"><button type="button" className={theme==='light'?'selected':''} aria-pressed={theme==='light'} onClick={()=>setTheme('light')}>Light</button><button type="button" className={theme==='dark'?'selected':''} aria-pressed={theme==='dark'} onClick={()=>setTheme('dark')}>Dark</button></div></div><div className="setting-line"><span>Interface sounds</span><button className="sound-toggle" type="button" role="switch" aria-checked={soundEnabled} onClick={()=>{setSoundEnabled(!soundEnabled);try{localStorage.setItem("ift-sound",soundEnabled?"off":"on");}catch{}}}>{soundEnabled?"On":"Off"}</button></div><p className="muted">{demo?'Demo session':session?.user.email}</p><div className="setting-line"><span>Currency</span><b>Bangladeshi taka · BDT</b></div><div className="setting-line"><span>Data storage</span><b>{demo?'Temporary demo session':'Your private cloud account'}</b></div><div className="setting-line"><span>Sync</span><b>{demo?'Disabled in demo':'On refresh and when you return'}</b></div><button className="secondary" onClick={async()=>{if(demo){location.href='/';return;}const {error}=await db.auth.signOut();if(error)setError(error.message);}}>Sign out</button></section><section className="panel settings-panel"><h2>Developer & support</h2><div className="setting-line"><span>Developer</span><b>Md Mahmudur Rahman</b></div><div className="setting-line"><span>Support</span><a href="mailto:rahman.shuvo95@gmail.com" style={{overflowWrap:"anywhere",textAlign:"right"}}>rahman.shuvo95@gmail.com</a></div></section><section className="panel settings-panel"><h2>Keep it close</h2><p>On iPhone, open this app in Safari, tap Share, then Add to Home Screen. On Android or desktop, use your browser’s Install app option.</p><p className="muted">An internet connection is needed to load and save your data. Transfer entries move money between accounts without counting as income or expenses.</p></section></>}
   <footer className="main-footer"><div><strong className="footer-brand"><img src={iftLogo} alt=""/>Instant Financial Tracker</strong><span>Designed &amp; developed by Md Mahmudur Rahman</span><a href="mailto:rahman.shuvo95@gmail.com">rahman.shuvo95@gmail.com</a></div><span>IFT &copy; {new Date().getFullYear()}</span></footer>
  </main>
  <nav className="mobile-nav" aria-label="Mobile navigation">{[['home','Overview'],['accounts','Accounts'],['activity','Activity']].map(([id,label])=><button key={id} onClick={()=>setView(id)} className={view===id?'active':''} aria-current={view===id?'page':undefined}><Icon name={id}/><span>{label}</span></button>)}</nav>
  {avatarFile&&<AvatarCropper file={avatarFile} busy={avatarBusy} error={avatarError} onCancel={()=>{if(!avatarBusy){setAvatarFile(null);setAvatarError('');}}} onSave={saveAvatarCrop}/>}
  {modal&&<dialog ref={dialogRef} className={closing?"dialog closing":"dialog"} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}} aria-labelledby="dialog-title"><div className="dialog-body"><div className="dialog-heading"><div><p className="eyebrow">KEEP THINGS UP TO DATE</p><h2 id="dialog-title">{modal.kind==='loanTransaction'?({lend:'Lend money',collect:'Record return',borrow:'Borrow money',repay:'Repay money',opening:'Previous balance',allocate:'Assign existing balance'})[modal.item.action]:modal.kind==='chooseTransaction'?'New transaction':modal.kind==='account'?(modal.item?.id?'Edit account':'New account'):(modal.item?.id?'Edit ':'New ')+(modal.item?.type||'expense')}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={close} disabled={saving}><Icon name="close"/></button></div>{error&&<div className="alert" role="alert">{error}</div>}{modal.kind==='chooseTransaction'?<div className="transaction-choices">{['expense','income','transfer'].map(type=><button type="button" key={type} className={'transaction-choice '+type} disabled={accounts.length<(type==='transfer'?2:1)} onClick={()=>open('transaction',{type,account_id:modal.item?.account_id})}><span className={'transaction-icon '+type}><Icon name={type}/></span><span>{type[0].toUpperCase()+type.slice(1)}</span><span className="choice-chevron">›</span></button>)}{!accounts.length&&<button className="primary" onClick={()=>open('account')}>Add an account</button>}</div>:<form onSubmit={save} key={modal.kind+(modal.item?.id||modal.item?.type||'new')}>
   {modal.kind==='loanTransaction'?<LoanFields item={modal.item} accounts={accounts} transactions={transactions} values={values}/>:modal.kind==='account'?<AccountFields item={modal.item} balance={values[modal.item?.id] || 0}/>:<TransactionFields item={modal.item} accounts={accounts}/>}
   <div className="dialog-actions"><button type="button" className="secondary" onClick={close} disabled={saving}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving…':modal.kind==='account'?'Save account':modal.kind==='loanTransaction'?'Save entry':'Save '+modal.item?.type}</button></div>
  </form>}</div></dialog>}
 </div>;
}
function Empty({title,text,button,onClick}){return <div className="empty"><span className="empty-icon"><Icon name="accounts"/></span><h3>{title}</h3><p>{text}</p><button className="text-button" onClick={onClick}>{button}</button></div>;}
function AccountFields({item,balance}) {
 const [type,setType]=useState(item?.type||'cash');
 const card=cardAmounts(item||{},balance);
 return <>
  <label>Account name<input name="name" placeholder="e.g. Cash, City Bank, bKash" required maxLength="100" defaultValue={item?.name||''} autoFocus/></label>
  <label>Account type<select name="type" value={type} onChange={event=>setType(event.target.value)}>{Object.entries(accountTypes).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>
  {type==='credit_card'?<>
   <label>Available limit (BDT)<input name="available_limit" type="number" min="0" step="0.01" placeholder="Current unused card limit" defaultValue={card.available??''} required/></label>
   <label>Outstanding amount (BDT)<input name="outstanding" type="number" min="0" step="0.01" defaultValue={card.outstanding} required/></label>
   <p className="help-note">Enter today's available limit and outstanding. New card spending increases outstanding and reduces available limit. Bill payments update both amounts. Saving these figures reconciles the current card balance.</p>
  </>:<><label>Opening balance (BDT)<input name="opening_balance" type="number" step="0.01" defaultValue={item?.opening_balance??'0'} required/></label><p className="help-note">For loans, start at 0 and add each person's previous balance inside the account. Existing balances are preserved; do not enter them twice. Use a negative opening balance for money you owe. Cash, bank and mobile banking funds appear in Available fund to use. Savings and receivables stay in their own accounts.</p></>}
 </>;
}
function TransactionFields({item,accounts}){
 const type=item?.type||'expense';
 return <>
  <input type="hidden" name="type" value={type}/>
  <label>Amount (BDT)<input autoFocus name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required defaultValue={item?.amount||''}/></label>
  <label>{type==='transfer'?'From account':'Account'}<select name="account_id" required defaultValue={item?.account_id||accounts[0]?.id||''}><option value="" disabled>Select account</option>{accounts.map(account=><option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
  {type==='transfer'?<label>To account<select name="transfer_account_id" required defaultValue={item?.transfer_account_id||''}><option value="" disabled>Select destination</option>{accounts.map(account=><option key={account.id} value={account.id}>{account.name}</option>)}</select></label>:<label>{type==='expense'?'Expense category':'Income source'}<input name="category" maxLength="80" list="categories" defaultValue={item?.category||''} placeholder={type==='expense'?'e.g. Food & drinks':'e.g. Salary'} required/><datalist id="categories">{(type==='income'?['Salary','Business','Gift','Other']:['Food & drinks','Shopping','Transport','Bills','Health','Family','Education','Other']).map(value=><option key={value} value={value}/>)}</datalist></label>}
  <label>Note <span className="muted">(optional)</span><input name="note" maxLength="500" placeholder="Add a note" defaultValue={item?.note||''}/></label>
 </>;
}
function AccountLedger({account,transactions,balance,accountName,onBack,onEdit,onTransaction,onAdd}) {
 const entries=accountLedger(account,transactions);
 return <section className="ledger-view">
  <div className="toolbar"><button className="secondary" onClick={onBack}>Accounts</button><button className="secondary" onClick={onEdit}>Edit account</button></div>
  <section className="ledger-balance panel"><span className={'account-icon '+account.type}><Icon name={account.type}/></span><div><p>{account.type==='credit_card'?'Outstanding':'Current balance'}</p><h2>{money(account.type==='credit_card'?Math.max(-balance,0):balance)}</h2></div><button className="primary" onClick={onAdd}><Icon name="plus"/>New transaction</button></section>
  <div className="section-heading"><h2>Ledger</h2><span className="muted">{entries.length} entries</span></div>
  <div className="ledger-table panel"><table><thead><tr><th>Date</th><th>Details</th><th>In</th><th>Out</th><th>Balance</th></tr></thead><tbody>
   <tr><td>—</td><td>Opening balance</td><td>—</td><td>—</td><td>{money(account.opening_balance)}</td></tr>
   {entries.map(row=><tr key={row.id}><td>{new Date(row.transaction_date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</td><td><button className="ledger-entry" onClick={()=>onTransaction(row)}>{row.category||row.type}</button>{row.type==='transfer'&&<small>{accountName(row.account_id)} → {accountName(row.transfer_account_id)}</small>}{loanMeta(row)&&<small>{loanLabel(row)}</small>}{loanNote(row)&&<small>{loanNote(row)}</small>}</td><td className="positive">{row.change>0?money(row.change):'—'}</td><td>{row.change<0?money(-row.change):'—'}</td><td>{money(row.balance)}</td></tr>)}
  </tbody></table></div>
  {account.type==='credit_card'&&<p className="help-note">A negative ledger balance is the amount owed. Card payments appear as money in.</p>}
 </section>;
}
function Auth({error,setError}){
 const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');const f=new FormData(e.currentTarget);try{
  const credentials={email:String(f.get('email')).trim(),password:String(f.get('password'))};
  const result=mode==='signup'?await db.auth.signUp(credentials):await db.auth.signInWithPassword(credentials);
  if(result.error)throw result.error;
  if(mode==='signup'&&!result.data.session)setMessage('Check your email to confirm your account, then come back here to sign in.');
 }catch(e){setError(e.message||'Could not sign in. Please try again.');}finally{setBusy(false);}}
 return <main className="auth-shell"><section className="auth-story"><a className="brand" href="/"><span className="brand-mark"><img src={iftLogo} alt="IFT"/></span><span>Instant Financial<br/><b>Tracker</b></span></a><div><p className="eyebrow">A LITTLE MORE CLARITY</p><h1>My money,<br/><em>simply.</em></h1><p>Less keeping track.<br/>More feeling in control.</p><div className="auth-orbit" aria-hidden="true">✳</div></div><small>Made for your everyday.</small></section><section className="auth-main"><div className="auth-card"><span className="auth-greeting">Welcome to your money space</span><h2>{mode==='login'?'Good to see you.':'A fresh start.'}</h2><p className="muted">{mode==='login'?'Sign in to pick up where you left off.':'One account. All your money in one place.'}</p><div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('');setMessage('');}}>Sign in</button><button className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('');setMessage('');}}>Create account</button></div>{error&&<div className="alert" role="alert">{error}</div>}{message&&<div className="success" role="status">{message}</div>}<form onSubmit={submit}><label>Email<input type="email" name="email" required autoComplete="email" placeholder="you@example.com"/></label><label>Password<input type="password" name="password" required minLength={mode==='signup'?8:1} autoComplete={mode==='signup'?'new-password':'current-password'} placeholder={mode==='signup'?'At least 8 characters':'Your password'}/></label><button className="primary full-width" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</button></form><a className="demo-link" href="/?demo=1">Take a look around the demo</a><div className="privacy-note"><Icon name="lock"/><span>Your data belongs to you.<br/>Private, and synced across your devices.</span></div></div><span className="auth-bottom">Simple by design. Personal by nature.</span></section></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
if('serviceWorker' in navigator&&import.meta.env.PROD)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));

