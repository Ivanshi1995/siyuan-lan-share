const {test}=require('node:test');const assert=require('node:assert/strict');
const {ShareServer,newToken}=require('../src/server.cjs');const {assetPath}=require('../src/snapshot.cjs');
test('附件路径拒绝目录穿越和非附件路径',()=>{
 for(const value of ['assets/../secret','assets/%2e%2e/secret','assets/a%5cb','/api/file/getFile','https://a/assets/a','assets/a?x','assets/%00'])assert.equal(assetPath(value),null);
 assert.equal(assetPath('/assets/图片.png'),'assets/图片.png');
});
test('分享服务隔离资源、撤销链接并限制方法',async t=>{
 const token=newToken();assert.match(token,/^[a-f0-9]{48}$/);const key='a'.repeat(64);
 const shares={[token]:{title:'<script>标题</script>',updated:'2026-11-09',html:'<p>快照</p>',assets:{[key]:{data:Buffer.from('附件').toString('base64'),type:'application/octet-stream',download:true,name:'资料.txt'}}}};
 const server=new ShareServer(()=>shares);let port;
 for(let p=24000;p<24100;p++){try{await server.start(p);port=p;break;}catch(e){if(e.code!=='EADDRINUSE')throw e;}}
 assert.ok(port);t.after(()=>server.stop());const base=`http://127.0.0.1:${port}`;const url=base+'/s/'+token+'/';
 let res=await fetch(url);assert.equal(res.status,200);const html=await res.text();assert.match(html,/&lt;script&gt;/);assert.match(html,/<p>快照/);assert.ok(res.headers.get('content-security-policy').includes("default-src 'none'"));
 res=await fetch(url+'assets/'+key);assert.equal(await res.text(),'附件');assert.match(res.headers.get('content-disposition'),/attachment/);
 assert.equal((await fetch(url,{method:'POST'})).status,405);
 assert.equal((await fetch(base+'/api/sql')).status,404);
 assert.equal((await fetch(url+'assets/'+'b'.repeat(64))).status,404);
 assert.equal((await fetch(url,{method:'HEAD'})).status,200);
 delete shares[token];assert.equal((await fetch(url)).status,404);
});
test('端口校验',async()=>{const s=new ShareServer(()=>({}));await assert.rejects(s.start(80));await assert.rejects(s.start(NaN));});
test('目录导航、子文档附件、整组更新与撤销',async t=>{
 const token=newToken(),other=newToken(),root='20261109140000-aaaaaaa',child='20261109140001-bbbbbbb',outside='20261109140002-ccccccc',key='c'.repeat(64);
 const shares={[token]:{id:root,title:'根',includeChildren:true,updated:'现在',docs:[{id:root,title:'根',html:'根正文',depth:0},{id:child,parentId:root,depth:1,title:'<img onerror=x>',html:`子正文<img src="assets/${key}"><a href="assets/${key}">附件</a>`}],assets:{[key]:{data:Buffer.from('子文档图片').toString('base64'),type:'image/png'}}},[other]:{id:outside,title:'范围外文档',html:'其他正文',assets:{}}};
 const server=new ShareServer(()=>shares);let port;
 for(let p=24200;p<24300;p++){try{await server.start(p);port=p;break;}catch(e){if(e.code!=='EADDRINUSE')throw e;}}assert.ok(port);t.after(()=>server.stop());
 const base=`http://127.0.0.1:${port}/s/${token}/`;
 let r=await fetch(base),html=await r.text();assert.equal(r.status,200);assert.match(html,/文档目录 · 2 篇/);assert.match(html,/&lt;img onerror=x&gt;/);assert.ok(html.includes(`/d/${child}/`));
 r=await fetch(base+'d/'+child+'/');html=await r.text();assert.equal(r.status,200);assert.match(html,/子正文/);assert.match(html,/aria-current="page"/);assert.ok(html.includes(`/s/${token}/assets/${key}`));
 assert.equal(await (await fetch(base+'assets/'+key)).text(),'子文档图片');
 assert.equal((await fetch(base+'d/'+outside+'/')).status,404);
 assert.equal((await fetch(base+'d/'+child+'/?unexpected=1')).status,404);
 shares[token]={...shares[token],docs:shares[token].docs.slice(0,1),assets:{}};
 assert.equal((await fetch(base+'d/'+child+'/')).status,404);assert.equal((await fetch(base+'assets/'+key)).status,404);
 delete shares[token];assert.equal((await fetch(base)).status,404);assert.equal((await fetch(base+'d/'+root+'/')).status,404);assert.equal((await fetch(base.replace(token,other))).status,200);
});
