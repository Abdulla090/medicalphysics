/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
declare const self: ServiceWorkerGlobalScope & {__WB_MANIFEST: Array<{url:string;revision:string|null}>};
precacheAndRoute(self.__WB_MANIFEST);
// No skipWaiting on install. The page activates a waiting build only outside an encounter.
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')void self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 // Remove the previous application's unsafe API cache. Never cache authenticated traffic.
 await caches.delete('convex-cache');await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const navigation=event.request.mode==='navigate';
 const practiceRoute=navigation&&['/training','/tools/xray-simulator'].includes(url.pathname)&&!url.searchParams.has('attempt');
 const staticAsset=/^\/(assets|radiography)\/[^?]+\.(js|css|woff2?|glb|ktx2|wasm|png|webp|json)$/.test(url.pathname);
 if(!practiceRoute&&!staticAsset)return;
 event.respondWith((async()=>{
  try {const response=await fetch(event.request);if(response.ok)return response;}catch{/* Explicitly downloaded public practice is the sole fallback. */}
  const keys=(await caches.keys()).filter(k=>k.startsWith('radiography-practice-')).reverse();
  for(const key of keys){const cache=await caches.open(key);if(!await cache.match('/.practice-ready'))continue;const cached=await cache.match(practiceRoute?'/index.html':url.pathname);if(cached)return cached;}
  return new Response('Practice content is not downloaded.',{status:503,headers:{'Content-Type':'text/plain'}});
 })());
});
