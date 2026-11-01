import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import worker from '../output/worker.js';
const require=createRequire(import.meta.url);let esbuild;try{esbuild=require('esbuild');}catch{esbuild=require(process.env.FLEET_ESBUILD_PATH);}
// Exercise URL escaping as well as Windows drive-letter paths.
const tmp=await mkdtemp(join(tmpdir(),'fleet-import #%-'));
for(const name of ['import-plan','xlsx-reader','fleet'])await esbuild.build({entryPoints:['src/'+name+'.ts'],bundle:true,platform:'node',format:'esm',outfile:tmp+'/'+name+'.mjs'});
const {planImport}=await import(pathToFileURL(join(tmp,'import-plan.mjs')).href),{initial}=await import(pathToFileURL(join(tmp,'fleet.mjs')).href),{excelDate,excelTime,readZip}=await import(pathToFileURL(join(tmp,'xlsx-reader.mjs')).href);
const rows=JSON.parse(await readFile('tests/fixtures/latest-import.json','utf8'));
const options={carId:'car-1',updateExisting:false,createPeople:false};
let plan=planImport(initial,rows,options);
assert.deepEqual(plan.errors,[]);assert.equal(plan.counts.new,31);assert.equal(plan.candidate.trips.reduce((n,t)=>n+t.odoEnd-t.odoStart,0),1765);assert.equal(plan.candidate.trips.at(-1).odoEnd,117549);
assert.equal(planImport(plan.candidate,rows,options).counts.same,31);
const first17=planImport(initial,rows.slice(0,17),options).candidate;
plan=planImport(first17,rows,options);assert.equal(plan.counts.same,17);assert.equal(plan.counts.new,14);assert.equal(plan.errors.length,0);
const changed=structuredClone(rows);changed[0].project='เปลี่ยนชื่อโครงการ';
assert.equal(planImport(first17,changed,options).counts.skipped,1);
plan=planImport(first17,changed,{...options,updateExisting:true});assert.equal(plan.counts.updated,1);assert.equal(plan.candidate.trips[0].id,first17.trips[0].id);assert.equal(plan.candidate.trips[0].project,'เปลี่ยนชื่อโครงการ');
const owned=structuredClone(first17);owned.trips[0].ownerUserId='existing-employee';assert.equal(planImport(owned,changed,{...options,updateExisting:true}).candidate.trips[0].ownerUserId,'existing-employee');
const duplicates=structuredClone(rows);duplicates[1].seq=106;assert.ok(planImport(initial,duplicates,options).errors.some(e=>e.includes('ซ้ำ')));
const wrongPlate=structuredClone(rows);wrongPlate[0].plate='กก9999';assert.ok(planImport(initial,wrongPlate,options).errors.some(e=>e.includes('ทะเบียน')));
const missingName=structuredClone(rows);missingName[0].driverName='พนักงานใหม่';assert.ok(planImport(initial,missingName,options).errors.some(e=>e.includes('พนักงาน')));
plan=planImport(initial,missingName,{...options,createPeople:true});assert.equal(plan.errors.length,0);assert.equal(plan.newPeople.length,1);
const mismatched=structuredClone(initial);mismatched.cars[0].initialOdo=116763;assert.ok(planImport(mismatched,rows,options).errors.some(e=>e.includes('เลขไมล์เริ่มต้น')));
const twoTest=structuredClone(initial);twoTest.trips=[{id:'test1',seq:1,carId:'car-1',driverId:'p1',project:'RVM BRB',destination:'คลัง345',start:'2026-10-28T16:34',end:'2026-10-28T16:35',odoStart:115784,odoEnd:115795,note:'',reason:''},{id:'test2',seq:2,carId:'car-1',driverId:'p1',project:'Smart key',destination:'Test',start:'2026-10-28T16:39',end:'2026-10-28T16:40',odoStart:115795,odoEnd:115798,note:'',reason:''}];
const snapshot=JSON.stringify(twoTest);plan=planImport(twoTest,rows,options);assert.ok(plan.errors.some(e=>e.includes('117549')&&e.includes('115784')));assert.equal(JSON.stringify(twoTest),snapshot);assert.equal(plan.candidate.trips.filter(t=>t.id.startsWith('test')).length,2);
// A real newer record that connects correctly remains in place and does not falsely block a full batch.
const newer=structuredClone(initial);newer.trips=[{...twoTest.trips[0],id:'real',odoStart:117549,odoEnd:117560,reason:'บันทึกย้อนหลังก่อนนำเข้าประวัติเดิม'}];
plan=planImport(newer,rows,options);assert.equal(plan.errors.length,0);assert.equal(plan.candidate.trips.find(t=>t.id==='real').odoEnd,117560);
assert.equal(excelDate('27/10/69'),'2026-10-27');assert.equal(excelDate('27/10/2569'),'2026-10-27');assert.equal(excelDate(46322),'2026-10-27');assert.equal(excelDate('2026-10-27'),'2026-10-27');assert.equal(excelDate(1,true),'1904-01-02');assert.throws(()=>excelDate('31/2/69'));assert.throws(()=>excelTime('25:00'));assert.equal(excelTime(0.5),'12:00');assert.equal(excelTime(0),'00:00');assert.equal(excelTime('8:20'),'08:20');
const fixture=process.env.FLEET_XLSX_FIXTURE;
if(fixture){const bytes=await readFile(fixture);const read=await readZip(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));assert.match(await read('xl/worksheets/sheet1.xml'),/117549/);}
// Integration: invalid import writes nothing, a valid import is atomic, repeat import is idempotent, and stale versions are rejected.
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
const env={APP_PASSWORD:crypto.randomUUID(),DB:{prepare(text){let args=[];const stmt=sql.prepare(text);return {bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async run(){const r=stmt.run(...args);return {meta:{changes:Number(r.changes)}};}};}}};
const origin='https://example.test';let cookie='';const req=(path,opts={})=>worker.fetch(new Request(origin+path,{...opts,headers:{origin,'CF-Connecting-IP':'192.0.2.2',cookie,...opts.headers}}),env);
let res=await req('/login',{method:'POST',body:new URLSearchParams({password:env.APP_PASSWORD})});cookie=res.headers.get('set-cookie').split(';')[0];
let state=await (await req('/api/fleet')).json();const post=(r,opts=options,version=state.version)=>req('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'importExcel',version,data:{rows:r,options:opts,fileName:'latest.xlsx',sheetName:'บันทึกการใช้รถ'}})});
res=await post(wrongPlate);assert.equal(res.status,400);assert.equal((await (await req('/api/fleet')).json()).state.trips.length,0);
res=await post(rows);assert.equal(res.status,200);state=await res.json();assert.equal(state.state.trips.length,31);assert.equal(state.importResult.new,31);
const before=JSON.stringify(state.state);res=await post(rows);assert.equal(res.status,400);assert.equal(JSON.stringify((await (await req('/api/fleet')).json()).state),before);
res=await post(changed,{...options,updateExisting:true},0);assert.equal(res.status,409);
res=await post(changed,{...options,updateExisting:true});assert.equal(res.status,200);state=await res.json();assert.equal(state.importResult.updated,1);assert.equal(state.state.trips.length,31);assert.equal(state.state.audit[0].before.trips.length,1);
console.log('PASS XLSX import: 31 rows/1765 km; 17 identical +14 new; explicit updates; duplicate seq; wrong car; unknown person opt-in; initial odometer mismatch; preservation and blocking of two conflicting existing records; valid newer record; Thai/Buddhist and numeric dates/times; XLSX ZIP decompression; API atomicity, idempotency, audit, stale version rejection');
