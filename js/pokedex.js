// 图鉴：列表、收藏、随机发现 + 详情玻璃面板（水平滑动切换、进化链）
const Dex=(()=>{
const LIST=PLIST, BYID=PBY;
const sel=new Set(); let filtered=[], shown=0, favOnly=false, caughtF=''; const PAGE=120;
[...new Set(LIST.map(p=>p.gen))].sort((a,b)=>a-b).forEach(g=>$('#gen').insertAdjacentHTML('beforeend',`<option value="${g}">${GEN_CN[g]||'第'+g+'世代'}</option>`));
$('#typeChips').innerHTML=T.types.map(typeChip).join('');
$('#typeChips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const id=+b.dataset.id;
 if(sel.has(id))sel.delete(id);else{if(sel.size>=2)sel.delete([...sel][0]);sel.add(id)}
 document.querySelectorAll('#typeChips .chip').forEach(c=>{const on=sel.has(+c.dataset.id);c.classList.toggle('on',on);c.setAttribute('aria-pressed',on)});apply()});
function matches(p,q){if(!q)return true;const n=q.replace('#','');
 if(/^\d+$/.test(n)){const s=n.replace(/^0+/,'');return String(p.id).startsWith(s)}
 const ql=q.toLowerCase();return p.name.includes(q)||p.key.includes(ql)||p.forms.some(f=>f.name.includes(q))}
function apply(){const q=$('#q').value.trim(),g=$('#gen').value,s=$('#sort').value;
 filtered=LIST.filter(p=>matches(p,q)&&(!g||p.gen==g)&&(!favOnly||isFav(p.id))&&(!caughtF||(caughtF==='y')===isCaught(p.id))&&[...sel].every(t=>p.types.includes(t)));
 if(/^#?\d+$/.test(q)){const n=+q.replace('#','');filtered.sort((a,b)=>(b.id===n)-(a.id===n)||a.id-b.id)}
 if(s==='bst')filtered.sort((a,b)=>sum(b.stats)-sum(a.stats));else if(s==='name')filtered.sort((a,b)=>a.name.localeCompare(b.name,'zh-Hans-CN'));
 $('#count').textContent=`共 ${filtered.length} 只`+(sel.size?' · '+[...sel].map(t=>TYPE_BY_ID[t].name).join('+'):'');badge();$('#grid').innerHTML='';shown=0;more();}
const star=id=>`<button class="star ${isFav(id)?'on':''}" data-fav="${id}" aria-label="收藏">${isFav(id)?'★':'☆'}</button>`;
function card(p,i){const t=TYPE_BY_ID[p.types[0]];return `<div class="card${isCaught(p.id)?' caught':''}" data-id="${p.id}" data-type="${t.key}" style="--c:${t.color};--fg:${t.fg};animation-delay:${Math.min(i,24)*18}ms"><span class="wm" aria-hidden="true">${String(p.id).padStart(3,'0')}</span>${star(p.id)}<div class="sprite-wrap"><img loading="lazy" decoding="async" draggable="false" src="${SPR(p.pid)}" alt="${esc(p.name)}"></div><div class="no">${pad(p.id)}</div><div class="nm">${esc(p.name)}</div><div class="types">${p.types.map(typeBadge).join('')}</div><div class="bst" title="种族值总和 ${sum(p.stats)} / 720"><span class="bst-bar" role="meter" aria-label="种族值总和" aria-valuemin="0" aria-valuemax="720" aria-valuenow="${sum(p.stats)}"><i style="width:${Math.min(100,Math.round(sum(p.stats)/7.2))}%"></i></span><span class="bst-n">${sum(p.stats)}</span></div></div>`}
function more(){const chunk=filtered.slice(shown,shown+PAGE);$('#grid').insertAdjacentHTML('beforeend',chunk.map(card).join(''));shown+=chunk.length;$('#more').hidden=shown>=filtered.length;
 if(!filtered.length)$('#grid').innerHTML=`<p class="empty">${favOnly?'还没有收藏，点卡片右上角的 ☆ 收藏吧。':'没有找到符合条件的宝可梦。'}</p>`}
$('#more').onclick=more;
new IntersectionObserver(es=>{if(es[0].isIntersecting&&shown<filtered.length)more()},{root:$('#pane-pokedex'),rootMargin:'600px'}).observe($('#more'));
['#q','#gen','#sort'].forEach(s=>$(s).addEventListener('input',apply));
$('#grid').addEventListener('click',e=>{const f=e.target.closest('[data-fav]');if(f){e.stopPropagation();toggleFav(+f.dataset.fav);return}
 const c=e.target.closest('.card');if(c)location.hash='#/pokemon/'+c.dataset.id});
const setFav=v=>{favOnly=v;$('#favOnly').classList.toggle('on',favOnly);$('#favOnly').setAttribute('aria-pressed',favOnly);$('#favOnly').textContent=(favOnly?'★':'☆')+' 只看收藏'};
$('#favOnly').onclick=()=>{setFav(!favOnly);apply()};
// ---- 筛选面板：世代 / 排序 / 只看收藏 收进一个弹出面板 ----
const fp=$('#filterPanel'), fb=$('#filterBtn');
function badge(){const n=($('#gen').value?1:0)+($('#sort').value!=='id'?1:0)+(favOnly?1:0)+(caughtF?1:0);const b=$('#filterBadge');b.hidden=!n;b.textContent=n;fb.classList.toggle('on',!!n)}
function openFilter(){fp.hidden=false;document.body.classList.add('filter-open');fb.setAttribute('aria-expanded','true');requestAnimationFrame(()=>fp.classList.add('show'))}
function closeFilter(){document.body.classList.remove('filter-open');if(fp.hidden)return;fp.classList.remove('show');fb.setAttribute('aria-expanded','false');fp.hidden=true}
fb.onclick=e=>{e.stopPropagation();fp.hidden?openFilter():closeFilter()};
$('#filterDone').onclick=()=>{closeFilter();fb.focus()};
$('#filterReset').onclick=()=>{$('#gen').value='';$('#sort').value='id';$('#caughtSel').value='';caughtF='';setFav(false);apply()};
$('#caughtSel').addEventListener('input',e=>{caughtF=e.target.value;apply()});
document.addEventListener('pointerdown',e=>{if(!fp.hidden&&!e.target.closest('#filterPanel,#filterBtn'))closeFilter()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!fp.hidden){e.stopPropagation();closeFilter();fb.focus()}},true);
document.addEventListener('favs',e=>{const id=e.detail;document.querySelectorAll(`[data-fav="${id}"]`).forEach(b=>{b.classList.toggle('on',isFav(id));b.textContent=(b.dataset.label?(isFav(id)?'★ 已收藏':'☆ 收藏'):(isFav(id)?'★':'☆'))});
 const s=document.querySelector(`[data-fav="${id}"]`);if(s)s.animate([{transform:'scale(1)'},{transform:'scale(1.5)'},{transform:'scale(1)'}],{duration:420,easing:'cubic-bezier(.34,1.56,.64,1)'});
 if(favOnly)apply()});

// ---- 随机发现（翻牌） ----
let randId=null;
function randomFlip(){const p=LIST[Math.floor(Math.random()*LIST.length)];randId=p.id;const fl=$('#flip');
 const fill=()=>{$('#flipFront').style.setProperty('--c',tcolor(p));$('#flipFront').innerHTML=`<span class="halo"></span><img src="${ART(p.pid)}" alt="${esc(p.name)}" draggable="false"><div class="no">${pad(p.id)}</div><h3>${esc(p.name)}</h3><div class="types">${p.types.map(typeBadge).join('')}</div><div class="muted">${esc(p.genus)} · 种族值 ${sum(p.stats)}</div>`};
 $('#flipBg').classList.add('show');
 if(fl.classList.contains('flipped')){fl.classList.remove('flipped');setTimeout(()=>{fill();fl.classList.add('flipped')},REDUCED?0:420)}
 else{fill();setTimeout(()=>fl.classList.add('flipped'),REDUCED?0:220)}}
$('#randomBtn').onclick=randomFlip;$('#flipAgain').onclick=randomFlip;
const closeFlip=()=>{$('#flipBg').classList.remove('show');$('#flip').classList.remove('flipped')};
$('#flipClose').onclick=closeFlip;$('#flipBg').addEventListener('click',e=>{if(e.target.id==='flipBg')closeFlip()});
$('#flipOpen').onclick=()=>{closeFlip();location.hash='#/pokemon/'+randId};
$('#flip').onclick=()=>{if($('#flip').classList.contains('flipped'))$('#flipOpen').click()};

// ---- 进化链 ----
const EVO=window.EVO_DATA.chains;
function evoHtml(p){const ch=EVO[p.chain];if(!ch||ch.length<2)return '<span class="muted">该宝可梦不会进化。</span>';
 const kids={},root=[];ch.forEach(([id,par,c])=>{if(par&&ch.some(x=>x[0]===par))(kids[par]=kids[par]||[]).push([id,c]);else root.push([id,''])});
 const stages=[];let layer=root;while(layer.length){stages.push(layer);layer=layer.flatMap(([id])=>(kids[id]||[]).map(k=>[...k,id]))}
 return '<div class="evo">'+stages.map((st,i)=>(i?'<span class="evo-arrow">›</span>':'')+`<div class="evo-stage">${st.map(([id,c])=>{const m=PBY[id];return `<a class="evo-item ${id===p.id?'cur':''}" href="#/pokemon/${id}" data-nav="${id}" style="--c:${tcolor(m)}"><img src="${SPR(m.pid)}" alt="" loading="lazy" draggable="false"><b>${esc(m.name)}</b>${c?`<span class="evo-conds">${c.split(' / ').map(v=>`<span class="evo-cond">${v.split(' · ').map(x=>`<i>${esc(x)}</i>`).join('<em>+</em>')}</span>`).join('<span class="evo-or">或</span>')}</span>`:''}</a>`}).join('')}</div>`).join('')+'</div>'}

// ---- 详情面板 ----
const STAT_COLORS=['#ff5f6d','#ff9f5a','#f7cf3b','#6e9bff','#5fd38a','#ff7ab6'];
const sc=$('#sheetContent'), scroll=$('#sheetScroll');
let curId=null, isOpen=false, running=[], pendingFromX=null;
function render(p,formIdx=0){const f=formIdx?p.forms[formIdx-1]:p;const name=formIdx?f.name:p.name;const c=TYPE_BY_ID[f.types[0]].color;
 document.documentElement.style.setProperty('--tint',c);document.documentElement.style.setProperty('--tint-fg',textOn(c));
 const prev=BYID[p.id-1],next=BYID[p.id+1];
 const forms=p.forms.length?`<div class="section"><h3>形态</h3><div class="forms">${[p,...p.forms].map((x,i)=>`<button class="glass-btn form-btn ${i===formIdx?'on':''}" data-i="${i}">${esc(i?x.name:p.name)}</button>`).join('')}</div></div>`:'';
 sc.innerHTML=`<div class="detail-hero" style="--c:${c}"><span class="band" aria-hidden="true"></span>
  ${prev?`<a class="glass-btn round nav-btn prev" href="#/pokemon/${prev.id}" data-nav="${prev.id}" aria-label="上一只">‹</a>`:''}
  <img class="art" draggable="false" src="${ART(f.pid)}" alt="${esc(name)}">${ANIM(f.pid)?`<img class="anim-sp px" src="${ANIM(f.pid)}" alt="${esc(name)} 动态图" loading="lazy" draggable="false" onerror="this.remove()">`:''}
  ${next?`<a class="glass-btn round nav-btn next" href="#/pokemon/${next.id}" data-nav="${next.id}" aria-label="下一只">›</a>`:''}</div>
 <div class="detail-meta"><div class="muted">${pad(p.id)} · ${GEN_CN[p.gen]||''}${p.legendary?' · 传说':''}${p.mythical?' · 幻之宝可梦':''}</div>
  <h2>${esc(name)}</h2><div class="muted">${esc(p.genus)} · ${esc(f.key)}</div>
  <div class="types">${f.types.map(typeBadge).join('')}</div>
  <div class="muted" style="font-size:14px">身高 ${f.height} m · 体重 ${f.weight} kg</div>
  <div class="actions"><button class="glass-btn" data-fav="${p.id}" data-label="1">${isFav(p.id)?'★ 已收藏':'☆ 收藏'}</button><button class="glass-btn${isCaught(p.id)?' on-caught':''}" data-caught="${p.id}">${isCaught(p.id)?'◓ 已抓到':'○ 标记已抓到'}</button><button class="glass-btn" data-act="team">＋ 加入队伍</button><button class="glass-btn" data-act="cmp">⇄ 对比</button></div>
  <div class="swipe-hint">← 左右滑动切换宝可梦 →</div></div>
 ${p.flavor?`<p class="flavor">${esc(p.flavor)}</p>`:''}
 ${forms}
 <div class="section"><h3>进化链</h3>${evoHtml(p)}</div>
 <div class="section"><h3>来源版本</h3><div id="originBox" class="muted">加载中…</div></div>
 <div class="section"><h3>出现地点</h3><div id="encBox" class="muted">加载中…</div></div>
 <div class="section"><h3>种族值（总和 ${sum(f.stats)}）</h3>${f.stats.map((v,i)=>`<div class="stat"><span>${STATN[i]}</span><b>${v==null?'-':v}</b><div class="bar"><i data-w="${Math.min(1,(v||0)/255)}" style="background:linear-gradient(90deg,${STAT_COLORS[i]}cc,${STAT_COLORS[i]})"></i></div></div>`).join('')}</div>
 <div class="section"><h3>特性</h3>${f.abilities.map(a=>`<span class="abil">${esc(a.name)}${a.hidden?' <span class="muted">· 隐藏</span>':''}</span>`).join('')||'<span class="muted">暂无数据</span>'}</div>
 <div class="section"><h3>受到伤害倍率</h3>${effHtml(f.types)}</div>
 <div class="pn">${prev?`<a class="glass-btn" href="#/pokemon/${prev.id}" data-nav="${prev.id}">‹ ${pad(prev.id)} ${esc(prev.name)}</a>`:'<span></span>'}${next?`<a class="glass-btn" href="#/pokemon/${next.id}" data-nav="${next.id}">${pad(next.id)} ${esc(next.name)} ›</a>`:''}</div>`;
 requestAnimationFrame(()=>requestAnimationFrame(()=>sc.querySelectorAll('.bar i').forEach(i=>i.style.transform=`scaleX(${i.dataset.w})`)));
 sc.querySelectorAll('.form-btn').forEach(b=>b.onclick=()=>render(p,+b.dataset.i));
 loadEnc(()=>{if(curId===p.id||!isOpen){fillEnc(p);if(typeof RegionMap!=='undefined'&&(window.ENC_DATA.enc[p.id]||[]).length)RegionMap.decorate($('#encBox'))}});
}
// ---- 出现地点 / 来源版本（数据较大，按需加载） ----
let encState=0;const encCbs=[];
function loadEnc(cb){if(window.ENC_DATA){cb();return}encCbs.push(cb);if(encState)return;encState=1;
 const s=document.createElement('script');s.src='data/encounters.js';s.onload=()=>{encCbs.splice(0).forEach(f=>f())};
 s.onerror=()=>{['#originBox','#encBox'].forEach(q=>{const el=$(q);if(el)el.textContent='出现地点数据加载失败。'});encState=0};document.head.appendChild(s)}
function fillEnc(p){const E=window.ENC_DATA,ob=$('#originBox'),eb=$('#encBox');if(!ob||!eb)return;
 const [intro,dexVgs]=E.origin[p.id]||[0,[]];const vg=E.vgs[intro];
 ob.className='';ob.innerHTML=`<div class="origin"><div><span class="muted small">首次登场</span><b>${GEN_CN[p.gen]||''}${vg?' · 《'+esc(vg.name)+'》':''}</b></div>
  <div><span class="muted small">地区图鉴收录（${dexVgs.length} 个版本组）</span><div class="pills">${dexVgs.length?dexVgs.map(v=>`<span class="pill">${esc(E.vgs[v].name)}</span>`).join(''):'<span class="muted">PokeAPI 暂无地区图鉴收录数据</span>'}</div></div></div>`;
 const rows=E.enc[p.id]||[];const S=E.strings;
 // 行格式：[[版本…], 地点, 方式, 最低等级, 最高等级, 出现率, 条件]；同一地点/方式/等级/出现率的多个版本已在数据中合并为一行
 const byG=new Map();rows.forEach(r=>{const g=E.vgs[E.versions[r[0][0]].vg].gen;if(!byG.has(g))byG.set(g,[]);byG.get(g).push(r)});
 const haveVg=new Set(rows.flatMap(r=>r[0].map(v=>E.versions[v].vg)));const missing=dexVgs.filter(v=>!haveVg.has(v));
 const vtag=v=>`<span class="vtag" title="${esc(E.versions[v].name)}">${esc(E.versions[v].name)}</span>`;
 eb.className='';
 eb.innerHTML=(byG.size?`<div class="rate-legend" aria-label="出现率图例"><span class="muted small">出现率</span>${RATE_LV.map(l=>`<span class="rate ${l.k}">${l.lab}</span>`).join('')}</div>`+
  [...byG.entries()].map(([g,rs],i)=>`<details class="enc-ver"${i===0?' open':''} data-gen="${g}"><summary><b>${GEN_CN[g]||'第'+g+'世代'}</b><span class="muted small">${rs.length} 条</span></summary>
  <div class="enc-list">${rs.map(r=>{const lv=rateLv(r[5]);return `<div class="enc-row" data-versions="${r[0].length}" data-vids="${r[0].join(',')}"><span class="loc">${esc(S[r[1]])}</span><span class="meth">${esc(S[r[2]])}</span><span class="lv">Lv.${r[3]}${r[4]>r[3]?'–'+r[4]:''}</span><span class="rate ${lv.k}" title="出现率 ${r[5]}%（${lv.name}）">${r[5]}%</span><span class="vtags">${r[0].map(vtag).join('')}</span>${r[6]>=0?`<span class="cond">${esc(S[r[6]])}</span>`:''}</div>`}).join('')}</div></details>`).join('')
  :'<p class="muted">该宝可梦暂无野生出现数据（PokeAPI 第八、九世代的出现地点数据较少）。</p>')+
  (missing.length?`<p class="muted small enc-missing">以下版本该宝可梦已收录于图鉴，但暂无野生出现数据：${missing.map(v=>esc(E.vgs[v].name)).join('、')}</p>`:'')+
  (byG.size?'<p class="muted small">地点名称采用官方简体中文译名，无法确认官方译名的保留英文；地点、方式、等级、出现率都相同的版本合并为一行。出现率为同一地点同一方式下各遭遇栏位的合计。</p>':'')}
// 出现率分级：≥20% 常见（绿）、5–19% 一般（中性）、<5% 稀有（灰）
const RATE_LV=[{k:'hi',min:20,name:'常见',lab:'常见 ≥20%'},{k:'mid',min:5,name:'一般',lab:'一般 5–19%'},{k:'lo',min:0,name:'稀有',lab:'稀有 <5%'}];
const rateLv=r=>RATE_LV.find(l=>r>=l.min);
sc.addEventListener('click',e=>{const a=e.target.closest('[data-nav]');if(a){e.preventDefault();location.replace('#/pokemon/'+a.dataset.nav);return}
 const f=e.target.closest('[data-fav]');if(f){toggleFav(+f.dataset.fav);return}
 const cg=e.target.closest('[data-caught]');if(cg){toggleCaught(+cg.dataset.caught);return}
 const act=e.target.closest('[data-act]');if(!act)return;
 if(act.dataset.act==='team'){(typeof Team!=='undefined')&&Team.add(curId)}
 if(act.dataset.act==='cmp'){const id=curId;location.hash='#/compare/'+id+'/'+(((typeof Compare!=='undefined')&&Compare.other(id))||(id===25?6:25))}});
function stopAnims(){running.forEach(a=>a.cancel());running=[]}
function show(id){const p=BYID[id];if(!p)return false;
 const dir=isOpen&&curId!=null?Math.sign(id-curId):0;const fromX=pendingFromX||0;pendingFromX=null;
 stopAnims();
 if(!dir||REDUCED){render(p);sc.style.transform='';sc.style.opacity='';scroll.scrollTop=0}
 else{const w=sc.offsetWidth;sc.style.transform='';sc.style.opacity='';
  const out=sc.animate([{transform:`translate3d(${fromX}px,0,0)`,opacity:1-Math.min(.5,Math.abs(fromX)/700)},{transform:`translate3d(${-dir*w*.55}px,0,0) scale(.96)`,opacity:0}],{duration:170,easing:'cubic-bezier(.4,0,1,1)'});
  running.push(out);
  out.onfinish=()=>{render(p);scroll.scrollTop=0;
   running.push(sc.animate([{transform:`translate3d(${dir*w*.55}px,0,0) scale(.96)`,opacity:0},{transform:'none',opacity:1}],{duration:560,easing:'cubic-bezier(.22,1.28,.36,1)'}))}}
 curId=id;isOpen=true;$('#sheetBg').classList.add('show');document.body.classList.add('tinted');
 document.title=p.name+' · 宝可梦中文图鉴';return true}
function hide(){if(!isOpen)return;isOpen=false;curId=null;$('#sheetBg').classList.remove('show');document.body.classList.remove('tinted')}
function step(d){if(curId&&BYID[curId+d])location.replace('#/pokemon/'+(curId+d))}
let sw=null;
sc.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,select'))return;sw={x:e.clientX,y:e.clientY,t:performance.now(),dx:0,on:false,id:e.pointerId}});
sc.addEventListener('pointermove',e=>{if(!sw||e.pointerId!==sw.id)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;
 if(!sw.on){if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.2){sw.on=true;stopAnims();try{sc.setPointerCapture(e.pointerId)}catch(_){}sc.classList.add('dragging')}else if(Math.abs(dy)>12){sw=null;return}else return}
 const edge=(dx>0&&!BYID[curId-1])||(dx<0&&!BYID[curId+1]);const d=edge?dx*.25:dx;sw.dx=d;
 sc.style.transform=`translate3d(${d}px,0,0) rotate(${d/90}deg)`;sc.style.opacity=1-Math.min(.5,Math.abs(d)/700)});
