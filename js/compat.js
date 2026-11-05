/* 旧浏览器兼容（ES5 写法，最先加载）：QQ/微信 X5 内核、UC、华为/小米浏览器、旧版 Safari 等 */
(function(){
 var AP=Array.prototype;
 if(!AP.flat)AP.flat=function(d){d=d===undefined?1:d;return AP.reduce.call(this,function(a,v){if(Array.isArray(v)&&d>0)return a.concat(v.flat(d-1));a.push(v);return a},[])};
 if(!AP.flatMap)AP.flatMap=function(f,t){return AP.map.call(this,f,t).flat(1)};
 if(!Object.fromEntries)Object.fromEntries=function(it){var o={};Array.from(it).forEach(function(e){o[e[0]]=e[1]});return o};
 if(window.NodeList&&!NodeList.prototype.forEach)NodeList.prototype.forEach=AP.forEach;
 // Web Animations 不支持时（Safari < 13.1）：跳过动画，直接结束
 if(window.Element&&!Element.prototype.animate)Element.prototype.animate=function(){var a={cancel:function(){},finish:function(){},play:function(){},pause:function(){}};
  Object.defineProperty(a,'onfinish',{set:function(f){if(f)setTimeout(function(){f.call(a)},0)}});a.finished=window.Promise?Promise.resolve(a):null;return a};
 if(!window.IntersectionObserver){window.IntersectionObserver=function(cb){this.cb=cb};
  window.IntersectionObserver.prototype.observe=function(el){var cb=this.cb,self=this;function tick(){var r=el.getBoundingClientRect();if(r.top<innerHeight+600)cb([{isIntersecting:true,target:el}],self)}
   window.addEventListener('scroll',tick,true);setInterval(tick,1000)};
  window.IntersectionObserver.prototype.disconnect=function(){}}
 // 兜底：脚本出错导致图鉴没渲染时，显示提示而不是一片空白
 var errs=[];window.addEventListener('error',function(e){if(e&&e.message)errs.push(e.message)});
 function check(){var g=document.getElementById('grid');if(!g||g.querySelector('.card'))return;
  var sp=document.getElementById('splash');if(sp&&sp.parentNode)sp.parentNode.removeChild(sp);
  g.innerHTML='<div class="load-fail"><b>页面没有加载成功</b><p>可能是网络较慢，或浏览器版本过旧。请点下方按钮重试；如果在微信 / QQ 里打开，可以点右上角「…」选择「在浏览器打开」。</p><button type="button" onclick="location.reload()">重新加载</button>'+(errs.length?'<small>'+errs[0].replace(/</g,'&lt;')+'</small>':'')+'</div>'}
 window.addEventListener('load',function(){setTimeout(check,1500)});setTimeout(check,20000);
})();
