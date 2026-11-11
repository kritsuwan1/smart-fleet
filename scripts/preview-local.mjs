import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {previewFixture,PREVIEW_ACCOUNTS} from './preview-fixture.mjs';
export const PREVIEW_HOST='127.0.0.1',PREVIEW_PORT=8787;
export const PREVIEW_CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
export function disablePreviewNetwork(){
 globalThis.fetch=async()=>{throw Error('LOCAL_PREVIEW_NETWORK_DISABLED');};
 globalThis.WebSocket=class{constructor(){throw Error('LOCAL_PREVIEW_NETWORK_DISABLED');}};
}
export async function startPreview({port=PREVIEW_PORT,fixtureDate}={}){
 if(Number(process.versions.node.split('.')[0])!==24)throw Error('Local Preview ต้องใช้ Node.js 24');
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid preview port');
 disablePreviewNetwork();
 // No Wrangler config, CLI, credentials, disk database, D1 API, R2 or scheduler.
 const {default:worker}=await import(new URL('../output/worker-staging.js',import.meta.url).href),fixture=await previewFixture({referenceDate:fixtureDate});
 let origin='';
 const server=createServer({maxHeaderSize:16384},async(req,res)=>{
  const refuse=(status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':PREVIEW_CSP});res.end(message);};
  try{
   if(req.socket.remoteAddress!==PREVIEW_HOST||req.headers.host!==new URL(origin).host)return refuse(403,'LOCAL_PREVIEW_HOST_DENIED');
   if(!req.url?.startsWith('/')||req.url.startsWith('//')||req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')return refuse(403,'LOCAL_PREVIEW_ORIGIN_DENIED');
   const url=new URL(req.url,origin);if(url.origin!==origin)return refuse(403,'LOCAL_PREVIEW_TARGET_DENIED');
   if(['/qr','/qr-site.svg','/qr-car.svg'].includes(url.pathname)||url.pathname.startsWith('/api/backup')||/recovery|unlock|reset/i.test(url.pathname))return refuse(404,'ฟังก์ชันนี้ไม่เปิดใน Local Preview');
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1000000)return refuse(413,'ข้อมูลใหญ่เกินกำหนด');chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');
   if(req.method==='POST'&&url.pathname==='/api/fleet'){let input;try{input=JSON.parse(body);}catch{return refuse(400,'JSON ไม่ถูกต้อง');}if(['import','importExcel'].includes(input.action))return refuse(403,'Local Preview ไม่รับไฟล์หรือข้อมูลจริง');}
   const headers=new Headers();for(const [key,value] of Object.entries(req.headers)){if(value!==undefined&&!['host','connection','content-length','transfer-encoding'].includes(key))headers.set(key,Array.isArray(value)?value.join(','):value);}
   headers.set('CF-Connecting-IP','192.0.2.80');
   const response=await worker.fetch(new Request(url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body})}),fixture.env);
   const outgoing=new Headers(response.headers);outgoing.set('Content-Security-Policy',PREVIEW_CSP);outgoing.set('Cache-Control','no-store');
   if(outgoing.has('location')){const target=new URL(outgoing.get('location'),origin);if(target.origin!==origin)return refuse(502,'LOCAL_PREVIEW_REDIRECT_DENIED');}
   let bytes=Buffer.from(await response.arrayBuffer());
   if(outgoing.get('content-type')?.startsWith('text/html')){let html=bytes.toString('utf8').replace(/<link\b[^>]*href=["']https?:\/\/[^>]*>/gi,'');html=html.replace('<body>','<body><div role="note" style="padding:8px;background:#fff1d6;color:#663b00;text-align:center;font:14px system-ui">LOCAL PREVIEW — ข้อมูลและบัญชีจำลองในหน่วยความจำเท่านั้น · หยุดด้วย Ctrl+C</div>');bytes=Buffer.from(html);}
   outgoing.delete('content-length');res.writeHead(response.status,Object.fromEntries(outgoing));res.end(req.method==='HEAD'?undefined:bytes);
  }catch{if(!res.headersSent)refuse(500,'LOCAL_PREVIEW_REQUEST_FAILED');else res.destroy();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
 try{await new Promise((ok,no)=>{server.once('error',no);server.listen(port,PREVIEW_HOST,ok);});}catch(e){fixture.close();throw e;}
 origin='http://'+PREVIEW_HOST+':'+server.address().port;
 let closed=false;const close=async()=>{if(closed)return;closed=true;await new Promise(r=>{server.close(r);server.closeAllConnections();});fixture.close();};
 return{server,url:origin,close};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{
  if(process.argv.length!==2)throw Error('ไม่รองรับ host/port/config override ใช้ npm run preview:local');
  const app=await startPreview();
  console.log('\nSmartFleet LOCAL PREVIEW (synthetic / memory only)\n'+app.url+'\n');
  for(const [role,account] of Object.entries(PREVIEW_ACCOUNTS))console.log(role+': '+account.username+' / '+account.password);
  console.log('\nข้อมูลหายเมื่อหยุด process · ไม่มี Cloudflare/R2/Cron · Ctrl+C เพื่อหยุด');
  const stop=async()=>{await app.close();console.log('หยุด Local Preview แล้ว');};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 }catch(e){console.error(e.code==='EADDRINUSE'?'พอร์ต8787ถูกใช้อยู่ หยุด process เดิมก่อน ไม่เปลี่ยน host/port อัตโนมัติ':e.message);process.exitCode=1;}
}
