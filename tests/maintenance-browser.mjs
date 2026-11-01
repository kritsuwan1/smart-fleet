// Optional local browser review. Install Playwright outside app dependencies, then:
// node --experimental-sqlite tests/maintenance-browser.mjs PATH_TO_PLAYWRIGHT [EDGE_EXECUTABLE]
// Loopback HTTP + actual React Dashboard/fleetApi + SQLite :memory: only.
// Identity is injected by this test harness; this is not a deployed auth test.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(resolve(process.argv[2]||'.qa/browser/node_modules/playwright'));
const compiled=await build({stdin:{contents:`export {fleetApi} from './src/api';export {initial} from './src/fleet';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,define:{__FLEET_ENV__:'"demo"'}});
const {fleetApi,initial}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const client=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import App from './src/App';createRoot(document.getElementById('root')).render(<App/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,jsx:'automatic',format:'iife',define:{__FLEET_ENV__:'"demo"','process.env.NODE_ENV':'"production"'}});
const css=(await Promise.all(['app','journey','history','account','receipt','maintenance'].map(name=>readFile('src/'+name+'.css','utf8')))).join('\n');
const sql=new DatabaseSync(':memory:');sql.exec(await readFile('schema.sql','utf8'));sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('environment','demo');
const state={...structuredClone(initial),cars:[{id:'car',plate:'SYNTHETIC-001',province:'Test',model:'Test',initialOdo:100,active:true}],people:[{id:'driver',name:'Synthetic Employee',active:true}],accounts:[{id:'employee',name:'Synthetic Employee',username:'synthetic',driverId:'driver',active:true,passwordVersion:0,role:'employee',salt:'test',passwordHash:'test',createdAt:'2026-01-01T00:00:00Z'}],sessionKey:'synthetic-only'};
sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('main',JSON.stringify(state));
const db={prepare(q){const stmt=sql.prepare(q);let args=[];return{bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async run(){return{meta:{changes:Number(stmt.run(...args).changes)}};}};}};
const root={id:'admin',role:'admin',name:'Synthetic Admin',username:'admin',driverId:'',passwordVersion:0};let user=root,posts=0,delay=0;
const server=createServer(async(req,res)=>{try{
 if(req.url==='/client.js'){res.setHeader('Content-Type','application/javascript');res.end(client.outputFiles[0].text);return;}
 if(req.url==='/app.css'){res.setHeader('Content-Type','text/css');res.end(css);return;}
 if(req.url==='/api/fleet'){
  const api=fleetApi({DB:db},user);let result;
  if(req.method==='POST'){posts++;let body='';for await(const chunk of req)body+=chunk;await new Promise(r=>setTimeout(r,delay));result=await api.POST(new Request(origin+'/api/fleet',{method:'POST',headers:{'Content-Type':'application/json',origin},body}));}else result=await api.GET();
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
 }
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/client.js"></script></html>');
}catch{res.statusCode=500;res.end('synthetic harness failed');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;const report=[];
try{
 browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const page=await browser.newPage({viewport:{width:360,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 const panel=page.getByRole('region',{name:'บำรุงรักษารถยนต์'});
 async function fits(label){const size=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));assert.ok(size.width<=size.viewport,label+': '+JSON.stringify(size));report.push({check:label,...size});}
 await page.goto(origin);await panel.getByText('ยังไม่มีแผนบำรุงรักษา').waitFor();await fits('admin dashboard 360 empty');
 await panel.getByRole('button',{name:'เพิ่มแผนบำรุงรักษา'}).click();await panel.getByLabel('ชื่องาน').fill('Synthetic service');await panel.getByLabel('เลขไมล์ครบกำหนด',{exact:true}).fill('200');await panel.getByLabel('รอบระยะทาง (กม.)',{exact:true}).fill('100');await fits('plan form 360');
 await mkdir('.qa/maintenance-review',{recursive:true});await page.screenshot({path:'.qa/maintenance-review/plan-360.png',fullPage:true});
 delay=350;const before=posts;
 // Dispatch two submit events in one task to exercise useRef lock before rerender.
 await panel.locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
 await panel.getByRole('status').filter({hasText:'บันทึกบำรุงรักษาแล้ว'}).waitFor();assert.equal(posts-before,1);assert.equal(JSON.parse(sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload).maintenancePlans.length,1);report.push({check:'two same-task submits',posts:posts-before});delay=0;
 await panel.getByRole('button',{name:'แก้ไขแผน',exact:true}).click();await panel.getByLabel('ชื่องาน').fill('Edited synthetic service');await panel.getByRole('button',{name:'บันทึกแผน',exact:true}).click();await panel.getByRole('heading',{name:/Edited synthetic/}).waitFor();
 await panel.getByRole('button',{name:'บันทึกงานที่เสร็จ'}).click();await panel.getByLabel('รายละเอียด',{exact:true}).fill('Synthetic private detail');await panel.getByLabel('ค่าใช้จ่าย (บาท)').fill('123.45');await fits('completion form 360');await page.screenshot({path:'.qa/maintenance-review/complete-360.png',fullPage:true});
 const completed=posts;delay=350;await panel.locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});await panel.locator('form').waitFor({state:'detached'});assert.equal(posts-completed,1);delay=0;
 const saved=JSON.parse(sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);assert.equal(saved.maintenanceHistory.length,1);assert.equal(saved.maintenanceHistory[0].costSatang,12345);
 await panel.locator('summary').click();await panel.getByText('Synthetic private detail',{exact:true}).waitFor();await fits('history 360');
 for(const width of [390,768,1280]){await page.setViewportSize({width,height:900});await fits('admin dashboard '+width);}
 user=state.accounts[0];await page.setViewportSize({width:360,height:800});await page.reload();await panel.getByRole('heading',{name:/Edited synthetic/}).waitFor();assert.equal(await panel.getByRole('button').count(),0);assert.equal(await panel.getByText('Synthetic private detail').count(),0);await fits('employee dashboard 360');await page.screenshot({path:'.qa/maintenance-review/employee-360.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS browser Maintenance:',JSON.stringify({browser:browser.version(),report,historyEditing:'NOT_IMPLEMENTED',realAuth:'NOT_TESTED (identity injected)',scope:'loopback/synthetic SQLite only'}));
}finally{await browser?.close();await new Promise(r=>server.close(r));sql.close();}
