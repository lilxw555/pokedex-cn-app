// 队伍构建器：最多 6 只，全队属性弱点热力图，localStorage 保存 + 链接分享
const Team=(()=>{
let team=store.get('team',[]).filter(id=>PBY[id]).slice(0,6);
const save=()=>{store.set('team',team);if(location.hash.startsWith('#/team/'))history.replaceState(null,'','#/team')};
const MULT_TXT={4:'4',2:'2',1:'',0.5:'½',0.25:'¼',0:'0'};
const mcls=v=>v>=4?'m4':v>=2?'m2':v===0?'m0':v<=0.25?'m025':v<1?'m05':'';
function add(id){if(!PBY[id])return;if(team.includes(id)){toast(PBY[id].name+' 已经在队伍里了');return}
 if(team.length>=6){toast('队伍已满（最多 6 只）');return}team.push(id);save();render(true);toast('已将 '+PBY[id].name+' 加入队伍')}
function remove(i){team.splice(i,1);save();render()}
function load(ids){team=ids.filter(id=>PBY[id]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,6);save();render()}
function render(pop){
 $('#teamCount').textContent=`${team.length} / 6`;
 $('#teamSlots').innerHTML=Array.from({length:6},(_,i)=>{const p=PBY[team[i]];
  if(!p)return `<div class="slot empty"><span>空位</span></div>`;
  return `<div class="slot card ${pop&&i===team.length-1?'pop':''}" style="--c:${tcolor(p)}" data-id="${p.id}"><button class="rm" data-rm="${i}" aria-label="移出">×</button><div class="sprite-wrap"><img src="${SPR(p.pid)}" alt="" draggable="false"></div><div class="nm">${esc(p.name)}</div><div class="types">${p.types.map(typeBadge).join('')}</div></div>`}).join('');
 if(!team.length){$('#teamAnalysis').innerHTML='<p class="muted">从上方搜索框添加宝可梦，或在图鉴详情里点「＋ 加入队伍」。</p>';return}
 const mons=team.map(id=>PBY[id]);
 const rows=T.types.map(a=>{const ms=mons.map(p=>p.types.reduce((m,d)=>m*T.chart[a.idx][TYPE_BY_ID[d].idx],1));
  const weak=ms.filter(v=>v>1).length,res=ms.filter(v=>v<1).length;return {a,ms,weak,res,unc:weak>0&&res===0}});
 const unc=rows.filter(r=>r.unc).sort((x,y)=>y.weak-x.weak);
 // 全队共同弱点：至少一半成员（且≥2只）被克制，且抵抗的成员比被克制的少
 const need=Math.max(2,Math.ceil(mons.length/2));const shared=rows.filter(r=>r.weak>=need&&r.res<r.weak).sort((x,y)=>y.weak-x.weak);
 shared.forEach(r=>r.shared=true);
 const gap=[...new Set([...shared,...unc])];
 let recHtml='';
 if(gap.length){const mult=(p,a)=>p.types.reduce((m,d)=>m*T.chart[a.idx][TYPE_BY_ID[d].idx],1);
  const cand=PLIST.filter(p=>!team.includes(p.id)&&!p.legendary&&!p.mythical).map(p=>{let sc=0;const cov=[];
   gap.forEach(r=>{const v=mult(p,r.a);if(v<1){sc+=v===0?2.2:v<=.25?1.8:1.5;cov.push(r.a)}else if(v>1)sc-=1.2});
   return {p,sc:sc+p.stats.reduce((a,b)=>a+b,0)/1500,cov}}).filter(x=>x.cov.length).sort((a,b)=>b.sc-a.sc).slice(0,6);
  recHtml=`<div class="rec"><h3>补位推荐 <span class="muted small">能抵抗或免疫 ${gap.map(r=>r.a.name).join('、')}，且自身不怕这些属性的高种族值宝可梦（不含传说/幻之宝可梦）</span></h3>
   <div class="rec-list">${cand.map(({p,cov})=>`<button type="button" class="rec-item" data-add="${p.id}" style="--c:${tcolor(p)}"><img src="${SPR(p.pid)}" alt="" loading="lazy" draggable="false"><b>${esc(p.name)}</b><span class="types">${p.types.map(typeBadge).join('')}</span><small>抵抗 ${cov.map(a=>a.name).join('、')}</small><i>＋ 加入</i></button>`).join('')}</div></div>`}
 const worst=[...rows].sort((x,y)=>y.weak-x.weak||x.res-y.res)[0];
 $('#teamAnalysis').innerHTML=`<div class="panel-head"><h2>全队属性热力图</h2>
  <div class="team-sum">${shared.length?`<div class="shared-box"><b>⚠ 全队共同弱点</b><span class="muted small">（至少 ${need} 只成员怕，抵抗的成员更少）</span><div class="list">${shared.map(r=>`<span class="unc-badge shared">${typeBadge(r.a.id)}<i>${r.weak}/${mons.length} 只怕</i></span>`).join('')}</div></div>`:''}<div><b>未覆盖的弱点</b><span class="muted small">（有成员被克制，且全队没有成员能抵抗或免疫）</span><div class="list">${unc.length?unc.map(r=>`<span class="unc-badge">${typeBadge(r.a.id)}<i>${r.weak} 只怕</i></span>`).join(''):'<span class="ok">✓ 全部弱点都有队友能抵抗</span>'}</div></div>
  ${worst.weak?`<div><b>最大威胁</b><div class="list">${typeBadge(worst.a.id)}<span class="muted small">${worst.weak} 只成员受到 2 倍以上伤害</span></div></div>`:''}</div></div>
  <div class="heat-wrap"><table class="heat"><thead><tr><th>攻击属性</th>${mons.map(p=>`<th><img src="${SPR(p.pid)}" alt="${esc(p.name)}" title="${esc(p.name)}"></th>`).join('')}<th class="cnt">弱</th><th class="cnt">抗</th></tr></thead>
  <tbody>${rows.map(r=>`<tr class="${r.unc?'unc':''}${r.shared?' shared':''}"><th>${typeBadge(r.a.id)}</th>${r.ms.map(v=>`<td class="${mcls(v)}">${MULT_TXT[v]!=null?MULT_TXT[v]:v}</td>`).join('')}<td class="cnt ${r.weak?'w':''}">${r.weak||''}</td><td class="cnt ${r.res?'r':''}">${r.res||''}</td></tr>`).join('')}</tbody></table></div>
  <div class="legend"><span><i class="lg" style="background:#e0453a"></i>4×</span><span><i class="lg" style="background:#ff9b8f"></i>2×</span><span><i class="lg" style="background:#8fd59a"></i>½×</span><span><i class="lg" style="background:#3fae5a"></i>¼×</span><span><i class="lg x0"></i>0×</span><span><i class="lg" style="background:rgba(255,120,100,.25);outline:2px solid #e0453a"></i>未覆盖</span><span><i class="lg lg-shared"></i>共同弱点</span></div>${recHtml}`}
picker($('#teamPick'),p=>add(p.id));
$('#teamSlots').addEventListener('click',e=>{const r=e.target.closest('[data-rm]');if(r){e.stopPropagation();remove(+r.dataset.rm);return}const c=e.target.closest('.slot[data-id]');if(c)location.hash='#/pokemon/'+c.dataset.id});
$('#teamAnalysis').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b)add(+b.dataset.add)});
$('#teamClear').onclick=()=>{team=[];save();render()};
$('#teamShare').onclick=async()=>{const url=location.href.split('#')[0]+'#/team/'+team.join(',');
 try{await navigator.clipboard.writeText(url);toast('分享链接已复制')}catch(_){prompt('复制这个链接分享队伍：',url)}};
render();
return {add,load,get ids(){return [...team]}};
})();
