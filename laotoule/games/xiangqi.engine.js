// 中国象棋规则与 alpha-beta。棋盘 90 格，红正黑负：1将 2士 3象 4马 5车 6炮 7兵。
(function(root){
  const K=1,A=2,E=3,H=4,R=5,C=6,P=7;
  const VAL=[0,10000,120,120,280,600,310,70];
  const HMOV=[[1,0,2,1],[1,0,2,-1],[-1,0,-2,1],[-1,0,-2,-1],[0,1,1,2],[0,1,-1,2],[0,-1,1,-2],[0,-1,-1,-2]];
  const EMOV=[[1,1,2,2],[-1,1,-2,2],[1,-1,2,-2],[-1,-1,-2,-2]];
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  const NAME={1:['帅','将'],2:['仕','士'],3:['相','象'],4:['马','马'],5:['车','车'],6:['炮','炮'],7:['兵','卒']};

  function start(){
    const b=new Int8Array(90);
    const back=[R,H,E,A,K,A,E,H,R];
    for(let x=0;x<9;x++){b[x]=-back[x];b[81+x]=back[x]}
    b[2*9+1]=b[2*9+7]=-C; b[7*9+1]=b[7*9+7]=C;
    for(let x=0;x<9;x+=2){b[3*9+x]=-P;b[6*9+x]=P}
    return b;
  }
  function clone(b){return Int8Array.from(b)}
  function kingAt(b,side){const k=side*K;for(let i=0;i<90;i++)if(b[i]===k)return i;return -1}

  function attacked(b,x,y,by){
    if(by>0){
      if(y+1<10&&b[(y+1)*9+x]===P)return true;
      if(y<=4){if(x>0&&b[y*9+x-1]===P)return true;if(x<8&&b[y*9+x+1]===P)return true}
    }else{
      if(y-1>=0&&b[(y-1)*9+x]===-P)return true;
      if(y>=5){if(x>0&&b[y*9+x-1]===-P)return true;if(x<8&&b[y*9+x+1]===-P)return true}
    }
    for(let i=0;i<8;i++){
      const ldx=HMOV[i][0],ldy=HMOV[i][1],ddx=HMOV[i][2],ddy=HMOV[i][3];
      const sx=x-ddx,sy=y-ddy;
      if(sx<0||sy<0||sx>8||sy>9)continue;
      if(b[sy*9+sx]!==by*H)continue;
      if(b[(sy+ldy)*9+(sx+ldx)])continue;
      return true;
    }
    for(let i=0;i<4;i++){
      const ex=EMOV[i][0],ey=EMOV[i][1],dx=EMOV[i][2],dy=EMOV[i][3];
      const sx=x-dx,sy=y-dy;
      if(sx<0||sy<0||sx>8||sy>9)continue;
      if(b[sy*9+sx]!==by*E)continue;
      if(by>0&&(sy<5||y<5))continue;
      if(by<0&&(sy>4||y>4))continue;
      if(b[(sy+ey)*9+(sx+ex)])continue;
      return true;
    }
    const adj=[[1,1],[1,-1],[-1,1],[-1,-1]];
    for(let i=0;i<4;i++){
      const sx=x-adj[i][0],sy=y-adj[i][1];
      if(sx<3||sx>5||sy<0||sy>9)continue;
      if(by>0&&(sy<7||y<7||sy>9||y>9))continue;
      if(by<0&&(sy>2||y>2))continue;
      if(b[sy*9+sx]===by*A)return true;
    }
    for(let i=0;i<4;i++){
      const sx=x-DIRS[i][0],sy=y-DIRS[i][1];
      if(sx<3||sx>5||sy<0||sy>9)continue;
      if(by>0&&(sy<7||y<7||sy>9||y>9))continue;
      if(by<0&&(sy>2||y>2))continue;
      if(b[sy*9+sx]===by*K)return true;
    }
    if(b[y*9+x]===-by*K){
      for(let yy=0;yy<10;yy++)if(b[yy*9+x]===by*K){
        let a=y<yy?y:yy,c=y<yy?yy:y,blk=false;
        for(let k=a+1;k<c;k++)if(b[k*9+x]){blk=true;break}
        if(!blk)return true;
      }
    }
    for(let d=0;d<4;d++){
      let x1=x+DIRS[d][0],y1=y+DIRS[d][1];
      while(x1>=0&&x1<9&&y1>=0&&y1<10){
        const p=b[y1*9+x1];
        if(p){if(p===by*R)return true;break}
        x1+=DIRS[d][0];y1+=DIRS[d][1];
      }
    }
    for(let d=0;d<4;d++){
      let x1=x+DIRS[d][0],y1=y+DIRS[d][1],seen=false;
      while(x1>=0&&x1<9&&y1>=0&&y1<10){
        const p=b[y1*9+x1];
        if(!seen){if(p)seen=true}
        else if(p){if(p===by*C)return true;break}
        x1+=DIRS[d][0];y1+=DIRS[d][1];
      }
    }
    return false;
  }
  function inCheck(b,side){
    const i=kingAt(b,side);
    if(i<0)return true;
    return attacked(b,i%9,(i/9)|0,-side);
  }
  function push(mv,n,f,t){mv[n]=f*90+t;return n+1}
  function genPseudo(b,side,mv){
    let n=0;
    for(let i=0;i<90;i++){
      const p=b[i];
      if(!p||(p>0)!==(side>0))continue;
      const t=p<0?-p:p,x=i%9,y=(i/9)|0;
      if(t===R||t===C){
        for(let d=0;d<4;d++){
          let x1=x+DIRS[d][0],y1=y+DIRS[d][1],seen=false;
          while(x1>=0&&x1<9&&y1>=0&&y1<10){
            const q=b[y1*9+x1];
            if(t===R){
              if(!q)n=push(mv,n,i,y1*9+x1);
              else{if(q*side<0)n=push(mv,n,i,y1*9+x1);break}
            }else if(!seen){
              if(!q)n=push(mv,n,i,y1*9+x1);
              else seen=true;
            }else{if(q){if(q*side<0)n=push(mv,n,i,y1*9+x1);break}}
            x1+=DIRS[d][0];y1+=DIRS[d][1];
          }
        }
      }else if(t===H){
        for(let k=0;k<8;k++){
          const lx=x+HMOV[k][0],ly=y+HMOV[k][1],dx=x+HMOV[k][2],dy=y+HMOV[k][3];
          if(dx<0||dy<0||dx>8||dy>9)continue;
          if(b[ly*9+lx])continue;
          const q=b[dy*9+dx];
          if(!q||q*side<0)n=push(mv,n,i,dy*9+dx);
        }
      }else if(t===E){
        for(let k=0;k<4;k++){
          const mx=x+EMOV[k][0],my=y+EMOV[k][1],dx=x+EMOV[k][2],dy=y+EMOV[k][3];
          if(dx<0||dy<0||dx>8||dy>9)continue;
          if(side>0&&dy<5)continue;
          if(side<0&&dy>4)continue;
          if(b[my*9+mx])continue;
          const q=b[dy*9+dx];
          if(!q||q*side<0)n=push(mv,n,i,dy*9+dx);
        }
      }else if(t===A){
        for(let k=0;k<4;k++){
          const dx=x+[1,1,-1,-1][k],dy=y+[1,-1,1,-1][k];
          if(dx<3||dx>5)continue;
          if(side>0&&(dy<7||dy>9))continue;
          if(side<0&&(dy<0||dy>2))continue;
          const q=b[dy*9+dx];
          if(!q||q*side<0)n=push(mv,n,i,dy*9+dx);
        }
      }else if(t===K){
        for(let d=0;d<4;d++){
          const dx=x+DIRS[d][0],dy=y+DIRS[d][1];
          if(dx<3||dx>5)continue;
          if(side>0&&(dy<7||dy>9))continue;
          if(side<0&&(dy<0||dy>2))continue;
          const q=b[dy*9+dx];
          if(!q||q*side<0)n=push(mv,n,i,dy*9+dx);
        }
      }else{
        const fy=y+(side>0?-1:1);
        if(fy>=0&&fy<10){const q=b[fy*9+x];if(!q||q*side<0)n=push(mv,n,i,fy*9+x)}
        const crossed=side>0?y<=4:y>=5;
        if(crossed){
          if(x>0){const q=b[y*9+x-1];if(!q||q*side<0)n=push(mv,n,i,y*9+x-1)}
          if(x<8){const q=b[y*9+x+1];if(!q||q*side<0)n=push(mv,n,i,y*9+x+1)}
        }
      }
    }
    return n;
  }
  function genLegal(b,side,mv){
    const tmp=genLegal._t||(genLegal._t=new Int32Array(128));
    const n0=genPseudo(b,side,tmp);
    let n=0;
    for(let i=0;i<n0;i++){
      const m=tmp[i],f=(m/90)|0,t=m%90,cap=b[t];
      b[t]=b[f];b[f]=0;
      const bad=inCheck(b,side);
      b[f]=b[t];b[t]=cap;
      if(!bad)mv[n++]=m;
    }
    return n;
  }
  function status(b,side){
    const mv=new Int32Array(128);
    const n=genLegal(b,side,mv);
    const chk=inCheck(b,side);
    if(!n)return chk?'mate':'stalemate';
    return chk?'check':'ok';
  }
  function evaluate(b,side){
    let s=0;
    for(let i=0;i<90;i++){
      const p=b[i];if(!p)continue;
      const t=p<0?-p:p,x=i%9,y=(i/9)|0;
      let v=VAL[t];
      if(t===P){v+=(p>0?9-y:y)*8;if((p>0&&y<=4)||(p<0&&y>=5))v+=40;if(x===4)v+=8}
      else if(t===H||t===C)v+=(4-Math.abs(x-4))*6+(p>0?9-y:y)*2;
      else if(t===R)v+=(4-Math.abs(x-4))*3+(p>0?9-y:y)*4;
      else if(t===K)v-=Math.abs(x-4)*4;
      s+=p*side>0?v:-v;
    }
    return s;
  }

  const histTab=new Int32Array(90*90);
  const killers=[];
  function search(b,side,opt){
    opt=opt||{};
    const maxD=opt.depth||3, ms=opt.ms==null?800:opt.ms, noise=opt.noise||0;
    const deadline=Date.now()+ms;
    let abort=false,nodes=0,bestMove=-1,bestScore=-1e9,done=0;
    const buf=Array.from({length:40},()=>new Int32Array(128));
    const scb=Array.from({length:40},()=>new Int32Array(128));
    function order(board,mv,n,ply,tt){
      const sc=scb[ply];
      for(let i=0;i<n;i++){
        const m=mv[i],f=(m/90)|0,t=m%90,cap=board[t];
        let s=histTab[f*90+t];
        if(m===tt)s+=1000000;
        else if(cap)s+=20000+VAL[cap<0?-cap:cap]*8-VAL[(board[f]<0?-board[f]:board[f])];
        else if(killers[ply]===m)s+=5000;
        sc[i]=s;
      }
      for(let i=1;i<n;i++){
        const ms_=sc[i],mm=mv[i];let j=i-1;
        while(j>=0&&sc[j]<ms_){sc[j+1]=sc[j];mv[j+1]=mv[j];j--}
        sc[j+1]=ms_;mv[j+1]=mm;
      }
    }
    function neg(board,sd,depth,alpha,beta,ply){
      if(abort)return 0;
      if((++nodes&1023)===0&&Date.now()>=deadline){abort=true;return 0}
      if(depth===0)return evaluate(board,sd);
      const mv=buf[ply];
      const n=genLegal(board,sd,mv);
      if(!n)return inCheck(board,sd)?-100000+ply:-20000;
      order(board,mv,n,ply,ply===0?bestMove:-1);
      let best=-1e9,bm=mv[0];
      for(let i=0;i<n;i++){
        const m=mv[i],f=(m/90)|0,t=m%90,cap=board[t],pc=board[f];
        board[t]=pc;board[f]=0;
        let sc=-neg(board,-sd,depth-1,-beta,-alpha,ply+1);
        board[f]=pc;board[t]=cap;
        if(abort)return 0;
        if(sc>best){best=sc;bm=m}
        if(sc>alpha){alpha=sc;if(ply===0)bestMove=m}
        if(alpha>=beta){if(!cap)killers[ply]=m;histTab[f*90+t]+=depth*depth;break}
      }
      if(ply===0)bestScore=best;
      return best;
    }
    for(let d=1;d<=maxD;d++){
      const before=bestMove;
      neg(b,side,d,-1e9,1e9,0);
      if(abort){bestMove=before<0?bestMove:before;break}
      done=d;
      if(bestScore>90000)break;
    }
    if(bestMove<0){
      const mv=new Int32Array(128),n=genLegal(b,side,mv);
      if(n)bestMove=mv[0];
    }
    if(noise&&bestMove>=0){
      const mv=new Int32Array(128),n=genLegal(b,side,mv);
      const pool=[];
      for(let i=0;i<n;i++){
        const m=mv[i],f=(m/90)|0,t=m%90,cap=b[t],pc=b[f];
        b[t]=pc;b[f]=0;
        const sc=-evaluate(b,-side);
        b[f]=pc;b[t]=cap;
        pool.push([m,sc]);
      }
      pool.sort((a,c)=>c[1]-a[1]);
      const cut=pool[0][1]-noise;
      const ok=pool.filter(x=>x[1]>=cut);
      bestMove=ok[(Math.random()*ok.length)|0][0];
    }
    return {move:bestMove,score:bestScore,depth:done,nodes:nodes,ms:Date.now()-(deadline-ms)};
  }
  function perft(b,side,depth){
    if(depth===0)return 1;
    const mv=new Int32Array(128);
    const n=genLegal(b,side,mv);
    if(depth===1)return n;
    let c=0;
    for(let i=0;i<n;i++){
      const m=mv[i],f=(m/90)|0,t=m%90,cap=b[t],pc=b[f];
      b[t]=pc;b[f]=0;
      c+=perft(b,-side,depth-1);
      b[f]=pc;b[t]=cap;
    }
    return c;
  }
  function pieceChar(p){if(!p)return '';const t=p<0?-p:p;return NAME[t][p<0?1:0]}
  root.XQ={K,A,E,H,R,C,P,VAL,start,clone,genLegal,genPseudo,inCheck,attacked,status,evaluate,search,perft,pieceChar,kingAt};
})(typeof globalThis!=='undefined'?globalThis:this);
