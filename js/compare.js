// 对比：两只宝可梦种族值雷达图叠加 + 双方属性克制
const Compare=(()=>{
let [a,b]=store.get('cmp',[6,9]);if(!PBY[a])a=6;if(!PBY[b])b=9;
// 雷达图颜色 = 双方主属性颜色（全站统一的属性色）；主属性相同则 B 改用第二属性色，仍相同则用中性深灰并改为虚线
let CA, CB, sameCol=false;
function pickCols(A,B){CA=TYPE_BY_ID[A.types[0]].color;const bt=B.types.map(t=>TYPE_BY_ID[t].color).find(c=>c!==CA);sameCol=!bt;CB=bt||'#5b6170'}
function set(x,y){if(PBY[x])a=x;if(PBY[y])b=y;store.set('cmp',[a,b]);render()}
function other(id){return a!==id?a:b}
function mult(atk,def){return def.types.reduce((m,d)=>m*T.chart[TYPE_BY_ID[atk].idx][TYPE_BY_ID[d].idx],1)}
const mtxt=v=>({4:'4×',2:'2×',1:'1×',0.5:'½×',0.25:'¼×',0:'0×'}[v]!=null?{4:'4×',2:'2×',1:'1×',0.5:'½×',0.25:'¼×',0:'0×'}[v]:v+'×');
const mcl=v=>v>1?'good':v===0?'none':v<1?'bad':'';
function radar(A,B){const N=6,R=110,cx=150,cy=140;const max=Math.max(150,Math.ceil(Math.max(...A.stats,...B.stats)/25)*25);
 const pt=(i,r)=>{const ang=-Math.PI/2+i*2*Math.PI/N;return [cx+r*Math.cos(ang),cy+r*Math.sin(ang)]};
 const poly=s=>s.map((v,i)=>pt(i,R*(v||0)/max).join(',')).join(' ');
 let g='';[.25,.5,.75,1].forEach(f=>g+=`<polygon points="${Array.from({length:N},(_,i)=>pt(i,R*f).join(',')).join(' ')}" class="ring"/>`);
 for(let i=0;i<N;i++){const [x,y]=pt(i,R);const [lx,ly]=pt(i,R+20);g+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="axis"/><text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle">${STATN[i]}</text>`}
 return `<svg class="radar" viewBox="0 0 300 280" role="img" aria-label="种族值雷达图">${g}
  <polygon class="pa" points="${poly(A.stats)}" style="fill:${CA}33;stroke:${CA}"/><polygon class="pb" points="${poly(B.stats)}" style="fill:${CB}33;stroke:${CB}${sameCol?';stroke-dasharray:6 4':''}"/>
  <text x="6" y="272" class="scale">外圈 = ${max}</text></svg>`}
function hero(p,col,side){return `<div class="cmp-hero glass" style="--c:${tcolor(p)};--side:${col}" data-id="${p.id}"><span class="halo"></span><img src="${ART(p.pid)}" alt="" draggable="false"><div class="no">${pad(p.id)}</div><h3><i class="dot" style="background:${col}"></i>${esc(p.name)}</h3><div class="types">${p.types.map(typeBadge).join('')}</div><div class="muted small">种族值总和 <b>${sum(p.stats)}</b></div></div>`}
function matchup(X,Y){return X.types.map(t=>{const v=mult(t,Y);return `<div class="mu-row">${typeBadge(t)}<span class="arrow">→</span><span class="mu ${mcl(v)}">${mtxt(v)}</span></div>`}).join('')}
function render(){const A=PBY[a],B=PBY[b];pickCols(A,B);
 $('#cmpA').placeholder='A：'+A.name;$('#cmpB').placeholder='B：'+B.name;
 $('#cmpBody').innerHTML=`<div class="cmp-grid">${hero(A,CA)}<div class="panel glass radar-panel">${radar(A,B)}<div class="legend" style="justify-content:center"><span><i class="lg" style="background:${CA}"></i>${esc(A.name)}</span><span><i class="lg" style="background:${CB}"></i>${esc(B.name)}</span></div></div>${hero(B,CB)}</div>
 <div class="panel glass"><h2>种族值逐项对比</h2>${STATN.map((n,i)=>{const x=A.stats[i]||0,y=B.stats[i]||0,m=Math.max(x,y,1);
  return `<div class="cmp-stat"><b class="${x>y?'win':''}">${x}</b><div class="cbar l"><i style="transform:scaleX(${x/255});background:${CA}"></i></div><span>${n}</span><div class="cbar r"><i style="transform:scaleX(${y/255});background:${CB}"></i></div><b class="${y>x?'win':''}">${y}</b></div>`}).join('')}
  <div class="cmp-stat total"><b class="${sum(A.stats)>sum(B.stats)?'win':''}">${sum(A.stats)}</b><span></span><span>总和</span><span></span><b class="${sum(B.stats)>sum(A.stats)?'win':''}">${sum(B.stats)}</b></div></div>
 <div class="panel glass"><h2>双方属性克制</h2><p class="muted small">以各自的属性作为招式属性，攻击对方时的伤害倍率（不含特性、道具等因素）。</p>
  <div class="mu-grid"><div><h3>${esc(A.name)} 攻击 ${esc(B.name)}</h3>${matchup(A,B)}</div><div><h3>${esc(B.name)} 攻击 ${esc(A.name)}</h3>${matchup(B,A)}</div></div></div>`;
 $('#cmpBody').querySelectorAll('.cmp-hero').forEach(h=>h.onclick=()=>location.hash='#/pokemon/'+h.dataset.id);
 if(location.hash.startsWith('#/compare'))history.replaceState(null,'','#/compare/'+a+'/'+b)}
picker($('#cmpA'),p=>set(p.id,b));picker($('#cmpB'),p=>set(a,p.id));
$('#cmpSwap').onclick=()=>set(b,a);
render();
return {set,other,get pair(){return [a,b]},get colors(){return [CA,CB]}};
})();
