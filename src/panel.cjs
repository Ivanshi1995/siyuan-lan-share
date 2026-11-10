'use strict';
const {svg}=require('./ui-icons.cjs');
function sortAddresses(ips){
 const local=ip=>/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
 return [...new Set(ips)].sort((a,b)=>Number(local(b))-Number(local(a)));
}
function currentDocumentId(editors){
 const visible=editors.filter(e=>e.protyle?.element?.getClientRects?.().length);
 const active=visible.filter(e=>e.protyle.element.closest('.layout__wnd--active'));
 const singleWithoutElement=editors.length===1 && !editors[0].protyle?.element?editors[0]:null;
 const current=active.length===1?active[0]:visible.length===1?visible[0]:singleWithoutElement;
 return current?.protyle?.block?.rootID || '';
}
function createPanel(plugin,host,environment){
 const {getAllEditor,addresses,copy,open,version}=environment;
 let busy='',selectedId='',includeChildren=false,preview=null,message=null,network='',port=String(plugin.state.port),confirmToken='',highlight='';
 let draftTitle='',focusTarget='',disposed=false,copied='',settingsOpen=false;
 function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
 function icon(name){const el=node('span','ls-icon');el.innerHTML=svg(name);return el;}
 const currentId=()=>currentDocumentId(getAllEditor());
 selectedId=currentId();
 function focusDraft(){focusTarget='draft';}
 async function run(label,operation){
  if(busy || disposed || !host.isConnected)return;
  busy=label;message=null;render();
  try{await operation();}
  catch(error){
   const text=error.code==='EADDRINUSE'?'端口已被占用。请停止服务后更换端口。':error.code==='EACCES'?'此端口无法使用。请停止服务后更换端口。':/[\u4e00-\u9fff]/.test(error.message || '')?error.message:'操作未完成。请检查连接后重试。';
   message={type:'error',text};
  }
  finally{busy='';if(!disposed && host.isConnected)render();}
 }
 function button(text,style,handler,iconName){
  const b=node('button','ls-button '+(style || 'ls-secondary'));b.type='button';b.disabled=!!busy;
  if(iconName)b.append(icon(iconName));b.append(node('span','',text));b.onclick=handler;return b;
 }
 function action(text,style,label,operation,iconName){return button(text,style,()=>run(label,operation),iconName);}
 function heading(parent,title,meta){const head=node('div','ls-section-heading');head.append(node('h3','',title));if(meta)head.append(node('span','ls-muted',meta));parent.append(head);}
 function invalidate(){
  preview=null;draftTitle='';highlight='';host.querySelector('.ls-preview')?.remove();
  host.querySelector('.ls-draft-title')?.remove();
  host.querySelector('.ls-steps')?.setAttribute('data-stage','select');
  const b=host.querySelector('[data-preview-button]');if(b)b.disabled=!!busy || !selectedId;
 }
 function metrics(parent,stats){
  const grid=node('dl','ls-metrics');
  for(const [title,value] of [['正文更新',stats.rendered],['正文复用',stats.reused],['附件更新',stats.assetsChanged],['附件复用',stats.assetsReused]]){
   const cell=node('div','');cell.append(node('dt','',title),node('dd','',String(value ?? 0)));grid.append(cell);
  }
  parent.append(grid);
 }
 function render(){
  const scroll=host.scrollTop;host.replaceChildren();host.setAttribute('aria-busy',String(!!busy));
  const ips=sortAddresses(addresses());if(!ips.includes(network))network=ips[0] || '127.0.0.1';
  const shares=Object.entries(plugin.state.shares);const running=!!plugin.service.server;
  const hero=node('div','ls-hero');const mark=node('div','ls-mark');mark.append(icon('share'));
  const intro=node('div','ls-intro');intro.append(node('h2','','分享笔记，保留阅读体验'),node('p','ls-muted','同一网络可访问，访客无需登录思源。'));
  hero.append(mark,intro,node('span','ls-version','v'+version));host.append(hero);
  const service=node('section','ls-service'+(running?' is-running':''));
  const state=node('div','ls-service-state');state.append(node('span','ls-dot'),node('strong','',running?'分享服务运行中':'分享服务已停止'));
  const serviceText=node('div','');serviceText.append(state,node('p','ls-muted',`已发布 ${shares.length} 组 · 端口 ${plugin.state.port}`));service.append(serviceText);
  service.append(action(running?'停止服务':'启动服务',running?'ls-secondary':'ls-primary',running?'正在停止服务…':'正在启动服务…',async()=>{
   if(plugin.service.server)await plugin.service.stop();
   else{const next={...plugin.state,port:Number(port)};await plugin.service.start(next.port);try{await plugin.persist(next);}catch(error){await plugin.service.stop();throw error;}}
   message={type:'success',text:plugin.service.server?'服务已启动。分享链接现在可以访问。':'服务已停止。启动后可继续访问原链接。'};
  },'network'));host.append(service);
  if(busy){const progress=node('div','ls-notice ls-progress',busy);progress.setAttribute('role','status');progress.prepend(node('span','ls-spinner'));host.append(progress);}
  else if(message){const notice=node('div','ls-notice '+(message.type==='error'?'ls-error':'ls-success'),message.text);notice.setAttribute('role',message.type==='error'?'alert':'status');host.append(notice);}
  const draft=node('section','ls-card ls-draft');draft.id='lan-share-draft';heading(draft,'发布笔记');
  const steps=node('ol','ls-steps');steps.setAttribute('data-stage',preview?'review':highlight?'copy':'select');
  for(const [number,label] of [['1','选择文档'],['2','核对范围'],['3','复制链接']]){const step=node('li','');step.append(node('span','ls-step-number',number),node('span','',label));steps.append(step);}draft.append(steps);
  const field=node('div','ls-field');const documentLabel=node('label','ls-label','文档编号');documentLabel.htmlFor='lan-share-doc-id';field.append(documentLabel);
  const inputRow=node('div','ls-input-row');const id=node('input','ls-input');id.id='lan-share-doc-id';id.value=selectedId;id.placeholder='20261109120000-abcdefg';id.disabled=!!busy;id.autocomplete='off';id.spellcheck=false;
  id.oninput=()=>{selectedId=id.value.trim();invalidate();};inputRow.append(id);
  inputRow.append(action('使用当前文档','ls-secondary','正在读取当前文档…',async()=>{
   const active=currentId();if(!active)throw new Error('未找到当前文档。请打开笔记，或填写文档编号。');
   selectedId=active;preview=null;highlight='';const docs=await plugin.collect(active,false);draftTitle=docs[0].title;focusDraft();
  },'document'));field.append(inputRow);draft.append(field);
  if(draftTitle)draft.append(node('div','ls-draft-title','已选择：'+draftTitle));
  const option=node('label','ls-scope');const check=node('input','');check.type='checkbox';check.checked=includeChildren;check.disabled=!!busy;
  check.onchange=()=>{includeChildren=check.checked;invalidate();};option.append(check,node('span','','子文档：包含全部层级和隐藏文档。'));draft.append(option);
  const previewButton=action('预览分享范围','ls-primary','正在收集分享范围…',async()=>{preview=null;preview=await plugin.collect(selectedId,includeChildren);focusDraft();},'arrow');
  previewButton.setAttribute('data-preview-button','');previewButton.disabled=!!busy || !selectedId;draft.append(previewButton);
  if(preview){
   const box=node('div','ls-preview');heading(box,'核对分享范围',`${preview.length} 篇`);
   const list=node('ul','ls-doc-tree');for(const doc of preview){const li=node('li','');li.style.setProperty('--depth',Math.min(doc.depth,8));li.append(icon('document'),node('span','',doc.title));list.append(li);}box.append(list);
   box.append(node('p','ls-preview-notice','访问范围：持有链接的人可读取清单中的文档和附件。'));
   const actions=node('div','ls-actions');actions.append(button('取消预览','ls-quiet',()=>{preview=null;render();}));
   const updating=shares.some(([,share])=>share.id===selectedId);
   actions.append(action(updating?'更新原链接':'发布此范围','ls-primary',updating?'正在更新分享…':'正在生成分享快照…',async()=>{
    const token=await plugin.publish(selectedId,includeChildren,preview);preview=null;highlight=token;focusTarget='share';
    message={type:'success',text:updating?'更新完成。原链接已显示新的快照。':'发布完成。请在已发布列表复制链接。'};
   },'share'));box.append(actions);draft.append(box);
  }
  const columns=node('div','ls-columns');columns.append(draft);
  const published=node('section','ls-published');heading(published,'已发布',`${shares.length} 组分享`);
  if(shares.length){
   const networkRow=node('label','ls-network-row');networkRow.append(node('span','ls-muted','访问地址'));
   const select=node('select','ls-input');select.setAttribute('aria-label','访问地址');select.disabled=!!busy;
   for(const ip of ips.length?ips:['127.0.0.1']){const item=node('option','',ip==='127.0.0.1'?'127.0.0.1 · 仅本机':ip);item.value=ip;item.selected=ip===network;select.append(item);}select.onchange=()=>{network=select.value;copied='';message=null;render();};networkRow.append(select);published.append(networkRow);
  }
  if(!shares.length){const empty=node('div','ls-empty');empty.append(icon('share'),node('strong','','尚未发布笔记'),node('p','ls-muted','请在上方选择文档，再预览分享范围。'));published.append(empty);}
  for(const [token,share] of shares){
   const card=node('article','ls-card ls-share'+(highlight===token?' ls-highlight':''));card.dataset.token=token;
   const top=node('div','ls-share-heading');const name=node('div','ls-share-title');name.append(icon('document'),node('h4','',share.title));top.append(name,node('span','ls-badge',`${share.docs?.length || 1} 篇`));card.append(top);
   card.append(node('p','ls-muted',share.includeChildren?'分享范围：文档及全部子文档':'分享范围：仅此文档'));
   if(share.stats)metrics(card,share.stats);
   const url=`http://${network}:${plugin.state.port}/s/${token}/`;
   const linkRow=node('div','ls-link-row');const link=node('input','ls-input ls-link');link.readOnly=true;link.value=url;link.setAttribute('aria-label',share.title+'的分享链接');link.onclick=()=>link.select();linkRow.append(link);
   linkRow.append(action(copied===token?'已复制':'复制链接','ls-primary','正在复制链接…',async()=>{
    try{await copy(url);copied=token;message={type:'success',text:'链接已复制。请发送给同一网络的访客。'};}
    catch{throw new Error('无法复制链接。请选中分享链接后手动复制。');}
   },copied===token?'check':'copy'));card.append(linkRow);
   const controls=node('div','ls-share-controls');
   controls.append(action('打开预览','ls-quiet','正在打开预览…',async()=>{await open(url);},'external'));
   controls.append(action('预览并更新','ls-quiet','正在收集更新范围…',async()=>{selectedId=share.id;includeChildren=!!share.includeChildren;preview=null;preview=await plugin.collect(selectedId,includeChildren);focusDraft();},'refresh'));
   controls.append(button('撤销分享','ls-danger-text',()=>{confirmToken=confirmToken===token?'':token;render();},'trash'));card.append(controls);
   if(confirmToken===token){const confirm=node('div','ls-revoke');confirm.append(node('p','','撤销后：原链接、子文档和附件将停止访问。'));
    const actions=node('div','ls-actions');actions.append(button('保留分享','ls-secondary',()=>{confirmToken='';render();}));
    actions.append(action(share.includeChildren?'撤销整组分享':'撤销此分享','ls-danger','正在撤销分享…',async()=>{const next={...plugin.state.shares};delete next[token];await plugin.persist({...plugin.state,shares:next});confirmToken='';message={type:'success',text:'分享已撤销。原链接已停止访问。'};},'trash'));confirm.append(actions);card.append(confirm);
   }
   published.append(card);
  }
  columns.append(published);host.append(columns);
  const settings=node('details','ls-settings');settings.open=settingsOpen;settings.ontoggle=()=>{settingsOpen=settings.open;};settings.append(node('summary','','连接设置'));
  const portField=node('label','ls-port-field');portField.append(node('span','','服务端口'));const portInput=node('input','ls-input');portInput.type='number';portInput.min='1024';portInput.max='65535';portInput.value=port;portInput.placeholder='17239';portInput.disabled=busy || running;portInput.oninput=()=>{port=portInput.value;};portField.append(portInput);settings.append(portField);
  settings.append(node('p','ls-muted','端口设置：停止服务后可修改，启动时保存。'));host.append(settings);
  const footer=node('footer','ls-footer');footer.append(node('span','','运行条件：保持思源运行，重启后需手动启动。'),node('span','','连接条件：同一网络须允许设备互访。'));host.append(footer);
  host.scrollTop=scroll;
  if(focusTarget){
   const target=focusTarget==='draft'?draft:[...published.querySelectorAll('.ls-share')].find(el=>el.dataset.token===highlight);
   target?.scrollIntoView?.({block:'nearest',behavior:'smooth'});focusTarget='';
  }
 }
 render();return {destroy(){disposed=true;}};
}
module.exports={createPanel,sortAddresses,currentDocumentId};
