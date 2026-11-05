// 对战模拟：原创的复古像素风回合制小游戏（界面全部用 CSS 绘制，精灵图为站内 img/spr）
const Battle=(()=>{
const MV={};window.MOVES_DATA.moves.forEach(m=>MV[m.id]=m);
const MVK={};window.MOVES_DATA.moves.forEach(m=>MVK[m.key]=m);
let BD=null,inited=false,team=[],B=null,speed=1;
// 不适合本游戏简化规则的招式（需要蓄力 / 硬直 / 依赖特殊条件 / 自爆等）
const BAN=new Set(['hyper-beam','giga-impact','solar-beam','solar-blade','sky-attack','focus-punch','explosion','self-destruct','dream-eater','fly','dig','dive','bounce','phantom-force','shadow-force','skull-bash','razor-wind','future-sight','doom-desire','blast-burn','hydro-cannon','frenzy-plant','roar-of-time','rock-wrecker','prismatic-laser','eternabeam','meteor-assault','last-resort','snore','belch','synchronoise','fling','natural-gift','spit-up','steel-beam','mind-blown','misty-explosion','fake-out','first-impression','counter','mirror-coat','metal-burst','bide','endeavor','final-gambit','struggle','memento','sky-drop','freeze-shock','ice-burn','geomancy','meteor-beam','electro-shot','outrage','petal-dance','thrash','uproar','rollout','ice-ball','sucker-punch','thunderclap','hyperspace-fury','dragon-energy','water-spout','eruption','shell-trap','beak-blast','burn-up','double-shock','gigaton-hammer','blood-moon','upper-hand','dynamax-cannon','behemoth-blade','behemoth-bash','sonic-boom','dragon-rage','night-shade','seismic-toss','super-fang','psywave','guillotine','horn-drill','fissure','sheer-cold','low-kick','grass-knot','heavy-slam','heat-crash','electro-ball','gyro-ball','reversal','flail','return','frustration','present','magnitude','beat-up','trump-card','wring-out','crush-grip','punishment','stored-power','power-trip','acrobatics','hex','venoshock','brine','assurance','payback','revenge','avalanche','retaliate','round','echoed-voice','fury-cutter','spit-up','hidden-power','weather-ball','terrain-pulse','rage','pursuit','smelling-salts','wake-up-slap','facade','knock-off','foul-play','body-press','tera-blast','expanding-force','rising-voltage','grav-apple','misty-explosion','lash-out','rage-fist','last-respects','temper-flare','collision-course','electro-drift']);
const STATUS_OK=new Set(['thunder-wave','will-o-wisp','toxic','spore','sleep-powder','hypnosis','stun-spore','glare','poison-powder','sing','lovely-kiss','grass-whistle','dark-void','poison-gas','nuzzle','recover','roost','soft-boiled','slack-off','milk-drink','synthesis','moonlight','morning-sun','shore-up','heal-order','rest']);
const meta=id=>(BD&&BD.meta[id])||[0,0,0,0,0,0,0,0,0];
const AIL={1:'par',2:'slp',4:'brn',5:'psn'},AILN={par:'麻痹',slp:'睡眠',brn:'灼伤',psn:'中毒'};
const usable=m=>m&&!BAN.has(m.key)&&(m.cat!=='status'?m.power>1:STATUS_OK.has(m.key));
const eff=(t,types)=>types.reduce((x,d)=>x*T.chart[TYPE_BY_ID[t].idx][TYPE_BY_ID[d].idx],1);
const mon=id=>PBY[id];
function learn(p){const l=BD&&BD.ls[p.pid];return (l||[]).map(i=>MV[i]).filter(usable)}
// 自动选 4 招：先选本系最强招式，再补打击面，最后可带 1 个状态招式
function autoMoves(p){const L=learn(p);if(!L.length)return [MVK.tackle.id];
 const score=m=>m.power*(m.acc||100)/100*(p.types.includes(m.type)?1.5:1)*(p.stats[m.cat==='physical'?1:3]/100);
 const dmg=L.filter(m=>m.cat!=='status').sort((a,b)=>score(b)-score(a)),pick=[];
 p.types.forEach(t=>{const m=dmg.find(x=>x.type===t&&!pick.includes(x));if(m)pick.push(m)});
 const cov=()=>{const s=new Set();pick.forEach(m=>T.types.forEach(t=>{if(eff(m.type,[t.id])>1)s.add(t.id)}));return s};
 while(pick.length<3){let best=null,bv=-1;const c=cov();dmg.forEach(m=>{if(pick.includes(m)||pick.some(x=>x.type===m.type))return;let n=0;T.types.forEach(t=>{if(eff(m.type,[t.id])>1&&!c.has(t.id))n++});const v=n*60+score(m);if(v>bv){bv=v;best=m}});if(!best)break;pick.push(best)}
 const st=L.find(m=>m.cat==='status'&&['spore','thunder-wave','will-o-wisp','toxic','sleep-powder','recover','roost','slack-off','soft-boiled'].indexOf(m.key)>=0);
 if(st&&pick.length<4)pick.push(st);
 dmg.forEach(m=>{if(pick.length<4&&!pick.includes(m))pick.push(m)});
 return pick.slice(0,4).map(m=>m.id)}
const save=()=>store.set('btTeam',team);
function add(p){if(team.length>=6){toast('队伍最多 6 只');return}team.push({id:p.id,moves:autoMoves(p)});save();drawTeam()}
function randomTeam(n,level){const pool=PLIST.filter(p=>{const b=sum(p.stats);if(level===0)return !p.legendary&&!p.mythical&&b<470;if(level===2)return b>=500&&!p.mythical;return !p.legendary&&!p.mythical&&b>=380});
 const out=[];while(out.length<n){const p=pool[Math.floor(Math.random()*pool.length)];if(!out.some(x=>x.id===p.id)&&learn(p).length)out.push({id:p.id,moves:autoMoves(p)})}return out}
function drawTeam(){const el=$('#btTeam');
 if(!team.length){el.innerHTML='<p class="muted bt-empty">还没有队员。搜索添加，或点「随机队伍」。</p>';$('#btGo').disabled=true;return}
 $('#btGo').disabled=false;
 el.innerHTML=team.map((t,i)=>{const p=mon(t.id),L=learn(p);return `<div class="bt-mem" style="--c:${tcolor(p)}"><img class="px" src="${SPR(p.pid)}" alt="" draggable="false"><div class="bt-mi"><b>${esc(p.name)}</b><span class="types">${p.types.map(typeBadge).join('')}</span></div>
  <button class="bt-rm" data-rm="${i}" type="button" aria-label="移出 ${esc(p.name)}">×</button>
  <div class="bt-moves">${[0,1,2,3].map(k=>{const m=MV[t.moves[k]];return `<label class="bt-mv" style="--c:${m?TYPE_BY_ID[m.type].color:'#999'}"><span class="sr-only">招式 ${k+1}</span><select data-i="${i}" data-k="${k}"><option value="">—</option>${L.map(x=>`<option value="${x.id}"${m&&x.id===m.id?' selected':''}>${esc(x.name)}${x.cat==='status'?'（变化）':' '+x.power}</option>`).join('')}</select></label>`}).join('')}</div></div>`}).join('')}
// ---------- 对战 ----------
function mk(t){const p=mon(t.id),s=p.stats,f=b=>Math.floor((2*b+31+21)*50/100);
 const hp=s[0]===1?1:f(s[0])+60;return {p,hp,max:hp,st:[hp,f(s[1])+5,f(s[2])+5,f(s[3])+5,f(s[4])+5,f(s[5])+5],moves:t.moves.filter(id=>MV[id]).map(id=>({m:MV[id],pp:MV[id].pp||10})),status:null,slp:0,out:false}}
const wait=ms=>new Promise(r=>setTimeout(r,ms*speed));
let tapRes=null;
function say(txt,ms){B.log.push(txt);const box=$('#btText');if(box){box.innerHTML=`<span>${esc(txt)}</span><i class="bt-arrow" aria-hidden="true">▼</i>`}
 const lg=$('#btLog');if(lg)lg.insertAdjacentHTML('beforeend',`<li>${esc(txt)}</li>`);
 return new Promise(r=>{let done=false;const fin=()=>{if(done)return;done=true;tapRes=null;r()};tapRes=fin;setTimeout(fin,(ms||1100)*speed)})}
function hpCls(f){return f>.5?'g':f>.2?'y':'r'}
function drawBox(side){const m=B[side][B.act[side]],el=$('#bt-'+side+'-box');if(!el)return;const f=m.hp/m.max;
 el.innerHTML=`<div class="bt-nm"><b>${esc(m.p.name)}</b><span>Lv.50</span></div><div class="bt-hp"><em>HP</em><span class="bt-bar"><i class="${hpCls(f)}" style="width:${f*100}%"></i></span></div>${side==='me'?`<div class="bt-hpn">${m.hp} / ${m.max}</div>`:''}<div class="bt-foot">${m.status?`<span class="bt-st ${m.status}">${AILN[m.status]}</span>`:'<span></span>'}<span class="bt-balls">${B[side].map(x=>`<i class="${x.hp<=0?'ko':''}"></i>`).join('')}</span></div>`;
 const balls=null;if(balls)balls.innerHTML=B[side].map(x=>`<i class="${x.hp<=0?'ko':''}"></i>`).join('')}
function drawMon(side,anim){const m=B[side][B.act[side]],img=$('#bt-'+side+'-img');const an=ANIM(m.p.pid);img.onerror=an?()=>{img.onerror=null;img.src=SPR(m.p.pid)}:null;img.onload=()=>{const fw=img.parentNode.clientWidth||300;img.style.width=Math.round(img.naturalWidth*fw/256*(side==='me'?1.3:1))+'px'};img.src=an||SPR(m.p.pid);img.classList.toggle('anim',!!an);img.alt=m.p.name;img.className='px bt-sprite '+side+(anim?' '+anim:'')+(an?' anim':'');img.style.opacity='';drawBox(side)}
function cry(m){if(!$('#btSound')||!$('#btSound').checked)return;try{const a=new Audio('cries/'+m.p.id+'.mp3');a.volume=.35;const pr=a.play();if(pr&&pr.catch)pr.catch(()=>{})}catch(_){}}
function arena(){$('#btArena').innerHTML=`<div class="bt-screen" id="btScreen">
  <div class="bt-field"><div class="bt-sky"></div><div class="bt-ground"></div>
   <div class="bt-plat foe"></div><div class="bt-plat me"></div>
   <img id="bt-foe-img" class="px bt-sprite foe" alt="" draggable="false"><img id="bt-me-img" class="px bt-sprite me" alt="" draggable="false">
   <div class="bt-box foe" id="bt-foe-box"></div><div class="bt-box me" id="bt-me-box"></div></div>
  <div class="bt-text" id="btText" role="status" aria-live="polite" tabindex="0" aria-label="对战消息（点按或按回车继续）"></div>
  <div class="bt-menu" id="btMenu"></div></div>
  <details class="bt-logbox"><summary>对战记录</summary><ol id="btLog"></ol></details>`;
 $('#btScreen').addEventListener('click',e=>{if(e.target.closest('#btText')&&tapRes)tapRes()});
 $('#btScreen').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.id==='btText'&&tapRes){e.preventDefault();tapRes()}
  if(e.key==='Escape'){const b=$('#btMenu .bt-back');if(b){e.preventDefault();e.stopPropagation();b.click()}}})}
