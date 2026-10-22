// 数独：完整终盘、唯一解题目、冲突检测。
(function(root){
  function mask(g,i){
    let m=0x3fe;
    const r=(i/9)|0,c=i%9,br=r-r%3,bc=c-c%3;
    for(let k=0;k<9;k++){m&=~(1<<g[r*9+k]);m&=~(1<<g[k*9+c])}
    for(let y=0;y<3;y++)for(let x=0;x<3;x++)m&=~(1<<g[(br+y)*9+bc+x]);
    return m;
  }
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;const t=a[i];a[i]=a[j];a[j]=t}return a}
  function findEmpty(g){
    let bi=-1,best=10,bm=0;
    for(let i=0;i<81;i++)if(!g[i]){
      const m=mask(g,i);let c=0;
      for(let d=1;d<=9;d++)if(m&(1<<d))c++;
      if(c<best){best=c;bi=i;bm=m;if(!c)break}
    }
    return {i:bi,m:bm,c:best};
  }
  function countSol(g,limit){
    let n=0;
    function dfs(){
      if(n>=limit)return;
      const e=findEmpty(g);
      if(e.i<0){n++;return}
      if(!e.c)return;
      for(let d=1;d<=9;d++)if(e.m&(1<<d)){
        g[e.i]=d;dfs();g[e.i]=0;
        if(n>=limit)return;
      }
    }
    dfs();
    return n;
  }
  function filled(){
    const g=new Array(81).fill(0);
    function dfs(){
      const e=findEmpty(g);
      if(e.i<0)return true;
      const ds=[];
      for(let d=1;d<=9;d++)if(e.m&(1<<d))ds.push(d);
      shuffle(ds);
      for(const d of ds){g[e.i]=d;if(dfs())return true;g[e.i]=0}
      return false;
    }
    dfs();
    return g;
  }
  function clueTarget(level){
    return {easy:[40,45],medium:[32,36],hard:[28,31],expert:[23,27]}[level]||[32,36];
  }
  function makePuzzle(level){
    const [lo,hi]=clueTarget(level);
    const goal=(lo+hi)>>1;
    let best=null;
    for(let attempt=0;attempt<6;attempt++){
      const sol=filled();
      const g=sol.slice();
      const order=shuffle([...Array(81).keys()]);
      for(const i of order){
        const left=g.reduce((a,v)=>a+(v?1:0),0);
        if(left<=goal)break;
        const old=g[i];
        g[i]=0;
        if(countSol(g,2)!==1)g[i]=old;
      }
      const clues=g.reduce((a,v)=>a+(v?1:0),0);
      const rec={puzzle:g.slice(),solution:sol,clues:clues};
      if(clues>=lo&&clues<=hi)return rec;
      if(!best||Math.abs(clues-goal)<Math.abs(best.clues-goal))best=rec;
    }
    return best;
  }
  function conflicts(g){
    const bad=new Array(81).fill(false);
    function mark(idx){
      const seen=new Array(10).fill(-1);
      for(const i of idx){
        const v=g[i];if(!v)continue;
        if(seen[v]>=0){bad[i]=true;bad[seen[v]]=true}else seen[v]=i;
      }
    }
    for(let r=0;r<9;r++)mark([...Array(9).keys()].map(c=>r*9+c));
    for(let c=0;c<9;c++)mark([...Array(9).keys()].map(r=>r*9+c));
    for(let br=0;br<9;br+=3)for(let bc=0;bc<9;bc+=3){
      const idx=[];
      for(let y=0;y<3;y++)for(let x=0;x<3;x++)idx.push((br+y)*9+bc+x);
      mark(idx);
    }
    return bad;
  }
  function peers(i){
    const r=(i/9)|0,c=i%9,br=r-r%3,bc=c-c%3,s=new Set();
    for(let k=0;k<9;k++){s.add(r*9+k);s.add(k*9+c)}
    for(let y=0;y<3;y++)for(let x=0;x<3;x++)s.add((br+y)*9+bc+x);
    s.delete(i);
    return s;
  }
  root.SUDOKU={mask,countSol,filled,makePuzzle,conflicts,peers,clueTarget};
})(typeof globalThis!=='undefined'?globalThis:this);
