import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test.beforeEach(async({page},info)=>{
 test.skip(info.project.name.startsWith('live'),'New motion and sound behavior is checked on the local production build before deployment.');
 await page.addInitScript(()=>{
  window.__motionQA={started:0,pending:0,frequencies:[],errors:[]};
  addEventListener('error',e=>window.__motionQA.errors.push(e.message));
  if(document.startViewTransition){const original=document.startViewTransition.bind(document);document.startViewTransition=update=>{window.__motionQA.started++;window.__motionQA.pending++;const t=original(update);const done=()=>window.__motionQA.pending--;t.finished.then(done,done);return t;};}
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(Audio){const create=Audio.prototype.createOscillator;Audio.prototype.createOscillator=function(){const osc=create.call(this),set=osc.frequency.setValueAtTime.bind(osc.frequency);osc.frequency.setValueAtTime=(f,t)=>{window.__motionQA.frequencies.push(f);return set(f,t);};return osc;};}
 });
});
const nav=page=>page.getByRole('navigation',{name:'Mobile navigation'});
async function view(page,name){await nav(page).getByRole('button',{name,exact:true}).click();await expect(page.locator('main.main')).toHaveAttribute('data-view',name.toLowerCase());await page.waitForFunction(()=>window.__motionQA.pending===0);}
async function settings(page){await page.getByRole('button',{name:'Open profile menu',exact:true}).click();await page.getByRole('button',{name:/App Settings/}).click();await expect(page.locator('main.main')).toHaveAttribute('data-view','settings');await page.waitForFunction(()=>window.__motionQA.pending===0);}
async function successCount(page){return page.evaluate(()=>window.__motionQA.frequencies.filter(f=>Math.abs(f-1046.5)<.1).length);}
test('pages, account drill-in and return animate without losing navigation',async({page},info)=>{
 await page.goto('/?demo=1');await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 await view(page,'Accounts');await page.getByRole('button',{name:'Open ledger for City Bank',exact:true}).click();
 await expect(page.locator('main.main')).toHaveAttribute('data-view','ledger');await page.waitForFunction(()=>window.__motionQA.pending===0);
 expect(await page.evaluate(()=>document.documentElement.dataset.iftNavigation)).toBe('forward');
 await page.locator('.ledger-view .toolbar').getByRole('button',{name:'Accounts',exact:true}).click();await expect(page.locator('main.main')).toHaveAttribute('data-view','accounts');await page.waitForFunction(()=>window.__motionQA.pending===0);
 expect(await page.evaluate(()=>document.documentElement.dataset.iftNavigation)).toBe('back');await view(page,'Activity');await view(page,'Home');
 expect(await page.evaluate(()=>window.__motionQA.started)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('ios-home.png'),fullPage:true});expect(await page.evaluate(()=>window.__motionQA.errors)).toEqual([]);
});
test('every saved transaction chimes once; rejected input and mute stay quiet',async({page},info)=>{
 await page.goto('/?demo=1');await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 for(const type of ['Expense','Income','Transfer']){
  const before=await successCount(page);await page.getByRole('button',{name:'Add a transaction',exact:true}).click();await page.getByRole('menuitem',{name:type,exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'New '+type.toLowerCase(),exact:true});await expect(dialog).toBeVisible();
  await expect.poll(()=>dialog.evaluate(e=>e.getBoundingClientRect().bottom)).toBeGreaterThan(800);
  await dialog.getByLabel('Amount (BDT)',{exact:true}).fill('125');
  if(type==='Transfer'){
   // Same-account transfer is rejected without a success tone.
   await dialog.getByRole('button',{name:'To account',exact:true}).click();await dialog.getByRole('option',{name:'Everyday cash',exact:true}).click();await dialog.getByRole('button',{name:'Save transfer',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();expect(await successCount(page)).toBe(before);
   await dialog.getByRole('button',{name:'To account',exact:true}).click();await dialog.getByRole('option',{name:'City Bank',exact:true}).click();
  }else await dialog.getByLabel(type==='Expense'?'Expense category':'Income source',{exact:true}).fill('Motion QA');
  if(type==='Expense')await page.screenshot({path:info.outputPath('ios-transaction-sheet.png'),fullPage:true});
  await dialog.getByRole('button',{name:'Save '+type.toLowerCase(),exact:true}).click();await expect(dialog).toBeHidden();await expect.poll(()=>successCount(page)).toBe(before+1);
 }
 await settings(page);const toggle=page.getByRole('switch');await toggle.click();await expect(toggle).toHaveAttribute('aria-checked','false');
 await view(page,'Home');const count=await successCount(page);await page.getByRole('button',{name:'Add a transaction',exact:true}).click();await page.getByRole('menuitem',{name:'Expense',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'New expense',exact:true});await dialog.getByLabel('Amount (BDT)',{exact:true}).fill('1');await dialog.getByLabel('Expense category',{exact:true}).fill('Muted QA');await dialog.getByRole('button',{name:'Save expense',exact:true}).click();await expect(dialog).toBeHidden();expect(await successCount(page)).toBe(count);
 expect(await page.evaluate(()=>window.__motionQA.errors)).toEqual([]);
});
test('reduced motion and browsers without native transitions remain usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?demo=1');await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();await view(page,'Accounts');expect(await page.evaluate(()=>window.__motionQA.started)).toBe(0);
 await page.getByRole('button',{name:'Add account',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCSS('animation-name','none');await page.getByRole('button',{name:'Close dialog',exact:true}).click();await expect(page.getByRole('dialog')).toBeHidden();
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>document.startViewTransition=undefined);await view(page,'Activity');await expect(page.locator('main.main')).toHaveAttribute('data-motion','fallback');await expect(page.locator('main.main')).toHaveCSS('opacity','1');
 expect(await page.evaluate(()=>window.__motionQA.errors)).toEqual([]);
});