function menu(html){const el=$('#btMenu'),had=el.contains(document.activeElement);el.innerHTML=html;const f=el.querySelector('button:not([disabled])');if(f&&had)f.focus({preventScroll:true})}
function cmdMenu(){return new Promise(res=>{const m=B.me[B.act.me];
 $('#btText').innerHTML=`<span>${esc(m.p.name)} 要怎么做？</span>`;
 menu(`<div class="bt-cmd"><button data-c="fight" type="button">战斗</button><button data-c="mon" type="button">宝可梦</button><button data-c="run" type="button">逃跑</button></div>`);
 $('#btMenu').onclick=async e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.c==='fight')res(await moveMenu());else if(b.dataset.c==='mon'){const i=await switchMenu(false);res(i==null?await cmdMenu():{sw:i})}else if(b.dataset.c==='run')res({run:true})}})}
function moveMenu(){return new Promise(res=>{const m=B.me[B.act.me],foe=B.foe[B.act.foe];
 menu(`<div class="bt-moves-menu">${m.moves.map((x,i)=>{const e=x.m.cat==='status'?1:eff(x.m.type,foe.p.types);return `<button data-m="${i}" type="button" style="--c:${TYPE_BY_ID[x.m.type].color};--fg:${TYPE_BY_ID[x.m.type].fg}" ${x.pp<=0?'disabled':''}><b>${esc(x.m.name)}</b><span><i class="t">${TYPE_BY_ID[x.m.type].name}</i>PP ${x.pp}/${x.m.pp||10}${x.m.cat!=='status'&&e!==1?`<i class="e">${e>1?'拔群':e===0?'无效':'不好'}</i>`:''}</span></button>`}).join('')}<button class="bt-back" data-m="back" type="button">‹ 返回</button></div>`);
 $('#btMenu').onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.m==='back'){cmdMenu().then(res);return}res({mv:+b.dataset.m})}})}
