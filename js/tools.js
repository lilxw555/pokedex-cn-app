// 工具箱：一个底栏入口 → 工具卡片网格 → 子页面（#/tools/xxx）
const Tools=(()=>{
const VIEWS=['damage','map','battle','guess','abilities','items','collection'];let cur='';const inits={};
function open(k,replace){if(!VIEWS.includes(k))k='';
 if(cur==='guess'&&k!=='guess'&&typeof Guess!=='undefined')Guess.stop();if(cur==='battle'&&k!=='battle'&&typeof Battle!=='undefined')Battle.pause();cur=k;
 $('#toolHome').hidden=!!k;VIEWS.forEach(v=>$('#tool-'+v).hidden=v!==k);
 if(k&&inits[k]){inits[k]();}
 const want='#/tools'+(k?'/'+k:'');if(replace&&location.hash!==want)history.replaceState(null,'',want);
 const pane=$('#pane-tools');if(pane)pane.scrollTop=0}
// 返回按钮：直接切回网格（不依赖 hashchange；滑动切换后 hash 可能已被改写），并保持浏览器/手机返回键可用
$('#pane-tools').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;e.preventDefault();const k=b.dataset.go;
 if(!k&&history.state&&history.state.pkdxSub){history.back();setTimeout(()=>{if(cur){history.replaceState(null,'','#/tools');open('')}},350);return}
 const h='#/tools'+(k?'/'+k:'');if(location.hash!==h)history.pushState(null,'',h);open(k)});
$('#toolGrid').addEventListener('click',e=>{const a=e.target.closest('a[href^="#/tools/"]');if(!a)return;e.preventDefault();const k=a.getAttribute('href').split('/')[2];
 history.pushState({pkdxSub:1},'','#/tools/'+k);open(k)});

// ===== 伤害计算器 =====
const DM=window.MOVES_DATA.moves.filter(m=>m.power>1&&m.cat!=='status');
const MV_BY_NAME={};DM.forEach(m=>MV_BY_NAME[m.name]=m);
const st={atk:PBY[6],def:PBY[3],move:DM.find(m=>m.key==='flamethrower')||DM[0]};
function stat(base,lv,iv,ev,nat){return Math.floor((Math.floor((2*base+iv+Math.floor(ev/4))*lv/100)+5)*nat)}
function hpStat(base,lv,iv,ev){return base===1?1:Math.floor((2*base+iv+Math.floor(ev/4))*lv/100)+lv+10}
const val=(side,f)=>{const el=$(`#${side} [data-f="${f}"]`);return el?+el.value:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,isNaN(v)?a:v));
function calc(){const A=st.atk,Dp=st.def,M=st.move;if(!A||!Dp||!M)return null;
 const phys=M.cat==='physical',ai=phys?1:3,di=phys?2:4;
 const aLv=clamp(val('dmgAtk','lv'),1,100),dLv=clamp(val('dmgDef','lv'),1,100);
 const atk=stat(A.stats[ai],aLv,clamp(val('dmgAtk','iv'),0,31),clamp(val('dmgAtk','ev'),0,252),val('dmgAtk','nat')||1);
 const def=stat(Dp.stats[di],dLv,31,clamp(val('dmgDef','ev'),0,252),val('dmgDef','nat')||1);
 const hp=hpStat(Dp.stats[0],dLv,31,clamp(val('dmgDef','hpev'),0,252));
 const crit=$('#dmgCrit').checked,stab=A.types.includes(M.type),eff=Dp.types.reduce((m,d)=>m*T.chart[TYPE_BY_ID[M.type].idx][TYPE_BY_ID[d].idx],1);
 const base=Math.floor(Math.floor(Math.floor(2*aLv/5+2)*M.power*atk/def)/50)+2;
 const rolls=[];for(let r=85;r<=100;r++){let d=crit?Math.floor(base*1.5):base;d=Math.floor(d*r/100);if(stab)d=Math.floor(d*1.5);d=Math.floor(d*eff);if(eff>0)d=Math.max(1,d);rolls.push(d)}
 return {atk,def,hp,crit,stab,eff,rolls,phys,aLv,dLv}}
function koText(r){const mn=r.rolls[0],mx=r.rolls[15];if(!mx)return {t:'无法造成伤害（属性免疫）',cls:'zero'};
 const sure=Math.ceil(r.hp/mn),may=Math.ceil(r.hp/mx);
 if(sure===may)return {t:`确定 ${sure} 击打倒`,cls:sure===1?'ohko':''};
 // 精确计算 may 击打倒的概率（16 档随机数，逐击卷积）
 let dist=new Map([[0,1]]);for(let k=0;k<may;k++){const nd=new Map();dist.forEach((p,s)=>r.rolls.forEach(d=>{const v=Math.min(r.hp,s+d);nd.set(v,(nd.get(v)||0)+p/16)}));dist=nd}
 const pr=dist.get(r.hp)||0;return {t:`${(pr*100).toFixed(1)}% 几率 ${may} 击打倒，确定 ${sure} 击打倒`,cls:may===1?'ohko':''}}
