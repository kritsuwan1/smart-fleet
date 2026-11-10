// Optional local Edge/Chromium acceptance. Actual Worker auth, signed cookies, synthetic DB only.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import worker from '../output/worker-demo.js';
import {fixture} from './fixtures/role-compatibility.mjs';
const {chromium}=createRequire(import.meta.url)(resolve(process.argv[2]||'.qa/browser/node_modules/playwright'));
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('environment','demo');const initial=JSON.parse(JSON.stringify(fixture().fleet));
sql.prepare('INSERT INTO fleet_store VALUES (?,?,7)').run('main',JSON.stringify(initial));
const db={prepare(q){const st=sql.prepare(q);let args=[];return{bind(...a){args=a;return this;},first:async()=>st.get(...args)||null,run:async()=>({meta:{changes:Number(st.run(...args).changes)}})};}};
const env={APP_PASSWORD:'synthetic-browser-root',DEMO_DB:db};let origin='',cookieObserved=false,posts=0;
const server=createServer(async(req,res)=>{try{
 let body='';for await(const chunk of req)body+=chunk;if(req.method==='POST')posts++;
 if(req.headers.cookie?.includes('__Host-smartfleet='))cookieObserved=true;
 const request=new Request(origin+req.url,{method:req.method,headers:{...req.headers,'CF-Connecting-IP':'192.0.2.91'},...(['GET','HEAD'].includes(req.method)?{}:{body})});
 const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.statusCode=500;res.end('synthetic bridge failure');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const page=await browser.newPage({viewport:{width:360,height:800}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.goto(origin+'/register?returnTo='+encodeURIComponent('/?car=c1&action=start'));await noOverflow();
 await page.getByLabel('ชื่อ–นามสกุล',{exact:true}).fill('PRIVATE PERSON 1');await page.getByLabel('ตั้งชื่อผู้ใช้',{exact:true}).fill('browser.user');await page.getByLabel('ตั้งรหัสผ่าน',{exact:true}).fill('12345');
 assert.equal(await page.locator('input[name=password]').evaluate(e=>e.validity.tooShort),true);
 const before=posts;await page.getByRole('button',{name:'สมัครและเริ่มใช้งาน',exact:true}).click();assert.equal(posts,before);
 await page.getByLabel('ตั้งรหัสผ่าน',{exact:true}).fill('abc123');await page.getByRole('button',{name:'สมัครและเริ่มใช้งาน',exact:true}).click();
 await page.getByText('บัญชี User พร้อมใช้งาน',{exact:true}).waitFor();assert.equal(new URL(page.url()).search,'');await noOverflow();
 assert.equal(cookieObserved,true);assert.equal(await page.getByRole('button',{name:'บันทึกใช้รถ',exact:true}).count(),0);
 const results=await page.evaluate(async()=>({fleet:await(await fetch('/api/fleet')).json(),backup:(await fetch('/api/backup.json')).status,
  operation:(await fetch('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'trip',data:{carId:'c1',driverId:'p1'},version:8})})).status}));
 assert.equal(results.fleet.scope,'self-account');assert.equal(results.fleet.state,undefined);assert.equal(results.backup,403);assert.equal(results.operation,403);
 await page.getByRole('button',{name:'ออกจากระบบ',exact:true}).click();await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).waitFor();await noOverflow();
 await page.getByLabel('ชื่อผู้ใช้',{exact:true}).fill('browser.user');await page.getByLabel('รหัสผ่าน',{exact:true}).fill('wrong12');await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();await page.getByRole('alert').waitFor();await noOverflow();
 await page.getByLabel('ชื่อผู้ใช้',{exact:true}).fill('browser.user');await page.getByLabel('รหัสผ่าน',{exact:true}).fill('abc123');await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();await page.getByText('บัญชี User พร้อมใช้งาน',{exact:true}).waitFor();
 await page.getByRole('button',{name:/เปลี่ยนรหัสผ่าน/}).click();await page.locator('#account-currentPassword').fill('abc123');await page.locator('#account-password').fill('new123');await page.locator('#account-confirm').fill('new123');await noOverflow();
 await page.getByRole('button',{name:'บันทึกรหัสผ่านใหม่',exact:true}).click();await page.getByRole('heading',{name:'เปลี่ยนรหัสผ่านสำเร็จ'}).waitFor();await noOverflow();
 const state=JSON.parse(sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);
 assert.deepEqual(state.people,initial.people);assert.deepEqual(state.trips,initial.trips);assert.deepEqual(state.accounts.slice(0,-1),initial.accounts);assert.equal(state.accounts.at(-1).role,'user');assert.equal(state.accounts.at(-1).driverId,null);
 assert.deepEqual(errors,[]);console.log('PASS self-registration browser: '+browser.version()+',360px actual Worker signup/login/secure signed cookie/logout/password change, restricted DTO/no operations/no Person claim/no horizontal overflow; loopback synthetic only, external requests blocked');
}finally{await browser?.close();await new Promise(r=>server.close(r));sql.close();}
