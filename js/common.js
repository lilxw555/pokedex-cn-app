// 公共工具：属性颜色、玻璃徽章、倍率计算、页脚
const TYPE_COLORS={normal:'#9FA19F',fighting:'#FF8000',flying:'#81B9EF',poison:'#9141CB',ground:'#915121',rock:'#AFA981',bug:'#91A119',ghost:'#704170',steel:'#60A1B8',fire:'#E62829',water:'#2980EF',grass:'#3FA129',electric:'#FAC000',psychic:'#EF4179',ice:'#3DCEF3',dragon:'#5060E1',dark:'#624D4E',fairy:'#EF70EF'};
// 同一属性在全站只用这一种颜色；浅色属性（电、冰、一般……）上的文字自动改用深色，保证对比度
function textOn(hex){const n=parseInt(hex.slice(1),16),c=[n>>16,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});
 const L=.2126*c[0]+.7152*c[1]+.0722*c[2];return (L+.05)/.05>1.05/(L+.05)?'#1d1f24':'#fff'}
const T=window.TYPES_DATA; const TYPE_BY_ID={}; T.types.forEach((t,i)=>{t.idx=i;t.color=TYPE_COLORS[t.key];t.fg=textOn(t.color);TYPE_BY_ID[t.id]=t});
const $=s=>document.querySelector(s);
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function typeOrb(id,withChar){const t=TYPE_BY_ID[id];return `<i class="orb" style="--c:${t.color}">${withChar?t.name[0]:''}</i>`}
function typeBadge(id){const t=TYPE_BY_ID[id];return `<span class="type-badge" data-type="${t.key}" style="--c:${t.color};--fg:${t.fg}">${t.name}</span>`}
function typeChip(t){return `<button class="chip" type="button" data-id="${t.id}" data-type="${t.key}" aria-pressed="false" style="--c:${t.color};--fg:${t.fg}">${typeOrb(t.id,true)}${t.name}</button>`}
function defenseMultipliers(defIds){return T.types.map(a=>({type:a,mult:defIds.reduce((m,d)=>m*T.chart[a.idx][TYPE_BY_ID[d].idx],1)}))}
function effGroups(defIds){const g={4:[],2:[],0.5:[],0.25:[],0:[]};defenseMultipliers(defIds).forEach(({type,mult})=>{if(g[mult])g[mult].push(type.id)});return g}
const EFF_LABELS={'4':'4× 弱点','2':'2× 弱点','0.5':'½× 抵抗','0.25':'¼× 抵抗','0':'0× 免疫'};
function effHtml(defIds){const g=effGroups(defIds);
 return ['4','2','0.5','0.25','0'].map(k=>`<div class="eff-row" data-mult="${k}"><b>${EFF_LABELS[k]}</b><div class="list">${g[k].length?g[k].map(typeBadge).join(''):'<span class="muted">无</span>'}</div></div>`).join('')}
const FOOTER=`<footer>数据来源：<a href="https://pokeapi.co" target="_blank" rel="noopener">PokeAPI</a>（<a href="https://github.com/PokeAPI/pokeapi" target="_blank" rel="noopener">开源数据</a>），图片来自 <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noopener">PokeAPI/sprites</a>。<br>Pokémon 及相关名称 © Nintendo / Creatures Inc. / GAME FREAK inc. / The Pokémon Company。本站为粉丝制作的非商业网站，与上述公司无关。<br><a href="privacy.html">隐私政策</a> · <a href="copyright.html">版权与免责声明</a> · <a href="https://github.com/lilxw555/pokedex-cn-app" target="_blank" rel="noopener">源代码</a></footer>`;
document.querySelectorAll('.pane-inner').forEach(p=>p.insertAdjacentHTML('beforeend',FOOTER));

// ---- 宝可梦公共数据与工具 ----
const PD=window.POKEMON_DATA, PLIST=PD.pokemon, STATN=PD.stat_names, PBY={};PLIST.forEach(p=>PBY[p.id]=p);
// 图片：优先 jsDelivr CDN（国内通常比 raw.githubusercontent.com 更容易访问），失败时回退到 GitHub 原始地址，官方立绘再失败则回退到像素图
// 图片优先使用本站自带的压缩图（国内也能打开），失败时依次尝试多个 CDN 镜像；远程请求 6 秒没响应也自动换下一个
const IMG_CDN='https://fastly.jsdelivr.net/gh/PokeAPI/sprites@master/';
const IMG_MIRRORS=[IMG_CDN,'https://gcore.jsdelivr.net/gh/PokeAPI/sprites@master/','https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/','https://raw.githubusercontent.com/PokeAPI/sprites/master/'];
const SPR=id=>'img/spr/'+id+'.png';
// 动态图（img/anim/<编号>.gif，第 1–649 号取自黑白版动画，其余为 Showdown 动画）；没有的返回 null
const ANIM_BITS='11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111000000111111111101010111111011110000';
const ANIM=id=>id>=1&&id<=1025&&ANIM_BITS.charAt(id-1)==='1'?'img/anim/'+id+'.gif':null;
const ART=id=>'img/art/'+id+'.webp';
function imgPath(s){let m;if((m=s.match(/(?:^|\/)img\/spr\/(\d+)\.png$/)))return 'sprites/pokemon/'+m[1]+'.png';
 if((m=s.match(/(?:^|\/)img\/art\/(\d+)\.webp$/)))return 'sprites/pokemon/other/official-artwork/'+m[1]+'.png';
 if((m=s.match(/(?:^|\/)img\/item\/([\w-]+)\.png$/)))return 'sprites/items/'+m[1]+'.png';
 for(const b of IMG_MIRRORS)if(s.indexOf(b)===0)return s.slice(b.length);return null}
