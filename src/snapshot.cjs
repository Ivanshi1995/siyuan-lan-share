'use strict';
const {createHash} = require('node:crypto');
const allowed = new Set('p div span h1 h2 h3 h4 h5 h6 a img pre code blockquote ul ol li strong em del s br hr table thead tbody tr th td sup sub details summary audio video source'.split(' '));
const dangerous = new Set('SCRIPT STYLE IFRAME OBJECT EMBED SVG MATH FORM INPUT BUTTON TEXTAREA LINK META BASE'.split(' '));
const mime = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',mp4:'video/mp4',webm:'video/webm'};
async function cacheAsset(path, readAsset, resources) {
  if(resources.cached.has(path)) return resources.cached.get(path);
  const bytes=await readAsset(path); resources.size+=bytes.length;
  if(resources.size>50*1024*1024) throw new Error('整组附件超过 50 MB。请减少附件。');
  const key=createHash('sha256').update(path).digest('hex');
  const contentHash=createHash('sha256').update(bytes).digest('hex');
  const previous=resources.previousAssets?.[key];
  if(previous?.path===path && previous.contentHash===contentHash) {
    resources.assets[key]=previous;
    if(resources.stats) resources.stats.assetsReused++;
  } else {
    const type=mime[path.split('.').pop().toLowerCase()];
    resources.assets[key]={path,contentHash,data:bytes.toString('base64'),type:type || 'application/octet-stream',download:!type,name:path.split('/').pop()};
    if(resources.stats) resources.stats.assetsChanged++;
  }
  resources.cached.set(path,key); return key;
}
async function reuseDocument(page, readAsset, resources) {
  const keys=[...new Set([...page.html.matchAll(/\b(?:src|href)="assets\/([a-f0-9]{64})"/g)].map(m=>m[1]))];
  // Old snapshots without original attachment paths must be rendered once.
  if(keys.some(key=>!assetPath(resources.previousAssets?.[key]?.path || ''))) return false;
  for(const key of keys) await cacheAsset(resources.previousAssets[key].path,readAsset,resources);
  return true;
}
function assetPath(raw) {
  let value; try { value=decodeURIComponent(raw); } catch { return null; }
  value=value.replace(/^\//,'');
  if(!value.startsWith('assets/') || /[\\?#\x00-\x1f]/.test(value) || value.split('/').some(x=>!x || x==='.' || x==='..')) return null;
  return value;
}
async function snapshot(html, document, readAsset, resources={assets:{},cached:new Map(),size:0}) {
  const root = document.createElement('div'); root.innerHTML=html;
  const {assets} = resources;
  async function walk(parent) {
    for(const node of [...parent.children]) {
      const tag=node.tagName.toLowerCase();
      if(dangerous.has(node.tagName)) { node.remove(); continue; }
      const raw=node.getAttribute(tag==='a' ? 'href' : 'src');
      const alt=node.getAttribute('alt'); const title=node.getAttribute('title');
      for(const attr of [...node.attributes]) node.removeAttribute(attr.name);
      if(title) node.setAttribute('title',title);
      if(tag==='img' && alt) node.setAttribute('alt',alt);
      if(['audio','video'].includes(tag)) node.setAttribute('controls','');
      if(raw && ['a','img','audio','video','source'].includes(tag)) {
        const path=assetPath(raw);
        if(path) {
          const key=await cacheAsset(path,readAsset,resources);
          node.setAttribute(tag==='a'?'href':'src','assets/'+key);
        } else if(tag==='a' && /^(https?:\/\/|mailto:|#)/i.test(raw)) {
          node.setAttribute('href',raw); node.setAttribute('rel','noreferrer noopener');
        }
      }
      await walk(node);
      if(!allowed.has(tag)) node.replaceWith(...node.childNodes);
    }
  }
  await walk(root); return {html:root.innerHTML,assets};
}
module.exports={snapshot,assetPath,cacheAsset,reuseDocument};
