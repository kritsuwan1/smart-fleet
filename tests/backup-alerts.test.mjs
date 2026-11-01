import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../output/worker.js';
import {build} from 'esbuild';
const built=await build({entryPoints:['src/backup.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {createBackup,inspectBackup}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
import {portableChecksum} from '../src/checksum.ts';
import {createHash} from 'node:crypto';
for(const length of [0,1,3,55,56,63,64,65,1000,90000]){const bytes=new Uint8Array(length);for(let i=0;i<length;i++)bytes[i]=i%251;assert.equal(portableChecksum(bytes),createHash('sha256').update(bytes).digest('hex'));}
import {tripElapsed} from '../src/open-trips.ts';
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
const env={APP_PASSWORD:crypto.randomUUID(),DB:{prepare(q){let args=[];const stmt=sql.prepare(q);return {bind(...values){args=values;return this;},async first(){return stmt.get(...args)||null;},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}};}};}}};
const origin='https://smart-fleet.test';let cookie='';
const request=(path,options={})=>worker.fetch(new Request(origin+path,{...options,headers:{origin,'CF-Connecting-IP':'192.0.2.91',...(cookie?{cookie}:{}),...options.headers}}),env);
assert.equal((await request('/api/backup.json')).status,401);
const login=await request('/login',{method:'POST',body:new URLSearchParams({username:'admin',password:env.APP_PASSWORD})});cookie=login.headers.get('set-cookie').split(';')[0];
let state=JSON.parse(sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);
state.trips.push({id:'t1',seq:1,carId:'car-1',driverId:'p1',project:"ทดสอบ 'quoted'",destination:'สำนักงาน',start:'2026-10-29T08:00',end:'',odoStart:115784,odoEnd:null,note:'ไทย '.repeat(4000),reason:''});
sql.prepare("UPDATE fleet_store SET payload=?,version=version+1 WHERE id='main'").run(JSON.stringify(state));
const r=await request('/api/backup.json');assert.equal(r.status,200);const b=await r.json();assert.equal(b.format,'smart-fleet-backup');assert.equal(b.appVersion,'3.9.0');
const report=await inspectBackup(JSON.stringify(b));assert.equal(report.verified,true);assert.equal(report.trips,1);assert.equal(report.open,1);assert.ok(!JSON.stringify(report).includes(state.sessionKey));
const tampered=structuredClone(b);tampered.state.trips[0].odoStart++;
await assert.rejects(inspectBackup(JSON.stringify(tampered)),/SHA-256/);
await assert.rejects(inspectBackup('oops'),/JSON/);
await assert.rejects(inspectBackup(' '.repeat(5_000_001)),/5 MB/);
assert.equal((await inspectBackup(JSON.stringify({exportedAt:b.exportedAt,state}))).verified,false);
const invalid=structuredClone(state);invalid.trips[0].carId='missing';await assert.rejects(inspectBackup(JSON.stringify(await createBackup(invalid,'3.9.0'))),/โครงสร้าง/);
const sqlText=await (await request('/api/backup.sql')).text();
for(const populated of [false,true]){
 const target=new DatabaseSync(':memory:');
 if(populated){target.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');target.prepare('INSERT INTO fleet_store VALUES (?,?,?)').run('main',JSON.stringify({obsolete:true}),7);}
 target.exec(sqlText);
 const restored=JSON.parse(target.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);
 assert.notEqual(restored.sessionKey,state.sessionKey);assert.deepEqual({...restored,sessionKey:''},{...state,sessionKey:''});
 const inspection=await inspectBackup(JSON.stringify(await createBackup(restored,'3.9.0')));assert.equal(inspection.trips,report.trips);assert.equal(inspection.cars,report.cars);
 target.close();
}
const temporary=await mkdtemp(join(tmpdir(),'fleet-restore-'));
try{
 const file=join(temporary,'backup.sql');await writeFile(file,sqlText);
 const command=spawnSync(process.execPath,['--experimental-sqlite','scripts/check-sql-backup.mjs',file],{encoding:'utf8'});assert.equal(command.status,0,command.stderr);assert.match(command.stdout,/สำเร็จ/);assert.ok(!command.stdout.includes(state.sessionKey));
 await writeFile(file,'SELECT 1;');const rejected=spawnSync(process.execPath,['--experimental-sqlite','scripts/check-sql-backup.mjs',file],{encoding:'utf8'});assert.equal(rejected.status,1);
}finally{await rm(temporary,{recursive:true,force:true});}
const clock=Date.parse('2026-10-31T08:00+07:00');
assert.deepEqual(tripElapsed('2026-10-31T08:00',clock),{text:'ไม่ถึง 1 นาที',review:false});
assert.equal(tripElapsed('2026-10-30T08:01',clock).review,false);
assert.deepEqual(tripElapsed('2026-10-30T08:00',clock),{text:'1 วัน',review:true});
assert.equal(tripElapsed('2026-10-29T06:30',clock).text,'2 วัน 1 ชั่วโมง 30 นาที');
assert.equal(tripElapsed('2026-11-01T08:00',clock).review,true);assert.equal(tripElapsed('invalid',clock).review,true);
console.log('PASS backups/alerts: authenticated checksummed JSON, local structure/count/integrity checks, old-format notice, corrupt/oversize/reference rejection, actual SQL restore into empty and populated isolated databases including Thai/quotes/chunks, session rotation, elapsed Thai timezone and 24-hour threshold');
