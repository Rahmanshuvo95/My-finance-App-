import { defineConfig } from 'vite';
import { copyFileSync } from 'node:fs';
export default defineConfig({plugins:[{name:'pwa-assets',closeBundle(){for(const file of ['manifest.webmanifest','sw.js','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png','favicon-32.png']) copyFileSync(file,`dist/${file}`);}}]});
