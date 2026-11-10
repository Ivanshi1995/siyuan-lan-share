'use strict';
const {Buffer} = require('node:buffer');
const ID = /^\d{14}-[a-z0-9]{7}$/;
const MAX_DOCS = 500;
async function collectDocuments(api, id, includeChildren) {
  if(!ID.test(id)) throw new Error('文档编号无效。请复制文档编号。');
  const info=await api('/api/block/getBlockInfo',{id});
  if(info.rootID!==id || !info.box || !info.path?.endsWith('/'+id+'.sy')) throw new Error('请选择整篇文档。请从文档菜单复制编号。');
  const docs=[{id,parentId:null,depth:0,title:info.rootTitle || '未命名文档',path:info.path}];
  if(!includeChildren) return docs;
  const seen=new Set([id]);
  async function visit(parent) {
    const result=await api('/api/filetree/listDocsByPath',{notebook:info.box,path:parent.path,maxListCount:0,showHidden:true});
    if(!Array.isArray(result.files)) throw new Error('子文档目录读取失败。请重新预览。');
    const prefix=parent.path.slice(0,-3)+'/';
    for(const file of result.files) {
      if(!ID.test(file.id) || file.path!==prefix+file.id+'.sy' || seen.has(file.id)) throw new Error('文档目录已变化。请重新预览。');
      if(docs.length>=MAX_DOCS || parent.depth>=64) throw new Error('分享范围超过限制。请选择更小的文档目录。');
      seen.add(file.id);
      const child={id:file.id,parentId:parent.id,depth:parent.depth+1,title:String(file.name || '未命名文档').replace(/\.sy$/,''),path:file.path};
      docs.push(child); await visit(child);
    }
  }
  await visit(docs[0]); return docs;
}
function sameScope(a,b) {
  return JSON.stringify(a.map(d=>[d.id,d.parentId,d.title,d.path]))===JSON.stringify(b.map(d=>[d.id,d.parentId,d.title,d.path]));
}
async function buildGroup(docs, renderDocument) {
  const pages=[];let size=0;
  for(const doc of docs) {
    const result=await renderDocument(doc);
    size+=Buffer.byteLength(result.html,'utf8');
    if(size>10*1024*1024) throw new Error('正文总量超过 10 MB。请选择更小的文档目录。');
    pages.push({id:doc.id,parentId:doc.parentId,depth:doc.depth,title:doc.title,html:result.html,...(result.sourceHash?{sourceHash:result.sourceHash}:{})});
  }
  return pages;
}
module.exports={collectDocuments,sameScope,buildGroup};