function endSwipe(e,cancel){if(!sw)return;const s=sw;sw=null;if(!s.on)return;sc.classList.remove('dragging');
 const v=s.dx/Math.max(1,performance.now()-s.t);const t=cancel?null:(s.dx<-80||v<-.6)?curId+1:(s.dx>80||v>.6)?curId-1:null;
 const suppress=ev=>{ev.stopPropagation();ev.preventDefault()};sc.addEventListener('click',suppress,{capture:true,once:true});setTimeout(()=>sc.removeEventListener('click',suppress,{capture:true}),0);
 if(t&&BYID[t]){pendingFromX=s.dx;location.replace('#/pokemon/'+t)}
 else{const from=sc.style.transform;sc.style.transform='';sc.style.opacity='';running.push(sc.animate([{transform:from},{transform:'none'}],{duration:520,easing:'cubic-bezier(.34,1.56,.64,1)'}))}}
sc.addEventListener('pointerup',e=>endSwipe(e,false));sc.addEventListener('pointercancel',e=>endSwipe(e,true));
$('#sheetClose').onclick=()=>{location.hash='#/pokedex'};
$('#sheetBg').addEventListener('click',e=>{if(e.target.id==='sheetBg')location.hash='#/pokedex'});
apply();
document.addEventListener('caught',e=>{const id=e.detail,on=isCaught(id);
 document.querySelectorAll(`.card[data-id="${id}"]`).forEach(c=>c.classList.toggle('caught',on));
 document.querySelectorAll(`[data-caught="${id}"]`).forEach(b=>{b.classList.toggle('on-caught',on);b.textContent=on?'◓ 已抓到':'○ 标记已抓到'});
 toast(on?'已标记抓到 '+BYID[id].name:'已取消标记');if(caughtF)apply()});
