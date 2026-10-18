import { readdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist');
const files=['/index.html'];
async function walk(dir){for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){
 const name=dir+'/'+entry.name;if(entry.isDirectory())await walk(name);else if(/\.(js|css|woff2?|glb|ktx2|wasm|png|webp|json)$/.test(name))files.push('/'+name);
}}
await walk('assets');await walk('radiography');
const hash=createHash('sha256');let bytes=0;
for(const name of files){const data=await readFile(path.join(root,name));hash.update(data);bytes+=data.length;}
await writeFile(path.join(root,'practice-manifest.json'),JSON.stringify({version:hash.digest('hex').slice(0,16),bytes,files},null,2));
console.log('Public offline practice:',files.length,'files,',(bytes/1048576).toFixed(2),'MiB. No API responses.');
