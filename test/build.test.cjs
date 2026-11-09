const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
test('安装包可在思源加载方式下导出插件类',()=>{
 const filename=path.join(__dirname,'../dist/index.js');assert.ok(fs.existsSync(filename),'请先构建安装包');
 class Plugin {} const mod={exports:{}};
 const context={module:mod,require:id=>id==='siyuan'?{Plugin}:require(id)};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),context);
 assert.ok(mod.exports.prototype instanceof Plugin);
});
