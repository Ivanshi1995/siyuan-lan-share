const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
for(const file of ['plugin.json','index.css','README.md','LICENSE','icon.png','preview.jpg'])fs.copyFileSync(path.join(root,file),path.join(dist,file));
const modules=['index.cjs','server.cjs','snapshot.cjs','group.cjs','viewer.cjs'].map(name=>JSON.stringify('./'+name)+':function(module,exports,require){\n'+fs.readFileSync(path.join(root,'src',name),'utf8')+'\n}').join(',\n');
fs.writeFileSync(path.join(dist,'index.js'),`module.exports=(function(nativeRequire){const modules={${modules}};const cache={};function load(id){if(!modules[id])return nativeRequire(id);if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;modules[id](m,m.exports,load);return m.exports;}return load('./index.cjs');})(require);`);
console.log('已生成 dist 安装目录。');
