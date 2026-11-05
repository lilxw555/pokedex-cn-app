// 属性相克表 + 计算器
(()=>{
const fmt=v=>v===1?'':v===0.5?'½':String(v), cls=v=>v===2?'x2':v===0.5?'x05':v===0?'x0':'';
let html='<tr><th class="corner">攻＼防</th>'+T.types.map(t=>`<th class="col" data-c="${t.idx}"><span style="--c:${t.color};--fg:${t.fg}">${t.name}</span></th>`).join('')+'</tr>';
T.types.forEach(a=>{html+=`<tr><th class="row" data-r="${a.idx}"><span style="--c:${a.color};--fg:${a.fg}">${a.name}</span></th>`+T.types.map(d=>{const v=T.chart[a.idx][d.idx];return `<td class="${cls(v)}" data-r="${a.idx}" data-c="${d.idx}" title="${a.name} → ${d.name}：${v}×">${fmt(v)}</td>`}).join('')+'</tr>'});
$('#chart').innerHTML=html;
let hl=null;
$('#chart').addEventListener('click',e=>{const th=e.target.closest('th[data-r],th[data-c]');if(!th)return;
 const key=th.dataset.r!==undefined?'r'+th.dataset.r:'c'+th.dataset.c;hl=hl===key?null:key;
 $('#chart').querySelectorAll('td,th[data-r],th[data-c]').forEach(el=>{if(!hl){el.classList.remove('dim');return}
  const on=hl[0]==='r'?el.dataset.r===hl.slice(1):el.dataset.c===hl.slice(1);el.classList.toggle('dim',!on)})});
const sel=[];
$('#defChips').innerHTML=T.types.map(typeChip).join('');
$('#defChips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const id=+b.dataset.id;const i=sel.indexOf(id);
 if(i>=0)sel.splice(i,1);else{if(sel.length>=2)sel.shift();sel.push(id)}
 document.querySelectorAll('#defChips .chip').forEach(c=>{const on=sel.includes(+c.dataset.id);c.classList.toggle('on',on);c.setAttribute('aria-pressed',on)});calc()});
function calc(){if(!sel.length){$('#calcResult').innerHTML='<p class="muted">请先选择属性。</p>';return}
 $('#calcResult').innerHTML=`<div style="margin:8px 0 10px">防御属性：${sel.map(typeBadge).join(' ')}</div>`+effHtml(sel)}
calc();
})();
