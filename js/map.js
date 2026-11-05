// 地区地图：原创示意图（SVG），点地点 → 该地点出现的宝可梦（可按版本筛选）
const RegionMap=(()=>{
let MD=null,inited=false,reg=null,sel='',ver='',vb=null;
const $$=(q,r)=>Array.prototype.slice.call((r||document).querySelectorAll(q));
const KIND={city:'城镇',cave:'洞窟',forest:'森林 / 草原',lake:'湖泊 / 海域',spot:'地标',mt:'山地'};
function parseHash(){const m=location.hash.match(/^#\/tools\/map\/(\w+)(?:\/([\w-]+))?/);return m?{r:m[1],l:m[2]||''}:{r:'',l:''}}
function setHash(){const h='#/tools/map/'+reg.k+(sel?'/'+sel:'');if(location.hash!==h)history.replaceState(history.state,'',h)}
function encOf(id){const rows=(reg.enc[id]||[]);return ver?rows.filter(r=>r[3].indexOf(+ver)>=0):rows}
function shape(n){const [id,x,y,kind]=n,has=encOf(id).length>0,c=has?' has':'';
 if(kind==='city')return `<rect class="mn city${c}" x="${x-2.2}" y="${y-2.2}" width="4.4" height="4.4" rx="1"/>`;
 if(kind==='cave')return `<path class="mn cave${c}" d="M${x-2.2} ${y+1.8}L${x} ${y-2}L${x+2.2} ${y+1.8}Z"/>`;
 if(kind==='mt')return `<path class="mn mt${c}" d="M${x-3} ${y+2}L${x-.8} ${y-2.2}L${x+.4} ${y-.6}L${x+1.2} ${y-1.6}L${x+3} ${y+2}Z"/>`;
 if(kind==='forest')return `<circle class="mn forest${c}" cx="${x}" cy="${y}" r="2.2"/>`;
 if(kind==='lake')return `<ellipse class="mn lake${c}" cx="${x}" cy="${y}" rx="3" ry="1.9"/>`;
 return `<path class="mn spot${c}" d="M${x} ${y-1.9}L${x+1.9} ${y}L${x} ${y+1.9}L${x-1.9} ${y}Z"/>`}
function draw(){const H=reg.h;const svg=$('#mapSvg');vb=vb||[-3,-3,106,H+10];
 const land=`<rect class="m-sea" x="-20" y="-20" width="140" height="${H+40}"/><rect class="m-land" x="-1" y="-1" width="102" height="${H+2}" rx="5"/>`;
 const rt=reg.routes.map(r=>{const d='M'+r[1].map(p=>p.join(' ')).join('L'),has=encOf(r[0]).length>0;
  return `<g class="mr${r[3]?' water':''}${has?' has':''}${sel===r[0]?' on':''}" data-loc="${r[0]}" tabindex="0" role="button" aria-label="${esc(r[2])}"><path class="hit" d="${d}"/><path class="ln" d="${d}"/></g>`}).join('');
 const nd=reg.nodes.map(n=>`<g class="mnode${sel===n[0]?' on':''}" data-loc="${n[0]}" tabindex="0" role="button" aria-label="${esc(n[4])}（${KIND[n[3]]}）"><circle class="hit" cx="${n[1]}" cy="${n[2]}" r="4"/>${shape(n)}${n[3]==='city'?`<text transform="scale(.25)" x="${n[1]*4}" y="${(n[2]+5.4)*4}" font-size="10">${esc(n[4])}</text>`:''}</g>`).join('');
 svg.innerHTML=land+rt+nd;svg.setAttribute('viewBox',vb.join(' '));}
function zoom(f,cx,cy){const H=reg.h,w=Math.max(25,Math.min(106,vb[2]*f)),h=w*(H+10)/106;cx=cx==null?vb[0]+vb[2]/2:cx;cy=cy==null?vb[1]+vb[3]/2:cy;
 const rx=(cx-vb[0])/vb[2],ry=(cy-vb[1])/vb[3];vb=[cx-rx*w,cy-ry*h,w,h];clampVb();$('#mapSvg').setAttribute('viewBox',vb.join(' '))}
function clampVb(){const H=reg.h;vb[0]=Math.max(-3,Math.min(103-vb[2],vb[0]));vb[1]=Math.max(-3,Math.min(H+7-vb[3],vb[1]))}
function pick(id,scroll){sel=id;setHash();$$('#mapSvg .on').forEach(e=>e.classList.remove('on'));const g=$(`#mapSvg [data-loc="${id}"]`);if(g)g.classList.add('on');panel(scroll)}
function nameOf(id){const n=reg.nodes.find(x=>x[0]===id);if(n)return [n[4],KIND[n[3]]];const r=reg.routes.find(x=>x[0]===id);return r?[r[2],r[3]?'水路':'道路']:['',''];}
function panel(scroll){const el=$('#mapPanel');if(!sel){el.innerHTML=`<p class="muted small">点地图上的城镇、道路或洞窟，查看在那里能遇到的宝可梦。实线是道路，蓝色虚线是水路；颜色较深的地点有出现数据。</p>`;return}
 const [nm,kind]=nameOf(sel),rows=encOf(sel),all=(reg.enc[sel]||[]).length;
 el.innerHTML=`<div class="mp-head"><div><b>${esc(nm)}</b><span class="muted small">${kind}${all?` · ${rows.length} 种宝可梦`:''}</span></div><button class="glass-btn" id="mapClose" type="button" aria-label="关闭">×</button></div>`+
 (rows.length?`<div class="mp-list">${rows.map(r=>{const p=PBY[r[0]];if(!p)return '';return `<a class="mp-mon" href="#/pokemon/${p.id}" style="--c:${tcolor(p)}"><img class="px" src="${SPR(p.pid)}" alt="" loading="lazy"><span><b>${esc(p.name)}</b><small>Lv.${r[1]}${r[2]>r[1]?'–'+r[2]:''}</small><small class="mp-v">${r[3].map(v=>esc(MD.vn[v]||'')).join(' · ')}</small></span></a>`}).join('')}</div>`
  :`<p class="muted small">${all?'所选版本中这里没有野生宝可梦出现数据。':(reg.k==='paldea'?'PokeAPI 目前没有帕底亚地区的野生出现数据。':'这里没有野生宝可梦出现数据（可能是城镇、剧情地点，或 PokeAPI 暂无数据）。')}</p>`);
 if(scroll)el.scrollIntoView({block:'nearest',behavior:'smooth'})}
function setRegion(k,l){reg=MD.regions.find(r=>r.k===k)||MD.regions[0];sel=l&&(reg.enc[l]||reg.nodes.some(n=>n[0]===l)||reg.routes.some(r=>r[0]===l))?l:'';vb=null;
 if(ver&&reg.vers.indexOf(+ver)<0)ver='';
 $$('#mapRegions button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.r===reg.k?'true':'false'));
 $('#mapGames').textContent=reg.games.map(g=>g[0]).join(' · ');
 $('#mapVer').innerHTML='<option value="">全部版本</option>'+reg.vers.map(v=>`<option value="${v}"${String(v)===ver?' selected':''}>${esc(MD.vn[v]||v)}</option>`).join('');
 $('#mapVer').disabled=!reg.vers.length;
 const linked=Object.keys(reg.enc).length,total=reg.nodes.length+reg.routes.length;
 $('#mapStat').textContent=`${total} 个地点 · ${linked} 个有出现数据`;
 draw();setHash();panel(false);if(sel){const g=$(`#mapSvg [data-loc="${sel}"]`);if(g){const n=reg.nodes.find(x=>x[0]===sel);if(n){vb=[-3,-3,106,reg.h+10];zoom(.6,n[1],n[2])}}}
 const b=$(`#mapRegions [data-r="${reg.k}"]`);if(b&&b.scrollIntoView)b.scrollIntoView({block:'nearest',inline:'center'})}
function bind(){const svg=$('#mapSvg');
 $('#mapRegions').addEventListener('click',e=>{const b=e.target.closest('[data-r]');if(b){ver=$('#mapVer').value;setRegion(b.dataset.r,'')}});
 $('#mapVer').addEventListener('change',e=>{ver=e.target.value;draw();panel(false)});
 $('#mapPanel').addEventListener('click',e=>{if(e.target.closest('#mapClose')){sel='';setHash();draw();panel(false)}});
 $('#mapZin').onclick=()=>zoom(.7);$('#mapZout').onclick=()=>zoom(1/.7);$('#mapZreset').onclick=()=>{vb=null;draw()};
 svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const g=e.target.closest('[data-loc]');if(g){e.preventDefault();pick(g.dataset.loc,true)}}});
 // 拖动 / 双指缩放 / 滚轮缩放
 const pts=new Map();let start=null,moved=false;
 const toSvg=(cx,cy)=>{const r=svg.getBoundingClientRect();return [vb[0]+(cx-r.left)/r.width*vb[2],vb[1]+(cy-r.top)/r.height*vb[3]]};
 svg.addEventListener('pointerdown',e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);moved=false;start={vb:vb.slice(),pts:new Map(pts)};});
 svg.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId)||!start)return;pts.set(e.pointerId,[e.clientX,e.clientY]);const r=svg.getBoundingClientRect();
  if(pts.size===1){const p0=start.pts.get(e.pointerId);if(!p0)return;const dx=e.clientX-p0[0],dy=e.clientY-p0[1];if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(!moved||start.vb[2]>=106)return;
   e.preventDefault();vb=[start.vb[0]-dx/r.width*start.vb[2],start.vb[1]-dy/r.height*start.vb[3],start.vb[2],start.vb[3]];clampVb();svg.setAttribute('viewBox',vb.join(' '))}
  else if(pts.size===2&&start.pts.size===2){const a=[...start.pts.values()],b=[...pts.values()];const d0=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]),d1=Math.hypot(b[0][0]-b[1][0],b[0][1]-b[1][1]);
   if(d0>10){moved=true;const c=toSvg((b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2);vb=start.vb.slice();zoom(d0/d1,c[0],c[1])}}});
 const up=e=>{pts.delete(e.pointerId);if(!pts.size)start=null;else start={vb:vb.slice(),pts:new Map(pts)}};
 svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
 svg.addEventListener('click',e=>{if(moved){moved=false;return}const g=e.target.closest('[data-loc]');if(g)pick(g.dataset.loc,true)});
 svg.addEventListener('wheel',e=>{if(!e.ctrlKey&&Math.abs(e.deltaY)<1)return;e.preventDefault();const c=toSvg(e.clientX,e.clientY);zoom(e.deltaY>0?1.15:.87,c[0],c[1])},{passive:false});
 window.addEventListener('hashchange',()=>{const h=parseHash();if(h.r&&MD&&(!reg||h.r!==reg.k||h.l!==sel))setRegion(h.r,h.l)})}
