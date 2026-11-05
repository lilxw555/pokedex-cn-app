// 技能列表
(()=>{
const M=window.MOVES_DATA.moves;
T.types.forEach(t=>$('#mtype').insertAdjacentHTML('beforeend',`<option value="${t.id}">${t.name}</option>`));
const cats={};M.forEach(m=>cats[m.cat]=m.catName);['physical','special','status'].filter(c=>cats[c]).forEach(c=>$('#mcat').insertAdjacentHTML('beforeend',`<option value="${c}">${cats[c]}</option>`));
let sortK='id',dir=1;
function render(){const q=$('#mq').value.trim(),ql=q.toLowerCase(),t=$('#mtype').value,c=$('#mcat').value;
 let rows=M.filter(m=>(!q||m.name.includes(q)||m.key.includes(ql)||m.desc.includes(q))&&(!t||m.type==t)&&(!c||m.cat===c));
 rows.sort((a,b)=>{let x=a[sortK],y=b[sortK];if(sortK==='type'){x=TYPE_BY_ID[x].idx;y=TYPE_BY_ID[y].idx}
  if(x==null)return 1;if(y==null)return -1;return (typeof x==='string'?x.localeCompare(y,'zh-Hans-CN'):x-y)*dir});
 $('#mcount').textContent=`共 ${rows.length} 个技能`;
 $('#moveList').innerHTML=rows.map(m=>`<div class="mrow"><div class="mn"><b>${esc(m.name)}</b><small>${esc(m.key)}</small></div><div class="mt">${typeBadge(m.type)}</div><div class="mc"><span class="cat ${m.cat}">${esc(m.catName)}</span></div><div class="mp num">${m.power==null?'—':m.power}</div><div class="ma num">${m.acc==null?'—':m.acc}</div><div class="mpp num">${m.pp==null?'—':m.pp}</div><div class="md">${esc(m.desc)||'<span class="muted">暂无中文说明</span>'}</div></div>`).join('')||'<p class="empty">没有找到符合条件的技能。</p>'}
['#mq','#mtype','#mcat'].forEach(s=>$(s).addEventListener('input',render));
$('#mhead').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;const k=b.dataset.k;
 if(sortK===k)dir=-dir;else{sortK=k;dir=(k==='power'||k==='acc'||k==='pp')?-1:1}
 document.querySelectorAll('#mhead button').forEach(h=>{h.classList.toggle('on',h===b);h.textContent=h.textContent.replace(/ [▲▼]$/,'')});b.textContent+=dir>0?' ▲':' ▼';render()});
render();
})();
