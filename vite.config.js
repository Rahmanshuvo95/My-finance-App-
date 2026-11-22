import { defineConfig } from 'vite';
import { copyFileSync } from 'node:fs';
export default defineConfig({plugins:[{name:'pwa-assets',closeBundle(){for(const file of ['manifest.webmanifest','sw.js','icon.svg']) copyFileSync(file,`dist/${file}`);}}]});