function switchMenu(forced){return new Promise(res=>{
 menu(`<div class="bt-switch">${B.me.map((m,i)=>{const f=m.hp/m.max;return `<button data-s="${i}" type="button" ${m.hp<=0||i===B.act.me?'disabled':''}><img class="px" src="${SPR(m.p.pid)}" alt=""><span><b>${esc(m.p.name)}</b><span class="bt-bar"><i class="${hpCls(f)}" style="width:${f*100}%"></i></span><small>${m.hp}/${m.max}${m.status?' · '+AILN[m.status]:''}${i===B.act.me?' · 场上':''}</small></span></button>`}).join('')}${forced?'':'<button class="bt-back" data-s="back" type="button">‹ 返回</button>'}</div>`);
 $('#btText').innerHTML=`<span>${forced?'要派出哪只宝可梦？':'要换上哪只宝可梦？'}</span>`;
 $('#btMenu').onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;res(b.dataset.s==='back'?null:+b.dataset.s)}})}
function calc(a,d,mv,crit,roll){const phys=mv.cat==='physical';let A=a.st[phys?1:3],D=d.st[phys?2:4];
 let dmg=Math.floor(Math.floor(Math.floor(2*50/5+2)*mv.power*A/D)/50)+2;if(crit)dmg=Math.floor(dmg*1.5);dmg=Math.floor(dmg*roll/100);
 if(a.p.types.includes(mv.type))dmg=Math.floor(dmg*1.5);const e=eff(mv.type,d.p.types);dmg=Math.floor(dmg*e);if(phys&&a.status==='brn')dmg=Math.floor(dmg/2);
 return {dmg:e>0?Math.max(1,dmg):0,e}}
