'use strict';
const {Plugin, Dialog, showMessage, getFrontend, getAllEditor} = require('siyuan');
const {ShareServer, addresses, newToken} = require('./server.cjs');
const {snapshot} = require('./snapshot.cjs');
const {collectDocuments,sameScope,buildGroup} = require('./group.cjs');
const {Buffer} = require('node:buffer');
module.exports = class LanShare extends Plugin {
  async onload() {
    if(getFrontend()!=='desktop') return;
    this.state=await this.loadData('shares.json') || {port:17239,shares:{}};
    this.service=new ShareServer(()=>this.state.shares);
    this.addTopBar({icon:'iconUpload',title:'局域网分享',position:'right',callback:()=>this.openSetting()});
  }
  async onunload() { await this.service?.stop(); this.dialog?.destroy(); }
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
    const resources={assets:{},cached:new Map(),size:0};
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
      return snapshot(lute.Md2HTML(exported.content),document,readAsset,resources);
    });
    // A failed export or concurrent tree change leaves the previous share intact.
    if(!sameScope(docs,await this.collect(id,includeChildren))) throw new Error('分享范围已变化。请重新预览后发布。');
    const existing=Object.entries(this.state.shares).find(([,s])=>s.id===id);
    const token=existing?.[0] || newToken();
    await this.persist({...this.state,shares:{...this.state.shares,[token]:{docs:pages,assets:resources.assets,id,includeChildren,title:pages[0].title,updated:new Date().toISOString()}}});
    return token;
  }
  openSetting() {
    if(!this.service) return showMessage('此插件需要思源桌面端。');
    this.dialog?.destroy();
    const dialog=new Dialog({title:'局域网分享',width:'760px',content:'<div class="lan-share-panel"></div>'}); this.dialog=dialog;
    const host=dialog.element.querySelector('.lan-share-panel');
    let busy=false; let selectedId=''; let includeChildren=false; let preview=null;
    const action=(label,fn)=>{const b=document.createElement('button');b.className='b3-button';b.textContent=label;b.onclick=async()=>{if(busy)return;busy=true;b.disabled=true;try{await fn();render();}catch(e){preview=null;render();showMessage(e.message || '操作失败。请重试。',7000,'error');}finally{busy=false;b.disabled=false;}};return b;};
    const line=text=>{const p=document.createElement('p');p.textContent=text;host.append(p);};
    const input=(label,value,placeholder)=>{const wrap=document.createElement('label');wrap.textContent=label;const i=document.createElement('input');i.className='b3-text-field';i.value=value;i.placeholder=placeholder;wrap.append(i);host.append(wrap);return i;};
    const render=()=>{
      host.replaceChildren();line('分享范围：持有链接的人可读取文档和附件。');
      line('服务状态：'+(this.service.server?'正在运行':'已停止'));
      const port=input('服务端口：',this.state.port,'17239');port.type='number';port.disabled=!!this.service.server;
      host.append(action(this.service.server?'停止服务':'启动服务',async()=>{
        if(this.service.server) await this.service.stop();
        else {const next={...this.state,port:Number(port.value)};await this.service.start(next.port);try{await this.persist(next);}catch(e){await this.service.stop();throw e;}}
      }));
      line('发布方式：预览文档清单后发布。更新会重新收集子文档。');
      const editors=getAllEditor(); const current=editors.find(e=>e.protyle?.element?.closest('.layout__wnd--active')) || (editors.length===1?editors[0]:null);
      if(!selectedId) selectedId=current?.protyle?.block?.rootID || '';
      const id=input('文档编号：',selectedId,'20261109120000-abcdefg');
      const option=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=includeChildren;option.append(check,document.createTextNode('包含子文档：分享全部层级，含隐藏文档。'));host.append(option);
      const invalidate=()=>{selectedId=id.value.trim();includeChildren=check.checked;preview=null;host.querySelector('.lan-share-preview')?.remove();};id.oninput=invalidate;check.onchange=invalidate;
      host.append(action('预览分享范围',async()=>{selectedId=id.value.trim();includeChildren=check.checked;preview=await this.collect(selectedId,includeChildren);}));
      if(preview) {
        const box=document.createElement('section');box.className='lan-share-preview';const label=document.createElement('p');label.textContent=`分享范围：共 ${preview.length} 篇。持有链接的人可读取全部文档。`;box.append(label);
        const list=document.createElement('ul');list.className='lan-share-doc-list';for(const doc of preview){const item=document.createElement('li');item.textContent=doc.title;item.style.marginLeft=(doc.depth*16)+'px';list.append(item);}box.append(list);
        box.append(action('发布此范围',async()=>{await this.publish(selectedId,includeChildren,preview);preview=null;}));host.append(box);
      }
      const ips=addresses(); if(!ips.length) line('网络地址：未发现局域网地址。请连接局域网。');
      if(!Object.keys(this.state.shares).length) line('分享列表：尚未发布。请在上方填写文档编号并发布。');
      for(const [token,s] of Object.entries(this.state.shares)) {
        const row=document.createElement('section');const title=document.createElement('strong');title.textContent=s.title;row.append(title);
        const count=document.createElement('p');count.textContent=`分享范围：${s.includeChildren?'包含全部子文档':'仅此文档'}，已发布 ${s.docs?.length || 1} 篇。`;row.append(count);
        for(const ip of ips) {const url=`http://${ip}:${this.state.port}/s/${token}/`;const p=document.createElement('p');const field=document.createElement('input');field.readOnly=true;field.value=url;field.className='b3-text-field';field.onclick=()=>field.select();p.append(field,action('复制链接',()=>navigator.clipboard.writeText(url)));row.append(p);}
        row.append(action('预览并更新',async()=>{selectedId=s.id;includeChildren=!!s.includeChildren;preview=await this.collect(selectedId,includeChildren);}),action(s.includeChildren?'撤销整组分享':'撤销分享',async()=>{const shares={...this.state.shares};delete shares[token];await this.persist({...this.state,shares});}));host.append(row);
      }
      line('连接条件：两台设备须能互相访问此端口。');
      line('运行条件：关闭思源或停用插件会停止服务。重启后需手动启动。');
    };render();
  }
};
