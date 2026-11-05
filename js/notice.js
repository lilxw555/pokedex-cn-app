// 更新公告：每个版本只弹一次（启动动画结束后；不和更新对话框同时出现）
const Notice=(()=>{const R=window.RELEASE;if(!R)return {};
const KEY='notice-'+R.version;
function open(){if(document.getElementById('noticeBg'))return;
 document.body.insertAdjacentHTML('beforeend',`<div class="upd-bg notice-bg" id="noticeBg"><div class="upd notice" role="dialog" aria-modal="true" aria-labelledby="noticeT">
  <span class="notice-ball" aria-hidden="true"></span><h3 id="noticeT">${esc(R.version)} 更新内容</h3><p class="muted small">${esc(R.date||'')}</p>
  <ul class="upd-notes">${R.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>
  <div class="upd-btns"><button class="glass-btn accent" id="noticeOk" type="button">知道了</button></div></div></div>`);
 const bg=document.getElementById('noticeBg');
 const close=()=>{store.set(KEY,1);bg.remove();document.removeEventListener('keydown',esc_,true);document.dispatchEvent(new Event('notice-closed'))};
 const esc_=e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close()}};
 bg.addEventListener('click',e=>{if(e.target===bg||e.target.id==='noticeOk')close()});document.addEventListener('keydown',esc_,true);
 setTimeout(()=>{const b=document.getElementById('noticeOk');b&&b.focus({preventScroll:true})},30)}
function maybe(){if(store.get(KEY,0)||/[?&]nonotice\b/.test(location.search)||(navigator.webdriver&&!store.get('noticeTest',0)))return;
 const t=setInterval(()=>{if(document.getElementById('splash'))return;            // 等启动动画结束
  if(document.getElementById('updBg'))return;                                     // 更新对话框在显示时先不弹
  clearInterval(t);setTimeout(()=>{if(!document.getElementById('updBg'))open();else maybe()},350)},200)}
maybe();
return {open,get open_(){return !!document.getElementById('noticeBg')},key:KEY};
})();