// 电脑选择
function aiPick(){const lv=B.level,a=B.foe[B.act.foe],d=B.me[B.act.me];const ok=a.moves.map((x,i)=>i).filter(i=>a.moves[i].pp>0);
 if(!ok.length)return {mv:-1};
 if(lv===0)return {mv:ok[Math.floor(Math.random()*ok.length)]};
 const val=i=>{const m=a.moves[i].m;if(m.cat==='status'){const mt=meta(m.id);if(mt[5]>0)return a.hp/a.max<.45?999:-1;return d.status?-1:(mt[0]?40:-1)}return m.power*(m.acc||100)/100*(a.p.types.includes(m.type)?1.5:1)*eff(m.type,d.p.types)*a.st[m.cat==='physical'?1:3]/d.st[m.cat==='physical'?2:4]};
 if(lv===2){const best=Math.max.apply(null,ok.map(val));const threat=Math.max.apply(null,d.moves.map(x=>x.m.cat==='status'?0:eff(x.m.type,a.p.types)));
  if(threat>=2&&best<60&&!B.foeSwitched){let bi=-1,bs=-1e9;B.foe.forEach((m,i)=>{if(i===B.act.foe||m.hp<=0)return;const s=-Math.max.apply(null,d.moves.map(x=>x.m.cat==='status'?0:eff(x.m.type,m.p.types)))*50+Math.max.apply(null,m.moves.map(x=>x.m.cat==='status'?0:eff(x.m.type,d.p.types)*x.m.power));if(s>bs){bs=s;bi=i}});
   if(bi>=0){B.foeSwitched=true;return {sw:bi}}}B.foeSwitched=false}
 let bi=ok[0],bv=-1e9;ok.forEach(i=>{const v=val(i)*(lv===1?(.9+Math.random()*.2):1);if(v>bv){bv=v;bi=i}});return {mv:bi}}