function monBox(side){const p=side==='dmgAtk'?st.atk:st.def;$(`#${side} [data-mon]`).innerHTML=`<img src="${SPR(p.pid)}" alt="" draggable="false"><span><b>${esc(p.name)}</b><span class="types">${p.types.map(typeBadge).join('')}</span></span>`;$(`#${side} [data-mon]`).style.setProperty('--c',tcolor(p))}
function drawDmg(){monBox('dmgAtk');monBox('dmgDef');const M=st.move;
 const evl=$('#dmgAtk [data-f="ev"]').parentElement.firstChild,dvl=$('#dmgDef [data-f="ev"]').parentElement.firstChild;
 if(M){evl.textContent=(M.cat==='physical'?'攻击':'特攻')+'努力值';dvl.textContent=(M.cat==='physical'?'防御':'特防')+'努力值'}
 const r=calc(),o=$('#dmgOut');if(!r){o.innerHTML='<p class="muted">请选择招式。</p>';return}
 const mn=r.rolls[0],mx=r.rolls[15],pc=v=>(v/r.hp*100).toFixed(1),ko=koText(r);
 const effT=r.eff===0?'无效 ×0':r.eff>1?`效果绝佳 ×${r.eff}`:r.eff<1?`效果不好 ×${r.eff}`:'×1';
 o.innerHTML=`<div class="dmg-head"><span>${typeBadge(M.type)} <b>${esc(M.name)}</b> <span class="muted small">${M.catName} · 威力 ${M.power}</span></span></div>
  <div class="dmg-big"><b>${pc(mn)}% – ${pc(mx)}%</b><span class="muted">${mn} – ${mx} / ${r.hp} HP</span></div>
  <div class="hpbar" role="img" aria-label="伤害范围占 HP 比例"><i class="lo" style="width:${Math.min(100,mn/r.hp*100)}%"></i><i class="hi" style="width:${Math.max(0,Math.min(100,mx/r.hp*100)-Math.min(100,mn/r.hp*100))}%"></i></div>
  <div class="ko ${ko.cls}">${ko.t}</div>
  <div class="dmg-tags"><span>${r.phys?'攻击':'特攻'} ${r.atk}</span><span>${r.phys?'防御':'特防'} ${r.def}</span><span>属性一致 ${r.stab?'×1.5':'—'}</span><span>相性 ${effT}</span>${r.crit?'<span>要害 ×1.5</span>':''}</div>
  <div class="rolls muted small">16 档随机伤害：${r.rolls.join(', ')}</div>`}
inits.damage=()=>{if(inits._d)return;inits._d=1;
 $('#dmgMoves').innerHTML=DM.map(m=>`<option value="${esc(m.name)}">`).join('');$('#dmgMove').value=st.move.name;
 picker($('#dmgAtk input[type=search]'),p=>{st.atk=p;drawDmg()});picker($('#dmgDef input[type=search]'),p=>{st.def=p;drawDmg()});
 $('#dmgMove').addEventListener('input',e=>{const m=MV_BY_NAME[e.target.value.trim()];if(m){st.move=m;drawDmg()}});
 $('#tool-damage').addEventListener('input',e=>{if(e.target.matches('[data-f],#dmgCrit'))drawDmg()});drawDmg()};

// ===== 特性图鉴 =====
inits.abilities=()=>{if(inits._a)return;inits._a=1;loadData('ABIL_DATA',A=>{if(!A){$('#abList').innerHTML='<p class="muted">特性数据加载失败。</p>';return}
 const draw=()=>{const q=$('#abQ').value.trim();const l=A.filter(a=>!q||a.name.includes(q)||a.desc.includes(q)||a.en.includes(q.toLowerCase()));
  $('#abCount').textContent=`共 ${l.length} 个`;
  $('#abList').innerHTML=l.slice(0,200).map(a=>`<details class="dx-row" data-ab="${a.id}"><summary><b>${esc(a.name)}</b><span class="muted small">${GEN_CN[a.gen]} · ${a.mons.length} 只</span><span class="dx-desc">${esc(a.desc||'（暂无中文说明）')}</span></summary><div class="dx-mons"></div></details>`).join('')||'<p class="empty">没有找到特性。</p>'};
 $('#abList').addEventListener('toggle',e=>{const d=e.target;if(!d.open||d.dataset.done)return;d.dataset.done=1;const a=A.find(x=>x.id==d.dataset.ab);
  d.querySelector('.dx-mons').innerHTML=a.mons.map(([id,h])=>{const p=PBY[id];return p?`<a href="#/pokemon/${id}" class="mini-mon" style="--c:${tcolor(p)}"><img src="${SPR(p.pid)}" alt="" loading="lazy" draggable="false"><span>${esc(p.name)}</span>${h?'<em>隐藏</em>':''}</a>`:''}).join('')||'<span class="muted small">没有宝可梦拥有此特性。</span>'},true);
 $('#abQ').addEventListener('input',draw);draw()})};

