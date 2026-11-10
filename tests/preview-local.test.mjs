import assert from 'node:assert/strict';
import {request} from 'node:http';
import {startPreview,PREVIEW_HOST,PREVIEW_PORT} from '../scripts/preview-local.mjs';
import {PREVIEW_ACCOUNTS} from '../scripts/preview-fixture.mjs';
let cases=0;const check=async fn=>{await fn();cases++;};
function send(app,path='/',{method='GET',body='',headers={},chunks}={}){return new Promise((resolve,reject)=>{const url=new URL(app.url);const r=request({hostname:PREVIEW_HOST,port:url.port,path,method,headers:{host:url.host,...headers}},response=>{const data=[];response.on('data',c=>data.push(c));response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,text:Buffer.concat(data).toString('utf8')}));});r.on('error',reject);for(const chunk of chunks||[body])r.write(chunk);r.end();});}
const app=await startPreview({port:0});let second;
try{
 assert.equal(PREVIEW_PORT,8787);assert.equal(app.server.address().address,'127.0.0.1');
 await check(async()=>{const r=await send(app);assert.equal(r.status,200);assert.match(r.text,/LOCAL PREVIEW/);assert.match(r.text,/STAGING/);assert.equal(/<link[^>]+href=["']https?:\/\//i.test(r.text),false);assert.equal(r.headers['content-security-policy'].includes('https:'),false);assert.equal(r.headers['cache-control'],'no-store');});
 for(const host of ['evil.invalid','localhost:8787','0.0.0.0:8787'])await check(async()=>assert.equal((await send(app,'/',{headers:{host}})).status,403));
 for(const origin of ['https://evil.invalid','null'])await check(async()=>assert.equal((await send(app,'/',{headers:{origin}})).status,403));
 await check(async()=>assert.equal((await send(app,'/',{headers:{'sec-fetch-site':'cross-site'}})).status,403));
 await check(async()=>assert.equal((await send(app,'https://evil.invalid/')).status,403));
 for(const path of ['/qr','/qr-site.svg','/qr-car.svg','/api/backup.json','/api/backup.sql','/api/recovery','/api/unlock','/api/reset'])await check(async()=>assert.equal((await send(app,path)).status,404));
 await check(async()=>assert.equal((await send(app,'/api/fleet')).status,401));
 const login=async(name,password)=>send(app,'/login',{method:'POST',headers:{origin:app.url,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:name,password}).toString()});
 const root=await login(PREVIEW_ACCOUNTS.admin.username,PREVIEW_ACCOUNTS.admin.password),cookie=root.headers['set-cookie'][0].split(';')[0];
 await check(async()=>{assert.equal(root.status,303);assert.equal(root.headers.location,'/');assert.match(root.headers['set-cookie'][0],/Secure; HttpOnly; SameSite=Lax/);});
 const fleet=async c=>JSON.parse((await send(app,'/api/fleet',{headers:{cookie:c}})).text);
 let state=await fleet(cookie);
 await check(async()=>{assert.equal(state.user.role,'admin');assert.deepEqual(state.state.cars.map(c=>c.plate),['LOCAL-001','LOCAL-002']);assert.equal(state.state.accounts,undefined);assert.equal(state.state.sessionKey,undefined);assert.equal(state.state.maintenancePlans.length,1);});
 for(const action of ['import','importExcel'])await check(async()=>{const before=await fleet(cookie),r=await send(app,'/api/fleet',{method:'POST',headers:{cookie,origin:app.url,'content-type':'application/json'},body:JSON.stringify({action,data:{},version:state.version})});assert.equal(r.status,403);const after=await fleet(cookie);assert.deepEqual({state:after.state,version:after.version},{state:before.state,version:before.version});});
 await check(async()=>{const r=await send(app,'/api/fleet',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({action:'project',data:{name:'forbidden'},version:state.version})});assert.equal(r.status,403);});
 await check(async()=>{const text=JSON.stringify({action:'project',data:{name:'โครงการจำลองภาษาไทย'},version:state.version}),buffer=Buffer.from(text),i=buffer.indexOf(Buffer.from('โ'))+1;const r=await send(app,'/api/fleet',{method:'POST',headers:{cookie,origin:app.url,'content-type':'application/json'},chunks:[buffer.subarray(0,i),buffer.subarray(i)]});assert.equal(r.status,200);assert.equal(JSON.parse(r.text).state.projects.includes('โครงการจำลองภาษาไทย'),true);});
 const user=await login(PREVIEW_ACCOUNTS.user.username,PREVIEW_ACCOUNTS.user.password),userCookie=user.headers['set-cookie'][0].split(';')[0];
 await check(async()=>{assert.equal(user.status,303);const v=await fleet(userCookie);assert.equal(v.scope,'verified-user');assert.equal(v.state.trips.length,1);assert.equal(v.state.trips[0].ownerUserId,'preview-user');assert.equal(v.state.maintenanceHistory,undefined);});
 const unlinked=await login(PREVIEW_ACCOUNTS.unlinked.username,PREVIEW_ACCOUNTS.unlinked.password);
 await check(async()=>assert.equal((await fleet(unlinked.headers['set-cookie'][0].split(';')[0])).scope,'self-account'));
 const employee=await login(PREVIEW_ACCOUNTS.employee.username,PREVIEW_ACCOUNTS.employee.password);
 await check(async()=>{assert.equal(employee.status,303);const v=await fleet(employee.headers['set-cookie'][0].split(';')[0]);assert.equal(v.user.role,'employee');assert.equal(v.user.driverId,'preview-person-3');assert.equal(v.state.trips.length,0);assert.equal(v.state.maintenanceHistory,undefined);});
 await check(async()=>{await assert.rejects(()=>globalThis.fetch('https://network.invalid'),/LOCAL_PREVIEW_NETWORK_DISABLED/);assert.throws(()=>new WebSocket('wss://network.invalid'),/LOCAL_PREVIEW_NETWORK_DISABLED/);});
 await check(async()=>{second=await startPreview({port:0});assert.equal((await send(second,'/api/fleet',{headers:{cookie}})).status,401);const r=await send(second,'/login',{method:'POST',headers:{origin:second.url,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(PREVIEW_ACCOUNTS.admin).toString()}),c=r.headers['set-cookie'][0].split(';')[0],v=JSON.parse((await send(second,'/api/fleet',{headers:{cookie:c}})).text);assert.equal(v.state.projects.includes('โครงการจำลองภาษาไทย'),false);});
 await check(async()=>{await assert.rejects(()=>startPreview({port:Number(new URL(app.url).port)}),e=>e.code==='EADDRINUSE');});
 console.log(`PASS local preview: ${cases} cases; loopback/Host/Origin/CSP, native synthetic SQLite/auth/isolation/atomic adapter, import/unsafe-route denial, UTF-8, network guard and occupied-port refusal; no Wrangler/cloud/real data`);
}finally{await second?.close();await app.close();}
