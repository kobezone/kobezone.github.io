// 24 点：有理数搜索，只接受正好等于 24 的组合。
(function(root){
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){const t=a%b;a=b;b=t}return a||1}
  function norm(n,d){
    if(d<0){n=-n;d=-d}
    const g=gcd(n,d);
    return [n/g,d/g];
  }
  function solve(nums){
    const items=nums.map(v=>({n:v,d:1,s:String(v)}));
    function rec(arr){
      if(arr.length===1)return arr[0].d!==0&&arr[0].n===24*arr[0].d?arr[0].s:null;
      for(let i=0;i<arr.length;i++)for(let j=0;j<arr.length;j++)if(i!==j){
        const a=arr[i],b=arr[j],rest=[];
        for(let k=0;k<arr.length;k++)if(k!==i&&k!==j)rest.push(arr[k]);
        const opts=[];
        let nd=norm(a.n*b.d+b.n*a.d,a.d*b.d);opts.push([nd[0],nd[1],'('+a.s+'+'+b.s+')']);
        nd=norm(a.n*b.d-b.n*a.d,a.d*b.d);opts.push([nd[0],nd[1],'('+a.s+'-'+b.s+')']);
        nd=norm(a.n*b.n,a.d*b.d);opts.push([nd[0],nd[1],'('+a.s+'×'+b.s+')']);
        if(b.n!==0){nd=norm(a.n*b.d,a.d*b.n);opts.push([nd[0],nd[1],'('+a.s+'÷'+b.s+')'])}
        for(const o of opts){
          const hit=rec(rest.concat([{n:o[0],d:o[1],s:o[2]}]));
          if(hit)return hit;
        }
      }
      return null;
    }
    return rec(items);
  }
  function deal(easy){
    const hi=easy?10:13;
    for(let t=0;t<400;t++){
      const nums=[1,2,3,4].map(()=>1+(Math.random()*hi|0));
      const expr=solve(nums);
      if(expr)return {nums:nums,expr:expr};
    }
    return {nums:[8,3,3,3],expr:solve([8,3,3,3])};
  }
  function face(n,on){
    if(!on)return String(n);
    return ({1:'A',11:'J',12:'Q',13:'K'})[n]||String(n);
  }
  root.TF24={solve,deal,face,norm};
})(typeof globalThis!=='undefined'?globalThis:this);
