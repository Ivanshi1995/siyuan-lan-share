'use strict';
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css = `
:root{color-scheme:light dark;--page:#f7f8fa;--surface:#fff;--text:#243044;--muted:#65738a;--border:#dde3eb;--link:#2465bb;--code:#eef1f5;--selected:#eaf1fb}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--text);font:17px/1.8 system-ui,sans-serif}
main{width:100%;max-width:900px;margin:40px auto;padding:40px;background:var(--surface);border-radius:18px;min-width:0}
.share-layout{display:grid;grid-template-columns:256px minmax(0,1fr);gap:32px;padding:32px 24px 32px 16px;min-height:100vh;align-items:start}
.share-layout main{margin:0 auto}
.directory-panel{position:sticky;top:24px;min-width:0;font-size:14px;line-height:1.6}
.directory-nav{padding:20px 12px;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:0 4px 20px #14233b06}
.directory-nav h2{font-size:14px;line-height:1.6;margin:0 8px 14px;color:var(--muted);font-weight:600}
.doc-tree{list-style:none;padding:0;margin:0;max-height:calc(100vh - 144px);max-height:calc(100dvh - 144px);overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
.doc-tree li{padding-left:calc(var(--depth)*12px)}
.doc-tree a{display:block;padding:8px 10px;border-radius:6px;color:var(--text);text-decoration:none;overflow-wrap:anywhere;border-left:2px solid transparent}
.doc-tree a:hover{background:var(--code)}
.doc-tree [aria-current=page]{font-weight:600;background:var(--selected);color:var(--link);border-left-color:var(--link)}
.directory-toggle,.directory-trigger{display:none}
a{color:var(--link)}
a:focus-visible,.directory-toggle:focus-visible+.directory-trigger{outline:2px solid var(--link);outline-offset:3px}
h1{line-height:1.3;overflow-wrap:anywhere}
header{border-bottom:1px solid var(--border);margin-bottom:28px}
small{color:var(--muted)}
article{overflow-wrap:anywhere}
img,video{max-width:100%;height:auto}
audio{max-width:100%}
pre{overflow:auto;padding:20px;background:var(--code);border-radius:8px}
table{border-collapse:collapse;display:block;overflow:auto}
td,th{border:1px solid var(--border);padding:8px}
blockquote{border-left:4px solid #91a6c4;margin-left:0;padding-left:20px}
@media(max-width:900px){
  .share-layout{display:block;padding:76px 20px 24px}
  .directory-panel{position:fixed;top:16px;left:16px;z-index:10;width:min(288px,calc(100vw - 32px))}
  .directory-toggle{display:block;position:absolute;width:1px;height:1px;opacity:0;margin:0}
  .directory-trigger{display:inline-flex;align-items:center;gap:12px;min-height:42px;padding:8px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 16px #14233b12;cursor:pointer;font-weight:600;user-select:none}
  .directory-trigger::after{content:'展开';color:var(--muted);font-size:12px;font-weight:400}
  .directory-toggle:checked+.directory-trigger::after{content:'收起'}
  .directory-nav{display:none;margin-top:8px;box-shadow:0 8px 32px #14233b22}
  .directory-toggle:checked~.directory-nav{display:block}
  .doc-tree{max-height:calc(100vh - 156px);max-height:calc(100dvh - 156px)}
}
@media(max-width:600px){main{margin:0;padding:24px;border-radius:0}.share-layout{padding:76px 0 0}.share-layout main{min-height:calc(100vh - 76px)}}
@media(prefers-color-scheme:dark){:root{--page:#151a24;--surface:#202837;--text:#dbe3ef;--muted:#9baac0;--border:#3d485b;--link:#92bcff;--code:#141c29;--selected:#2b405c}}
`;
function renderPage(share,docs,page,base) {
  const nav=share.includeChildren ? `<aside class="directory-panel"><input class="directory-toggle" id="directory-toggle" type="checkbox" aria-label="切换文档目录"><label class="directory-trigger" for="directory-toggle">文档目录 · ${docs.length} 篇</label><nav class="directory-nav" aria-label="文档目录"><h2>文档目录 · ${docs.length} 篇</h2><ul class="doc-tree">${docs.map(d=>`<li style="--depth:${Math.min(8,Math.max(0,Number(d.depth)||0))}"><a href="${base}d/${escape(d.id)}/" title="${escape(d.title)}"${d.id===page.id?' aria-current="page"':''}>${escape(d.title)}</a></li>`).join('')}</ul></nav></aside>` : '';
  const html=page.html.replace(/\b(src|href)="assets\/([a-f0-9]{64})"/g,`$1="${base}assets/$2"`);
  const main=`<main><header><small>局域网只读分享 · ${escape(share.updated)}</small><h1>${escape(page.title)}</h1></header><article>${html}</article></main>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(page.title)}</title><style>${css}</style></head><body>${nav?`<div class="share-layout">${nav}${main}</div>`:main}</body></html>`;
}
module.exports={renderPage,escape};
