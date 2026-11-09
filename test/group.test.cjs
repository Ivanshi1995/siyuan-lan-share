const {test}=require('node:test');const assert=require('node:assert/strict');
const {collectDocuments,sameScope}=require('../src/group.cjs');
const {readFileSync}=require('node:fs');const vm=require('node:vm');
const root='20261109133929-rf7nlzl',child='20261109140000-aaaaaaa',grandchild='20261109140001-bbbbbbb',sibling='20261109140002-ccccccc';
function fixture() {
 const paths={[root]:'/'+root+'.sy',[child]:'/'+root+'/'+child+'.sy',[grandchild]:'/'+root+'/'+child+'/'+grandchild+'.sy',[sibling]:'/'+sibling+'.sy'};
 const titles={[root]:'测试根文档',[child]:'子文档',[grandchild]:'孙文档',[sibling]:'其他文档'};
 const children={[root]:[child],[child]:[grandchild],[grandchild]:[]};const calls=[];
 const api=async (route,args)=>{
  calls.push({route,args});
  if(route==='/api/block/getBlockInfo')return {rootID:args.id,box:'notebook',path:paths[args.id],rootTitle:titles[args.id]};
  if(route==='/api/filetree/listDocsByPath'){const parent=Object.keys(paths).find(k=>paths[k]===args.path);return {files:(children[parent]||[]).map(id=>({id,path:paths[id],name:titles[id]+'.sy'}))};}
  if(route==='/api/export/exportMdContent')return {content:'正文-'+titles[args.id]};
  throw new Error(route);
 };return {api,paths,titles,children,calls};
}
function plugin(api) {
 const mod={exports:{}};const nativeRequire=require;
 vm.runInNewContext(readFileSync(require.resolve('../src/index.cjs'),'utf8'),{module:mod,window:{Lute:{New:()=>({Md2HTML:x=>x})}},document:{},require:id=>{
  if(id==='siyuan')return {Plugin:class {}};
  if(id==='./group.cjs')return nativeRequire('../src/group.cjs');
  if(id==='./server.cjs')return nativeRequire('../src/server.cjs');
  if(id==='./snapshot.cjs')return {snapshot:async html=>({html})};return nativeRequire(id);
 }});
 const p=new mod.exports();p.api=api;p.state={port:17239,shares:{}};p.saveData=async()=>{};return p;
}
test('收集所有层级，保持目录顺序并排除兄弟文档',async()=>{
 const f=fixture();const docs=await collectDocuments(f.api,root,true);
 assert.deepEqual(docs.map(d=>d.id),[root,child,grandchild]);assert.deepEqual(docs.map(d=>d.depth),[0,1,2]);assert.equal(docs[2].parentId,child);
 for(const call of f.calls.filter(c=>c.route.includes('listDocs'))) {assert.equal(call.args.maxListCount,0);assert.equal(call.args.showHidden,true);}
 assert.equal((await collectDocuments(f.api,root,false)).length,1);
 assert.equal(sameScope(docs,[...docs].reverse()),false);
});
test('拒绝块编号、目录越界和重复目录',async()=>{
 const f=fixture();await assert.rejects(collectDocuments(async()=>({rootID:child}),root,true));
 await assert.rejects(collectDocuments(async(route,args)=>route.includes('listDocs')?{files:[{id:sibling,path:f.paths[sibling]}]}:f.api(route,args),root,true));
 f.children[child]=[root];await assert.rejects(collectDocuments(f.api,root,true));
});
test('整组更新保留链接并移除已移出范围的子文档',async()=>{
 const f=fixture(),p=plugin(f.api);const token=await p.publish(root,true);
 assert.equal(p.state.shares[token].docs.length,3);
 f.children[child]=[];assert.equal(await p.publish(root,true),token);assert.equal(p.state.shares[token].docs.length,2);
 assert.equal(await p.publish(root,false),token);assert.equal(p.state.shares[token].docs.length,1);assert.equal(p.state.shares[token].includeChildren,false);
});
test('导出失败、保存失败及预览范围变化均保留原分享',async()=>{
 const f=fixture(),p=plugin(f.api);const token=await p.publish(root,true);const before=p.state;
 p.api=async(route,args)=>{if(route.includes('export') && args.id===child)throw new Error('导出失败');return f.api(route,args);};
 await assert.rejects(p.publish(root,true));assert.equal(p.state,before);
 p.api=f.api;p.saveData=async()=>{throw new Error('保存失败');};await assert.rejects(p.publish(root,true));assert.equal(p.state,before);
 const preview=await p.collect(root,true);f.children[child]=[];await assert.rejects(p.publish(root,true,preview),/范围已变化/);assert.equal(p.state.shares[token],before.shares[token]);
});
test('导出期间目录变化不提交新快照',async()=>{
 const f=fixture(),p=plugin(f.api);await p.publish(root,true);const before=p.state;
 p.api=async(route,args)=>{if(route.includes('export'))f.children[child]=[];return f.api(route,args);};await assert.rejects(p.publish(root,true),/范围已变化/);assert.equal(p.state,before);
});
