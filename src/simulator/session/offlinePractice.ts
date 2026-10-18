/** Cache only the public static practice bundle. Authenticated API responses never enter this cache. */
export async function isPracticeAvailableOffline(){
  if(!('caches' in window))return false;
  try{for(const name of await caches.keys())if(name.startsWith('radiography-practice-')&&await(await caches.open(name)).match('/.practice-ready'))return true;}catch{/* Storage may be blocked. */}
  return false;
}
export async function downloadPractice(onProgress?:(done:number,total:number)=>void) {
  if(!('caches' in window)||!('serviceWorker' in navigator))throw new Error('Offline storage unavailable');
  const response=await fetch('/practice-manifest.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Build the practice bundle before downloading');
  const manifest=await response.json() as {version:string;files:string[]};
  if(!/^[a-f0-9]{16}$/.test(manifest.version)||!Array.isArray(manifest.files)||manifest.files.some(p=>typeof p!=='string'))throw new Error('Invalid practice manifest');
  const urls=manifest.files.filter(path=>!path.includes('..')&&(path==='/index.html'||/^\/(assets|radiography)\/[\w./-]+\.(js|css|woff2?|glb|ktx2|wasm|png|webp|json)$/.test(path)));
  if(urls.length!==manifest.files.length)throw new Error('Invalid practice manifest');
  const cache=await caches.open('radiography-practice-'+manifest.version);
  let cursor=0,done=0;onProgress?.(0,urls.length);
  const results=await Promise.allSettled(Array.from({length:4},async()=>{
    while(cursor<urls.length){
      const url=urls[cursor++],response=await fetch(url,{credentials:'omit'});
      if(!response.ok)throw new Error('Practice download incomplete');
      await cache.put(url,response);onProgress?.(++done,urls.length);
    }
  }));
  if(results.some(r=>r.status==='rejected'))throw new Error('Practice download incomplete');
  await cache.put('/.practice-ready',new Response(manifest.version));
  // Cache Storage is authoritative; localStorage can be disabled independently.
  try{localStorage.setItem('radiography-offline',manifest.version);}catch{/* Optional hint. */}
}