function init(){const h=parseHash();if(inited){if(MD&&h.r&&(!reg||h.r!==reg.k||h.l!==sel))setRegion(h.r,h.l);else if(MD&&reg)setHash();return}inited=true;
 $('#mapPanel').innerHTML='<p class="muted">加载地图…</p>';
 loadData('MAP_DATA',d=>{if(!d){$('#mapPanel').innerHTML='<p class="muted">地图数据加载失败。</p>';return}MD=d;
  $('#mapRegions').innerHTML=MD.regions.map(r=>`<button type="button" class="chip" data-r="${r.k}" aria-pressed="false">${r.name}</button>`).join('');
  bind();setRegion(h.r||store.get('mapRegion','kanto'),h.l)})}
// 图鉴详情页：给出现地点加「地图」链接（只在地图数据已加载或加载后补上）
function find(name,versions){if(!MD)return null;const base=name.replace(/（.*$/,'');for(const r of MD.regions){if(!versions.some(v=>r.vers.indexOf(v)>=0))continue;
  const n=r.nodes.find(x=>x[4]===base&&r.enc[x[0]])||r.routes.find(x=>x[2]===base&&r.enc[x[0]]);if(n)return '#/tools/map/'+r.k+'/'+n[0]}return null}
function decorate(box){loadData('MAP_DATA',d=>{if(!d)return;MD=MD||d;$$('.enc-row',box).forEach(row=>{if(row.querySelector('.map-link'))return;const loc=row.querySelector('.loc');const vs=(row.dataset.vids||'').split(',').map(Number);
  const h=loc&&find(loc.textContent,vs);if(h)loc.insertAdjacentHTML("beforeend",`<a class="map-link" href="${h}" aria-label="在地图上查看" title="在地图上查看"></a>`)})})}
return {init,decorate,find,get region(){return reg&&reg.k},get sel(){return sel},pick:id=>pick(id,false),setVer(v){ver=String(v);$('#mapVer').value=ver;draw();panel(false)}};
})();
