import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import demo from '../output/worker-demo.js';
import production from '../output/worker-production.js';

const built=await build({entryPoints:['src/automatic-backup.ts'],bundle:true,write:false,platform:'node',format:'esm',define:{__FLEET_ENV__:'"demo"'}});
const {runAutomaticBackup,inspectAutomaticBackup,automaticBackupArtifact,restoreAutomaticBackupToStaging,automaticBackupStatus,backupDay,BACKUP_CRON}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const schema=await readFile('schema.sql','utf8');
const scheduled=Date.parse('2026-11-01T19:00:00Z'),date='2026-11-02',key='fleet/v1/staging/'+date+'.json';
const state={cars:[{id:'car',plate:'TEST-001',province:'Test',model:'Synthetic',initialOdo:100,active:true}],people:[{id:'driver',name:'Synthetic Driver',active:true}],projects:['Synthetic'],trips:[{id:'trip',seq:1,carId:'car',driverId:'driver',ownerUserId:'account',project:'Synthetic',destination:'Test',start:'2026-11-01T08:00',end:'2026-11-01T09:00',odoStart:100,odoEnd:110,note:'',reason:''}],audit:[{id:'audit',time:'2026-11-01T02:00:00Z',actor:'Synthetic Driver',action:'Synthetic',before:null,after:{}}],accounts:[{id:'account',username:'synthetic',name:'Synthetic Driver',driverId:'driver',active:true,salt:'PRIVATE_SALT',passwordHash:'PRIVATE_HASH',passwordVersion:1,role:'employee',createdAt:'2026-11-01T00:00:00Z'}],sessionKey:'PRIVATE_SESSION_KEY',imported:true,fuelPrices:[],legacy:{keep:'preserve unknown historical fields'}};
const databases=[];
function database(marker='demo',main=true){
 const sql=new DatabaseSync(':memory:');databases.push(sql);sql.exec(schema);
 if(marker!==null)sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('environment',marker);
 if(main)sql.prepare('INSERT INTO fleet_store VALUES (?,?,5)').run('main',JSON.stringify(state));
 const db={prepare(q){let args=[];const stmt=sql.prepare(q);return{bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async run(){return{meta:{changes:Number(stmt.run(...args).changes)}};}};}};
 return {sql,db};
}
function bucket(){
 const values=new Map(),calls={get:0,put:0,list:0,delete:0},failures={};let onPut;
 const b={values,calls,failures,set onPut(fn){onPut=fn;},
  async get(k){calls.get++;if(failures.get>0){failures.get--;throw Error('PRIVATE_NETWORK_ERROR');}const value=values.get(k);return value===undefined?null:{size:Buffer.byteLength(value),async text(){return value;}};},
  async put(k,text,options){calls.put++;if(failures.put>0){failures.put--;throw Error('PRIVATE_STORAGE_ERROR');}assert.equal(options.onlyIf.get('If-None-Match'),'*');if(values.has(k))return null;values.set(k,text);if(onPut)await onPut(k);if(failures.ambiguous>0){failures.ambiguous--;throw Error('lost acknowledgement');}return{key:k};},
  async list({prefix,cursor}){calls.list++;if(failures.list>0){failures.list--;throw Error('PRIVATE_LIST_ERROR');}const keys=[...values.keys()].filter(k=>k.startsWith(prefix)&&(!cursor||k>cursor)).sort(),page=keys.slice(0,2);return{objects:page.map(key=>({key})),truncated:keys.length>page.length,...(keys.length>page.length?{cursor:page.at(-1)}:{})};},
  async delete(k){calls.delete++;if(failures.delete>0){failures.delete--;throw Error('PRIVATE_DELETE_ERROR');}values.delete(k);}
 };return b;
}
function setup(options={}){
 const d=database(options.marker===undefined?'demo':options.marker,options.main!==false),r2=bucket(),logs=[],notifications=[];
 const env={DB:d.db,BACKUP_BUCKET:r2,AUTOMATIC_BACKUP_ENABLED:'true',BACKUP_ENVIRONMENT:'staging',BACKUP_NOTIFICATION_URL:'https://notify.invalid/test',BACKUP_NOTIFICATION_TOKEN:'PRIVATE_TOKEN'};
 const deps={now:()=>scheduled,sleep:async()=>{},log:r=>logs.push(r),fetch:async(url,opts)=>{assert.equal(url,'https://notify.invalid/test');assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,'Bearer PRIVATE_TOKEN');notifications.push(JSON.parse(opts.body));return new Response('',{status:200});}};
 const snapshot=()=>d.sql.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").get();
 return {...d,r2,logs,notifications,env,deps,snapshot};
}
async function run(s){return runAutomaticBackup(s.env,scheduled,s.deps);}
try{
 // Repository configuration only: no provider credentials or Cloudflare calls.
 for(const file of ['wrangler.jsonc','wrangler.demo.jsonc','wrangler.production.jsonc','config/backup-staging.example.jsonc','config/backup-production.example.jsonc']){
  const config=JSON.parse((await readFile(file,'utf8')).replace(/^\s*\/\/.*$/gm,''));
  assert.deepEqual(config.triggers?.crons||[],[],file+' must have no active cron');
  assert.notEqual(config.vars?.AUTOMATIC_BACKUP_ENABLED,'true',file+' must not enable backup');
 }
 assert.equal(BACKUP_CRON,'0 19 * * *');assert.equal(backupDay(scheduled),date);assert.equal(backupDay(scheduled-1),'2026-11-02');assert.equal(backupDay(Date.parse('2026-11-01T16:59:59Z')),'2026-11-01');
 const disabled=setup();assert.deepEqual(await runAutomaticBackup({...disabled.env,AUTOMATIC_BACKUP_ENABLED:'false',DB:undefined},scheduled,disabled.deps),{state:'disabled'});assert.equal(disabled.r2.calls.get,0);
 const s=setup(),before=s.snapshot();assert.equal((await run(s)).state,'success');assert.deepEqual(s.snapshot(),before);
 const artifact=await inspectAutomaticBackup(s.r2.values.get(key),'staging',date);assert.deepEqual(artifact.state,state);assert.equal(artifact.metadata.sourceVersion,5);assert.equal(artifact.metadata.counts.trips,1);
 const sha256=value=>createHash('sha256').update(JSON.stringify(value),'utf8').digest('hex');
 assert.equal(artifact.metadata.stateSha256,sha256(state));
 const {sha256:envelopeDigest,...envelope}=artifact;assert.equal(envelopeDigest,sha256(envelope));
 const status=await automaticBackupStatus(s.env);assert.equal(status.state,'success');assert.equal(status.lastSuccess.date,date);assert.ok(!JSON.stringify(status).includes('PRIVATE_'));assert.equal(s.notifications.length,0);
 const poisoned=setup();poisoned.sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('backup:status:staging',JSON.stringify({state:'failed',code:'PRIVATE_STATUS_SECRET',lastSuccess:{date,completedAt:'2026-11-01 (PRIVATE_STATUS_SECRET)',sourceVersion:5,sha256:'a'.repeat(64),bytes:10},stateDump:state}));assert.ok(!JSON.stringify(await automaticBackupStatus(poisoned.env)).includes('PRIVATE_'));
 const original=s.r2.values.get(key);assert.equal((await run(s)).state,'success');assert.equal(s.r2.calls.put,1);assert.equal(s.r2.values.get(key),original);
 assert.equal((await runAutomaticBackup(s.env,scheduled-86400000,s.deps)).code,'STALE_SCHEDULE');assert.equal((await automaticBackupStatus(s.env)).lastSuccess.date,date);assert.equal(s.r2.calls.put,1);
 for(const mutate of [b=>b.state.trips[0].odoEnd++,b=>b.metadata.sourceVersion++,b=>b.metadata.environment='production',b=>b.metadata.backupDate='2026-11-01',b=>b.metadata.counts.trips++,b=>b.sha256='0'.repeat(64)]){
  const changed=JSON.parse(original);mutate(changed);await assert.rejects(inspectAutomaticBackup(JSON.stringify(changed),'staging',date),/INTEGRITY_FAILED/);
 }
 await assert.rejects(inspectAutomaticBackup('invalid'),/INTEGRITY_FAILED/);await assert.rejects(inspectAutomaticBackup(' '.repeat(5_000_001)),/INTEGRITY_FAILED/);
 await assert.rejects(inspectAutomaticBackup(original,'production'),/INTEGRITY_FAILED/);
 const transient=setup();transient.r2.failures.put=2;assert.equal((await run(transient)).state,'success');assert.equal(transient.r2.calls.put,3);
 const ambiguous=setup();ambiguous.r2.failures.ambiguous=1;assert.equal((await run(ambiguous)).state,'success');assert.equal(ambiguous.r2.values.size,1);
 const storageFail=setup();storageFail.r2.failures.put=10;const unchanged=storageFail.snapshot();assert.equal((await run(storageFail)).code,'STORAGE_WRITE_FAILED');assert.equal(storageFail.r2.calls.put,3);assert.deepEqual(storageFail.snapshot(),unchanged);assert.equal(storageFail.notifications[0].code,'STORAGE_WRITE_FAILED');assert.equal((await automaticBackupStatus(storageFail.env)).notification,'sent');assert.ok(!JSON.stringify([...storageFail.logs,...storageFail.notifications]).includes('PRIVATE_'));
 const unconfigured=setup();delete unconfigured.env.BACKUP_NOTIFICATION_URL;unconfigured.r2.failures.put=10;await run(unconfigured);assert.equal((await automaticBackupStatus(unconfigured.env)).notification,'unconfigured');
 const notifyFail=setup();notifyFail.r2.failures.put=10;let notifications=0;notifyFail.deps.fetch=async()=>{notifications++;throw Error('PRIVATE_NOTIFICATION_SECRET');};await run(notifyFail);assert.equal(notifications,3);assert.equal((await automaticBackupStatus(notifyFail.env)).notification,'failed');assert.ok(!JSON.stringify(notifyFail.logs).includes('PRIVATE_'));
 const readFail=setup();readFail.r2.failures.get=10;assert.equal((await run(readFail)).code,'STORAGE_READ_FAILED');assert.equal(readFail.r2.calls.put,0);
 const statusFail=setup(),originalPrepare=statusFail.db.prepare;
 statusFail.db.prepare=q=>{const statement=originalPrepare(q);if(q.startsWith('INSERT INTO fleet_store(id,payload,version) SELECT'))statement.run=async()=>{throw Error('PRIVATE_D1_FAILURE');};return statement;};
 assert.equal((await run(statusFail)).state,'failed');assert.ok(statusFail.logs.some(r=>r.event==='backup-status-failed'));assert.equal(statusFail.r2.calls.put,0);assert.ok(!JSON.stringify(statusFail.logs).includes('PRIVATE_'));
 const badState=setup();badState.sql.prepare("UPDATE fleet_store SET payload='invalid' WHERE id='main'").run();assert.equal((await run(badState)).code,'STATE_INVALID');assert.equal(badState.r2.calls.put,0);
 const missingReadback=setup();missingReadback.r2.get=async()=>null;missingReadback.r2.values.set('fleet/v1/staging/2026-01-01.json','preserve');assert.equal((await run(missingReadback)).code,'READBACK_MISSING');assert.equal(missingReadback.r2.calls.delete,0);
 const corrupt=setup();corrupt.r2.onPut=k=>corrupt.r2.values.set(k,'corrupted readback');corrupt.r2.values.set('fleet/v1/staging/2026-01-01.json','preserve');assert.equal((await run(corrupt)).code,'INTEGRITY_FAILED');assert.equal(corrupt.r2.calls.delete,0);
 const missing=setup({main:false});assert.equal((await run(missing)).code,'STATE_MISSING');assert.equal(missing.snapshot(),undefined);
 for(const mark of [null,'production']){const wrong=setup({marker:mark});const previous=wrong.snapshot();assert.equal((await run(wrong)).code,'ENVIRONMENT_MISMATCH');assert.deepEqual(wrong.snapshot(),previous);assert.equal(wrong.r2.calls.put,0);}
 const wrongEnv=setup();wrongEnv.env.BACKUP_ENVIRONMENT='production';assert.equal((await run(wrongEnv)).code,'ENVIRONMENT_MISMATCH');
 const stale=setup();assert.equal((await runAutomaticBackup(stale.env,scheduled-2*86400000,stale.deps)).code,'SCHEDULE_INVALID');

 // A live lease prevents duplicate jobs; an expired/crashed lease can be reclaimed.
 const locked=setup();locked.sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('backup:lease:staging',JSON.stringify({token:'other',expires:scheduled+10000}));assert.equal((await run(locked)).state,'skipped');assert.equal(locked.r2.calls.put,0);locked.sql.prepare("UPDATE fleet_store SET payload=? WHERE id='backup:lease:staging'").run(JSON.stringify({token:'crashed',expires:scheduled-1}));assert.equal((await run(locked)).state,'success');
 const concurrent=setup();const outcomes=await Promise.all([run(concurrent),run(concurrent)]);assert.equal(outcomes.filter(r=>r.state==='success').length,1);assert.equal(outcomes.filter(r=>r.state==='skipped').length,1);assert.equal(concurrent.r2.calls.put,1);
 const stolen=setup();stolen.r2.onPut=()=>stolen.sql.prepare("UPDATE fleet_store SET payload=? WHERE id='backup:lease:staging'").run(JSON.stringify({token:'new-owner',expires:scheduled+10000}));assert.equal((await run(stolen)).code,'LEASE_LOST');assert.equal(JSON.parse(stolen.sql.prepare("SELECT payload FROM fleet_store WHERE id='backup:lease:staging'").get().payload).token,'new-owner');assert.equal(stolen.r2.calls.delete,0);

 const retention=setup();
 for(let day=20;day<=31;day++)retention.r2.values.set('fleet/v1/staging/2026-10-'+day+'.json','old');
 retention.r2.values.set('fleet/v1/production/2026-10-01.json','other environment');
 retention.r2.values.set('unrelated.json','untouched');retention.r2.values.set('fleet/v1/staging/operator-note.txt','untouched');
 assert.equal((await run(retention)).state,'success');assert.ok(retention.r2.values.has('fleet/v1/staging/2026-10-27.json'));assert.ok(!retention.r2.values.has('fleet/v1/staging/2026-10-26.json'));assert.ok(retention.r2.calls.list>1);assert.ok(retention.r2.values.has(key));assert.ok(retention.r2.values.has('fleet/v1/production/2026-10-01.json'));assert.ok(retention.r2.values.has('unrelated.json'));assert.ok(retention.r2.values.has('fleet/v1/staging/operator-note.txt'));
 const lastCopy=setup();const oldKey='fleet/v1/staging/2026-10-01.json';lastCopy.r2.values.set(oldKey,JSON.stringify(await automaticBackupArtifact(state,4,'staging','2026-10-01','2026-10-01T00:00:00Z')));lastCopy.r2.failures.put=10;await run(lastCopy);assert.ok(lastCopy.r2.values.has(oldKey));assert.equal(lastCopy.r2.calls.delete,0);
 // Real valid synthetic artifacts across ten dates: retain precisely seven days.
 const sevenDays=setup(),expectedKeys=[];
 for(let age=1;age<=9;age++){
  const day=backupDay(scheduled-age*86400000),dailyKey='fleet/v1/staging/'+day+'.json';
  sevenDays.r2.values.set(dailyKey,JSON.stringify(await automaticBackupArtifact(state,4,'staging',day,new Date(scheduled-age*86400000).toISOString())));
  if(age<=6)expectedKeys.push(dailyKey);
 }
 assert.equal((await run(sevenDays)).state,'success');
 assert.deepEqual([...sevenDays.r2.values.keys()].sort(),[key,...expectedKeys].sort());
 for(const [dailyKey,text] of sevenDays.r2.values)await inspectAutomaticBackup(text,'staging',dailyKey.slice(-15,-5));
 const deleteFail=setup();deleteFail.r2.values.set(oldKey,'old');deleteFail.r2.failures.delete=10;assert.equal((await run(deleteFail)).code,'RETENTION_FAILED');assert.ok(deleteFail.r2.values.has(key));assert.equal((await automaticBackupStatus(deleteFail.env)).lastSuccess.date,date);
 const listFail=setup();listFail.r2.failures.list=10;assert.equal((await run(listFail)).code,'RETENTION_FAILED');assert.ok(listFail.r2.values.has(key));
 // After a failed job, next attempt reuses its immutable object and can complete retention.
 listFail.r2.failures.list=0;assert.equal((await run(listFail)).state,'success');assert.equal(listFail.r2.calls.put,1);

 const target=database('demo',false);const restored=await restoreAutomaticBackupToStaging(target.db,original,'staging');assert.equal(restored.counts.trips,1);const targetState=JSON.parse(target.sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);assert.notEqual(targetState.sessionKey,state.sessionKey);assert.deepEqual({...targetState,sessionKey:''},{...state,sessionKey:''});
 await assert.rejects(restoreAutomaticBackupToStaging(target.db,original,'staging'),/RESTORE_TARGET_NOT_EMPTY/);
 const prodTarget=database('production',false);await assert.rejects(restoreAutomaticBackupToStaging(prodTarget.db,original,'staging'),/ENVIRONMENT_MISMATCH/);assert.equal(prodTarget.sql.prepare("SELECT * FROM fleet_store WHERE id='main'").get(),undefined);
 const prodSource=JSON.stringify(await automaticBackupArtifact(state,6,'production',date,new Date(scheduled).toISOString()));const fromProd=database('demo',false);await restoreAutomaticBackupToStaging(fromProd.db,prodSource,'staging');assert.equal(JSON.parse(fromProd.sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload).trips.length,1);
 await assert.rejects(restoreAutomaticBackupToStaging(database('demo',false).db,original,'production'),/RESTORE_TARGET_INVALID/);
 const corruptTarget=database('demo',false);await assert.rejects(restoreAutomaticBackupToStaging(corruptTarget.db,'bad','staging'),/INTEGRITY_FAILED/);assert.equal(corruptTarget.sql.prepare("SELECT * FROM fleet_store WHERE id='main'").get(),undefined);
 const temp=await mkdtemp(join(tmpdir(),'fleet-auto #%-'));
 try{const file=join(temp,'synthetic.json');await writeFile(file,original);const rehearsal=spawnSync(process.execPath,['--experimental-sqlite','scripts/rehearse-auto-restore.mjs',file],{encoding:'utf8'});assert.equal(rehearsal.status,0,rehearsal.stderr);assert.match(rehearsal.stdout,/PASS offline/);assert.ok(!rehearsal.stdout.includes('PRIVATE_'));}finally{await rm(temp,{recursive:true,force:true});}

 // Scheduled D1 is mandatory. Keep R2 helper/status compatibility tested offline explicitly.
 await assert.rejects(production.scheduled({cron:BACKUP_CRON,scheduledTime:Date.now()},{}),/AUTOMATIC_BACKUP_FAILED:D1_BACKUP_CONFIGURATION/);
 const productionMock=setup({marker:'production'});await assert.rejects(production.scheduled({cron:BACKUP_CRON,scheduledTime:Date.now()},{...productionMock.env,BACKUP_ENVIRONMENT:'production',BACKUP_NOTIFICATION_URL:undefined}),/AUTOMATIC_BACKUP_FAILED:D1_BACKUP_CONFIGURATION/);assert.equal(productionMock.r2.values.size,0);
 const live=setup();const liveEnv={...live.env,DEMO_DB:live.db,APP_PASSWORD:'synthetic-password'};delete liveEnv.DB;
 const now=Date.now();await assert.rejects(demo.scheduled({cron:BACKUP_CRON,scheduledTime:now},liveEnv),/AUTOMATIC_BACKUP_FAILED:D1_BACKUP_CONFIGURATION/);assert.equal(live.r2.values.size,0);assert.equal((await runAutomaticBackup(live.env,now,{...live.deps,now:()=>now})).state,'success');assert.ok(live.r2.values.has('fleet/v1/staging/'+backupDay(now)+'.json'));
 const request=(path,opts={},cookie='')=>demo.fetch(new Request('https://fleet.test'+path,{...opts,headers:{origin:'https://fleet.test','CF-Connecting-IP':'192.0.2.123',...(cookie?{cookie}:{}),...opts.headers}}),liveEnv);
 assert.equal((await request('/api/backup-status')).status,401);
 let response=await request('/login',{method:'POST',body:new URLSearchParams({username:'admin',password:liveEnv.APP_PASSWORD})});const admin=response.headers.get('set-cookie').split(';')[0];
 response=await request('/api/backup-status',{},admin);assert.equal(response.status,503);assert.equal((await response.json()).error,'BACKUP_STATUS_UNAVAILABLE');assert.equal((await automaticBackupStatus(live.env)).state,'success');
 response=await request('/register',{method:'POST',body:new URLSearchParams({name:'Other Synthetic',username:'another',password:'abcdef'})});const employee=response.headers.get('set-cookie').split(';')[0];assert.equal((await request('/api/backup-status',{},employee)).status,403);
 const broken=setup();delete broken.env.BACKUP_BUCKET;await assert.rejects(demo.scheduled({cron:BACKUP_CRON,scheduledTime:now},{...broken.env,DEMO_DB:broken.db,BACKUP_NOTIFICATION_URL:undefined}),/AUTOMATIC_BACKUP_FAILED/);
 console.log('PASS automatic backups: UTC/Bangkok day, default-off/env guards, full state and metadata SHA-256, immutable daily idempotency, concurrent/expired/stolen leases, transient/ambiguous/storage/network failures, redacted notifications/status, paginated 7-day retention and last-valid-copy protection, empty-staging-only restore/session rotation, offline rehearsal, scheduled binding integration and admin authorization');
}finally{for(const sql of databases)sql.close();}
