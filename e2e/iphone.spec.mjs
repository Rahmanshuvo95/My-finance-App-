import {test,expect} from '@playwright/test';
async function noOverflow(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
async function shot(page,testInfo,name){await page.screenshot({path:testInfo.outputPath(name+'.png'),fullPage:true});}
const errors=new WeakMap();
test.beforeEach(async({page})=>{const list=[];errors.set(page,list);page.on('pageerror',error=>list.push(error.message));});
test.afterEach(async({page})=>{expect(errors.get(page)||[],'uncaught page errors').toEqual([]);});
test('sign-in opens with readable mobile layout',async({page},info)=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'Good to see you.',exact:true})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Email',exact:true})).toBeVisible();
 await expect(page.locator('#ift-startup')).toBeHidden();
 await noOverflow(page);await shot(page,info,'iphone-sign-in');
});
test('demo loan return and repayment update funds correctly',async({page},info)=>{
 await page.goto('/?demo=1',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 await expect(page.locator('.net-card h2')).toContainText('106,900.00');
 const nav=page.getByRole('navigation',{name:'Mobile navigation'});
 await nav.getByRole('button',{name:'Accounts',exact:true}).click();
 await page.getByRole('button',{name:'Open ledger for Loan Receivable',exact:true}).click();
 await expect(page.locator('.loan-summary h2')).toContainText('12,000.00');
 await noOverflow(page);await shot(page,info,'iphone-receivable');
 await page.getByRole('button',{name:'Record return',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Record return',exact:true});
 await dialog.getByLabel('Person',{exact:true}).selectOption('Rahim');
 await dialog.getByLabel('Amount (BDT)',{exact:true}).fill('1000');
 await dialog.getByRole('button',{name:'Receive into account',exact:true}).click();
 await dialog.getByRole('option',{name:'bKash',exact:true}).click();
 await dialog.getByRole('button',{name:'Save entry',exact:true}).click();
 await expect(dialog).toBeHidden();await expect(page.locator('.loan-summary h2')).toContainText('11,000.00');
 await page.locator('.loan-view .toolbar').getByRole('button',{name:'Accounts',exact:true}).click();
 await page.getByRole('button',{name:'Open ledger for Loan Payable',exact:true}).click();
 await page.getByRole('button',{name:'Repay money',exact:true}).click();
 const repay=page.getByRole('dialog',{name:'Repay money',exact:true});
 await repay.getByLabel('Person',{exact:true}).selectOption('Hasan');
 await repay.getByLabel('Amount (BDT)',{exact:true}).fill('2000');
 await repay.getByRole('button',{name:'Pay from account',exact:true}).click();
 await repay.getByRole('option',{name:'City Bank',exact:true}).click();
 await repay.getByRole('button',{name:'Save entry',exact:true}).click();
 await expect(repay).toBeHidden();await expect(page.locator('.loan-summary h2')).toContainText('13,000.00');
 await noOverflow(page);await shot(page,info,'iphone-payable');
 await nav.getByRole('button',{name:'Home',exact:true}).click();
 await expect(page.locator('.net-card h2')).toContainText('105,900.00');
 await expect(page.locator('.summary-grid')).toContainText('63,000.00');
 await expect(page.locator('.summary-grid')).toContainText('27,400.00');
 await shot(page,info,'iphone-home');
});
test('app shell reloads while offline after a complete initial install',async({page,context,browserName},info)=>{
 test.skip(browserName==='webkit','Playwright service-worker testing is supported only on Chromium. Physical iPhone offline behavior is not certified by this test.');
 await page.goto('/?demo=1',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(async()=>{
  const registration=await navigator.serviceWorker.getRegistration('/');
  const keys=await caches.keys();const current=keys.filter(k=>k.startsWith('ift-static-')).pop();
  return !!registration?.active&&!!navigator.serviceWorker.controller&&!!current&&!!(await (await caches.open(current)).match('/'));
 }),{timeout:90000}).toBe(true);
 await context.setOffline(true);
 try{
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
  await expect(page.getByText(/You are offline. Reconnect to load and save/)).toBeVisible();
  await noOverflow(page);await shot(page,info,'iphone-offline-shell');
 }finally{await context.setOffline(false);}
});
test('repair keeps unrelated saved storage and opens sign-in',async({page},info)=>{
 await page.goto('/recover.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>localStorage.setItem('ift-qa-sentinel','keep'));
 await page.getByRole('button',{name:'Repair and reopen IFT',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Good to see you.',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('ift-qa-sentinel'))).toBe('keep');
 await noOverflow(page);await shot(page,info,'iphone-repaired');
});
