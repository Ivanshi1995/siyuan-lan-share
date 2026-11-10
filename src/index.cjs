'use strict';
const {Plugin, Dialog, showMessage, getFrontend, getAllEditor} = require('siyuan');
const {ShareServer, addresses, newToken} = require('./server.cjs');
const {snapshot,reuseDocument} = require('./snapshot.cjs');
const {createHash} = require('node:crypto');
const {collectDocuments,sameScope,buildGroup} = require('./group.cjs');
const {Buffer} = require('node:buffer');
const {createPanel} = require('./panel.cjs');
const {symbol} = require('./ui-icons.cjs');
module.exports = class LanShare extends Plugin {
  async onload() {
    if(getFrontend()!=='desktop') return;
    this.state=await this.loadData('shares.json') || {port:17239,shares:{}};
    this.service=new ShareServer(()=>this.state.shares);
    this.addIcons(symbol);
    this.addTopBar({icon:'iconLanShare',title:'局域网分享',position:'right',callback:()=>this.openSetting()});
  }
  async onunload() { this.panel?.destroy(); await this.service?.stop(); this.dialog?.destroy(); }
  onDataChanged() { /* Local snapshots are committed by persist. */ }
  async api(path,body) {
    const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    if(!res.ok) throw new Error('思源接口读取失败。请重试。');
    const data=await res.json(); if(data.code!==0) throw new Error('思源拒绝导出。请检查文档权限。'); return data.data;
  }
  async persist(next) { await this.saveData('shares.json',next); this.state=next; }
  collect(id,includeChildren) { return collectDocuments(this.api.bind(this),id,includeChildren); }
  async publish(id,includeChildren=false,preview) {
    const docs=await this.collect(id,includeChildren);
    if(preview && !sameScope(docs,preview)) throw new Error('分享范围已变化。请重新预览后发布。');
    const lute=window.Lute?.New?.();
    if(!lute) throw new Error('渲染器未加载。请重启思源。');
    const existing=Object.entries(this.state.shares).find(([,s])=>s.id===id);
    const previous=existing?.[1];
    const previousDocs=new Map((previous?.docs || []).map(doc=>[doc.id,doc]));
    const stats={rendered:0,reused:0,assetsChanged:0,assetsReused:0};
    const resources={assets:{},cached:new Map(),size:0,previousAssets:previous?.assets || {},stats};
    const readAsset=async path=>{
      const response=await fetch('/'+path.split('/').map(encodeURIComponent).join('/'),{signal:AbortSignal.timeout(30000)});
      if(!response.ok) throw new Error('附件读取失败。请检查附件是否存在。');
      if(Number(response.headers.get('content-length'))>50*1024*1024) throw new Error('附件超过 50 MB。请减少附件。');
      const reader=response.body.getReader(); const parts=[]; let size=0;
      try { for(;;) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>50*1024*1024) throw new Error('附件超过 50 MB。请减少附件。'); parts.push(Buffer.from(value)); } }
      finally { await reader.cancel(); }
      return Buffer.concat(parts);
    };
    const pages=await buildGroup(docs,async doc=>{
      const exported=await this.api('/api/export/exportMdContent',{id:doc.id,yfm:false,addTitle:false});
      if(typeof exported.content!=='string') throw new Error('正文读取失败。请重新发布。');
      const sourceHash=createHash('sha256').update('snapshot-v1\0'+exported.content).digest('hex');
      const old=previousDocs.get(doc.id);
      if(old?.sourceHash===sourceHash && await reuseDocument(old,readAsset,resources)) {
        stats.reused++; return {html:old.html,sourceHash};
      }
      const result=await snapshot(lute.Md2HTML(exported.content),document,readAsset,resources);
      stats.rendered++; return {...result,sourceHash};
    });
    // A failed export or concurrent tree change leaves the previous share intact.
    if(!sameScope(docs,await this.collect(id,includeChildren))) throw new Error('分享范围已变化。请重新预览后发布。');
    const token=existing?.[0] || newToken();
    const unchanged=previous && previous.includeChildren===includeChildren && previous.docs?.length===pages.length &&
      pages.every((page,i)=>['id','parentId','depth','title','html','sourceHash'].every(key=>page[key]===previous.docs[i][key])) &&
      Object.keys(previous.assets || {}).length===Object.keys(resources.assets).length &&
      Object.entries(resources.assets).every(([key,asset])=>asset===previous.assets[key]);
    if(unchanged){
      // Keep the persisted snapshot and timestamp intact when nothing changed.
      this.state={...this.state,shares:{...this.state.shares,[token]:{...previous,stats}}};
      return token;
    }
    await this.persist({...this.state,shares:{...this.state.shares,[token]:{docs:pages,assets:resources.assets,id,includeChildren,title:pages[0].title,updated:new Date().toISOString(),stats}}});
    return token;
  }
  openSetting() {
    if(!this.service) return showMessage('此插件需要思源桌面端。');
    this.panel?.destroy();this.dialog?.destroy();
    const dialog=new Dialog({title:'局域网分享',width:'860px',content:'<div class="lan-share-panel"></div>'});
    this.dialog=dialog;
    this.panel=createPanel(this,dialog.element.querySelector('.lan-share-panel'),{
      getAllEditor,addresses,version:'0.4.0',
      copy:url=>navigator.clipboard.writeText(url),
      open:url=>require('electron').shell.openExternal(url),
    });
  }
};
