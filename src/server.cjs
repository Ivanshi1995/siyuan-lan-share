'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const os = require('node:os');
const {Buffer} = require('node:buffer');
const {renderPage,escape} = require('./viewer.cjs');
class ShareServer {
  constructor(getShares) { this.getShares = getShares; this.server = null; }
  async start(port) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('端口须为 1024 至 65535。');
    if (this.server) throw new Error('服务已启动。请先停止服务。');
    const server = http.createServer((req,res) => this.handle(req,res));
    server.requestTimeout = 15000; server.headersTimeout = 10000;
    await new Promise((resolve,reject) => { server.once('error',reject); server.listen(port,'0.0.0.0',resolve); });
    server.on('error', () => {}); this.server = server; this.port = port;
  }
  async stop() {
    const s = this.server; this.server = null;
    if(s) await new Promise(resolve => { s.close(resolve); s.closeAllConnections?.(); });
  }
  handle(req,res) {
    const headers = {'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"};
    const send = (status,type,body,extra={}) => { res.writeHead(status,{...headers,'Content-Type':type,...extra}); res.end(req.method === 'HEAD' ? undefined : body); };
    if(!['GET','HEAD'].includes(req.method)) return send(405,'text/plain; charset=utf-8','只支持读取。',{Allow:'GET, HEAD'});
    const match = /^\/s\/([a-f0-9]{48})(?:\/(?:assets\/([a-f0-9]{64})|d\/(\d{14}-[a-z0-9]{7})\/?)?)?$/.exec(req.url || '');
    const share = match && this.getShares()[match[1]];
    if(!share) return send(404,'text/plain; charset=utf-8','分享不存在或已撤销。');
    if(match[2]) {
      const asset = Object.hasOwn(share.assets,match[2]) && share.assets[match[2]];
      if(!asset) return send(404,'text/plain; charset=utf-8','附件不存在。');
      return send(200,asset.type,Buffer.from(asset.data,'base64'),asset.download ? {'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(asset.name)} : {});
    }
    // Relative assets must resolve beneath the capability URL.
    if(!req.url.endsWith('/')) return send(302,'text/plain','', {Location:req.url+'/'});
    const docs=share.docs || [{id:share.id,title:share.title,html:share.html,depth:0}];
    const page=match[3] ? docs.find(d=>d.id===match[3]) : docs[0];
    if(!page) return send(404,'text/plain; charset=utf-8','文档不在此分享中。');
    const base='/s/'+match[1]+'/';
    send(200,'text/html; charset=utf-8',renderPage(share,docs,page,base));
  }
}
function addresses() { return [...new Set(Object.values(os.networkInterfaces()).flat().filter(a=>a && a.family==='IPv4' && !a.internal).map(a=>a.address))]; }
module.exports = {ShareServer, addresses, escape, newToken:()=>crypto.randomBytes(24).toString('hex')};
