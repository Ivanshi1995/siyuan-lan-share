'use strict';
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const m=JSON.parse(fs.readFileSync(path.join(root,'plugin.json'),'utf8'));const p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const issues=[];
if(!m.author?.trim() || m.author==='Local')issues.push('作者信息尚未填写。');
if(!new RegExp('^https://github\\.com/[A-Za-z0-9-]+/'+m.name+'$').test(m.url))issues.push('GitHub 仓库地址尚未填写。');
if(p.version!==m.version || !/^\d+\.\d+\.\d+$/.test(m.version))issues.push('版本号无效或不一致。');
for(const key of ['displayName','description','readme']){
 if(!m[key]?.default)issues.push(key+' 缺少默认值。');
 for(const locale of Object.keys(m[key] || {})){if(locale!=='default'){try{if(Intl.getCanonicalLocales(locale)[0]!==locale)issues.push('语言标记不规范：'+locale);}catch{issues.push('语言标记无效：'+locale);}}}
}
for(const name of ['LICENSE','README.md','icon.png','preview.png'])if(!fs.existsSync(path.join(root,name)))issues.push('缺少发布文件：'+name);
if(fs.existsSync(path.join(root,'LICENSE')) && !fs.readFileSync(path.join(root,'LICENSE'),'utf8').startsWith('MIT License'))issues.push('许可证与 MIT 声明不一致。');
for(const [key,max] of [['icon',64*1024],['preview',512*1024]])if(m[key]){const file=path.join(root,m[key]);if(!fs.existsSync(file) || fs.statSync(file).size>max)issues.push('图片不存在或体积超限：'+m[key]);}
if(issues.length){for(const issue of issues)console.error('未通过：'+issue);process.exitCode=1;}else console.log('发布材料本地检查通过。');
