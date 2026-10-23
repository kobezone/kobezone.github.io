// 华容道。经典「横刀立马」，曹操 2×2 走到出口即胜。
(function(root){
  function piece(id,name,img,w,h,x,y,kind){return {id,name,img,w,h,x,y,kind}}
  const LAYOUTS=[
    {id:'classic',name:'横刀立马',pieces:[
      piece('cao','曹操','caocao.svg',2,2,1,0,'cao'),
      piece('zhang','张飞','zhangfei.svg',1,2,0,0,'gen'),
      piece('zhao','赵云','zhaoyun.svg',1,2,3,0,'gen'),
      piece('ma','马超','machao.svg',1,2,0,2,'gen'),
      piece('guan','关羽','guanyu.svg',2,1,1,2,'wide'),
      piece('huang','黄忠','huangzhong.svg',1,2,3,2,'gen'),
      piece('b1','兵','bing.svg',1,1,1,3,'bing'),
      piece('b2','兵','bing.svg',1,1,2,3,'bing'),
      piece('b3','兵','bing.svg',1,1,0,4,'bing'),
      piece('b4','兵','bing.svg',1,1,3,4,'bing')
    ]},
    {id:'easy',name:'近在咫尺',pieces:[
      piece('cao','曹操','caocao.svg',2,2,1,2,'cao'),
      piece('zhang','张飞','zhangfei.svg',1,2,0,0,'gen'),
      piece('zhao','赵云','zhaoyun.svg',1,2,3,0,'gen'),
      piece('ma','马超','machao.svg',1,2,0,2,'gen'),
      piece('guan','关羽','guanyu.svg',2,1,1,0,'wide'),
      piece('huang','黄忠','huangzhong.svg',1,2,3,2,'gen'),
      piece('b1','兵','bing.svg',1,1,1,1,'bing'),
      piece('b2','兵','bing.svg',1,1,2,1,'bing'),
      piece('b3','兵','bing.svg',1,1,0,4,'bing'),
      piece('b4','兵','bing.svg',1,1,3,4,'bing')
    ]}
  ];
  function clone(pieces){return pieces.map(p=>({...p}))}
  function grid(pieces){
    const g=Array.from({length:5},()=>Array(4).fill(null));
    for(const p of pieces)for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++)g[p.y+y][p.x+x]=p.id;
    return g;
  }
  function tryMove(pieces,id,dx,dy){
    const p=pieces.find(q=>q.id===id);
    if(!p||(dx&&dy)||(!dx&&!dy))return null;
    const steps=Math.abs(dx||dy),sx=Math.sign(dx),sy=Math.sign(dy);
    const nx=p.x+dx,ny=p.y+dy;
    if(nx<0||ny<0||nx+p.w>4||ny+p.h>5)return null;
    const g=grid(pieces);
    for(let i=1;i<=steps;i++){
      const x0=p.x+sx*i,y0=p.y+sy*i;
      for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){
        const occ=g[y0+y][x0+x];
        if(occ&&occ!==id)return null;
      }
    }
    return pieces.map(q=>q.id===id?{...q,x:nx,y:ny}:q);
  }
  function won(pieces){const c=pieces.find(p=>p.id==='cao');return !!(c&&c.x===1&&c.y===3)}
  function key(pieces){
    const g=Array.from({length:5},()=>Array(4).fill('.'));
    for(const p of pieces){
      const ch=p.kind==='cao'?'C':p.kind==='wide'?'W':p.kind==='bing'?'B':'G';
      for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++)g[p.y+y][p.x+x]=ch;
    }
    return g.map(r=>r.join('')).join('/');
  }
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  function hint(pieces){
    const start=clone(pieces);
    const sk=key(start);
    if(won(start))return null;
    const q=[start];
    const prev=new Map();
    prev.set(sk,null);
    let head=0;
    while(head<q.length){
      const cur=q[head++];
      const ck=key(cur);
      if(won(cur)){
        let step=prev.get(ck),first=step,guard=0;
        while(step&&step.parent!==sk&&guard++<200){
          step=prev.get(step.parent);
          if(step)first=step;
        }
        return first?{id:first.id,dx:first.dx,dy:first.dy}:null;
      }
      for(const p of cur)for(const [sx,sy] of DIRS){
        for(let dist=1;dist<=4;dist++){
          const nxt=tryMove(cur,p.id,sx*dist,sy*dist);
          if(!nxt)break;
          const k=key(nxt);
          if(prev.has(k))continue;
          prev.set(k,{parent:ck,id:p.id,dx:sx*dist,dy:sy*dist});
          q.push(nxt);
        }
      }
    }
    return null;
  }
  root.KLOTSKI={LAYOUTS,clone,tryMove,won,hint,grid,key};
})(typeof globalThis!=='undefined'?globalThis:this);
