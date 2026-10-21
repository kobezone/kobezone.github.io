// 老头乐游戏厅 公共函数
(function(){
  const KEY='laotoule:';
  window.LTL={
    getBest(id,def){const v=localStorage.getItem(KEY+id);return v===null?(def===undefined?0:def):Number(v)},
    setBest(id,v){localStorage.setItem(KEY+id,String(v))},
    // 记录最高分（higher=true表示越大越好），返回是否破纪录
    record(id,score,higher=true){const b=localStorage.getItem(KEY+id);
      if(b===null||(higher?score>Number(b):score<Number(b))){localStorage.setItem(KEY+id,String(score));return true}return false},
    toast(msg,ms=1800){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
      t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),ms)},
    // 简单音效（无需任何外部文件）
    beep(freq=440,dur=0.08,type='sine',vol=0.08){if(localStorage.getItem(KEY+'mute')==='1')return;try{
      const C=window.__ac||(window.__ac=new (window.AudioContext||window.webkitAudioContext)());
      const o=C.createOscillator(),g=C.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;
      o.connect(g);g.connect(C.destination);o.start();g.gain.exponentialRampToValueAtTime(0.0001,C.currentTime+dur);o.stop(C.currentTime+dur+0.02)}catch(e){}},
    // 滑动手势
    version:'1.7',
    defaults:{nav:'fab',help:false,stats:true,controls:true,dpad:true},
    getSettings(){
      const s={nav:'fab',help:false,stats:true,controls:true,dpad:true};
      try{
        const raw=localStorage.getItem(KEY+'settings');
        if(raw){const o=JSON.parse(raw);
          if(o.nav==='bar'||o.nav==='fab')s.nav=o.nav;
          ['help','stats','controls','dpad'].forEach(k=>{if(typeof o[k]==='boolean')s[k]=o[k]});
          return s}
        if(localStorage.getItem(KEY+'topbar')==='show')s.nav='bar';
      }catch(e){}
      return s},
    saveSettings(s){try{localStorage.setItem(KEY+'settings',JSON.stringify({
      nav:s.nav==='bar'?'bar':'fab', help:!!s.help, stats:!!s.stats, controls:!!s.controls, dpad:!!s.dpad
    }))}catch(e){}},
    onSwipe(el,cb,min=24){let sx,sy,active=false;
      el.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;active=true},{passive:true});
      el.addEventListener('touchmove',e=>{if(active)e.preventDefault()},{passive:false});
      el.addEventListener('touchend',e=>{if(!active)return;active=false;const t=e.changedTouches[0];const dx=t.clientX-sx,dy=t.clientY-sy;
        if(Math.max(Math.abs(dx),Math.abs(dy))<min)return;cb(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'))});
      let mx,my,md=false;el.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){md=true;mx=e.clientX;my=e.clientY}});
      window.addEventListener('pointerup',e=>{if(!md)return;md=false;const dx=e.clientX-mx,dy=e.clientY-my;
        if(Math.max(Math.abs(dx),Math.abs(dy))<min)return;cb(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'))});
    }
  };
  if('serviceWorker' in navigator && location.protocol!=='file:'){
    const base=document.currentScript.src.replace(/common\.js.*$/,'');
    window.addEventListener('load',()=>navigator.serviceWorker.register(base+'sw.js').catch(()=>{}));
  }

  const bar=document.querySelector('.topbar');
  if(!bar) return;
  const listHref=new URL('../index.html', location.href).href;
  const settingsHref=new URL('../settings.html', location.href).href;

  const fab=document.createElement('button');
  fab.type='button'; fab.className='ltl-fab'; fab.textContent='☰';
  fab.setAttribute('aria-label','菜单'); fab.setAttribute('aria-expanded','false');
  const backdrop=document.createElement('div'); backdrop.className='ltl-backdrop'; backdrop.hidden=true;
  const menu=document.createElement('div');
  menu.className='ltl-menu'; menu.hidden=true; menu.setAttribute('role','dialog'); menu.setAttribute('aria-label','菜单');
  const pull=document.createElement('div'); pull.className='ltl-pull'; pull.setAttribute('aria-hidden','true');
  function item(label){const b=document.createElement('button'); b.type='button'; b.className='btn'; b.textContent=label; return b}
  const bList=item('回到游戏列表');
  const bRestart=item('重新开始');
  const bSet=item('设置');
  const bClose=item('关闭');
  menu.append(bList,bRestart,bSet,bClose);
  document.body.append(pull,fab,backdrop,menu);

  function restartButton(){
    for(const id of ['restart','reset','new','go']){
      const el=document.getElementById(id);
      if(el && el.tagName==='BUTTON') return el;
    }
    return null;
  }
  function activate(btn){
    btn.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',isPrimary:true,button:0,buttons:1}));
    btn.click();
    setTimeout(()=>btn.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',isPrimary:true,button:0,buttons:0})),80);
  }
  function applySettings(s){
    const barOn=s.nav==='bar';
    document.body.classList.toggle('ltl-showbar', barOn);
    document.body.classList.toggle('ltl-show-help', !!s.help);
    document.body.classList.toggle('ltl-hide-stats', !s.stats);
    document.body.classList.toggle('ltl-hide-controls', !s.controls);
    document.body.classList.toggle('ltl-hide-dpad', !s.dpad);
    if(!barOn) document.body.classList.remove('ltl-peek');
    const h=barOn ? (Math.round(bar.getBoundingClientRect().height)||64) : 0;
    document.documentElement.style.setProperty('--ltl-chrome', h+'px');
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
  function refreshMirrors(){
    menu.querySelectorAll('[data-mirror]').forEach(n=>n.remove());
    const s=LTL.getSettings();
    const nodes=[];
    bar.querySelectorAll('button').forEach(b=>nodes.push(b));
    if(!s.controls) document.querySelectorAll('.controls button').forEach(b=>nodes.push(b));
    if(!s.dpad) document.querySelectorAll('.dpad button, .tpad button').forEach(b=>nodes.push(b));
    const primary=restartButton();
    const seen=new Set();
    nodes.forEach(btn=>{
      if(btn===primary || btn.closest('.overlay')) return;
      const label=(btn.textContent||'').replace(/\s+/g,' ').trim();
      if(!label || seen.has(label)) return;
      seen.add(label);
      const b=item(label);
      b.dataset.mirror='1';
      b.addEventListener('click',()=>{activate(btn); b.textContent=(btn.textContent||'').replace(/\s+/g,' ').trim()||label; closeMenu()});
      menu.insertBefore(b, bClose);
    });
  }
  function openMenu(){
    bRestart.hidden=!restartButton();
    refreshMirrors();
    menu.hidden=false; backdrop.hidden=false;
    fab.setAttribute('aria-expanded','true');
    bList.focus();
  }
  function closeMenu(){
    menu.hidden=true; backdrop.hidden=true;
    fab.setAttribute('aria-expanded','false');
  }
  fab.addEventListener('click',()=>menu.hidden?openMenu():closeMenu());
  backdrop.addEventListener('click', closeMenu);
  bClose.addEventListener('click', closeMenu);
  bList.addEventListener('click',()=>{location.href=listHref});
  bRestart.addEventListener('click',()=>{const btn=restartButton(); closeMenu(); if(btn) btn.click()});
  bSet.addEventListener('click',()=>{location.href=settingsHref});
  document.querySelectorAll('.help h2').forEach(h=>h.addEventListener('click',()=>{
    const s=LTL.getSettings(); s.help=!s.help; LTL.saveSettings(s); applySettings(s);
  }));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault(); closeMenu(); fab.focus()}});
  applySettings(LTL.getSettings());
  window.addEventListener('pageshow',()=>applySettings(LTL.getSettings()));

  let px=0,py=0,pid=null;
  pull.addEventListener('pointerdown',e=>{pid=e.pointerId; px=e.clientX; py=e.clientY; pull.setPointerCapture(e.pointerId)});
  pull.addEventListener('pointerup',e=>{
    if(e.pointerId!==pid) return; pid=null;
    const dx=e.clientX-px, dy=e.clientY-py;
    if(dy>32 && Math.abs(dy)>Math.abs(dx)) document.body.classList.add('ltl-peek');
  });
  let bsx=0,bsy=0,bdrag=false;
  bar.addEventListener('pointerdown',e=>{if(!document.body.classList.contains('ltl-peek'))return; bdrag=true; bsx=e.clientX; bsy=e.clientY});
  bar.addEventListener('pointerup',e=>{
    if(!bdrag) return; bdrag=false;
    const dx=e.clientX-bsx, dy=e.clientY-bsy;
    if(dy<-28 && Math.abs(dy)>Math.abs(dx)) document.body.classList.remove('ltl-peek');
  });
  document.addEventListener('pointerdown',e=>{
    if(!document.body.classList.contains('ltl-peek')) return;
    if(e.target.closest('.topbar, .ltl-fab, .ltl-menu, .ltl-pull')) return;
    document.body.classList.remove('ltl-peek');
  }, true);

  history.pushState({ltlGame:1}, '');
  window.addEventListener('popstate',()=>{
    if(!menu.hidden){closeMenu(); history.pushState({ltlGame:1}, ''); return}
    location.replace(listHref);
  });
})();
