// 经典纸牌接龙（Klondike）。r：1=A … 13=K。s：0黑桃 1红心 2梅花 3方块。
(function(root){
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
  function shuffle(a,rand){const b=a.map(c=>({...c}));for(let i=b.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));const t=b[i];b[i]=b[j];b[j]=t}return b}
  function fresh(seed,draw){
    const cards=[];
    for(let s=0;s<4;s++)for(let r=1;r<=13;r++)cards.push({r,s,id:s*13+r});
    const deck=shuffle(cards,mulberry32(seed>>>0));
    const tab=Array.from({length:7},()=>[]);
    let k=0;
    for(let col=0;col<7;col++)for(let i=0;i<=col;i++)tab[col].push({...deck[k++],up:i===col});
    return {draw:draw===3?3:1,tab,stock:deck.slice(k).map(c=>({...c,up:false})),waste:[],found:[[],[],[],[]],moves:0,seed:seed>>>0};
  }
  const red=c=>c.s%2===1;
  const top=a=>a.length?a[a.length-1]:null;
  function canFound(card,pile){if(!pile.length)return card.r===1;const t=top(pile);return t.s===card.s&&t.r+1===card.r}
  function canTab(card,col){if(!col.length)return card.r===13;const t=top(col);return !!(t&&t.up&&t.r===card.r+1&&red(t)!==red(card))}
  function seqOk(col,index){
    if(index<0||index>=col.length||!col[index].up)return false;
    for(let i=index;i<col.length-1;i++){
      const a=col[i],b=col[i+1];
      if(!b.up||a.r!==b.r+1||red(a)===red(b))return false;
    }
    return true;
  }
  function flip(col){const t=top(col);if(t&&!t.up)t.up=true}
  function drawCard(st){
    if(!st.stock.length){
      if(!st.waste.length)return false;
      st.stock=st.waste.reverse().map(c=>({...c,up:false}));
      st.waste=[];
      return true;
    }
    const n=Math.min(st.draw,st.stock.length);
    for(let i=0;i<n;i++)st.waste.push({...st.stock.pop(),up:true});
    return true;
  }
  function apply(st,mv){
    if(!mv)return false;
    if(mv.t==='draw')return drawCard(st);
    if(mv.t==='w-f'){
      const c=top(st.waste);if(!c||!canFound(c,st.found[c.s]))return false;
      st.found[c.s].push(st.waste.pop());return true;
    }
    if(mv.t==='w-t'){
      const c=top(st.waste);if(!c||!canTab(c,st.tab[mv.to]))return false;
      st.tab[mv.to].push(st.waste.pop());return true;
    }
    if(mv.t==='t-f'){
      const col=st.tab[mv.col];const c=top(col);if(!c||!c.up||!canFound(c,st.found[c.s]))return false;
      st.found[c.s].push(col.pop());flip(col);return true;
    }
    if(mv.t==='t-t'){
      const from=st.tab[mv.from],to=st.tab[mv.to];
      if(mv.from===mv.to||!seqOk(from,mv.index)||!canTab(from[mv.index],to))return false;
      to.push(...from.splice(mv.index));flip(from);return true;
    }
    if(mv.t==='f-t'){
      const pile=st.found[mv.suit];const c=top(pile);if(!c||!canTab(c,st.tab[mv.to]))return false;
      st.tab[mv.to].push(pile.pop());return true;
    }
    return false;
  }
  function hint(st){
    const w=top(st.waste);
    if(w&&canFound(w,st.found[w.s]))return {t:'w-f'};
    for(let col=0;col<7;col++){const c=top(st.tab[col]);if(c&&c.up&&canFound(c,st.found[c.s]))return {t:'t-f',col}}
    if(w)for(let to=0;to<7;to++)if(canTab(w,st.tab[to]))return {t:'w-t',to};
    for(let from=0;from<7;from++){
      const col=st.tab[from];
      for(let index=0;index<col.length;index++){
        if(!seqOk(col,index)||index===0||col[index-1].up)continue;
        for(let to=0;to<7;to++)if(to!==from&&canTab(col[index],st.tab[to]))return {t:'t-t',from,index,to};
      }
    }
    for(let from=0;from<7;from++){
      const col=st.tab[from];
      for(let index=0;index<col.length;index++){
        if(!seqOk(col,index))continue;
        for(let to=0;to<7;to++){
          if(to===from||!canTab(col[index],st.tab[to]))continue;
          if(index===0&&!st.tab[to].length)continue;
          return {t:'t-t',from,index,to};
        }
      }
    }
    if(st.stock.length||st.waste.length>1||(st.waste.length&&st.stock.length))return {t:'draw'};
    if(!st.stock.length&&st.waste.length)return {t:'draw'};
    return null;
  }
  function won(st){return st.found.every(p=>p.length===13)}
  function clone(st){return JSON.parse(JSON.stringify(st))}
  root.KLON={fresh,apply,hint,won,clone,canFound,canTab,seqOk};
})(typeof globalThis!=='undefined'?globalThis:this);
