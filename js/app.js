// 水平分页 + 玻璃 Tab 栏 + 路由
(()=>{
const pager=$('#pager'), panes=[...document.querySelectorAll('.pane')], inners=panes.map(p=>p.querySelector('.pane-inner'));
const KEYS=panes.map(p=>p.dataset.key), TITLES=panes.map(p=>p.getAttribute('aria-label'));
const tabs=[...document.querySelectorAll('.tab')], ind=$('#indicator');
let cur=0, anim=null, lastP=0, lastT=performance.now(), settleT=null, booted=false;
const W=()=>pager.clientWidth||1;
const typing=()=>/INPUT|SELECT|TEXTAREA/.test(document.activeElement&&document.activeElement.tagName);

// --- 弹簧动画滚动 ---
function stopAnim(){if(anim){cancelAnimationFrame(anim);anim=null;pager.classList.remove('animating')}}
function spring(to){stopAnim();let x=pager.scrollLeft,v=0,last=performance.now();const k=240,c=30;pager.classList.add('animating');
 const stepF=t=>{const dt=Math.min(.032,(t-last)/1000);last=t;for(let n=0;n<4;n++){const a=-k*(x-to)-c*v;v+=a*dt/4;x+=v*dt/4}
  pager.scrollLeft=x;if(Math.abs(x-to)<.5&&Math.abs(v)<8){pager.scrollLeft=to;anim=null;pager.classList.remove('animating');settle();return}anim=requestAnimationFrame(stepF)};
 anim=requestAnimationFrame(stepF)}
function goTo(i,instant){i=Math.max(0,Math.min(KEYS.length-1,i));cur=i;markTab(i);const to=i*W();
 if(instant||REDUCED){stopAnim();pager.scrollLeft=to;update();settle()}else spring(to)}
function markTab(i){tabs.forEach((t,j)=>{t.classList.toggle('active',j===i);t.setAttribute('aria-selected',j===i)});$('#sectionTitle').textContent=TITLES[i];document.body.dataset.pane=KEYS[i];if(i!==0)Dex.closeFilter()}
function settle(){const i=Math.round(pager.scrollLeft/W());cur=i;markTab(i);if(lastIdx!==i){if(lastIdx>=0)ripple(i);lastIdx=i}
 if(!Dex.open){const h=location.hash;const want='#/'+KEYS[i]+(KEYS[i]==='tools'&&(typeof Tools!=='undefined')&&Tools.cur?'/'+Tools.cur:'');if(!(h===want||h.startsWith(want+'/')))history.replaceState(null,'',want)}}

// --- Tab 指示器跟随滚动，速度越快越“拉伸” ---
function update(){const p=pager.scrollLeft/W(), t=performance.now(), vel=Math.abs(p-lastP)/Math.max(1,t-lastT)*1000;lastP=p;lastT=t;
 if(!drop.tw)measure();dropTo(p*drop.tw);
 inners.forEach((el,i)=>{const d=Math.min(1,Math.abs(p-i));if(d>=1&&el._d>=1)return;el._d=d;el.style.transform=d?`scale(${1-d*.06})`:'';el.style.opacity=d?1-d*.4:''});
 const near=Math.round(p);if(near!==cur&&!anim){markTab(near)}}
const tabbar=$('#tabbar');

// --- 水珠指示器：头部弹簧 + 拖尾弹簧 + 按压放大，三者各自做弹簧运动 ---
const head=ind.querySelector('.head'), tail=ind.querySelector('.tail'), lens=ind.querySelector('.lens'), ripples=$('#ripples');
const drop={x:0,v:0,x2:0,v2:0,tx:0,pr:0,pv:0,press:0,tw:0,run:false,t:0,ready:false};
let lastIdx=-1;
function measure(){drop.tw=(tabbar.clientWidth-10)/KEYS.length;[head,tail,lens].forEach(el=>el.style.width=drop.tw+'px')}
function render(){
 const sp=Math.abs(drop.v), sx=1+Math.min(.5,sp/2600), sy=1-Math.min(.16,sp/9000), g=1+drop.pr*.16;   // 跑得越快，水珠被拉得越长、越扁
 const gap=Math.abs(drop.x-drop.x2)/drop.tw, ts=Math.max(.34,.8-gap*.1);                              // 拖尾离得越远越小，像要脱落的水滴
 const m=`translate3d(${drop.x}px,0,0) scale(${sx*g},${sy*g})`;
 head.style.transform=m;lens.style.transform=m;
 tail.style.transform=`translate3d(${drop.x2}px,0,0) scale(${ts*sx*.9},${ts})`}
function dropFrame(t){
 const dt=Math.min(.032,(t-drop.t)/1000)||.016;drop.t=t;
 for(let n=0;n<3;n++){const h=dt/3;
  let a=-300*(drop.x-drop.tx)-24*drop.v;drop.v+=a*h;drop.x+=drop.v*h;       // 头部：略欠阻尼，落点处有轻微过冲回弹
  a=-110*(drop.x2-drop.x)-13*drop.v2;drop.v2+=a*h;drop.x2+=drop.v2*h;       // 尾部：更软，被头部拖着走
  a=-380*(drop.pr-drop.press)-20*drop.pv;drop.pv+=a*h;drop.pr+=drop.pv*h}   // 按压：像镜头被“托起”
 render();
 const rest=Math.abs(drop.x-drop.tx)<.2&&Math.abs(drop.v)<4&&Math.abs(drop.x2-drop.x)<.2&&Math.abs(drop.v2)<4&&Math.abs(drop.pr-drop.press)<.002&&Math.abs(drop.pv)<.05;
 if(rest){drop.x=drop.x2=drop.tx;drop.v=drop.v2=0;drop.pr=drop.press;drop.pv=0;render();drop.run=false;return}
 requestAnimationFrame(dropFrame)}
function kick(){if(!drop.run){drop.run=true;drop.t=performance.now();requestAnimationFrame(dropFrame)}}
function dropTo(x){drop.tx=x;
 if(!drop.ready||REDUCED){drop.ready=true;drop.x=drop.x2=x;drop.v=drop.v2=0;render();return}
 kick()}
function press(on){drop.press=on?1:0;ind.classList.toggle('pressed',!!on);if(REDUCED){drop.pr=drop.press;render()}else kick()}
function ripple(i){if(REDUCED||!drop.tw)return;const r=document.createElement('i');r.className='drip';r.style.left=((i+.5)*drop.tw+5)+'px';ripples.appendChild(r);r.addEventListener('animationend',()=>r.remove())}
tabbar.addEventListener('pointerdown',()=>press(true));
['pointerup','pointercancel'].forEach(ev=>window.addEventListener(ev,()=>press(false)));
let raf=null;pager.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=null;update()});clearTimeout(settleT);if(!anim&&!drag)settleT=setTimeout(()=>{settle();update()},140)},{passive:true});
['wheel','touchstart'].forEach(ev=>pager.addEventListener(ev,e=>{if(ev==='wheel'&&Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;stopAnim()},{passive:true}));

// --- 鼠标拖动 ---
let drag=null;
pager.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('input,select,textarea,.suggest,.chart,.heat-wrap,.type-strip,.filter-panel'))return;
 drag={x:e.clientX,y:e.clientY,s:pager.scrollLeft,on:false,id:e.pointerId,t:performance.now(),lx:e.clientX,v:0}});
