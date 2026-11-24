import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildWorker} from './pwa-build.js';
const template=readFileSync(new URL('./sw.js',import.meta.url),'utf8');
function environment(fetch,initial={}){
 const handlers={},stores=new Map(Object.entries(initial).map(([key,rows])=>[key,new Map(Object.entries(rows))]));
 const caches={keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key),open:async key=>{
  if(!stores.has(key))stores.set(key,new Map());const rows=stores.get(key);
  return {match:async path=>rows.get(path)||null,addAll:async()=>{}};
 }};
 const code=template.replace('__IFT_VERSION__','new').replace('__IFT_PRECACHE__',JSON.stringify(['/','/assets/new.js']));
 const context=vm.createContext({self:{location:{origin:'https://ift.example'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},fetch,caches,Request,Response,URL,AbortController,Set,setTimeout,clearTimeout});
 vm.runInContext(code,context);return {handlers,context,stores};
}
test('cached app shell opens without making a network request',async()=>{
 const {context}=environment(()=>assert.fail('must not depend on network'),{'ift-static-new':{'/':new Response('static shell')}});
 context.request=new Request('https://ift.example/?demo=1');const r=await vm.runInContext('shell(request)',context);assert.equal(await r.text(),'static shell');
});
test('current and previous version JS remain available offline',async()=>{
 const {context}=environment(()=>assert.fail('no network'),{'ift-static-old':{'/assets/old.js':new Response('old bundle')},'ift-static-new':{'/assets/new.js':new Response('new bundle')}});
 for(const version of ['old','new']){context.path='/assets/'+version+'.js';assert.equal(await (await vm.runInContext('cachedPath(path)',context)).text(),version+' bundle');}
});
test('Supabase, arbitrary API calls and profile pictures are not intercepted',()=>{
 const {handlers}=environment(()=>assert.fail());
 for(const url of ['https://db.example/rest/v1/accounts','https://ift.example/api/accounts','https://ift.example/profile/avatar.jpg','https://ift.example/recover.html'])handlers.fetch({request:{method:'GET',url,mode:'cors'},respondWith:()=>assert.fail('private/runtime URL intercepted')});
 handlers.fetch({request:{method:'POST',url:'https://ift.example/',mode:'navigate'},respondWith:()=>assert.fail('write intercepted')});
});
test('worker activation retains previous build and removes only owned obsolete caches',async()=>{
 const {handlers,stores}=environment(null,{'ift-static-ancient':{},'ift-static-old':{},'ift-static-new':{},'ift-shell-v3-recovery':{},'unrelated':{}});let done;
 handlers.activate({waitUntil:p=>done=p});await done;assert.deepEqual([...stores.keys()],['ift-static-old','ift-static-new','unrelated']);
});
test('uncached first launch fails with a visible noncached connection page',async()=>{
 const {context}=environment(async()=>{throw Error('offline');});context.request=new Request('https://ift.example/');const r=await vm.runInContext('shell(request)',context);assert.equal(r.status,503);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.match(await r.text(),/first time/);
});
test('build manifest includes full public shell and immutable chunks, excludes recovery and source files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ift-pwa-test-'));
 try{mkdirSync(join(dir,'assets'));writeFileSync(join(dir,'index.html'),'<div id="root"></div>');writeFileSync(join(dir,'assets','app.js'),'bundle');writeFileSync(join(dir,'assets','app.css'),'styles');writeFileSync(join(dir,'recover.html'),'repair');writeFileSync(join(dir,'private.json'),'do not cache');
  const first=buildWorker(dir,template);assert.deepEqual(first.urls,['/assets/app.css','/assets/app.js','/']);assert.ok(!readFileSync(join(dir,'sw.js'),'utf8').includes('__IFT_PRECACHE__'));
  writeFileSync(join(dir,'assets','app.js'),'updated bundle');assert.notEqual(buildWorker(dir,template).version,first.version);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('incomplete app cache install never replaces the previous working worker',async()=>{
 let skipped=false;const handlers={};const code=template.replace('__IFT_VERSION__','broken').replace('__IFT_PRECACHE__','["/","/assets/new.js"]');let deleted=false;
 const context=vm.createContext({self:{addEventListener:(n,f)=>handlers[n]=f,skipWaiting:async()=>skipped=true},caches:{open:async()=>({addAll:async()=>{throw Error('download failed');}}),delete:async()=>deleted=true},Set,Request:class{constructor(){} }});
 vm.runInContext(code,context);let done;handlers.install({waitUntil:p=>done=p});await assert.rejects(done);assert.equal(skipped,false);assert.equal(deleted,true);
});
