import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

export function buildWorker(directory,template){
 const files=[];
 function walk(folder,relative=''){
  for(const entry of readdirSync(folder,{withFileTypes:true})){
   const name=relative+entry.name;
   if(entry.isDirectory())walk(join(folder,entry.name),name+'/');
   else if(name==='index.html'||/\.(js|css|png|svg|webp|avif|ico|webmanifest)$/.test(name)&&name!=='sw.js')files.push(name);
  }
 }
 walk(directory);files.sort();
 if(!files.includes('index.html'))throw Error('Cannot publish a worker without an app shell.');
 const hash=createHash('sha256').update(template);
 for(const file of files)hash.update(file).update(readFileSync(join(directory,file)));
 const version=hash.digest('hex').slice(0,16);
 const urls=files.map(file=>file==='index.html'?'/':'/'+file);
 const output=template.replace('__IFT_VERSION__',version).replace('__IFT_PRECACHE__',JSON.stringify(urls));
 writeFileSync(join(directory,'sw.js'),output);
 return {version,urls};
}
