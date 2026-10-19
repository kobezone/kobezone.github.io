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
})();
