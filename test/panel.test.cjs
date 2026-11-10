const {test}=require('node:test');const assert=require('node:assert/strict');
const {sortAddresses,currentDocumentId}=require('../src/panel.cjs');
test('分享地址优先选择私有网段，保留其他网卡并去重',()=>{
 const addresses=['28.0.0.1','172.15.0.1','192.168.1.108','10.0.0.2','172.16.0.1','192.168.1.108'];
 assert.deepEqual(sortAddresses(addresses),['192.168.1.108','10.0.0.2','172.16.0.1','28.0.0.1','172.15.0.1']);
 assert.equal(addresses.length,6);assert.deepEqual(sortAddresses([]),[]);
});
test('当前文档排除隐藏标签页，分屏不明确时要求手动选择',()=>{
 const editor=(id,visible,active)=>({protyle:{block:{rootID:id},element:{getClientRects:()=>visible?[{}]:[],closest:()=>active?{}:null}}});
 const hidden=editor('隐藏标签页',false,true),current=editor('当前文档',true,true),other=editor('其他分屏',true,false);
 assert.equal(currentDocumentId([hidden,current,other]),'当前文档');
 assert.equal(currentDocumentId([hidden,current]),'当前文档');
 assert.equal(currentDocumentId([hidden]),'');
 assert.equal(currentDocumentId([editor('左侧',true,false),editor('右侧',true,false)]),'');
 assert.equal(currentDocumentId([]),'');
});
