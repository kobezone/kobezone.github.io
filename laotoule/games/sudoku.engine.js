// 数独：9×9 随机唯一解，4×4 与 6×6（2×3 宫）各 10 道固定关。
(function(root){
  const PACKS={"4":[{"puzzle":[1,0,0,2,0,0,4,1,3,0,0,0,4,2,1,0],"solution":[1,4,3,2,2,3,4,1,3,1,2,4,4,2,1,3]},{"puzzle":[0,4,1,0,3,0,0,4,0,2,0,1,0,3,0,2],"solution":[2,4,1,3,3,1,2,4,4,2,3,1,1,3,4,2]},{"puzzle":[4,0,0,0,1,2,4,0,2,0,3,0,0,0,1,2],"solution":[4,3,2,1,1,2,4,3,2,1,3,4,3,4,1,2]},{"puzzle":[2,0,4,3,0,0,0,2,1,0,2,4,0,0,0,0],"solution":[2,1,4,3,3,4,1,2,1,3,2,4,4,2,3,1]},{"puzzle":[2,1,0,0,0,0,2,0,3,0,1,0,0,2,3,0],"solution":[2,1,4,3,4,3,2,1,3,4,1,2,1,2,3,4]},{"puzzle":[0,2,3,0,1,0,0,0,3,0,1,0,0,0,0,3],"solution":[4,2,3,1,1,3,2,4,3,4,1,2,2,1,4,3]},{"puzzle":[2,0,4,0,0,1,0,0,0,2,0,0,0,0,3,2],"solution":[2,3,4,1,4,1,2,3,3,2,1,4,1,4,3,2]},{"puzzle":[0,0,3,0,0,3,0,4,0,1,0,0,0,4,0,2],"solution":[4,2,3,1,1,3,2,4,2,1,4,3,3,4,1,2]},{"puzzle":[0,0,0,4,0,3,1,0,0,0,0,1,0,1,0,0],"solution":[1,2,3,4,4,3,1,2,3,4,2,1,2,1,4,3]},{"puzzle":[0,0,0,0,0,0,0,4,4,0,0,3,3,0,0,2],"solution":[2,4,3,1,1,3,2,4,4,2,1,3,3,1,4,2]}],"6":[{"puzzle":[5,0,2,1,4,0,0,4,6,5,2,0,0,5,4,2,0,1,3,2,0,6,0,0,2,1,3,4,0,5,0,0,5,3,0,0],"solution":[5,3,2,1,4,6,1,4,6,5,2,3,6,5,4,2,3,1,3,2,1,6,5,4,2,1,3,4,6,5,4,6,5,3,1,2]},{"puzzle":[1,2,3,6,4,0,6,0,0,3,1,2,0,1,0,0,2,4,5,0,0,0,0,0,0,0,1,2,5,0,0,6,5,4,0,1],"solution":[1,2,3,6,4,5,6,5,4,3,1,2,3,1,6,5,2,4,5,4,2,1,6,3,4,3,1,2,5,6,2,6,5,4,3,1]},{"puzzle":[5,0,0,3,4,6,0,0,0,0,2,5,2,5,0,6,0,4,0,0,3,2,0,0,3,0,5,0,1,0,1,0,0,0,6,3],"solution":[5,1,2,3,4,6,4,3,6,1,2,5,2,5,1,6,3,4,6,4,3,2,5,1,3,6,5,4,1,2,1,2,4,5,6,3]},{"puzzle":[4,5,6,0,0,0,0,0,0,5,0,4,0,6,2,0,1,3,3,1,0,0,0,0,0,0,3,6,0,5,0,0,5,3,2,1],"solution":[4,5,6,1,3,2,2,3,1,5,6,4,5,6,2,4,1,3,3,1,4,2,5,6,1,2,3,6,4,5,6,4,5,3,2,1]},{"puzzle":[0,1,5,0,0,6,0,0,0,4,0,0,5,0,1,0,0,0,3,4,0,1,0,5,0,3,4,0,1,2,1,0,0,0,4,0],"solution":[4,1,5,2,3,6,2,6,3,4,5,1,5,2,1,3,6,4,3,4,6,1,2,5,6,3,4,5,1,2,1,5,2,6,4,3]},{"puzzle":[0,0,4,0,3,5,0,2,3,6,0,0,0,0,0,1,2,3,3,0,0,0,5,6,0,0,0,0,6,0,6,0,0,5,4,0],"solution":[1,6,4,2,3,5,5,2,3,6,1,4,4,5,6,1,2,3,3,1,2,4,5,6,2,4,5,3,6,1,6,3,1,5,4,2]},{"puzzle":[6,0,3,0,0,5,0,4,5,0,6,0,5,0,1,0,0,0,0,6,0,0,0,1,2,5,0,3,0,6,0,0,0,0,0,0],"solution":[6,2,3,1,4,5,1,4,5,2,6,3,5,3,1,6,2,4,4,6,2,5,3,1,2,5,4,3,1,6,3,1,6,4,5,2]},{"puzzle":[0,0,0,1,5,0,0,5,0,0,2,0,0,3,5,6,0,0,4,6,0,5,0,0,6,0,0,0,0,5,0,4,2,0,0,0],"solution":[3,2,4,1,5,6,1,5,6,4,2,3,2,3,5,6,1,4,4,6,1,5,3,2,6,1,3,2,4,5,5,4,2,3,6,1]},{"puzzle":[4,2,0,1,0,0,0,6,0,0,0,0,2,1,0,0,0,0,5,0,3,0,0,1,0,0,0,5,6,0,0,0,0,0,0,4],"solution":[4,2,5,1,3,6,3,6,1,2,4,5,2,1,6,4,5,3,5,4,3,6,2,1,1,3,4,5,6,2,6,5,2,3,1,4]},{"puzzle":[0,0,0,5,3,0,0,6,0,2,4,0,0,0,0,1,0,0,0,1,3,0,0,5,0,0,0,0,0,0,6,0,0,0,5,4],"solution":[1,4,2,5,3,6,3,6,5,2,4,1,4,5,6,1,2,3,2,1,3,4,6,5,5,3,4,6,1,2,6,2,1,3,5,4]}]};
  function specOf(n){return n===4?{n:4,br:2,bc:2}:n===6?{n:6,br:2,bc:3}:{n:9,br:3,bc:3}}
  function mask(g,i,n=9,br=3,bc=3){
    let m=(1<<(n+1))-2;
    const r=(i/n)|0,c=i%n,y0=r-r%br,x0=c-c%bc;
    for(let k=0;k<n;k++){m&=~(1<<g[r*n+k]);m&=~(1<<g[k*n+c])}
    for(let y=0;y<br;y++)for(let x=0;x<bc;x++)m&=~(1<<g[(y0+y)*n+x0+x]);
    return m;
  }
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;const t=a[i];a[i]=a[j];a[j]=t}return a}
  function findEmpty(g,n,br,bc){
    let bi=-1,best=99,bm=0;
    for(let i=0;i<n*n;i++)if(!g[i]){
      const m=mask(g,i,n,br,bc);let c=0;
      for(let d=1;d<=n;d++)if(m&(1<<d))c++;
      if(c<best){best=c;bi=i;bm=m;if(!c)break}
    }
    return {i:bi,m:bm,c:best};
  }
  function countSol(g,limit,n=9,br=3,bc=3){
    let cnt=0;
    function dfs(){
      if(cnt>=limit)return;
      const e=findEmpty(g,n,br,bc);
      if(e.i<0){cnt++;return}
      if(!e.c)return;
      for(let d=1;d<=n;d++)if(e.m&(1<<d)){g[e.i]=d;dfs();g[e.i]=0;if(cnt>=limit)return}
    }
    dfs();
    return cnt;
  }
  function filled(){
    const g=new Array(81).fill(0);
    function dfs(){
      const e=findEmpty(g,9,3,3);
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
  function clueTarget(level){return {easy:[40,45],medium:[32,36],hard:[28,31],expert:[23,27]}[level]||[32,36]}
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
        const old=g[i];g[i]=0;
        if(countSol(g,2)!==1)g[i]=old;
      }
      const clues=g.reduce((a,v)=>a+(v?1:0),0);
      const rec={puzzle:g.slice(),solution:sol,clues};
      if(clues>=lo&&clues<=hi)return rec;
      if(!best||Math.abs(clues-goal)<Math.abs(best.clues-goal))best=rec;
    }
    return best;
  }
  function conflicts(g,n=9,br=3,bc=3){
    const bad=new Array(n*n).fill(false);
    function mark(idx){
      const seen=new Array(n+1).fill(-1);
      for(const i of idx){
        const v=g[i];if(!v)continue;
        if(seen[v]>=0){bad[i]=true;bad[seen[v]]=true}else seen[v]=i;
      }
    }
    for(let r=0;r<n;r++)mark([...Array(n).keys()].map(c=>r*n+c));
    for(let c=0;c<n;c++)mark([...Array(n).keys()].map(r=>r*n+c));
    for(let br0=0;br0<n;br0+=br)for(let bc0=0;bc0<n;bc0+=bc){
      const idx=[];
      for(let y=0;y<br;y++)for(let x=0;x<bc;x++)idx.push((br0+y)*n+bc0+x);
      mark(idx);
    }
    return bad;
  }
  function peers(i,n=9,br=3,bc=3){
    const r=(i/n)|0,c=i%n,y0=r-r%br,x0=c-c%bc,s=new Set();
    for(let k=0;k<n;k++){s.add(r*n+k);s.add(k*n+c)}
    for(let y=0;y<br;y++)for(let x=0;x<bc;x++)s.add((y0+y)*n+x0+x);
    s.delete(i);
    return s;
  }
  function level(size,index){
    const pack=PACKS[String(size)];
    const item=pack[Math.max(0,Math.min(pack.length-1,index|0))];
    return {puzzle:item.puzzle.slice(),solution:item.solution.slice()};
  }
  root.SUDOKU={mask,countSol,filled,makePuzzle,conflicts,peers,clueTarget,specOf,level,PACKS};
})(typeof globalThis!=='undefined'?globalThis:this);
