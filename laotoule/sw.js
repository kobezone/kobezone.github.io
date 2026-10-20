const VERSION='laotoule-v4';
const FILES=['./','index.html','style.css','common.js','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png',
'games/2048.html','games/pelican.html','games/snake.html','games/minesweeper.html','games/tetris.html','games/gomoku.html','games/memory.html','games/whack.html','games/zodiac.html','games/tank.html','games/mota.html','games/ninja.html','games/sokoban.html','games/lianliankan.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin)return;
  // 缓存优先，后台更新
  e.respondWith(caches.open(VERSION).then(async c=>{const hit=await c.match(e.request,{ignoreSearch:true});
    const net=fetch(e.request).then(r=>{if(r&&r.ok)c.put(e.request,r.clone());return r}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}const r=await net;if(r)return r;
    if(e.request.mode==='navigate'){return (await c.match('index.html'))||new Response('离线中',{status:503})}return new Response('',{status:504})}))});