// ===== 道具图鉴 =====
inits.items=()=>{if(inits._i)return;inits._i=1;loadData('ITEM_DATA',I=>{if(!I){$('#itList').innerHTML='<p class="muted">道具数据加载失败。</p>';return}
 [...new Set(I.map(i=>i.pk))].forEach(k=>$('#itPk').insertAdjacentHTML('beforeend',`<option>${esc(k)}</option>`));
 let l=[],n=0;const row=i=>`<div class="dx-row it"><img src="img/item/${i.en}.png" alt="" loading="lazy" draggable="false" class="it-ic"><div><b>${esc(i.name)}</b><span class="muted small">${esc(i.pk)}${i.cost?' · '+i.cost+' 円':''}</span><span class="dx-desc">${esc(i.desc)}</span></div></div>`;
 const more=()=>{$('#itList').insertAdjacentHTML('beforeend',l.slice(n,n+80).map(row).join(''));n+=80;$('#itMore').hidden=n>=l.length};
 const draw=()=>{const q=$('#itQ').value.trim(),pk=$('#itPk').value;l=I.filter(i=>(!pk||i.pk===pk)&&(!q||i.name.includes(q)||i.desc.includes(q)||i.en.includes(q.toLowerCase())));
  $('#itCount').textContent=`共 ${l.length} 个`;$('#itList').innerHTML=l.length?'':'<p class="empty">没有找到道具。</p>';n=0;more()};
 $('#itQ').addEventListener('input',draw);$('#itPk').addEventListener('input',draw);$('#itMore').onclick=more;draw()})};

// ===== 收集进度 =====
const bar=(n,t)=>{const p=t?n/t*100:0;return `<span class="pbar"><i style="width:${p}%"></i></span><span class="pn"><b>${t?Math.round(p):0}%</b> <span class="muted small">${n}/${t}</span></span>`};
function drawCol(){const all=PLIST,n=all.filter(p=>isCaught(p.id)).length;
 const gens=[...new Set(all.map(p=>p.gen))];
 let h=`<div class="panel glass col-top"><div class="col-ring" style="--p:${n/all.length*100}"><b>${(n/all.length*100).toFixed(1)}%</b><span class="muted small">全国图鉴</span></div><div><b>${n} / ${all.length}</b><p class="muted small">在任意宝可梦详情页点「○ 标记已抓到」。图鉴筛选里可以只看已抓到 / 未抓到。</p><a class="glass-btn" href="#/pokedex" data-colfilter>去图鉴查看未抓到 ›</a></div></div>
 <div class="col-cols"><div class="panel glass"><h2>按世代</h2>${gens.map(g=>{const l=all.filter(p=>p.gen===g);return `<div class="prow"><span>${GEN_CN[g]}</span>${bar(l.filter(p=>isCaught(p.id)).length,l.length)}</div>`}).join('')}</div>
 <div class="panel glass"><h2>按游戏版本 <span class="muted small">（该版本地区图鉴收录的宝可梦）</span></h2><div id="colVer"><p class="muted">加载版本数据…</p></div></div></div>`;
 $('#colBox').innerHTML=h;
 loadData('ENC_DATA',E=>{const el=$('#colVer');if(!el)return;if(!E){el.textContent='版本数据加载失败。';return}
  const per={};Object.entries(E.origin).forEach(([id,[,vs]])=>vs.forEach(v=>(per[v]=per[v]||[]).push(+id)));
  const vgs=Object.keys(per).sort((a,b)=>E.vgs[a].order-E.vgs[b].order);
  el.innerHTML=vgs.map(v=>`<div class="prow"><span>${esc(E.vgs[v].name)}</span>${bar(per[v].filter(isCaught).length,per[v].length)}</div>`).join('')})}
inits.collection=drawCol;
document.addEventListener('caught',()=>{if(cur==='collection')drawCol()});
$('#colBox').addEventListener('click',e=>{if(e.target.closest('[data-colfilter]')){$('#caughtSel').value='n';$('#caughtSel').dispatchEvent(new Event('input'))}});
inits.guess=()=>{};
inits.map=()=>{if(typeof RegionMap!=='undefined')RegionMap.init()};
inits.battle=()=>{if(typeof Battle!=='undefined')Battle.init()};
return {open,get cur(){return cur},calc:()=>calc(),koText,state:st};
})();