window.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.on){if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){drag.on=true;stopAnim();pager.classList.add('dragging')}else if(Math.abs(dy)>8){drag=null;return}else return}
 const now=performance.now();drag.v=(e.clientX-drag.lx)/Math.max(1,now-drag.t);drag.lx=e.clientX;drag.t=now;
 let x=drag.s-dx;const max=(KEYS.length-1)*W();if(x<0)x*=.3;if(x>max)x=max+(x-max)*.3;pager.scrollLeft=x});
window.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;if(!d.on)return;pager.classList.remove('dragging');
 const dx=d.lx-d.x;let i=Math.round(d.s/W());if(dx<-W()*.15||d.v<-.5)i++;else if(dx>W()*.15||d.v>.5)i--;
 const kill=ev=>{ev.stopPropagation();ev.preventDefault()};window.addEventListener('click',kill,{capture:true,once:true});setTimeout(()=>window.removeEventListener('click',kill,{capture:true}),0);
 clearTimeout(settleT);nav(i)});
function nav(i){i=Math.max(0,Math.min(KEYS.length-1,i));const h='#/'+KEYS[i]+(KEYS[i]==='tools'&&typeof Tools!=='undefined'&&Tools.cur?'/'+Tools.cur:'');
 if(location.hash!==h)history.pushState(null,'',h);goTo(i)}
window.addEventListener('popstate',()=>{})

// --- 键盘 ---
document.addEventListener('keydown',e=>{if(typing())return;
 if(e.key==='Escape'){if(Dex.flipOpen)Dex.closeFlip();else if(Dex.open)location.hash='#/pokedex';return}
 if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;const d=e.key==='ArrowRight'?1:-1;e.preventDefault();
 if(Dex.open)Dex.step(d);else nav(cur+d)});
// 已在「工具」时再点一次「工具」：回到工具网格
tabs.forEach((t,i)=>t.addEventListener('click',()=>{if(KEYS[i]==='tools'&&document.body.dataset.pane==='tools'&&(typeof Tools!=='undefined')&&Tools.cur){history.pushState(null,'','#/tools');Tools.open('');return}nav(i)}));

// --- 路由 ---
let lastH=null;
function route(){lastH=location.hash;const h=decodeURIComponent(location.hash);let m;
 if((m=h.match(/^#\/pokemon\/(\d+)/))&&Dex.BYID[+m[1]]){Dex.show(+m[1]);if(cur!==0||!booted)goTo(0,!booted);booted=true;return}
 Dex.hide();document.title='宝可梦中文图鉴';
 if((m=h.match(/^#\/team\/([\d,]+)/)))Team.load(m[1].split(',').map(Number));
 if((m=h.match(/^#\/compare\/(\d+)\/(\d+)/)))Compare.set(+m[1],+m[2]);
 let k=(h.match(/^#\/(\w+)/)||[])[1];if(k==='guess'){k='tools';Tools.open('guess',true)}else if(k==='tools')Tools.open((h.match(/^#\/tools\/(\w+)/)||[])[1]||'');const i=KEYS.indexOf(k);goTo(i<0?0:i,!booted);booted=true}
window.addEventListener('hashchange',route);
// 部分 WebKit 在 pushState 产生的记录间后退时只触发 popstate、不触发 hashchange
window.addEventListener('popstate',()=>setTimeout(()=>{if(location.hash!==lastH)route()},30));
window.addEventListener('resize',()=>{stopAnim();pager.scrollLeft=cur*W();measure();drop.ready=false;update()});
route();update();
})();
