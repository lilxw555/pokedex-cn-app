// 小游戏：谁是这只宝可梦？四种玩法：剪影 / 听叫声 / 属性数值 / 限时 60 秒；本机排行榜
const Guess=(()=>{
const CRY_CDN='https://fastly.jsdelivr.net/gh/PokeAPI/cries@main/cries/pokemon/latest/',CRY_RAW='https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/';
const MODES={sil:'剪影',cry:'听叫声',stat:'属性数值',time:'限时 60 秒'};
let mode='sil',streak=0,ans=null,done=false,score=0,left=0,tick=null,audio=null,started=false;
const bests=store.get('bests',{sil:store.get('best',0)});
[...new Set(PLIST.map(p=>p.gen))].forEach(g=>$('#guessGen').insertAdjacentHTML('beforeend',`<option value="${g}">${GEN_CN[g]}</option>`));
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const stage=$('#guessStage'),img=$('#guessImg');
function lbAdd(m,s){if(!s)return;const lb=store.get('lb',{});const l=lb[m]||[];const d=new Date();
 l.push({s,d:`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`});l.sort((a,b)=>b.s-a.s);lb[m]=l.slice(0,5);store.set('lb',lb);drawLb()}
function drawLb(){const lb=store.get('lb',{});
 $('#lb').innerHTML=`<div class="lb-grid">${Object.entries(MODES).map(([k,n])=>`<div class="lb-col"><b>${n}</b><span class="muted small">${k==='time'?'60 秒内答对数':'最长连对'}</span><ol>${(lb[k]||[]).map(x=>`<li><b>${x.s}</b><span class="muted small">${x.d}</span></li>`).join('')||'<li class="muted small">暂无记录</li>'}</ol></div>`).join('')}</div>`}
function setBest(){$('#best').textContent=bests[mode]||0}
// 叫声：本站自带 mp3（所有浏览器都能播），失败再试 CDN 镜像的 ogg
function playCry(){if(!ans)return;if(audio)audio.pause();const id=ans.id,srcs=['cries/'+id+'.mp3',CRY_CDN+ans.pid+'.ogg',CRY_RAW+ans.pid+'.ogg'];let i=0;
 const tryNext=()=>{if(i>=srcs.length){toast('叫声加载失败');return}const a=new Audio(srcs[i++]);a.volume=.6;audio=a;a.onerror=()=>{if(audio===a)tryNext()};const p=a.play();if(p&&p.catch)p.catch(()=>{})};tryNext()}
// 剪影用 canvas 画（iOS Safari 对 webp + CSS filter 的渲染有拼块错乱问题）
function drawSil(){const c=$('#guessSil'),w=img.naturalWidth,h=img.naturalHeight;if(!w)return;c.width=w;c.height=h;const x=c.getContext('2d');
 x.clearRect(0,0,w,h);x.globalCompositeOperation='source-over';x.drawImage(img,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#111215';x.fillRect(0,0,w,h)}
function next(){if(mode==='time'&&!started){showStart();return}
 const g=$('#guessGen').value;const pool=PLIST.filter(p=>!g||p.gen==g);
 ans=rnd(pool);const opts=new Set([ans.id]);while(opts.size<4)opts.add(rnd(pool).id);
 const list=[...opts].sort(()=>Math.random()-.5).map(id=>PBY[id]);done=false;
 stage.classList.remove('revealed');stage.dataset.mode=mode;stage.style.setProperty('--c',tcolor(ans));img.classList.add('loading');
 img.onload=()=>{img.classList.remove('loading');drawSil()};img.src=ART(ans.pid);
 $('#cryBtn').hidden=mode!=='cry';$('#statHint').hidden=mode!=='stat';
 if(mode==='stat')$('#statHint').innerHTML=`<div class="sh-types">${ans.types.map(typeBadge).join('')}</div>${ans.stats.map((v,i)=>`<div class="sh-row"><span>${STATN[i]}</span><i><b style="width:${Math.min(100,v/1.8)}%"></b></i><em>${v}</em></div>`).join('')}<div class="muted small">身高 ${ans.height} m · 体重 ${ans.weight} kg</div>`;
 $('#guessHint').innerHTML=mode==='sil'||mode==='time'?`提示：${ans.types.map(typeBadge).join(' ')} <span class="muted">· ${GEN_CN[ans.gen]}</span>`:mode==='cry'?`<span class="muted">点 ▶ 再听一次 · ${GEN_CN[ans.gen]}</span>`:`<span class="muted">${GEN_CN[ans.gen]} · 种族值总和 ${ans.stats.reduce((a,b)=>a+b,0)}</span>`;
 $('#guessOpts').innerHTML=list.map((p,i)=>`<button class="glass-btn opt" data-id="${p.id}"><kbd>${i+1}</kbd>${esc(p.name)}</button>`).join('');
 $('#guessResult').innerHTML='';$('#guessNext').hidden=true;$('#timeStart').hidden=true;
 if(mode==='cry')playCry()}
function showStart(){ans=null;const sc=$('#guessSil');sc.width=sc.width;stage.classList.remove('revealed');stage.dataset.mode='time';img.removeAttribute('src');$('#cryBtn').hidden=true;$('#statHint').hidden=true;
 $('#guessOpts').innerHTML='';$('#guessHint').innerHTML='<span class="muted">60 秒内尽可能多地认出剪影，答错不扣分</span>';$('#guessNext').hidden=true;$('#timeStart').hidden=false}
function startTimer(){started=true;score=0;left=60;$('#streak').textContent=0;$('#timer').textContent=left;clearInterval(tick);
 tick=setInterval(()=>{left--;$('#timer').textContent=left;if(left<=0)endTimer()},1000);next()}
function endTimer(){clearInterval(tick);tick=null;started=false;done=true;
 $('#guessOpts').querySelectorAll('.opt').forEach(b=>b.disabled=true);
 if(score>(bests.time||0)){bests.time=score;store.set('bests',bests)}setBest();lbAdd('time',score);
 $('#guessResult').innerHTML=`<span class="ok">时间到！</span> 本轮答对 <b>${score}</b> 只`;$('#timeStart').textContent='再来一轮';$('#timeStart').hidden=false;$('#guessNext').hidden=true}
function answer(id){if(done||!ans)return;done=true;const ok=id===ans.id;
 $('#guessOpts').querySelectorAll('.opt').forEach(b=>{const bid=+b.dataset.id;b.disabled=true;if(bid===ans.id)b.classList.add('right');else if(bid===id)b.classList.add('wrong')});
 stage.classList.add('revealed');
 if(mode==='time'){if(ok)score++;$('#streak').textContent=score;$('#guessResult').innerHTML=`<span class="${ok?'ok':'no'}">${ok?'✓':'✗'}</span> ${esc(ans.name)}`;setTimeout(()=>{if(started)next()},ok?450:900);return}
 if(ok){streak++;if(streak>(bests[mode]||0)){bests[mode]=streak;store.set('bests',bests);if(mode==='sil')store.set('best',streak)}}else{lbAdd(mode,streak);streak=0}
 $('#streak').textContent=streak;setBest();
 $('#streak').parentElement.animate([{transform:'scale(1)'},{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:500,easing:'cubic-bezier(.34,1.56,.64,1)'});
 $('#guessResult').innerHTML=`<span class="${ok?'ok':'no'}">${ok?'答对了！':'可惜～'}</span> 是 <a href="#/pokemon/${ans.id}"><b>${esc(ans.name)}</b></a>（${pad(ans.id)} · ${esc(ans.genus)}）`;
 $('#guessNext').hidden=false}
function setMode(m){if(!MODES[m])return;if(started)endTimer();if(streak)lbAdd(mode,streak);mode=m;streak=0;started=false;clearInterval(tick);
 document.querySelectorAll('#guessMode button').forEach(b=>{b.classList.toggle('on',b.dataset.m===m);b.setAttribute('aria-selected',b.dataset.m===m)});
 $('#timerBox').hidden=m!=='time';$('#timer').textContent=60;$('#streak').previousSibling.textContent='';$('#streak').parentElement.firstChild.textContent=m==='time'?'得分 ':'连对 ';
 $('#streak').textContent=0;$('#timeStart').textContent='开始 60 秒挑战';setBest();next()}
$('#guessMode').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(b)setMode(b.dataset.m)});
$('#guessOpts').addEventListener('click',e=>{const b=e.target.closest('.opt');if(b)answer(+b.dataset.id)});
$('#cryBtn').onclick=playCry;$('#timeStart').onclick=startTimer;
$('#guessNext').onclick=next;$('#guessGen').addEventListener('input',()=>{if(mode==='time'){if(started)endTimer();showStart();return}streak=0;$('#streak').textContent=0;next()});
const active=()=>document.body.dataset.pane==='tools'&&(typeof Tools!=='undefined')&&Tools.cur==='guess';
document.addEventListener('keydown',e=>{if(!active()||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
 if(/^[1-4]$/.test(e.key)){const b=$('#guessOpts').querySelectorAll('.opt')[+e.key-1];if(b)answer(+b.dataset.id)}else if(e.key==='Enter'&&done&&mode!=='time')next()});
setBest();drawLb();next();
return {setMode,get mode(){return mode},stop(){if(started)endTimer();if(audio)audio.pause()},get ans(){return ans}};
})();
