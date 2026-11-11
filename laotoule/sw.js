const VERSION='laotoule-v2.19';
const FILES=[
'./','index.html','style.css','common.js','settings.html','changelog.html','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png',
'games/2048.html','games/pelican.html','games/snake.html','games/pacman.html','games/minesweeper.html','games/tetris.html','games/gomoku.html','games/memory.html',
'games/whack.html','games/zodiac.html','games/paint.html','games/drawfish.html','games/catmouse.html','games/doctor.html','games/tank.html','games/mota.html',
'games/ninja.html','games/sokoban.html','games/lianliankan.html','games/bloxblock.html','games/spider.html','games/xiangqi.html','games/xiangqi.engine.js',
'games/sudoku.html','games/sudoku.engine.js','games/24.html','games/tf24.engine.js','games/bigtext.html','games/doudizhu.html','games/doudizhu.engine.js',
'games/klondike.html','games/klondike.engine.js','games/goldminer.html','games/klotski.html','games/klotski.engine.js','games/assets/klotski/caocao.svg',
'games/assets/klotski/guanyu.svg','games/assets/klotski/zhangfei.svg','games/assets/klotski/zhaoyun.svg','games/assets/klotski/machao.svg','games/assets/klotski/huangzhong.svg',
'games/assets/klotski/bing.svg','credits.html','games/vendor/PROVENANCE.json','games/vendor/measure.py','games/vendor/huejumper/LICENSE','games/vendor/huejumper/UPSTREAM.txt',
'games/vendor/huejumper/index.html','games/vendor/invaderz/LICENSE','games/vendor/invaderz/README.md','games/vendor/invaderz/UPSTREAM.txt','games/vendor/invaderz/favicon.png',
'games/vendor/invaderz/index.html','games/vendor/invaderz/manifest.json','games/vendor/invaderz/css/main.css','games/vendor/invaderz/js/Genetics.js',
'games/vendor/invaderz/js/Invader.js','games/vendor/invaderz/js/Player.js','games/vendor/invaderz/js/main.js','games/vendor/isocity/LICENSE','games/vendor/isocity/NOTICE.txt',
'games/vendor/isocity/README.md','games/vendor/isocity/favicon.png','games/vendor/isocity/index.html','games/vendor/isocity/css/main.css','games/vendor/isocity/js/main.js',
'games/vendor/isocity/textures/01_130x66_130x230.png','games/vendor/pong/LICENSE','games/vendor/pong/README.md','games/vendor/pong/UPSTREAM.txt',
'games/vendor/pong/game.js','games/vendor/pong/index.html','games/vendor/pong/pong.css','games/vendor/pong/pong.js','games/vendor/pong/images/press1.png',
'games/vendor/pong/images/press2.png','games/vendor/pong/images/winner.png','games/vendor/pong/sounds/goal.wav','games/vendor/pong/sounds/ping.wav',
'games/vendor/pong/sounds/pong.wav','games/vendor/pong/sounds/wall.wav','games/vendor/sublevel07/LICENSE','games/vendor/sublevel07/UPSTREAM.txt',
'games/vendor/sublevel07/index.html','games/vendor/sublevel07/three/LICENSE','games/vendor/sublevel07/three/build/three.module.js','games/vendor/sublevel07/three/examples/jsm/geometries/RoundedBoxGeometry.js',
'games/vendor/sublevel07/three/examples/jsm/math/SimplexNoise.js','games/vendor/sublevel07/three/examples/jsm/postprocessing/EffectComposer.js',
'games/vendor/sublevel07/three/examples/jsm/postprocessing/GTAOPass.js','games/vendor/sublevel07/three/examples/jsm/postprocessing/MaskPass.js',
'games/vendor/sublevel07/three/examples/jsm/postprocessing/OutputPass.js','games/vendor/sublevel07/three/examples/jsm/postprocessing/Pass.js','games/vendor/sublevel07/three/examples/jsm/postprocessing/ShaderPass.js',
'games/vendor/sublevel07/three/examples/jsm/postprocessing/UnrealBloomPass.js','games/vendor/sublevel07/three/examples/jsm/shaders/CopyShader.js',
'games/vendor/sublevel07/three/examples/jsm/shaders/GTAOShader.js','games/vendor/sublevel07/three/examples/jsm/shaders/LuminosityHighPassShader.js',
'games/vendor/sublevel07/three/examples/jsm/shaders/OutputShader.js','games/vendor/sublevel07/three/examples/jsm/shaders/PoissonDenoiseShader.js',
'games/vendor/sublevel07/three/examples/jsm/utils/BufferGeometryUtils.js','games/vendor/underrun/LICENSE.md','games/vendor/underrun/README.md','games/vendor/underrun/UPSTREAM.txt',
'games/vendor/underrun/index-debug.html','games/vendor/underrun/m/l1.png','games/vendor/underrun/m/l2.png','games/vendor/underrun/m/l3.png','games/vendor/underrun/m/q2.png',
'games/vendor/underrun/source/audio.js','games/vendor/underrun/source/entity-cpu.js','games/vendor/underrun/source/entity-explosion.js','games/vendor/underrun/source/entity-health.js',
'games/vendor/underrun/source/entity-particle.js','games/vendor/underrun/source/entity-plasma.js','games/vendor/underrun/source/entity-player.js',
'games/vendor/underrun/source/entity-sentry.js','games/vendor/underrun/source/entity-spider.js','games/vendor/underrun/source/entity.js','games/vendor/underrun/source/game.js',
'games/vendor/underrun/source/main.js','games/vendor/underrun/source/music-dark-meat-beat.js','games/vendor/underrun/source/random.js','games/vendor/underrun/source/renderer.js',
'games/vendor/underrun/source/sonantx-reduced.js','games/vendor/underrun/source/sound-effects.js','games/vendor/underrun/source/terminal.js','games/sublevel07.html',
'games/isocity.html','games/underrun.html','games/invaderz.html','games/huejumper.html','games/pong.html'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin)return;
  // 缓存优先，后台更新
  e.respondWith(caches.open(VERSION).then(async c=>{const hit=await c.match(e.request,{ignoreSearch:true});
    const net=fetch(e.request).then(r=>{if(r&&r.ok)c.put(e.request,r.clone());return r}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}const r=await net;if(r)return r;
    if(e.request.mode==='navigate'){return (await c.match('index.html'))||new Response('离线中',{status:503})}return new Response('',{status:504})}))});
