import {defineConfig,devices} from '@playwright/test';
const phone=devices['iPhone 13'];
export default defineConfig({
 testDir:'./e2e',
 testMatch:'iphone.spec.mjs',
 timeout:120000,
 expect:{timeout:30000},
 workers:2,
 retries:0,
 reporter:[['list'],['html',{open:'never'}]],
 use:{...phone,browserName:'webkit',locale:'en-GB',timezoneId:'Asia/Dhaka',serviceWorkers:'allow',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'local-iPhone-390',use:{baseURL:'http://127.0.0.1:4173',viewport:{width:390,height:844},screen:{width:390,height:844}}},
  {name:'local-iPhone-440',use:{baseURL:'http://127.0.0.1:4173',viewport:{width:440,height:956},screen:{width:440,height:956}}},
  {name:'live-iPhone-440',use:{baseURL:'https://instant-financial-tracker.vercel.app',viewport:{width:440,height:956},screen:{width:440,height:956}}},
  {name:'local-Chromium-PWA',grep:/app shell reloads/,use:{browserName:'chromium',baseURL:'http://127.0.0.1:4173'}},
  {name:'live-Chromium-PWA',grep:/app shell reloads/,use:{browserName:'chromium',baseURL:'https://instant-financial-tracker.vercel.app'}}
 ],
 webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:30000}
});