function aiNext(){let bi=-1,bs=-1e9;const d=B.me[B.act.me];B.foe.forEach((m,i)=>{if(m.hp<=0)return;const s=B.level===0?Math.random():Math.max.apply(null,m.moves.map(x=>x.m.cat==='status'?0:eff(x.m.type,d.p.types)*x.m.power))-Math.max.apply(null,d.moves.map(x=>x.m.cat==='status'?0:eff(x.m.type,m.p.types)))*40;if(s>bs){bs=s;bi=i}});return bi}
const who=side=>side==='foe'?'对手的 ':'';
async function doSwitch(side,i,first){const old=B[side][B.act[side]];
 if(!first){await say(side==='me'?`回来吧，${old.p.name}！`:`对手收回了 ${old.p.name}！`,800)}
 B.act[side]=i;const m=B[side][i];drawMon(side,'enter');cry(m);await say(side==='me'?`去吧！${m.p.name}！`:`对手派出了 ${m.p.name}！`,900)}
async function useMove(side,mi){const os=side==='me'?'foe':'me',a=B[side][B.act[side]],d=B[os][B.act[os]];if(a.hp<=0)return;
 if(a.status==='slp'){if(--a.slp>0){await say(`${who(side)}${a.p.name} 正在呼呼大睡。`);return}a.status=null;drawBox(side);await say(`${who(side)}${a.p.name} 醒过来了！`)}
 if(a.status==='par'&&Math.random()<.25){await say(`${who(side)}${a.p.name} 因麻痹而无法行动！`);return}
 if(a.flinch){a.flinch=false;await say(`${who(side)}${a.p.name} 畏缩了，无法行动！`);return}
 const slot=mi>=0?a.moves[mi]:null,mv=slot?slot.m:MVK.struggle||{name:'挣扎',type:1,cat:'physical',power:50,acc:null,id:165};if(slot)slot.pp--;
 await say(`${who(side)}${a.p.name} 使用了「${mv.name}」！`,850);
 const mt=meta(mv.id);
 if(mv.acc&&Math.random()*100>=mv.acc){await say('但是没有命中！');return}
 if(mv.cat==='status'){
  if(mt[5]>0||mv.key==='rest'){if(a.hp>=a.max){await say('但是什么也没有发生！');return}if(mv.key==='rest'){a.hp=a.max;a.status='slp';a.slp=3}else a.hp=Math.min(a.max,a.hp+Math.floor(a.max*mt[5]/100));
   anim(side,'heal');drawBox(side);await say(`${who(side)}${a.p.name} 回复了体力！`);return}
  if(mt[0])return inflict(os,d,AIL[mt[0]],true,mv);await say('但是什么也没有发生！');return}
 const e0=eff(mv.type,d.p.types);if(e0===0){await say(`对 ${who(os)}${d.p.name} 好像没有效果……`);return}
 const hits=mt[2]?mt[2]+Math.floor(Math.random()*(mt[3]-mt[2]+1)):1;let total=0,critAny=false,e=1;
 for(let h=0;h<hits&&d.hp>0;h++){const crit=Math.random()<(mt[6]>0?1/8:1/24);const r=calc(a,d,mv,crit,85+Math.floor(Math.random()*16));e=r.e;critAny=critAny||crit;
  d.hp=Math.max(0,d.hp-r.dmg);total+=r.dmg;anim(os,'hit');drawBox(os);await wait(380)}
 if(critAny)await say('击中了要害！',800);
 if(e>1)await say('效果拔群！',900);else if(e<1)await say('效果不好……',900);
 if(hits>1)await say(`击中了 ${hits} 次！`,800);
 if(mt[4]>0&&total>0&&a.hp<a.max){a.hp=Math.min(a.max,a.hp+Math.max(1,Math.floor(total*mt[4]/100)));drawBox(side);await say(`${who(os)}${d.p.name} 的体力被吸取了！`,800)}
 if(mt[4]<0&&total>0){a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(total*-mt[4]/100)));drawBox(side);await say(`${who(side)}${a.p.name} 受到了反作用力伤害！`,800)}
 if(d.hp>0&&mt[0]&&Math.random()*100<(mt[1]||0))await inflict(os,d,AIL[mt[0]],false,mv);
 if(d.hp>0&&mt[7]&&B.first===side&&Math.random()*100<mt[7])d.flinch=true}
