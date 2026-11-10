'use strict';
const {createHash}=require('node:crypto');
// Only this constant script is permitted by the page's content security policy.
const script=`(()=>{
const images=Array.from(document.querySelectorAll('article img[src]'));
if(!images.length)return;
const dialog=document.querySelector('.image-preview');
const image=dialog.querySelector('img');
const count=dialog.querySelector('.image-count');
const viewport=dialog.querySelector('.image-viewport');
const zoom=dialog.querySelector('[data-action="zoom"]');
let index=0,opener;const links=new Set();
function show(next){
 index=(next+images.length)%images.length;
 image.src=images[index].src;image.alt=images[index].alt || '';
 count.textContent=(index+1)+' / '+images.length;
 viewport.classList.remove('original-size');zoom.textContent='查看原图';
 viewport.scrollTop=0;viewport.scrollLeft=0;
}
function close(){dialog.close();opener?.focus();}
images.forEach((img,i)=>{
 const trigger=document.createElement('button');trigger.type='button';
 trigger.className='image-trigger';trigger.setAttribute('aria-label','放大图片'+(img.alt?'：'+img.alt:''));
 // Keep the DOM valid when a note image is already inside a link.
 const link=img.closest('a');
 if(link){
  if(!links.has(link)){
   links.add(link);
   link.addEventListener('click',event=>{
    event.preventDefault();opener=link;
    const clicked=event.target.closest('img');
    show(clicked && images.includes(clicked)?images.indexOf(clicked):i);dialog.showModal();
   });
  }
 }else{
  img.replaceWith(trigger);trigger.append(img);
  trigger.addEventListener('click',()=>{opener=trigger;show(i);dialog.showModal();});
 }
});
dialog.addEventListener('click',event=>{
 const action=event.target.closest('[data-action]')?.dataset.action;
 if(event.target===dialog || action==='close')close();
 if(action==='previous')show(index-1);
 if(action==='next')show(index+1);
 if(action==='zoom'){
  const original=viewport.classList.toggle('original-size');
  zoom.textContent=original?'适应窗口':'查看原图';
 }
});
dialog.addEventListener('keydown',event=>{
 if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);}
 if(event.key==='ArrowRight'){event.preventDefault();show(index+1);}
});
dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
})();`;
const scriptHash=createHash('sha256').update(script).digest('base64');
const markup=`<dialog class="image-preview" aria-label="图片预览"><div class="image-toolbar"><span class="image-count" aria-live="polite"></span><button type="button" data-action="previous" aria-label="上一张图片">上一张</button><button type="button" data-action="next" aria-label="下一张图片">下一张</button><button type="button" data-action="zoom">查看原图</button><button type="button" data-action="close" autofocus>关闭预览</button></div><div class="image-viewport" tabindex="0"><img alt=""></div></dialog>`;
const css=`
.image-trigger{display:inline-block;max-width:100%;padding:0;border:0;background:none;cursor:zoom-in;vertical-align:middle}
.image-trigger:focus-visible{outline:2px solid var(--link);outline-offset:4px}
article a:has(img){cursor:zoom-in}
.image-preview{width:calc(100vw - 32px);max-width:none;height:calc(100dvh - 32px);max-height:none;padding:0;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);overflow:hidden}
.image-preview[open]{display:flex;flex-direction:column}
.image-preview::backdrop{background:#000c}
body:has(.image-preview[open]){overflow:hidden}
.image-toolbar{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px;padding:12px;border-bottom:1px solid var(--border)}
.image-toolbar button{border:1px solid var(--border);border-radius:6px;padding:8px 12px;background:var(--surface);color:var(--text);font:inherit;font-size:14px;cursor:pointer;min-height:40px}
.image-toolbar button:focus-visible{outline:2px solid var(--link);outline-offset:2px}
.image-count{margin-right:auto;font-size:14px}
.image-viewport{flex:1;min-height:0;overflow:auto;display:flex;align-items:center;justify-content:center;padding:16px}
.image-viewport img{display:block;max-width:100%;max-height:100%;object-fit:contain;height:auto;width:auto}
.image-viewport.original-size{display:block}
.image-viewport.original-size img{max-width:none;max-height:none}
@media(max-width:600px){.image-preview{width:100vw;height:100dvh;max-height:100dvh;margin:0;border:0;border-radius:0}.image-toolbar{gap:6px;padding:8px}.image-toolbar button{padding:6px 8px}}
`;
module.exports={script,scriptHash,markup,css};
