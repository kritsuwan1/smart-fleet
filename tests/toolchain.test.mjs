// Offline compatibility rehearsal: no Wrangler deployment/config, credentials,
// Cloudflare API, real D1, R2 bucket or registered Scheduled Trigger.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {Miniflare} from 'miniflare';
import {build} from 'esbuild';
import sharp from 'sharp';
import {request} from 'undici';
import WebSocket,{WebSocketServer} from 'ws';
const versions={wrangler:'4.116.0',miniflare:'4.20260730.0',sharp:'0.35.5',undici:'7.30.1',ws:'8.21.0',esbuild:'0.28.1'};
for(const [name,version] of Object.entries(versions))assert.equal(JSON.parse(await readFile('node_modules/'+name+'/package.json','utf8')).version,version);
assert.equal(Number(process.versions.node.split('.')[0]),24,'compatibility rehearsal requires Node 24');
const pixels=await sharp({create:{width:3,height:2,channels:4,background:'#336699'}}).png().toBuffer();
const metadata=await sharp(pixels).metadata();assert.equal(metadata.width,3);assert.equal(metadata.height,2);assert.equal(metadata.format,'png');
const jpeg=await sharp(pixels).resize(6,4).jpeg().toBuffer();assert.equal((await sharp(jpeg).metadata()).width,6);
const http=createServer((_req,res)=>res.end('synthetic-loopback'));
const sockets=new WebSocketServer({server:http});sockets.on('connection',ws=>ws.on('message',message=>ws.send(message)));
let mf,client;const timer=setTimeout(()=>{console.error('FAIL offline toolchain timeout');process.exit(1);},30000);
try{
 await new Promise(r=>http.listen(0,'127.0.0.1',r));const port=http.address().port;
 const response=await request('http://127.0.0.1:'+port);assert.equal(response.statusCode,200);assert.equal(await response.body.text(),'synthetic-loopback');
 client=new WebSocket('ws://127.0.0.1:'+port);await once(client,'open');const reply=once(client,'message');client.send('synthetic-websocket');assert.equal(String((await reply)[0]),'synthetic-websocket');client.close();await once(client,'close');
 // Query D1 inside the local Worker, avoiding Node-side proxy bridges. All
 // resources here are ephemeral; real SmartFleet D1/backup logic is also tested
 // by the existing SQLite/mock suites, not certified as a remote cloud service.
 mf=new Miniflare({modules:true,host:'127.0.0.1',compatibilityDate:'2026-07-30',d1Databases:['DB'],d1Persist:false,script:`export default {async fetch(req,env){await env.DB.exec('CREATE TABLE IF NOT EXISTS synthetic_counter(value INTEGER)');await env.DB.prepare('INSERT INTO synthetic_counter VALUES (42)').run();return Response.json(await env.DB.prepare('SELECT count(*) AS count, sum(value) AS total FROM synthetic_counter').first());}}`});
 const first=await(await mf.dispatchFetch('http://localhost/synthetic')).json();assert.deepEqual(first,{count:1,total:42});
 const second=await(await mf.dispatchFetch('http://localhost/synthetic')).json();assert.deepEqual(second,{count:2,total:84});
 await mf.dispose();mf=undefined;
 // Exercise the actual built Staging Worker inside local workerd, with its
 // normal auth/API/maintenance/manual-backup code and ephemeral D1 only.
 const bundled=await build({stdin:{contents:`import app from './output/worker-staging.js';export default {...app,async fetch(req,env){await env.DB.exec('CREATE TABLE IF NOT EXISTS fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');await env.DB.prepare("INSERT OR IGNORE INTO fleet_store VALUES ('environment','demo',0)").run();return app.fetch(req,{...env,DEMO_DB:env.DB,APP_PASSWORD:'synthetic-toolchain-password',AUTOMATIC_BACKUP_ENABLED:'false',BACKUP_ENVIRONMENT:'staging'});}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'neutral'});
 mf=new Miniflare({modules:true,host:'127.0.0.1',compatibilityDate:'2026-07-30',d1Databases:['DB'],d1Persist:false,script:bundled.outputFiles[0].text});
 const call=(path,options={},cookie='')=>mf.dispatchFetch('https://staging.test'+path,{redirect:'manual',...options,headers:{origin:'https://staging.test','CF-Connecting-IP':'192.0.2.70',...(cookie?{cookie}:{}),...options.headers}});
 assert.equal((await call('/api/fleet')).status,401);assert.equal((await call('/qr-site.svg')).status,404);
 const login=await call('/login',{method:'POST',body:new URLSearchParams({username:'admin',password:'synthetic-toolchain-password'})});assert.equal(login.status,303);const cookie=login.headers.get('set-cookie').split(';')[0];
 let fleet=await(await call('/api/fleet',{},cookie)).json();assert.equal(fleet.state.cars[0].plate,'SYNTHETIC-001');
 const action=async data=>{const result=await call('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'maintenance',version:fleet.version,data})},cookie);assert.equal(result.status,200);fleet=await result.json();};
 await action({operation:'plan',plan:{carId:'staging-car-1',type:'oil',name:'Synthetic native runtime service',active:true,dueOdo:200,intervalKm:100,warnKm:20,warnDays:7}});
 const day=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
 await action({operation:'complete',planId:fleet.state.maintenancePlans[0].id,record:{date:day,odometer:100,details:'Synthetic only',costSatang:12345}});
 const history=fleet.state.maintenanceHistory[0];await action({operation:'editHistory',id:history.id,record:{...history,details:'Corrected synthetic',costSatang:10000}});assert.equal(fleet.state.maintenanceHistory.length,1);assert.equal(fleet.state.maintenanceHistory[0].costSatang,10000);
 const backupResponse=await call('/api/backup.json',{},cookie);assert.equal(backupResponse.status,200);const backup=await backupResponse.json();assert.equal(backup.state.maintenanceHistory[0].costSatang,10000);assert.match(backup.sha256,/^[a-f0-9]{64}$/);
 assert.equal((await(await call('/api/backup-status',{},cookie)).json()).state,'disabled');
 console.log('PASS built Staging Worker in local workerd: auth, synthetic D1, maintenance create/complete/correct, private manual backup and disabled automatic backup/QR; no real resources');
 console.log('PASS offline toolchain: pinned Wrangler/Miniflare4/sharp/esbuild/undici/ws, native synthetic PNG/JPEG, loopback HTTP/WebSocket, local workerd Worker/D1 query persistence; no real Cloudflare/R2/credentials');
}finally{
 clearTimeout(timer);client?.terminate();await mf?.dispose();for(const client of sockets.clients)client.terminate();await new Promise(r=>sockets.close(r));await new Promise(r=>http.close(r));http.closeAllConnections();
}
