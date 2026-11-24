import {defineConfig} from 'vite';
import {copyFileSync,readFileSync} from 'node:fs';
import {buildWorker} from './pwa-build.js';
export default defineConfig({
 plugins:[{name:'pwa-assets',closeBundle(){
  for(const file of ['manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png','favicon-32.png'])copyFileSync(file,`dist/${file}`);
  buildWorker('dist',readFileSync('sw.js','utf8'));
 }}]
});