function imgNext(t){const s=t.getAttribute('src')||'',path=imgPath(s);if(!path){t.style.visibility='hidden';return}
 let i=+(t.dataset.mi||-1)+1;
 if(i<IMG_MIRRORS.length){t.dataset.mi=i;t.src=IMG_MIRRORS[i]+path;clearTimeout(t._to);
  t._to=setTimeout(()=>{if(!t.complete||!t.naturalWidth)imgNext(t)},6000);return}
 const m=path.match(/official-artwork\/(\d+)\.png$/);
 if(m&&!t.dataset.px){t.dataset.px=1;t.dataset.mi=-1;t.src=SPR(m[1]);return}
 t.style.visibility='hidden'}
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG')imgNext(t)},true);
document.addEventListener('load',e=>{const t=e.target;if(t&&t.tagName==='IMG')clearTimeout(t._to)},true);
const GEN_CN=['','第一世代','第二世代','第三世代','第四世代','第五世代','第六世代','第七世代','第八世代','第九世代'];
const sum=a=>a.reduce((x,y)=>x+(y||0),0), pad=n=>'#'+String(n).padStart(4,'0');
const tcolor=p=>TYPE_BY_ID[p.types[0]].color;
const store={get(k,d){try{return (v=>v==null?d:v)(JSON.parse(localStorage.getItem('pkdx-'+k)))}catch(_){return d}},set(k,v){try{localStorage.setItem('pkdx-'+k,JSON.stringify(v))}catch(_){}}};
// 收藏
const FAV=new Set(store.get('favs',[]));
function isFav(id){return FAV.has(id)}
// 收集：已抓到（本机保存）
const CAUGHT=new Set(store.get('caught',[]));const isCaught=id=>CAUGHT.has(id);
function toggleCaught(id){CAUGHT.has(id)?CAUGHT.delete(id):CAUGHT.add(id);store.set('caught',[...CAUGHT]);document.dispatchEvent(new CustomEvent('caught',{detail:id}))}
// exe / apk 内不显示“下载”入口
const IS_APP=/Electron|PokedexCN-App/.test(navigator.userAgent);if(IS_APP)document.documentElement.classList.add('is-app');
// 按需加载 data/*.js（file:// 下也能用）
const _ld={};function loadData(name,cb){const v=window[name];if(v){cb(v);return}const k=name;if(_ld[k]){_ld[k].push(cb);return}_ld[k]=[cb];
 const s=document.createElement('script');s.src='data/'+{MAP_DATA:'maps',BATTLE_DATA:'battle',ABIL_DATA:'abilities',ITEM_DATA:'items',ENC_DATA:'encounters'}[name]+'.js';
 s.onload=()=>{const l=_ld[k];delete _ld[k];l.forEach(f=>f(window[name]))};s.onerror=()=>{const l=_ld[k];delete _ld[k];l.forEach(f=>f(null))};document.head.appendChild(s)}
function toggleFav(id){FAV.has(id)?FAV.delete(id):FAV.add(id);store.set('favs',[...FAV]);document.dispatchEvent(new CustomEvent('favs',{detail:id}))}
function searchMons(q,limit=8){q=q.trim();if(!q)return [];const n=q.replace('#','');
 if(/^\d+$/.test(n)){const s=n.replace(/^0+/,'');return PLIST.filter(p=>String(p.id).startsWith(s)).sort((a,b)=>(b.id==+s)-(a.id==+s)||a.id-b.id).slice(0,limit)}
 const ql=q.toLowerCase();return PLIST.filter(p=>p.name.includes(q)||p.key.includes(ql)).sort((a,b)=>(b.name===q)-(a.name===q)||(b.name.startsWith(q))-(a.name.startsWith(q))||a.id-b.id).slice(0,limit)}
// 玻璃下拉选择器
function picker(input,onPick){const box=input.parentElement.querySelector('.suggest');let items=[],hi=0;
 const draw=()=>{box.innerHTML=items.map((p,i)=>`<button type="button" class="sg ${i===hi?'hi':''}" data-id="${p.id}"><img src="${SPR(p.pid)}" alt="" loading="lazy"><span>${esc(p.name)}</span><small>${pad(p.id)}</small></button>`).join('');box.hidden=!items.length};
 input.addEventListener('input',()=>{items=searchMons(input.value);hi=0;draw()});
 input.addEventListener('keydown',e=>{if(box.hidden)return;if(e.key==='ArrowDown'){hi=(hi+1)%items.length;draw();e.preventDefault()}else if(e.key==='ArrowUp'){hi=(hi-1+items.length)%items.length;draw();e.preventDefault()}else if(e.key==='Enter'&&items[hi]){pick(items[hi].id)}else if(e.key==='Escape'){box.hidden=true}});
 const pick=id=>{box.hidden=true;items=[];input.value='';onPick(PBY[id])};
 box.addEventListener('pointerdown',e=>e.preventDefault());
 box.addEventListener('click',e=>{const b=e.target.closest('.sg');if(b)pick(+b.dataset.id)});
 input.addEventListener('blur',()=>setTimeout(()=>box.hidden=true,120));}
function toast(msg){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast glass strong';document.body.appendChild(t)}
 t.textContent=msg;t.classList.remove('show');void t.offsetWidth;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2200)}
