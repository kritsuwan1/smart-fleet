import {IS_DEMO,ENVIRONMENT,SITE_URL,ENVIRONMENT_HTML} from './environment';
import {createBackup} from './backup';
import {BACKUP_CRON,runAutomaticBackup,automaticBackupStatus} from './automatic-backup';
import {APP_VERSION} from './version';
import {systemStatus} from './system-status';
import {fuelPrice} from './fuel';
import reportRegular from '../assets/sarabun-regular.base64.txt';
import reportBold from '../assets/sarabun-bold.base64.txt';
import {fleetApi} from './api';
import {readState,writeState} from './storage';
import {checkLogin,sessionUser,issueSession,clearSession,registerEmployee,rateLimit,safeReturn,verifyPassword,hashPassword,passwordValid,hex} from './auth';
import {screen,login,registerPage,escape,passwordChangedPage} from './auth-pages';
import appJS from './client.bundle.txt';
import appCSS from './app.css';
import maintenanceCSS from './maintenance.css';
import journeyCSS from './journey.css';
import historyCSS from './history.css';
import accountCSS from './account.css';
import receiptCSS from './receipt.css';
import revoImage from '../assets/vehicle-revo-canopy.base64.txt';
import qrSite from '../assets/smart-fleet-qr.svg';
import qrCar from '../assets/smart-fleet-car-8kn3362-qr.svg';
import qrDemoSite from '../assets/smart-fleet-demo-qr.svg';
import qrDemoCar from '../assets/smart-fleet-demo-car-8kn3362-qr.svg';
const siteQr=IS_DEMO?qrDemoSite:qrSite,carQr=IS_DEMO?qrDemoCar:qrCar;
const security={
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};
const response=(body:any,status=200,extra:any={})=>new Response(body,{status,headers:{...security,...extra}});
const html=(body:string,status=200)=>response(body,status,{'Content-Type':'text/html; charset=utf-8'});
const json=(value:any,status=200,extra:any={})=>response(JSON.stringify(value),status,{'Content-Type':'application/json; charset=utf-8',...extra});
const redirect=(to:string,cookie?:string)=>response(null,303,{Location:to,...(cookie?{'Set-Cookie':cookie}:{})});
const q=(s:string)=>"'"+s.replaceAll("'","''")+"'";
async function backup(env:any){
 const row=await env.DB.prepare("SELECT payload FROM fleet_store WHERE id='main'").first();if(!row)return response('ยังไม่มีข้อมูล',404);const id='restore-'+crypto.randomUUID();const restoreGuard=IS_DEMO?"(SELECT payload FROM fleet_store WHERE id='environment')='demo'":"COALESCE((SELECT payload FROM fleet_store WHERE id='environment'),'production')='production'";
 const lines=['-- Smart Fleet '+APP_VERSION+' backup '+new Date().toISOString(),'-- environment: '+ENVIRONMENT,'-- PRIVATE: contains salted password hashes and session-signing material. Keep offline and private.','-- Restores all fleet data AND employee accounts. Existing main state is replaced only after valid JSON staging.','CREATE TABLE IF NOT EXISTS fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);',`INSERT OR REPLACE INTO fleet_store(id,payload,version) VALUES(${q(id)},'',0);`];
 for(let i=0;i<row.payload.length;i+=10000)lines.push(`UPDATE fleet_store SET payload=payload || ${q(row.payload.slice(i,i+10000))} WHERE id=${q(id)};`);
 lines.push(`INSERT INTO fleet_store(id,payload,version) SELECT 'main',json_set(payload,'$.sessionKey',lower(hex(randomblob(32)))),0 FROM fleet_store WHERE id=${q(id)} AND json_valid(payload) AND ${restoreGuard} ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=fleet_store.version+1;`,`DELETE FROM fleet_store WHERE id=${q(id)};`);
 return response(lines.join('\n'),200,{'Content-Type':'application/sql; charset=utf-8','Content-Disposition':`attachment; filename="smart-fleet-${ENVIRONMENT}-backup-${new Date().toISOString().slice(0,10)}.sql"`});
}
function qrPage(){return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Smart Fleet — QR สำหรับพนักงาน</title><style>body{font:16px system-ui,sans-serif;background:#f3f7f4;color:#183d2c;margin:0;padding:30px}main{max-width:900px;margin:auto}.cards{display:flex;gap:24px;flex-wrap:wrap}.card{background:white;border:1px solid #d9e5dc;border-radius:18px;text-align:center;padding:28px;flex:1;min-width:230px}svg{width:240px;max-width:100%;height:auto}h1{font-size:26px}h2{font-size:20px}p{line-height:1.8;font-size:14px}small{display:block;font-size:11px;overflow-wrap:anywhere;color:#7c9281}a{color:#14684e}.note{margin-top:25px}@media print{body{background:white;padding:10px}.no-print{display:none}.card{break-inside:avoid}}</style></head><body><main>${ENVIRONMENT_HTML}<p class="no-print"><a href="/">กลับหน้าหลัก</a> · กด Ctrl + P เพื่อพิมพ์</p><h1>Smart Fleet — บันทึกการใช้รถยนต์</h1><div class="cards"><section class="card"><h2>สแกนเพื่อเข้าสู่ระบบ</h2>${siteQr}<p>พนักงานเดิม: เข้าสู่ระบบ<br>พนักงานใหม่: กดสมัครใช้งาน</p><small>${SITE_URL.replace('https://','')}</small></section><section class="card"><h2>รถทะเบียน 8กน3362</h2>${carQr}<p>สแกนเพื่อเริ่มใช้รถหรือคืนรถ<br>เข้าสู่ระบบก่อนบันทึกทุกครั้ง</p><small>กรุงเทพมหานคร · Smart Machine & Software</small></section></div><p class="note">สมัครด้วยชื่อ ชื่อผู้ใช้ และรหัสผ่านอย่างน้อย 6 ตัวอักษร</p></main></body></html>`;}
export default {async scheduled(event:{cron:string;scheduledTime:number},env:any){
 if(event.cron!==BACKUP_CRON)return;
 const result=await runAutomaticBackup(IS_DEMO?{...env,DB:env.DEMO_DB}:env,event.scheduledTime);
 if(result.state==='failed')throw Error('AUTOMATIC_BACKUP_FAILED:'+result.code);
},async fetch(req:Request,env:any){
 const url=new URL(req.url),path=url.pathname;
 if(IS_DEMO)env={...env,DB:env.DEMO_DB};
 try{
  if(typeof env.APP_PASSWORD!=='string'||env.APP_PASSWORD.length<6)return html(screen('<p>ผู้ดูแลต้องตั้ง Secret ชื่อ <strong>APP_PASSWORD</strong> อย่างน้อย 6 ตัวอักษรใน Cloudflare แล้ว Deploy</p>'),503);
  if(!env.DB)return html(screen('<p>กรุณาเชื่อม D1 binding ชื่อ '+(IS_DEMO?'DEMO_DB → smart-fleet-demo':'DB → smart-fleet-production')+'</p>'),503);
  if(IS_DEMO&&url.hostname==='smart-fleet.kritsuwan1.workers.dev'||!IS_DEMO&&url.hostname==='smart-fleet-demo.kritsuwan1.workers.dev')return html(screen('<p>ไฟล์ Worker ไม่ตรงฝั่ง Demo / Production กรุณาตรวจไฟล์ที่ Deploy</p>'),503);
  if(!['GET','POST','HEAD'].includes(req.method))return response('Method not allowed',405,{Allow:'GET, HEAD, POST'});
  if(req.method==='POST'&&req.headers.get('origin')!==url.origin)return response('คำขอไม่ถูกต้อง กรุณาเปิดเว็บไซต์โดยตรง',403);
  if(req.method==='POST'&&Number(req.headers.get('Content-Length'))>1000000)return response('ข้อมูลใหญ่เกินกำหนด',413);
  if(path==='/favicon.ico')return response(null,204);
  if(path==='/qr-site.svg')return response(siteQr,200,{'Content-Type':'image/svg+xml'});
  if(path==='/qr-car.svg')return response(carQr,200,{'Content-Type':'image/svg+xml'});
  const {state}=await readState(env);
  if((path==='/login'||path==='/register')&&req.method==='POST'){
   const text=await req.text();if(text.length>8192)return html(login('ข้อมูลมีขนาดใหญ่เกินกำหนด'),400);
   const form=new URLSearchParams(text),returnTo=safeReturn(form.get('returnTo')||'/'),username=form.get('username')||'',password=form.get('password')||'';
   if(!await rateLimit(req,env,state,path==='/register'?'register':'login',path==='/register'?20:10))return html(login('ลองทำรายการหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่',returnTo),429);
   if(path==='/register'){
    try{const result=await registerEmployee(env,{name:form.get('name')||'',username,password});return redirect(returnTo,await issueSession(env,result.state,result.user));}
    catch(e){return html(registerPage(e instanceof Error?e.message:'สมัครไม่สำเร็จ',returnTo,form.get('name')||'',username),400);}
   }
   if(!password||password.length>256)return html(login('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',returnTo),401);
   const user=await checkLogin(env,username,password,state);if(!user)return html(login('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน',returnTo),401);
   return redirect(returnTo,await issueSession(env,state,user));
  }
  const user=await sessionUser(req,env,state);
  const returnTo=safeReturn(url.searchParams.get('returnTo')||url.pathname+url.search);
  if(path==='/password-changed'&&req.method==='GET')return html(passwordChangedPage());
  if(!user){
   if(path.startsWith('/api/'))return json({error:'UNAUTHORIZED'},401);
   if(path==='/register')return html(registerPage('',returnTo));
   return html(login('',returnTo,url.searchParams.get('changed')==='1'?'เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง':''));
  }
  if(path==='/login'||path==='/register')return redirect(returnTo);
  if(path==='/logout'){
   if(req.method==='POST')return redirect('/login',clearSession());
   return html(screen('<p>ต้องการออกจากระบบหรือไม่?</p><form action="/logout" method="post"><button>ออกจากระบบ</button></form><p><a href="/">กลับหน้าหลัก</a></p>'));
  }
  if(path==='/api/system-status'&&req.method==='GET'){const latest=await readState(env),access=await sessionUser(req,env,latest.state);if(!access)return json({error:'UNAUTHORIZED'},401);if(access.role!=='admin')return json({error:'FORBIDDEN'},403);return json(systemStatus(latest.state,latest.payloadBytes));}
  if(path==='/api/backup-status'&&req.method==='GET'){
   if(user.role!=='admin')return json({error:'FORBIDDEN'},403);
   try{return json(await automaticBackupStatus(env));}catch{return json({error:'BACKUP_STATUS_UNAVAILABLE'},503);}
  }
  if(path==='/api/fuel-price'&&req.method==='GET'){
   try{return json(await fuelPrice(env,state,url.searchParams.get('month')||''));}catch(e){return json({error:e instanceof Error?e.message:'ตรวจราคาไม่ได้'},400);}
  }
  if(path==='/report-font-regular.ttf'||path==='/report-font-bold.ttf'){return response(Uint8Array.from(atob(path.includes('bold')?reportBold:reportRegular),c=>c.charCodeAt(0)),200,{'Content-Type':'font/ttf','Cache-Control':'private, max-age=86400'});}
  if(path==='/api/fleet'){
   const api=fleetApi(env,user);const r=await (req.method==='POST'?api.POST(req):api.GET());const headers=new Headers(r.headers);for(const [k,v] of Object.entries(security))headers.set(k,v);return new Response(r.body,{status:r.status,headers});
  }
  if(path==='/api/profile/password'&&req.method==='POST'){
   if(user.id==='admin')return json({error:'บัญชีหลักเปลี่ยนรหัสผ่านได้ที่ Cloudflare Secret APP_PASSWORD'},400);
   if(!await rateLimit(req,env,state,'change-password',10))return json({error:'ลองหลายครั้ง กรุณารอ 15 นาที'},429);
   const body=await req.text();if(body.length>4096)return json({error:'ข้อมูลใหญ่เกินกำหนด'},413);
   const input=JSON.parse(body),member=state.accounts?.find(a=>a.id===user.id&&a.active&&a.passwordVersion===user.passwordVersion);
   if(!member||typeof input.currentPassword!=='string'||input.currentPassword.length>128||!await verifyPassword(input.currentPassword,member))return json({error:'รหัสผ่านปัจจุบันไม่ถูกต้อง'},400);
   if(!passwordValid(input.password))return json({error:'รหัสผ่านใหม่ต้องมี 6–128 ตัวอักษร'},400);
   // Read latest state before writing so fleet and account updates are never overwritten.
   const latest=await readState(env),account=latest.state.accounts?.find(a=>a.id===user.id&&a.active&&a.passwordVersion===user.passwordVersion);if(!account)return json({error:'UNAUTHORIZED'},401);
   account.salt=hex(crypto.getRandomValues(new Uint8Array(16)).buffer);account.passwordHash=await hashPassword(input.password,account.salt);account.passwordVersion++;
   latest.state.audit.unshift({id:crypto.randomUUID(),time:new Date().toISOString(),actor:user.name,action:'เปลี่ยนรหัสผ่านของตนเอง',before:null,after:{id:user.id,username:user.username}});
   if(!await writeState(env,latest.state,latest.version))return json({error:'ข้อมูลเปลี่ยนแปลง กรุณาลองอีกครั้ง'},409);
   return json({success:true},200,{'Set-Cookie':clearSession()});
  }
  if(req.method==='POST')return response('Not found',404);
  if(path==='/api/backup.sql'||path==='/api/backup.json'){
   if(user.role!=='admin')return json({error:'FORBIDDEN'},403);
   if(path.endsWith('.sql'))return backup(env);
   return json(await createBackup(state,APP_VERSION,ENVIRONMENT),200,{'Content-Disposition':`attachment; filename="smart-fleet-${ENVIRONMENT}-backup-${new Date().toISOString().slice(0,10)}.json"`});
  }
  if(path==='/qr'){if(user.role!=='admin')return json({error:'FORBIDDEN'},403);return html(qrPage());}
  if(path==='/app.js')return response(appJS,200,{'Content-Type':'text/javascript; charset=utf-8'});
  if(path==='/vehicle-revo-canopy.webp')return response(Uint8Array.from(atob(revoImage),c=>c.charCodeAt(0)),200,{'Content-Type':'image/webp','Cache-Control':'private, max-age=86400'});
  if(path==='/app.css')return response(appCSS+'\n'+journeyCSS+'\n'+historyCSS+'\n'+accountCSS+'\n'+receiptCSS+'\n'+maintenanceCSS,200,{'Content-Type':'text/css; charset=utf-8'});
  if(path==='/')return html('<!doctype html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Smart Fleet | บันทึกการใช้รถยนต์</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js" defer></script></body></html>');
  return response('Not found',404);
 }catch(error){if(error instanceof Error&&error.message==='ENVIRONMENT_MISMATCH'){const message='ฐานข้อมูลไม่ตรงกับ '+ENVIRONMENT+' ระบบหยุดเพื่อป้องกันข้อมูล กรุณาตรวจ Binding และใช้ schema ของฝั่งที่ถูกต้อง';return path.startsWith('/api/')?json({error:message},503):html(screen('<p>'+message+'</p>'),503);}console.error('Smart Fleet request failed',error);return path.startsWith('/api/')?json({error:'ระบบยังไม่พร้อม กรุณาตรวจฐานข้อมูลและลองใหม่'},503):html(screen('<p>ระบบไม่สามารถทำรายการได้ในขณะนี้ กรุณาตรวจว่า DB เชื่อมฐานข้อมูลที่มีตาราง fleet_store แล้ว</p>'),503);}
}};
