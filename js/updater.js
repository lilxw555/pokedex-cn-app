// 应用内更新（只在 Windows / Android 离线版里运行；网页版什么都不做）
// 清单：https://pokedex-cn.netlify.app/download/version.json
const Updater=(()=>{
const URL_DEFAULT='https://pokedex-cn.netlify.app/download/version.json';
// 版本号比较：'3.10.0' > '3.9.1'；返回 1 / 0 / -1
function cmp(a,b){const x=String(a||'0').split(/[.-]/).map(n=>parseInt(n,10)||0),y=String(b||'0').split(/[.-]/).map(n=>parseInt(n,10)||0);
 for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d>0?1:-1}return 0}
// 解析并校验清单；返回 {version, notes[], bin:{url,size,sha256}} 或 null
function parse(txt,plat){let m;try{m=typeof txt==='string'?JSON.parse(txt):txt}catch(_){return null}
 if(!m||typeof m.version!=='string'||!/^\d+(\.\d+){0,3}$/.test(m.version))return null;const b=m[plat];
 if(!b||typeof b.url!=='string'||!/^[0-9a-f]{64}$/i.test(b.sha256||''))return null;
 const notes=Array.isArray(m.notes)?m.notes.map(String):m.notes?[String(m.notes)]:[];
 return {version:m.version,versionCode:m.versionCode|0,notes,bin:{url:new URL(b.url,URL_DEFAULT).href,size:+b.size||0,sha256:b.sha256.toLowerCase()}}}
// ---- 原生桥：Electron preload 暴露 window.pkdxNative；Android 注入 window.PokedexAndroid ----
let N=null;
if(window.pkdxNative)N={plat:'exe',version:()=>window.pkdxNative.version(),fetch:u=>window.pkdxNative.fetchText(u),
 download:(b,onP)=>{window.pkdxNative.onProgress(onP);return window.pkdxNative.download(b.url,b.sha256,b.size)},apply:()=>window.pkdxNative.apply()};
else if(window.PokedexAndroid){let seq=0;const A=window.PokedexAndroid;
 N={plat:'apk',version:()=>A.version(),
  fetch:u=>new Promise((res,rej)=>{const cb='__pkdxF'+(++seq);window[cb]=(ok,t)=>{delete window[cb];ok?res(t):rej(new Error(t))};A.fetchText(u,cb)}),
  download:(b,onP)=>new Promise((res,rej)=>{window.__pkdxUpd=(type,v)=>{if(type==='progress')onP(+v);else if(type==='done')res(v);else if(type==='error')rej(new Error(v));else if(type==='note')toast(v)};A.download(b.url,b.sha256)}),
  apply:()=>Promise.resolve()}}
const url=()=>store.get('updUrl',URL_DEFAULT);
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]);
async function check(manual){if(!N)return null;let info=null;
 try{info=parse(await withTimeout(N.fetch(url()+'?t='+Date.now()),10000),N.plat)}catch(e){if(manual)toast('检查更新失败，请确认网络后重试');return null}
 if(!info){if(manual)toast('更新信息无法识别，请稍后再试');return null}
 store.set('updLast',Date.now());
 if(cmp(info.version,N.version())<=0){if(manual)toast('已是最新版本 '+N.version());return info}
 if(!manual&&store.get('updSkip','')===info.version)return info;   // 点过“稍后”的版本，下次启动不再自动弹
 show(info);return info}
function show(info){if($('#noticeBg')){document.addEventListener('notice-closed',()=>show(info),{once:true});return}let bg=$('#updBg');if(bg)bg.remove();
 document.body.insertAdjacentHTML('beforeend',`<div class="upd-bg" id="updBg"><div class="upd" role="dialog" aria-modal="true" aria-labelledby="updT">
  <h3 id="updT">发现新版本 ${esc(info.version)}</h3><p class="muted small">当前版本 ${esc(N.version())}${info.bin.size?` · 下载大小 ${(info.bin.size/1048576).toFixed(info.bin.size>1e7?0:1)} MB`:''}</p>
  ${info.notes.length?`<ul class="upd-notes">${info.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}
  <div class="upd-prog" hidden><i></i></div><p class="upd-msg small muted" hidden></p>
  <div class="upd-btns"><button class="glass-btn" data-u="later" type="button">稍后</button><button class="glass-btn accent" data-u="go" type="button">立即更新</button></div></div></div>`);
 bg=$('#updBg');const prog=bg.querySelector('.upd-prog'),bar=prog.firstChild,msg=bg.querySelector('.upd-msg'),go=bg.querySelector('[data-u=go]');
 bg.onclick=async e=>{const b=e.target.closest('[data-u]');if(!b)return;
  if(b.dataset.u==='later'){store.set('updSkip',info.version);bg.remove();return}
  go.disabled=true;go.textContent='下载中…';prog.hidden=false;msg.hidden=false;msg.textContent='正在下载，请不要关闭应用';
  try{await N.download(info.bin,p=>{bar.style.width=Math.round(p*100)+'%';msg.textContent=`已下载 ${Math.round(p*100)}%`});
   bar.style.width='100%';msg.textContent=N.plat==='apk'?'下载完成，已校验文件，正在打开系统安装程序…':'下载完成，已校验文件，正在重启并替换…';
   const r=await N.apply();if(r&&r.mode==='opened')msg.textContent='新版本已保存到：'+r.path+'，已为你打开。';
   go.textContent=N.plat==='apk'?'重新安装':'完成';go.disabled=N.plat!=='apk'}
  catch(err){msg.textContent='更新失败：'+(err&&err.message||err)+'。可以稍后再试，或到网站下载页手动下载。';go.disabled=false;go.textContent='重试'}};
 setTimeout(()=>go.focus(),50)}
if(N){document.documentElement.classList.add('has-updater');setTimeout(()=>check(false),2500)}
document.addEventListener('click',e=>{if(e.target.closest('[data-tile="update"]')){e.preventDefault();check(true)}});
return {cmp,parse,check,show,get native(){return N}};
})();
