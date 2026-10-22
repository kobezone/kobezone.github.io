// 斗地主牌型。牌 r：0=3 … 11=A，12=2，13=小王，14=大王。
(function(root){
  function isConsec(rs){for(let i=1;i<rs.length;i++)if(rs[i]!==rs[i-1]+1)return false;return true}
  function counts(cards){
    const cnt=new Array(15).fill(0);
    for(const c of cards)cnt[c.r]++;
    const ranks=[];
    for(let r=0;r<15;r++)if(cnt[r])ranks.push(r);
    return {cnt,ranks};
  }
  function classify(cards){
    if(!cards||!cards.length)return null;
    const {cnt,ranks}=counts(cards);
    const n=cards.length;
    const hi=ranks[ranks.length-1];
    if(n===2&&cnt[13]&&cnt[14])return {type:'rocket',rank:14,len:2};
    if(n===4&&ranks.length===1&&cnt[ranks[0]]===4)return {type:'bomb',rank:ranks[0],len:4};
    if(n===1)return {type:'single',rank:cards[0].r,len:1};
    if(n===2&&ranks.length===1&&cnt[ranks[0]]===2)return {type:'pair',rank:ranks[0],len:2};
    if(n===3&&ranks.length===1&&cnt[ranks[0]]===3)return {type:'triple',rank:ranks[0],len:3};
    if(n===4&&ranks.length===2){
      const t=ranks.find(r=>cnt[r]===3),s=ranks.find(r=>cnt[r]===1);
      if(t!=null&&s!=null)return {type:'triple1',rank:t,len:4};
    }
    if(n===5&&ranks.length===2){
      const t=ranks.find(r=>cnt[r]===3),p=ranks.find(r=>cnt[r]===2);
      if(t!=null&&p!=null)return {type:'triple2',rank:t,len:5};
    }
    if(n===6){
      const f=ranks.find(r=>cnt[r]===4);
      if(f!=null&&ranks.length===3&&ranks.every(r=>r===f||cnt[r]===1))return {type:'four2',rank:f,len:6};
    }
    if(n===8){
      const f=ranks.find(r=>cnt[r]===4);
      if(f!=null&&ranks.length===3&&ranks.every(r=>r===f||cnt[r]===2))return {type:'four4',rank:f,len:8};
    }
    if(ranks.length===n&&n>=5&&isConsec(ranks)&&hi<=11)return {type:'straight',rank:hi,len:n};
    if(n%2===0&&ranks.every(r=>cnt[r]===2)&&ranks.length>=3&&isConsec(ranks)&&hi<=11)return {type:'pairSeq',rank:hi,len:n};
    const triples=ranks.filter(r=>cnt[r]===3);
    const rest=ranks.filter(r=>cnt[r]!==3);
    if(triples.length>=2&&isConsec(triples)&&triples[triples.length-1]<=11){
      const k=triples.length, tr=triples[triples.length-1];
      if(!rest.length&&n===k*3)return {type:'plane',rank:tr,len:n,k};
      if(rest.length===k&&rest.every(r=>cnt[r]===1)&&n===k*4)return {type:'plane1',rank:tr,len:n,k};
      if(rest.length===k&&rest.every(r=>cnt[r]===2)&&n===k*5)return {type:'plane2',rank:tr,len:n,k};
    }
    return null;
  }
  function beats(a,b){
    if(!a)return false;
    if(!b)return true;
    if(a.type==='rocket')return true;
    if(b.type==='rocket')return false;
    if(a.type==='bomb')return b.type!=='bomb'||a.rank>b.rank;
    if(b.type==='bomb')return false;
    return a.type===b.type&&a.len===b.len&&a.rank>b.rank;
  }
  function deck(){
    const c=[];
    for(let s=0;s<4;s++)for(let r=0;r<13;r++)c.push({r,s,id:s*13+r});
    c.push({r:13,s:0,id:52},{r:14,s:0,id:53});
    return c;
  }
  function shuffle(a,rand){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));const t=b[i];b[i]=b[j];b[j]=t}return b}
  function deal(rand){
    const d=shuffle(deck(),rand);
    return {hands:[d.slice(0,17),d.slice(17,34),d.slice(34,51)],hole:d.slice(51)};
  }
  function byRank(hand){
    const m=new Map();
    for(const c of hand){if(!m.has(c.r))m.set(c.r,[]);m.get(c.r).push(c)}
    return m;
  }
  function take(map,r,n){return map.get(r).slice(0,n)}
  function moves(hand){
    const map=byRank(hand);
    const ranks=[...map.keys()].sort((a,b)=>a-b);
    const out=[];
    const push=cs=>{const k=classify(cs);if(k)out.push(cs)};
    for(const r of ranks){
      const cs=map.get(r);
      if(cs.length>=1)push(take(map,r,1));
      if(cs.length>=2&&r<13)push(take(map,r,2));
      if(cs.length>=3)push(take(map,r,3));
      if(cs.length===4)push(cs.slice());
    }
    if(map.has(13)&&map.has(14))push([map.get(13)[0],map.get(14)[0]]);
    const singles=ranks.filter(r=>(map.get(r).length>=1));
    const pairs=ranks.filter(r=>r<13&&map.get(r).length>=2);
    const triples=ranks.filter(r=>r<13&&map.get(r).length>=3);
    const fours=ranks.filter(r=>map.get(r).length===4);
    for(const t of triples){
      for(const s of singles)if(s!==t)push(take(map,t,3).concat(take(map,s,1)));
      for(const p of pairs)if(p!==t)push(take(map,t,3).concat(take(map,p,2)));
    }
    for(const f of fours){
      const others=singles.filter(r=>r!==f);
      for(let i=0;i<others.length;i++)for(let j=i+1;j<others.length;j++)push(take(map,f,4).concat(take(map,others[i],1),take(map,others[j],1)));
      const ps=pairs.filter(r=>r!==f);
      for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)push(take(map,f,4).concat(take(map,ps[i],2),take(map,ps[j],2)));
    }
    const seqRanks=ranks.filter(r=>r<=11&&map.get(r).length>=1);
    for(let i=0;i<seqRanks.length;i++){
      for(let j=i+4;j<=seqRanks.length;j++){
        const rs=seqRanks.slice(i,j);
        if(!isConsec(rs))continue;
        push(rs.map(r=>take(map,r,1)[0]));
        if(j-i>seqRanks.length)break;
      }
    }
    const pairRanks=ranks.filter(r=>r<=11&&map.get(r).length>=2);
    for(let i=0;i<pairRanks.length;i++){
      for(let j=i+2;j<=pairRanks.length;j++){
        const rs=pairRanks.slice(i,j);
        if(!isConsec(rs))continue;
        push(rs.flatMap(r=>take(map,r,2)));
      }
    }
    const tripRanks=ranks.filter(r=>r<=11&&map.get(r).length>=3);
    for(let i=0;i<tripRanks.length;i++){
      for(let j=i+1;j<tripRanks.length;j++){
        const rs=tripRanks.slice(i,j+1);
        if(!isConsec(rs))continue;
        const body=rs.flatMap(r=>take(map,r,3));
        push(body);
        const wingsS=singles.filter(r=>!rs.includes(r));
        if(wingsS.length>=rs.length){
          const comb=pick(wingsS,rs.length);
          for(const w of comb)push(body.concat(w.flatMap(r=>take(map,r,1))));
        }
        const wingsP=pairs.filter(r=>!rs.includes(r));
        if(wingsP.length>=rs.length){
          const comb=pick(wingsP,rs.length);
          for(const w of comb)push(body.concat(w.flatMap(r=>take(map,r,2))));
        }
      }
    }
    return out;
  }
  function pick(arr,k){
    const res=[];
    function dfs(start,acc){
      if(acc.length===k){res.push(acc.slice());return}
      for(let i=start;i<arr.length;i++){acc.push(arr[i]);dfs(i+1,acc);acc.pop();if(res.length>12)return}
    }
    dfs(0,[]);
    return res;
  }
  function rankOf(cards){const k=classify(cards);return k?k.rank*(k.type==='bomb'||k.type==='rocket'?100:1)+cards.length:99}
  function choose(hand,prev,threat){
    const pk=prev&&prev.length?classify(prev):null;
    let list=moves(hand).filter(cs=>beats(classify(cs),pk));
    if(!list.length)return null;
    const soft=list.filter(cs=>{const t=classify(cs).type;return t!=='bomb'&&t!=='rocket'});
    const pool=(!pk&&soft.length)?soft:(threat||!soft.length?list:soft.length?soft:list);
    pool.sort((a,b)=>rankOf(a)-rankOf(b));
    if(pk&&threat&&soft.length===0)return pool[0];
    if(pk&&!threat&&soft.length===0)return null;
    return pool[0];
  }
  function strength(hand){
    const {cnt}=counts(hand);
    let s=0;
    for(let r=0;r<13;r++)if(cnt[r]===4)s+=3;
    s+=cnt[12]*1.4+cnt[11]*0.6+(cnt[13]+cnt[14])*2;
    if(cnt[13]&&cnt[14])s+=2;
    return s;
  }
  function bidOf(hand,current){
    const s=strength(hand);
    let want=0;
    if(s>=8)want=3;else if(s>=6)want=2;else if(s>=4.2)want=1;
    if(want<=current)return 0;
    return want;
  }
  root.DDZ={classify,beats,deck,deal,moves,choose,strength,bidOf,shuffle};
})(typeof globalThis!=='undefined'?globalThis:this);
