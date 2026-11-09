'use strict';
const {createHash} = require('node:crypto');
const allowed = new Set('p div span h1 h2 h3 h4 h5 h6 a img pre code blockquote ul ol li strong em del s br hr table thead tbody tr th td sup sub details summary audio video source'.split(' '));
const dangerous = new Set('SCRIPT STYLE IFRAME OBJECT EMBED SVG MATH FORM INPUT BUTTON TEXTAREA LINK META BASE'.split(' '));
const mime = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',mp4:'video/mp4',webm:'video/webm'};
function assetPath(raw) {
  let value; try { value=decodeURIComponent(raw); } catch { return null; }
  value=value.replace(/^\//,'');
  if(!value.startsWith('assets/') || /[\\?#\x00-\x1f]/.test(value) || value.split('/').some(x=>!x || x==='.' || x==='..')) return null;
  return value;
}
async function snapshot(html, document, readAsset, resources={assets:{},cached:new Map(),size:0}) {
  const root = document.createElement('div'); root.innerHTML=html;
  const {assets,cached} = resources;
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
          let key=cached.get(path);
          if(!key) {
            const bytes=await readAsset(path); resources.size+=bytes.length;
            if(resources.size>50*1024*1024) throw new Error('整组附件超过 50 MB。请减少附件。');
            key=createHash('sha256').update(path).digest('hex'); cached.set(path,key);
            const type=mime[path.split('.').pop().toLowerCase()];
            assets[key]={data:bytes.toString('base64'),type:type || 'application/octet-stream',download:!type,name:path.split('/').pop()};
          }
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
module.exports={snapshot,assetPath};