async function inflict(side,m,st,loud,mv){const t=m.p.types;
 const imm=m.status||(st==='brn'&&t.includes(10))||(st==='par'&&t.includes(13))||(st==='psn'&&(t.includes(4)||t.includes(9)))||(mv&&mv.key==='thunder-wave'&&t.includes(5))||(mv&&/powder|spore/.test(mv.key)&&t.includes(12));
 if(imm){if(loud)await say('但是没有效果！');return}
 m.status=st;if(st==='slp')m.slp=1+Math.floor(Math.random()*3);drawBox(side);
 await say(`${who(side)}${m.p.name}${{par:' 麻痹了，可能会无法行动！',slp:' 睡着了！',brn:' 被灼伤了！',psn:' 中毒了！'}[st]}`)}
function anim(side,k){const img=$('#bt-'+side+'-img');if(!img)return;img.classList.remove('hit','heal','enter');void img.offsetWidth;img.classList.add(k)}
async function endTurn(){for(const side of ['me','foe']){const m=B[side][B.act[side]];if(m.hp<=0||!(m.status==='brn'||m.status==='psn'))continue;
  m.hp=Math.max(0,m.hp-Math.max(1,Math.floor(m.max/(m.status==='brn'?16:8))));anim(side,'hit');drawBox(side);await say(`${who(side)}${m.p.name} 受到了${AILN[m.status]}的伤害！`,850)}}
async function faints(){for(const side of ['foe','me']){const m=B[side][B.act[side]];if(m.hp>0||m.out)continue;m.out=true;
  {const im=$('#bt-'+side+'-img');im.classList.add('faint');setTimeout(()=>{if(im.classList.contains('faint'))im.style.opacity='0'},650*speed)}await say(`${who(side)}${m.p.name} 倒下了！`,1000)}
 const alive=s=>B[s].some(m=>m.hp>0);if(!alive('foe')||!alive('me'))return end(alive('me'));
 if(B.foe[B.act.foe].hp<=0)await doSwitch('foe',aiNext(),true);
 if(B.me[B.act.me].hp<=0){const i=await switchMenu(true);await doSwitch('me',i,true)}}
let ended=false;
async function end(win){ended=true;B.over=true;await say(win?'你赢得了对战！':'你的宝可梦全部倒下了……',1000);
 menu('');$('#btText').innerHTML='';
 $('#btScreen').insertAdjacentHTML('beforeend',`<div class="bt-result ${win?'win':'lose'}" id="btResult"><b>${win?'胜利！':'失败…'}</b><span>${win?`击败了电脑（${['简单','普通','困难'][B.level]}）`:'再接再厉！'} · ${B.turn} 回合</span><div><button class="bt-btn" id="btAgain" type="button">再战一场</button><button class="bt-btn alt" id="btTeamBtn" type="button">调整队伍</button></div></div>`);
 const st=store.get('btStats',{w:0,l:0});st[win?'w':'l']++;store.set('btStats',st);
 $('#btAgain').onclick=()=>start();$('#btTeamBtn').onclick=()=>showBuild()}
