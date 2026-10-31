import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import worker from '../output/worker.js';
const require=createRequire(import.meta.url);let esbuild;try{esbuild=require('esbuild');}catch{esbuild=require(process.env.FLEET_ESBUILD_PATH);}
async function module(name){const r=await esbuild.build({entryPoints:['src/'+name+'.ts'],bundle:true,write:false,platform:'node',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const {systemStatus}=await module('system-status'),{initial}=await module('fleet');
for(const [bytes,level] of [[0,'normal'],[1049999,'normal'],[1050000,'warning'],[1349999,'warning'],[1350000,'critical'],[1500000,'full'],[1500001,'full']]){const s=systemStatus(initial,bytes);assert.equal(s.storage.level,level);assert.equal(s.storage.remainingBytes,Math.max(0,1500000-bytes));assert.equal(s.counts.accountLimit,200);}
const thai={...structuredClone(initial),projects:['ข้อความภาษาไทย']};assert.equal(systemStatus(thai).storage.usedBytes,new TextEncoder().encode(JSON.stringify(thai)).length);assert.ok(systemStatus(thai).storage.usedBytes>JSON.stringify(thai).length);
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
const env={APP_PASSWORD:crypto.randomUUID(),DB:{prepare(q){const stmt=sql.prepare(q);let args=[];return{bind(...a){args=a;return this},async first(){return stmt.get(...args)||null},async run(){return{meta:{changes:Number(stmt.run(...args).changes)}}}}}}};
const origin='https://smart-fleet.kritsuwan1.workers.dev';const req=(path,opt={},cookie='')=>worker.fetch(new Request(origin+path,{...opt,headers:{origin,'CF-Connecting-IP':'192.0.2.24',...(cookie?{cookie}:{}),...opt.headers}}),env);
assert.equal((await req('/api/system-status')).status,401);
let r=await req('/login',{method:'POST',body:new URLSearchParams({username:'admin',password:env.APP_PASSWORD})});const root=r.headers.get('set-cookie').split(';')[0];
r=await req('/register',{method:'POST',body:new URLSearchParams({name:'Status Employee',username:'statusstaff',password:'abc123'})});const staff=r.headers.get('set-cookie').split(';')[0];
assert.equal((await req('/api/system-status',{},staff)).status,403);assert.equal((await (await req('/api/fleet',{},staff)).json()).systemStatus,undefined);
// Account hashes are used only for byte totals; the status response must not expose them.
let raw=sql.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").get(),parsed=JSON.parse(raw.payload),pretty=JSON.stringify(parsed,null,2);
sql.prepare("UPDATE fleet_store SET payload=? WHERE id='main'").run(pretty);sql.prepare("INSERT INTO fleet_store VALUES('backup-test',?,0)").run('x'.repeat(20000));
r=await req('/api/system-status',{},root);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');const status=await r.json();assert.equal(status.storage.usedBytes,new TextEncoder().encode(pretty).length);assert.equal(status.version,'3.8.2');assert.equal(status.counts.accounts,1);assert.equal(status.counts.activeAccounts,1);assert.equal(status.storage.limitBytes,1500000);
assert.ok(!JSON.stringify(status).includes(parsed.accounts[0].passwordHash));assert.ok(!JSON.stringify(status).includes(parsed.sessionKey));
const a=await (await req('/api/fleet',{},root)).json();assert.equal(a.systemStatus.storage.usedBytes,status.storage.usedBytes);assert.equal(a.state.accounts,undefined);
const unchanged=sql.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").get();assert.equal(unchanged.payload,pretty);assert.equal(unchanged.version,raw.version);
// Read status even when the application cannot accept further writes; preserve all data.
parsed.padding='ท'.repeat(510000);const full=JSON.stringify(parsed);sql.prepare("UPDATE fleet_store SET payload=? WHERE id='main'").run(full);
const saturated=await (await req('/api/system-status',{},root)).json();assert.equal(saturated.storage.level,'full');assert.equal(saturated.storage.remainingBytes,0);assert.ok(saturated.storage.usedBytes>1500000);assert.equal(sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload,full);
console.log('PASS system status: exact stored UTF-8 bytes, shared data/account limits, 70/90/100% thresholds, read-only when full, excludes backup rows, admin-only status/summary, no account hashes/session secrets, preserved database payload/version');
