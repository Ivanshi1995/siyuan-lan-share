const {test}=require('node:test');const assert=require('node:assert/strict');
const {cacheAsset,reuseDocument}=require('../src/snapshot.cjs');
const {createHash}=require('node:crypto');
function resources(previousAssets={}){return {assets:{},previousAssets,cached:new Map(),size:0,stats:{assetsChanged:0,assetsReused:0}};}
test('附件去重、内容复用及同路径替换',async()=>{
 let reads=0,bytes=Buffer.from('旧图片');const read=async()=>{reads++;return bytes;};
 const first=resources();const key=await cacheAsset('assets/photo.png',read,first);
 await cacheAsset('assets/photo.png',read,first);assert.equal(reads,1);
 const page={html:`<img src="assets/${key}"><a href="assets/${key}">下载</a>`};
 const same=resources(first.assets);assert.equal(await reuseDocument(page,read,same),true);
 assert.equal(same.assets[key],first.assets[key]);assert.equal(same.stats.assetsReused,1);
 bytes=Buffer.from('替换图片');const changed=resources(first.assets);
 await reuseDocument(page,read,changed);assert.equal(changed.stats.assetsChanged,1);
 assert.equal(Buffer.from(changed.assets[key].data,'base64').toString(),'替换图片');
 assert.equal(Buffer.from(first.assets[key].data,'base64').toString(),'旧图片');
});
test('复用只保留仍被引用的附件，失败不修改原附件',async()=>{
 const old=resources();const key=await cacheAsset('assets/keep.png',async()=>Buffer.from('原图'),old);
 await cacheAsset('assets/removed.png',async()=>Buffer.from('删除图'),old);
 const next=resources(old.assets);await reuseDocument({html:`<img src="assets/${key}">`},async()=>Buffer.from('原图'),next);
 assert.deepEqual(Object.keys(next.assets),[key]);
 const saved=JSON.stringify(old.assets);
 await assert.rejects(reuseDocument({html:`<img src="assets/${key}">`},async()=>{throw new Error('缺少附件');},resources(old.assets)),/缺少附件/);
 assert.equal(JSON.stringify(old.assets),saved);
 assert.equal(await reuseDocument({html:`<img src="assets/${'a'.repeat(64)}">`},async()=>{throw new Error('不能读取');},resources()),false);
});
test('复用附件仍执行整组大小限制',async()=>{
 const state=resources();state.size=50*1024*1024;
 await assert.rejects(cacheAsset('assets/large.png',async()=>Buffer.from('x'),state),/50 MB/);
});
test('预览脚本仅允许固定内容，笔记文本不参与脚本',()=>{
 const {script,scriptHash}=require('../src/preview.cjs');
 assert.equal(createHash('sha256').update(script).digest('base64'),scriptHash);
 const {renderPage}=require('../src/viewer.cjs');
 const html=renderPage({},[],{title:'</script><script>alert(1)</script>',html:'<p>正文</p>'},'/s/'+'a'.repeat(48)+'/');
 assert.equal((html.match(/<script>/g)||[]).length,1);
 assert.ok(html.includes('aria-label="图片预览"'));
 assert.ok(!html.includes("<script>alert(1)</script>"));
});
