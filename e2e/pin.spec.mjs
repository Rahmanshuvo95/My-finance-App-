import {test,expect} from '@playwright/test';
const USER='6abf01d2-4c45-4c3f-87f9-e4cdbd38c15c';
const SESSION='0c1bf786-96b0-4906-91dd-7b765ec114d4';
const PIN='493827',TOKEN='c'.repeat(64);
async function backend(page,enabled=true){
 let unlocked=false,financialRequests=0;
 const user={id:USER,aud:'authenticated',role:'authenticated',email:'pin-qa@example.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:new Date().toISOString()};
 function session(){const now=Math.floor(Date.now()/1000);const body={sub:USER,role:'authenticated',aud:'authenticated',exp:now+3600,iat:now,session_id:SESSION,amr:[{method:'password',timestamp:now}]};const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(body)).toString('base64url')+'.qa-signature';return {access_token:token,refresh_token:'qa-refresh-token',token_type:'bearer',expires_in:3600,expires_at:now+3600,user};}
 const success=()=>({enabled,locked:false,token:TOKEN,expires_at:new Date(Date.now()+900000).toISOString()});
 await page.route('https://*.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url),data=request.postDataJSON()||{};
  const send=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(url.pathname.startsWith('/auth/v1/token'))return send(session());
  if(url.pathname==='/auth/v1/user')return send(user);
  if(url.pathname.startsWith('/auth/v1/'))return send({});
  const name=url.pathname.split('/').pop();
  const proof=request.headers()['x-ift-unlock']===TOKEN;
  if(name==='ift_pin_status')return send({enabled,locked:enabled&&!(unlocked&&proof),expires_at:new Date(Date.now()+900000).toISOString()});
  if(name==='ift_pin_unlock'){if(data.p_pin!==PIN)return send({error:'invalid_pin'});unlocked=true;return send(success());}
  if(name==='ift_pin_configure'){enabled=data.p_new_pin!==null;unlocked=enabled;return send(success());}
  if(name==='ift_pin_touch')return send(unlocked&&proof?success():{error:'locked'});
  if(name==='ift_pin_lock'||name==='ift_pin_lock_grant'){unlocked=false;return send({enabled,locked:enabled});}
  if(url.pathname.startsWith('/rest/v1/')){
   financialRequests++;
   if(enabled&&!(unlocked&&proof))return send({message:'IFT_PIN_LOCKED',code:'42501'},403);
   if(name==='accounts')return send([{id:'e81ab7b4-5040-4e99-a717-cc67abec1979',user_id:USER,name:'QA Cash',type:'cash',opening_balance:10000,created_at:new Date().toISOString()}]);
   return send([]);
  }
  return send({});
 });
 return {expire(){unlocked=false;},get requests(){return financialRequests;}};
}
async function login(page){await page.goto('/');await page.getByLabel('Email',{exact:true}).fill('pin-qa@example.invalid');await page.getByLabel('Password',{exact:true}).fill('qa-account-password');await page.getByRole('button',{name:'Sign in',exact:true}).last().click();}
async function unlock(page){await page.getByLabel('PIN',{exact:true}).fill(PIN);await page.getByRole('button',{name:'Unlock IFT',exact:true}).click();await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();await expect(page.locator('.net-card h2')).toContainText('10,000.00');}
test.beforeEach(async({},info)=>{test.skip(info.project.name.startsWith('live'),'Authenticated PIN tests use a local production build with a mocked backend, never real user credentials.');});
test('PIN blocks reads, rejects a wrong code, and unlocks with a server proof',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const mock=await backend(page);
 await login(page);await expect(page.getByRole('heading',{name:'Your money is locked',exact:true})).toBeVisible();expect(mock.requests).toBe(0);
 await page.getByLabel('PIN',{exact:true}).fill('111111');await page.getByRole('button',{name:'Unlock IFT',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Incorrect PIN');expect(mock.requests).toBe(0);
 await unlock(page);expect(mock.requests).toBeGreaterThan(0);
 mock.expire();await page.getByRole('button',{name:'Refresh accounts',exact:true}).click();await expect(page.getByRole('heading',{name:'Your money is locked',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('iphone-pin-lock.png'),fullPage:true});expect(errors).toEqual([]);
});
test('PIN idle timeout resets on activity and locks after background suspension',async({page})=>{
 await page.clock.install();await backend(page);await login(page);await unlock(page);
 await page.clock.fastForward(14*60*1000);await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name:'Home',exact:true}).click();
 await page.clock.fastForward(14*60*1000);await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 await page.clock.fastForward(62000);await expect(page.getByRole('heading',{name:'Your money is locked',exact:true})).toBeVisible();
 await unlock(page);
 const future=await page.evaluate(()=>Date.now()+16*60*1000);await page.clock.setSystemTime(new Date(future));
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await expect(page.getByRole('heading',{name:'Your money is locked',exact:true})).toBeVisible();
});
test('PIN setup uses password verification and does not persist the PIN',async({page})=>{
 await backend(page,false);await login(page);await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Open profile menu',exact:true}).click();await page.getByRole('button',{name:/Settings/}).click();
 const settings=page.locator('.pin-settings');await settings.getByRole('button',{name:'Enable PIN lock',exact:true}).click();
 await settings.getByLabel('Account password',{exact:true}).fill('qa-account-password');await settings.getByLabel('New PIN',{exact:true}).fill(PIN);await settings.getByLabel('Confirm PIN',{exact:true}).fill(PIN);
 await settings.getByRole('button',{name:'Save PIN',exact:true}).click();await expect(settings.getByText(/On.*locks after 15 minutes/)).toBeVisible();
 expect(await page.evaluate(pin=>[...Object.values(localStorage),...Object.values(sessionStorage)].some(v=>v.includes(pin)),PIN)).toBe(false);
 await settings.getByRole('button',{name:'Lock now',exact:true}).click();await expect(page.getByRole('heading',{name:'Your money is locked',exact:true})).toBeVisible();
});