// ---- 每日一只：按本地日期取种子，只用真实图鉴说明 ----
function daily(){const d=new Date(),key=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
 let h=key>>>0;h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h=(h^h>>>16)>>>0;
 const pool=LIST.filter(p=>p.flavor),p=pool[h%pool.length],el=$('#daily'),hid=store.get('dailyHide','')===String(key);
 el.dataset.id=p.id;el.style.setProperty('--c',tcolor(p));el.classList.toggle('mini',hid);
 el.innerHTML=hid?`<button class="d-pill" type="button" data-dopen aria-label="展开今日宝可梦">今日 · <b>${esc(p.name)}</b> ›</button>`
  :`<a class="d-main" href="#/pokemon/${p.id}"><img src="${SPR(p.pid)}" alt="" draggable="false"><span class="d-txt"><span class="d-k">今日宝可梦 · ${d.getMonth()+1}月${d.getDate()}日</span><span class="d-n"><b>${esc(p.name)}</b> <span class="muted">${pad(p.id)} · ${esc(p.genus)}</span></span><span class="d-f">${esc(p.flavor)}</span></span></a><button class="d-x" type="button" data-dhide aria-label="收起今日宝可梦">×</button>`;
 el.onclick=e=>{if(e.target.closest('[data-dhide]')){store.set('dailyHide',String(key));daily()}else if(e.target.closest('[data-dopen]')){store.set('dailyHide','');daily()}}}
daily();
return {show,hide,step,closeFilter,daily,get filterOpen(){return !fp.hidden},get open(){return isOpen},get flipOpen(){return $('#flipBg').classList.contains('show')},closeFlip,BYID};
})();
