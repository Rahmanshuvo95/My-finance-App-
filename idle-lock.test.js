import test from 'node:test';
import assert from 'node:assert/strict';
import {createIdleLock,IDLE_MS} from './idle-lock.js';
import {createPinFetch,setPinToken} from './pin-session.js';
function fixture(start=0,last=0){let time=start,callback,locks=0,disposed=0;const clock=createIdleLock({now:()=>time,lastActivity:last,schedule:fn=>{callback=fn;return 1;},cancel:()=>disposed++,onLock:()=>locks++});return {clock,set:t=>time=t,fire:()=>callback(),get locks(){return locks;},get disposed(){return disposed;}};}
test('locks at fifteen minutes, never early',()=>{const f=fixture();f.set(IDLE_MS-1);assert.equal(f.clock.check(),false);f.set(IDLE_MS);f.fire();assert.equal(f.locks,1);f.fire();assert.equal(f.locks,1);});
test('trusted activity extends the idle window',()=>{const f=fixture();f.set(IDLE_MS-1000);assert.equal(f.clock.activity(),true);f.set(IDLE_MS+1000);assert.equal(f.clock.check(),false);f.set(2*IDLE_MS-1000);assert.equal(f.clock.check(),true);});
test('resuming after a suspended timer still locks before activity can reset it',()=>{const f=fixture();f.set(IDLE_MS+60000);assert.equal(f.clock.activity(),false);assert.equal(f.locks,1);assert.equal(f.clock.lastActivity,0);});
test('restoring an expired tab locks immediately and cleanup cancels timers',()=>{const f=fixture(IDLE_MS+1,0);assert.equal(f.locks,1);const n=f.disposed;f.clock.dispose();assert.equal(f.disposed,n+1);});
test('unlock proof is attached only to this Supabase REST origin',async()=>{
 const calls=[];const request=createPinFetch('https://db.example',async(input,options)=>{calls.push(options.headers);return new Response('{}');});setPinToken('a'.repeat(64));
 await request('https://db.example/rest/v1/accounts',{headers:{Authorization:'Bearer test'}});assert.equal(calls[0].get('x-ift-unlock'),'a'.repeat(64));assert.equal(calls[0].get('Authorization'),'Bearer test');
 await request('https://other.example/rest/v1/accounts');await request('https://db.example/auth/v1/token');assert.equal(calls[1].has('x-ift-unlock'),false);assert.equal(calls[2].has('x-ift-unlock'),false);setPinToken('');
});
test('server expiry dispatches a lock event and does not consume the response',async()=>{
 let expired=0;const previous=globalThis.window;globalThis.window={dispatchEvent:e=>{if(e.type==='ift:pin-expired')expired++;}};
 try{const request=createPinFetch('https://db.example',async()=>new Response(JSON.stringify({message:'IFT_PIN_LOCKED'}),{status:403}));const r=await request('https://db.example/rest/v1/accounts');assert.equal(expired,1);assert.equal((await r.json()).message,'IFT_PIN_LOCKED');}finally{globalThis.window=previous;}
});
