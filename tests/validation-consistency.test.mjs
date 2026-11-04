// Synthetic state and SQLite :memory: only. No Worker/provider/credential access.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
const built=await build({stdin:{contents:`export {fleetApi} from './src/api';export {validateTrip} from './src/fleet';export {createBackup,inspectBackup,backupDigest} from './src/backup';export {automaticBackupArtifact,inspectAutomaticBackup,restoreAutomaticBackupToStaging} from './src/automatic-backup';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',define:{__FLEET_ENV__:'"demo"'}});
const {fleetApi,validateTrip,createBackup,inspectBackup,backupDigest,automaticBackupArtifact,inspectAutomaticBackup,restoreAutomaticBackupToStaging}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const base={cars:[{id:'car',plate:'SYNTHETIC-001',province:'Test',model:'Synthetic',initialOdo:100,active:true}],people:[{id:'person',name:'Synthetic',active:true}],projects:['Synthetic'],trips:[{id:'trip',seq:1,carId:'car',driverId:'person',project:'Synthetic',destination:'Local',start:'2026-11-01T10:00',end:'2026-11-01T11:00',odoStart:100,odoEnd:110,note:'',reason:''}],audit:[],accounts:[],sessionKey:'synthetic-fixture-only',imported:false,maintenancePlans:[],maintenanceHistory:[],legacy:{keep:'unknown fields retained'}};
const root={id:'admin',username:'admin',name:'Synthetic',role:'admin',driverId:'',passwordVersion:0};
const databases=[];let checks=0,networkCalls=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=()=>{networkCalls++;throw Error('external network forbidden');};
function database(main){
 const sql=new DatabaseSync(':memory:');databases.push(sql);
 sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
 sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('environment','demo');
 sql.prepare('INSERT INTO fleet_store VALUES (?,?,9)').run('sentinel','synthetic-preserve');
 if(main)sql.prepare('INSERT INTO fleet_store VALUES (?,?,4)').run('main',JSON.stringify(main));
 const stats={runCalls:0,changes:0};
 const db={prepare(q){const stmt=sql.prepare(q);let args=[];return{bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async run(){stats.runCalls++;const changes=Number(stmt.run(...args).changes);stats.changes+=changes;return{meta:{changes}};}};}};
 const snapshot=()=>({schema:sql.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name').all(),rows:sql.prepare('SELECT id,payload,version FROM fleet_store ORDER BY id').all()});
 return{sql,db,stats,snapshot};
}
const post=(d,data)=>fleetApi({DB:d.db},root).POST(new Request('https://synthetic.invalid/api/fleet',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://synthetic.invalid'},body:JSON.stringify({action:'car',version:4,data})}));
const carData=(value,id='car')=>({...base.cars[0],id,initialOdo:value});
const manual=async s=>JSON.stringify(await createBackup(s,'3.8.5','demo'));
function modified(change){const s=structuredClone(base);change(s);return s;}
async function poisonedArtifact(s){
 // A valid envelope/checksum does not make invalid application values safe.
 const a=await automaticBackupArtifact(base,4,'staging','2026-11-04','2026-11-04T00:00:00Z');
 a.state=s;a.metadata.stateBytes=new TextEncoder().encode(JSON.stringify(s)).length;
 a.metadata.stateSha256=await backupDigest(s);
 a.metadata.counts={cars:s.cars.length,people:s.people.length,projects:s.projects.length,trips:s.trips.length,audit:s.audit.length,accounts:s.accounts?.length||0};
 const {sha256,...body}=a;a.sha256=await backupDigest(body);
 assert.equal(a.metadata.stateSha256,await backupDigest(s));assert.equal(a.sha256,await backupDigest(body));
 return JSON.stringify(a);
}
try{
 // Reproduce both audited bugs before changes; after remediation both must refuse.
 const backwards=modified(s=>s.trips[0].end='2026-11-01T09:00');
 assert.throws(()=>validateTrip(backwards,backwards.trips[0]));
 let backupRejected=false;try{await inspectBackup(await manual(backwards));}catch{backupRejected=true;}
 const probe=database(base),probeBefore=probe.snapshot(),carResponse=await post(probe,carData(100000000));
 const observed={backupRejected,carStatus:carResponse.status};
 console.log('Validation regression observations:',JSON.stringify(observed));
 assert.deepEqual(observed,{backupRejected:true,carStatus:400});
 assert.deepEqual(probe.snapshot(),probeBefore);assert.equal(probe.stats.changes,0);checks+=2;

 const invalids=[
  s=>s.trips[0].end='2026-11-01T09:00',
  s=>s.trips[0].start='2026-02-30T10:00',
  s=>s.trips[0].end='2026-11-31T11:00',
  s=>s.trips[0].start='2026-11-01T24:00',
  s=>s.trips[0].end='2026-11-01T11:60',
  s=>s.trips[0].start='2026-11-01T10:00:00',
  s=>s.trips[0].odoStart=-1,
  s=>s.trips[0].odoStart=1.5,
  s=>s.trips[0].odoStart=100000000,
  s=>s.trips[0].odoEnd=99,
  s=>s.trips[0].odoEnd=110.5,
  s=>s.trips[0].odoEnd=100000000,
  s=>s.trips[0].odoEnd=null,
  s=>{s.trips[0].end='';s.trips[0].odoEnd=0;},
  s=>{s.trips[0].end='';delete s.trips[0].odoEnd;},
  s=>s.trips[0].end=null,
  s=>s.cars[0].initialOdo=100000000,
  s=>s.cars[0].initialOdo=-1,
  s=>s.cars[0].initialOdo=100.5,
  s=>s.cars[0].initialOdo='100'
 ];
 for(const change of invalids){
  const s=modified(change),original=structuredClone(s),text=await manual(s);
  await assert.rejects(inspectBackup(text));assert.deepEqual(s,original);checks++;
  await assert.rejects(inspectBackup(JSON.stringify({state:s,exportedAt:'2026-11-04T00:00:00Z'})));checks++;
  const artifact=await poisonedArtifact(s);await assert.rejects(inspectAutomaticBackup(artifact),/INTEGRITY_FAILED/);checks++;
  // Both empty/populated local targets preserve schema, rows and versions; zero run calls.
  for(const populated of [false,true]){
   const d=database(populated?base:undefined),before=d.snapshot();
   await assert.rejects(restoreAutomaticBackupToStaging(d.db,artifact,'staging'),/INTEGRITY_FAILED/);
   assert.equal(d.stats.runCalls,0);assert.deepEqual(d.snapshot(),before);checks++;
  }
 }
 const valids=[
  ()=>{},
  s=>{s.trips[0].end='';s.trips[0].odoEnd=null;},
  s=>s.trips[0].end=s.trips[0].start,
  s=>{s.trips[0].start='2024-02-29T10:00';s.trips[0].end='2024-02-29T11:00';},
  s=>{s.trips[0].start='2026-12-31T23:59';s.trips[0].end='2027-01-01T00:00';},
  s=>{s.cars[0].initialOdo=0;s.trips[0].odoStart=0;s.trips[0].odoEnd=0;},
  s=>{s.cars[0].initialOdo=99999999;s.trips[0].odoStart=99999999;s.trips[0].odoEnd=99999999;},
  s=>{s.trips[0].note='legacy long text '.repeat(400);delete s.maintenancePlans;delete s.maintenanceHistory;},
  s=>{delete s.accounts;delete s.maintenancePlans;delete s.maintenanceHistory;delete s.sessionKey;}
 ];
 for(const change of valids){
  const s=modified(change),original=structuredClone(s);
  assert.equal((await inspectBackup(await manual(s))).verified,true);assert.deepEqual(s,original);checks++;
  assert.equal((await inspectBackup(JSON.stringify({state:s,exportedAt:'2026-11-04T00:00:00Z'}))).verified,false);checks++;
  // Do not apply unrelated text/overlap/continuity policies to legacy backup inspection.
  const artifact=JSON.stringify(await automaticBackupArtifact(s,4,'staging','2026-11-04','2026-11-04T00:00:00Z'));
  const d=database();await restoreAutomaticBackupToStaging(d.db,artifact,'staging');
  const restored=JSON.parse(d.sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);
  assert.deepEqual({...restored,sessionKey:''},{...s,sessionKey:''});assert.notEqual(restored.sessionKey,s.sessionKey);checks++;
 }
 for(const value of [100000000,-1,1.5,Number.MAX_SAFE_INTEGER,'Infinity','NaN','1e100'])for(const id of ['car',undefined]){
  const d=database(base),before=d.snapshot(),data={...carData(value),id,plate:id===undefined?'SYNTHETIC-NEW':base.cars[0].plate};
  assert.equal((await post(d,data)).status,400);assert.deepEqual(d.snapshot(),before);assert.equal(d.stats.changes,0);checks++;
 }
 for(const value of [0,99999999,100,'0','99999999','100'])for(const id of ['car',undefined]){
  const d=database(base),before=structuredClone(base),data={...carData(value),id,plate:id===undefined?'SYNTHETIC-NEW':base.cars[0].plate};
  assert.equal((await post(d,data)).status,200);
  const saved=JSON.parse(d.sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);
  const changed=saved.cars.find(c=>id===undefined?c.plate==='SYNTHETIC-NEW':c.id===id);
  assert.equal(changed.initialOdo,Number(value));assert.equal(saved.cars.length,id===undefined?2:1);
  assert.equal(d.sql.prepare("SELECT version FROM fleet_store WHERE id='main'").get().version,5);
  assert.deepEqual(saved.trips,before.trips);assert.deepEqual(saved.maintenancePlans,before.maintenancePlans);assert.deepEqual(saved.maintenanceHistory,before.maintenanceHistory);assert.deepEqual(saved.legacy,before.legacy);checks++;
 }
 // Valid Trip rules/errors stay intact, including a reason for a discontinuity.
 const discontinuous=modified(s=>{s.trips[0].odoStart=101;s.trips[0].reason='Synthetic explained gap';});
 assert.doesNotThrow(()=>validateTrip(discontinuous,discontinuous.trips[0]));checks++;
 const boundaries=valids.slice(0,7);for(const change of boundaries){const s=modified(change);assert.doesNotThrow(()=>validateTrip(s,s.trips[0]));checks++;}
 assert.equal(networkCalls,0);
 console.log('PASS validation consistency: '+checks+' cases, backup chronology/calendar/open-closed odometers, shared car/Trip bounds, valid legacy preservation, exact-checksum invalid restore refusal before any mutation; synthetic SQLite only');
}finally{globalThis.fetch=originalFetch;for(const sql of databases)sql.close();}
