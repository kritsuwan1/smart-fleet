// Optional local browser test; identity injected, synthetic SQLite, external routes blocked.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(resolve(process.argv[2]||'.qa/browser/node_modules/playwright'));
const serverCode=await build({stdin:{contents:"export {fleetApi} from './src/api';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',define:{__FLEET_ENV__:'"demo"'}});
const {fleetApi}=await import('data:text/javascript;base64,'+Buffer.from(serverCode.outputFiles[0].text).toString('base64'));
const client=await build({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import App from './src/App';createRoot(document.getElementById('root')).render(<App/>);",resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',format:'iife',define:{__FLEET_ENV__:'"demo"','process.env.NODE_ENV':'"production"'}});
const css=(await Promise.all(['app','journey','history','account','receipt','maintenance'].map(n=>readFile('src/'+n+'.css','utf8')))).join('\n');
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
const state={cars:[{id:'c1',plate:'SYNTHETIC-1',province:'Test',model:'Test',initialOdo:100,active:true}],people:[{id:'p1',name:'Synthetic',active:true}],projects:['Synthetic'],trips:[],audit:[],accounts:[],sessionKey:'synthetic',imported:false};
sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('environment','demo');sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('main',JSON.stringify(state));
const db={prepare(q){const st=sql.prepare(q);let args=[];return{bind(...a){args=a;return this;},async first(){return st.get(...args)||null;},async run(){return{meta:{changes:Number(st.run(...args).changes)}};},execute(){return /^SELECT/.test(q)?{success:true,meta:{changes:0},results:st.all(...args)}:{success:true,meta:{changes:Number(st.run(...args).changes)}};}};},async batch(statements){sql.exec('BEGIN IMMEDIATE');try{const rs=statements.map(s=>s.execute());sql.exec('COMMIT');return rs;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const user={id:'admin',role:'admin',name:'Synthetic',username:'admin',driverId:'',passwordVersion:0};
let posts=0,drop=false,delay=150;const bodies=[];
const server=createServer(async(req,res)=>{try{
 if(req.url==='/client.js'){res.setHeader('Content-Type','application/javascript');res.end(client.outputFiles[0].text);return;}
 if(req.url==='/app.css'){res.setHeader('Content-Type','text/css');res.end(css);return;}
 if(req.url==='/api/fleet'){
  const api=fleetApi({DB:db},user);let response;
  if(req.method==='POST'){posts++;let text='';for await(const chunk of req)text+=chunk;bodies.push(JSON.parse(text));await new Promise(r=>setTimeout(r,delay));response=await api.POST(new Request(origin+'/api/fleet',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:text}));}
  else response=await api.GET();
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
 }
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/client.js"></script>');
}catch{res.statusCode=500;res.end('synthetic harness failure');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});const page=await browser.newPage({viewport:{width:360,height:800}});
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',async r=>{if(!r.request().url().startsWith(origin+'/'))return r.abort();if(drop&&r.request().method()==='POST'&&r.request().url()===origin+'/api/fleet'){drop=false;const response=await r.fetch();await response.dispose();return r.abort('failed');}return r.continue();});
 await page.goto(origin);await page.getByRole('button',{name:'บันทึกใช้รถ',exact:true}).first().click();const dialog=page.getByRole('dialog');
 await dialog.locator('input[list="journey-projects"]').fill('Synthetic');await dialog.getByPlaceholder('ระบุสถานที่หรือชื่อลูกค้า').fill('Local');await dialog.locator('input[type="datetime-local"]').fill('2026-11-05T08:00');
 await dialog.locator('form').evaluate(f=>{f.requestSubmit();f.requestSubmit();});await page.getByRole('heading',{name:'บันทึกใช้รถสำเร็จ',exact:true}).waitFor();
 assert.equal(posts,1);assert.equal(JSON.parse(sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload).trips.length,1);
 await dialog.getByRole('button',{name:'เรียบร้อย',exact:true}).click();await page.getByRole('button',{name:'คืนรถ',exact:true}).first().click();
 await dialog.locator('input[type="datetime-local"]').fill('2026-11-05T09:00');await dialog.locator('input[type="number"]').fill('110');drop=true;
 await dialog.locator('form').evaluate(f=>f.requestSubmit());await dialog.getByRole('alert').filter({hasText:'ยังยืนยันผลไม่ได้'}).waitFor();
 assert.equal(posts,2);assert.equal(await dialog.locator('fieldset').evaluate(e=>e.disabled),true);assert.equal(await dialog.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).isDisabled(),true);assert.equal(await dialog.getByRole('button',{name:'ยกเลิก',exact:true}).isDisabled(),true);
 const before=sql.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").get();
 await dialog.locator('form').evaluate(f=>{f.requestSubmit();f.requestSubmit();});await page.getByRole('heading',{name:'คืนรถสำเร็จ',exact:true}).waitFor();
 assert.equal(posts,3);assert.equal(bodies[1].tripOperation.id,bodies[2].tripOperation.id);assert.deepEqual(sql.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").get(),before);assert.equal(before.version,2);assert.equal(JSON.parse(before.payload).audit.length,2);assert.equal(sql.prepare("SELECT count(*) n FROM fleet_store WHERE id LIKE 'trip-operation:%'").get().n,2);
 assert.deepEqual(errors,[]);console.log('PASS browser transaction reliability:',JSON.stringify({browser:browser.version(),viewport:360,doubleSubmitPosts:1,lostReturnReplyReplay:'PASS',sameOperationId:true,version:2,scope:'loopback/synthetic SQLite; injected identity; no live auth'}));
}finally{await browser?.close();await new Promise(r=>server.close(r));sql.close();}