async function loop(){while(!B.over){if(B.paused){await wait(300);continue}
  const c=await cmdMenu();menu('');if(B.over)return;
  if(c.run){B.over=true;await say('成功逃走了！',900);showBuild();return}
  B.turn++;const ai=aiPick();
  const acts=[];acts.push(Object.assign({side:'me'},c));acts.push(Object.assign({side:'foe'},ai));
  const pri=x=>x.sw!=null?10:(x.mv>=0?(B[x.side][B.act[x.side]].moves[x.mv].m.priority||0):0);
  const spd=x=>{const m=B[x.side][B.act[x.side]];return m.st[5]*(m.status==='par'?.5:1)};
  acts.sort((x,y)=>pri(y)-pri(x)||spd(y)-spd(x)||(Math.random()-.5));
  B.first=acts[0].sw==null?acts[0].side:acts[1].side;
  for(const x of acts){if(B.over)return;if(x.sw!=null){await doSwitch(x.side,x.sw);continue}
   if(B[x.side][B.act[x.side]].hp<=0)continue;await useMove(x.side,x.mv);
   const o=x.side==='me'?'foe':'me';if(B[o][B.act[o]].hp<=0||B[x.side][B.act[x.side]].hp<=0)break}
  B.me[B.act.me].flinch=B.foe[B.act.foe].flinch=false;
  if(!B.over){await endTurn();await faints()}}}
function showBuild(){B=null;$('#btArena').hidden=true;$('#btBuild').hidden=false;drawTeam()}
async function start(){if(!team.length)return;ended=false;
 const n=team.length,level=+$('#btLevel').value;
 B={me:team.map(mk),foe:randomTeam(n,level).map(mk),act:{me:0,foe:0},level,turn:0,log:[],over:false};
 $('#btBuild').hidden=true;$('#btArena').hidden=false;arena();
 B.me.forEach((_,i)=>{});drawMon('foe','enter');drawMon('me','enter');$('#bt-me-img').style.visibility='hidden';
 await say(`电脑（${['简单','普通','困难'][level]}）发起了对战！`,900);cry(B.foe[0]);await say(`对手派出了 ${B.foe[0].p.name}！`,900);
 $('#bt-me-img').style.visibility='';drawMon('me','enter');cry(B.me[0]);await say(`去吧！${B.me[0].p.name}！`,900);
 loop()}
function init(){if(inited)return;inited=true;$('#btTeam').innerHTML='<p class="muted">加载招式数据…</p>';
 $('#btSound').checked=store.get('btSound',true);$('#btSound').addEventListener('change',e=>store.set('btSound',e.target.checked));
 $('#btLevel').value=String(store.get('btLevel',1));$('#btLevel').addEventListener('change',e=>store.set('btLevel',+e.target.value));
 loadData('BATTLE_DATA',d=>{if(!d){$('#btTeam').innerHTML='<p class="muted">对战数据加载失败。</p>';return}BD=d;
  team=store.get('btTeam',[]).filter(t=>mon(t.id)).slice(0,6).map(t=>({id:t.id,moves:(t.moves||[]).filter(id=>usable(MV[id])).slice(0,4)})).map(t=>t.moves.length?t:{id:t.id,moves:autoMoves(mon(t.id))});
  picker($('#btPick'),p=>add(p));
  $('#btRandom').onclick=()=>{team=randomTeam(6,1);save();drawTeam()};
  $('#btTeam').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(b){team.splice(+b.dataset.rm,1);save();drawTeam()}});
  $('#btTeam').addEventListener('change',e=>{const s=e.target.closest('select[data-i]');if(!s)return;const t=team[+s.dataset.i],k=+s.dataset.k,v=+s.value;
   if(v&&t.moves.includes(v)&&t.moves[k]!==v){toast('这只宝可梦已经带了这个招式');drawTeam();return}if(v)t.moves[k]=v;else t.moves.splice(k,1);t.moves=t.moves.filter(Boolean);save();drawTeam()});
  $('#btGo').onclick=start;drawTeam()})}
return {init,pause(){},start,get state(){return B},get team(){return team},set speed(v){speed=v},autoMoves,calc,eff,learn,showBuild};
})();
