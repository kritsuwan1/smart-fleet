import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import worker from '../output/worker-demo.js';
import {fixture} from './fixtures/role-compatibility.mjs';
const built=await build({stdin:{contents:`export * from './src/account-compatibility';
export {readState,writeState,writeTripOperation} from './src/storage';
export {checkLogin,currentUser,issueSession,sessionUser,viewForUser,hashPassword} from './src/auth';
export {createBackup,inspectBackup,backupDigest} from './src/backup';
export {automaticBackupArtifact,restoreAutomaticBackupToStaging} from './src/automatic-backup';
export {fleetApi} from './src/api';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',define:{__FLEET_ENV__:'"demo"'}});
const A=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=operational-account-guards.mjs').toString('base64'));
const clone=structuredClone, databases=[];
let cases=0, network=0, errors=[];
const savedFetch=globalThis.fetch,savedError=console.error;
globalThis.fetch=()=>{network++;throw Error('NETWORK_FORBIDDEN');};console.error=(...args)=>errors.push(args.map(x=>x instanceof Error?x.message:String(x)).join(' '));
const password='synthetic-password-only',salt='synthetic-salt',hash=await A.hashPassword(password,salt);
const base=()=>{const s=fixture().fleet;for(const a of s.accounts){a.salt=salt;a.passwordHash=hash;}return JSON.parse(JSON.stringify(s));};
const root={id:'admin',role:'admin',username:'admin',name:'Synthetic Root',driverId:'',passwordVersion:0};
const user=s=>({...s.accounts[1]});
const test=async fn=>{await fn();cases++;};
function setup(state=base(),main=true){
 const sql=new DatabaseSync(':memory:');databases.push(sql);
 sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0); CREATE TABLE sentinel(id TEXT PRIMARY KEY,value TEXT)');
 sql.prepare('INSERT INTO sentinel VALUES (?,?)').run('retain','unrelated fixture');
 sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('environment','demo');
 sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('trip-operation:v1:sentinel',JSON.stringify({preserve:'original-ledger'}));
 if(main)sql.prepare('INSERT INTO fleet_store VALUES (?,?,7)').run('main',JSON.stringify(state));
 const calls={run:0,batch:0,ackLost:false,beforeRun:null};
 const db={prepare(q){const stmt=sql.prepare(q);let args=[];return{bind(...a){args=a;return this;},first:async()=>stmt.get(...args)||null,
  run:async()=>{calls.run++;if(calls.beforeRun){const hook=calls.beforeRun;calls.beforeRun=null;hook();}return{success:true,meta:{changes:Number(stmt.run(...args).changes)}};},
  execute(){return /^SELECT/.test(q)?{success:true,meta:{changes:0},results:stmt.all(...args)}:{success:true,meta:{changes:Number(stmt.run(...args).changes)}};}};},
  async batch(statements){calls.batch++;sql.exec('BEGIN IMMEDIATE');let result;try{result=statements.map(s=>s.execute());sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}if(calls.ackLost)throw Error('synthetic committed acknowledgement loss');return result;}};
 const env={APP_PASSWORD:password,DB:db,DEMO_DB:db};
 const snapshot=()=>({schema:sql.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY name').all(),rows:sql.prepare('SELECT * FROM fleet_store ORDER BY id').all(),sentinel:sql.prepare('SELECT * FROM sentinel').all()});
 const raw=()=>sql.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").get();
 const replace=s=>sql.prepare("UPDATE fleet_store SET payload=? WHERE id='main'").run(JSON.stringify(s));
 const request=(path,cookie='',options={})=>worker.fetch(new Request('https://synthetic.invalid'+path,{...options,headers:{origin:'https://synthetic.invalid','CF-Connecting-IP':'192.0.2.77',...(cookie?{cookie}:{}),...options.headers}}),env);
 const post=(data,operation,version=7,who=user(state))=>A.fleetApi(env,who).POST(new Request('https://synthetic.invalid/api/fleet',{method:'POST',headers:{origin:'https://synthetic.invalid'},body:JSON.stringify({action:'trip',data,version,tripOperation:operation})}));
 return{sql,db,calls,env,snapshot,raw,replace,request,post};
}
const invalid=[
 ...['staff','user','legacy-employee','owner','',null,0,false,{},[]].map(role=>s=>s.accounts[1].role=role),
 ...A.accountSecurityFields.map(k=>s=>s.accounts[1][k]=k==='status'?'PENDING':2),
 ...A.stateSecurityFields.map(k=>s=>s[k]='unsupported'),
 ...[2,0,null,'1',true,{},[]].map(v=>s=>s.accountFormatVersion=v),
 ...['PENDING','APPROVED','REJECTED','DISABLED'].map(v=>s=>s.accounts[1].status=v),
 ...[-1,1.5,'3',null,9007199254740992].map(v=>s=>s.accounts[1].passwordVersion=v),
 s=>s.accounts[1].active='true',s=>delete s.accounts[1].active,s=>s.accounts[1].id='admin',s=>s.accounts[1].username='admin',
 s=>s.accounts[1].driverId='missing',s=>s.accounts[1].salt=null,s=>s.accounts[1].passwordHash='',
 s=>s.accounts.push(clone(s.accounts[1])),s=>s.accounts[1].username=s.accounts[0].username,
 s=>s.accounts={},s=>s.sessionKey=null,s=>s.sessionKey='',s=>s.people=['bad'],s=>delete s.trips
];
try{
 const sql=new DatabaseSync(':memory:');databases.push(sql);
 function sqlAccept(s){try{return sql.prepare('WITH sample(payload) AS(VALUES(?)) SELECT '+A.operationalAccountsSql('payload')+' AS valid FROM sample').get(JSON.stringify(s)).valid===1;}catch{return false;}}
 for(const mutate of invalid)await test(()=>{
  const s=base();mutate(s);const before=clone(s);assert.throws(()=>A.assertOperationalAccounts(s),/ACCOUNT_FORMAT_UNSUPPORTED/);assert.deepEqual(s,before);assert.equal(sqlAccept(s),false);
 });
 for(const mutate of [()=>{},s=>delete s.accounts[1].role,s=>s.accounts[1].role='admin',s=>s.accounts[1].active=false,
  s=>delete s.accounts,s=>delete s.sessionKey,s=>s.accountFormatVersion=1,s=>s.extra={preserve:true},s=>s.accounts[1].passwordVersion=0])await test(()=>{
  const s=base();mutate(s);const before=clone(s);A.assertOperationalAccounts(s);assert.equal(sqlAccept(s),true);assert.deepEqual(s,before);
 });
 for(const role of ['admin','staff','user','legacy-employee'])for(const status of ['PENDING','APPROVED','REJECTED','DISABLED'])await test(()=>{
  const metadata={accountFormatVersion:2,role,status,personId:status==='APPROVED'?'p4':null,accessRevision:0};
  assert.deepEqual(A.inspectFutureAccountMetadata(metadata),metadata);
  const s=base();s.accounts[1]={...s.accounts[1],...metadata};assert.throws(()=>A.assertOperationalAccounts(s));assert.equal(sqlAccept(s),false);
 });
 await test(()=>{assert.throws(()=>A.inspectFutureAccountMetadata({accountFormatVersion:2,role:'user',status:'APPROVED',personId:null,accessRevision:0}));
  assert.throws(()=>A.inspectFutureAccountMetadata({accountFormatVersion:2,role:'unknown',status:'PENDING',personId:null,accessRevision:0}));});
 // Invalid records with no session key must be refused before lazy initialization/rate-limit writes.
 for(const mutate of invalid.filter((_,i)=>i%4===0))await test(async()=>{
  const s=base();delete s.sessionKey;mutate(s);const d=setup(s),before=d.snapshot();
  await assert.rejects(()=>A.readState(d.env));assert.equal(d.calls.run,0);assert.deepEqual(d.snapshot(),before);
  assert.equal((await A.fleetApi(d.env,root).GET()).status,503);
  const r=await d.request('/login','',{method:'POST',body:new URLSearchParams({username:'admin',password})});
  assert.equal(r.status,503);assert.equal(d.calls.run,0);assert.deepEqual(d.snapshot(),before);
 });
 await test(async()=>{const s=base(),d=setup(s),before=d.snapshot();assert.deepEqual((await A.readState(d.env)).state,s);assert.deepEqual(d.snapshot(),before);assert.equal(d.calls.run,0);});
 await test(async()=>{const s=base();delete s.sessionKey;const d=setup(s),ledger=d.snapshot().rows.filter(x=>x.id!=='main');const r=await A.readState(d.env);
  assert.equal(typeof r.state.sessionKey,'string');assert.deepEqual({...r.state,sessionKey:undefined},{...s,sessionKey:undefined});
  assert.deepEqual(d.snapshot().rows.filter(x=>x.id!=='main'),ledger);assert.equal(r.version,8);});
 await test(async()=>{const s=base();delete s.sessionKey;const d=setup(s);d.calls.beforeRun=()=>{const changed=clone(s);changed.accounts[1].role='staff';d.sql.prepare("UPDATE fleet_store SET payload=?,version=8 WHERE id='main'").run(JSON.stringify(changed));};
  await assert.rejects(()=>A.readState(d.env));assert.equal(d.raw().version,8);assert.equal(JSON.parse(d.raw().payload).sessionKey,undefined);});
 for(const status of ['PENDING','REJECTED','DISABLED'])await test(async()=>{
  const s=base(),d=setup(s),who=user(s),cookie=(await A.issueSession(d.env,s,who)).split(';')[0];
  s.accounts[1].status=status;d.replace(s);const before=d.snapshot();
  await assert.rejects(()=>A.checkLogin(d.env,who.username,password,s));await assert.rejects(()=>A.checkLogin(d.env,'admin',password,s));
  await assert.rejects(()=>A.issueSession(d.env,s,who));assert.equal(await A.sessionUser(new Request('https://synthetic.invalid',{headers:{cookie}}),d.env,s),null);
  assert.throws(()=>A.currentUser(who,s));assert.throws(()=>A.viewForUser(s,7,who));
  for(const path of ['/','/api/fleet','/api/backup.sql','/api/backup.json','/api/system-status','/api/backup-status','/api/fuel-price?month=2026-11','/app.js']){
   const r=await d.request(path,cookie);assert.equal(r.status,503);assert.ok(!(await r.text()).includes('PRIVATE'));
  }
  const r=await d.request('/api/fleet',cookie,{method:'POST',body:JSON.stringify({action:'account',version:7,data:{id:who.id,operation:'active',active:true}})});assert.equal(r.status,503);
  assert.equal((await d.request('/register','',{method:'POST',body:new URLSearchParams({name:'SYNTHETIC APPLICANT',username:'applicant',password})})).status,503);
  assert.deepEqual(d.snapshot(),before);assert.equal(d.calls.run,0);assert.equal(d.calls.batch,0);
 });
 await test(async()=>{const s=base(),d=setup(s),who=user(s),cookie=(await A.issueSession(d.env,s,who)).split(';')[0];s.accounts[1].active=false;d.replace(s);
  const before=d.snapshot();assert.equal(await A.checkLogin(d.env,who.username,password,s),null);assert.equal((await d.request('/api/fleet',cookie)).status,401);assert.deepEqual(d.snapshot(),before);
  assert.equal((await A.checkLogin(d.env,'admin',password,s)).role,'admin');});
 await test(async()=>{const d=setup();d.sql.prepare("UPDATE fleet_store SET payload=? WHERE id='main'").run('{"PRIVATE_SECRET_FRAGMENT');const before=d.snapshot();
  await assert.rejects(()=>A.readState(d.env),/^Error: ACCOUNT_FORMAT_UNSUPPORTED$/);
  const r=await A.fleetApi(d.env,root).GET();assert.equal(r.status,503);assert.ok(!(await r.text()).includes('PRIVATE_SECRET_FRAGMENT'));assert.deepEqual(d.snapshot(),before);assert.equal(d.calls.run,0);
 });
 for(const missingRole of [false,true])await test(async()=>{
  const s=base();if(missingRole)delete s.accounts[1].role;const d=setup(s),who=user(s),before=d.snapshot();
  const login=await A.checkLogin(d.env,who.username,password,s);assert.equal(login.role,'employee');
  const cookie=(await A.issueSession(d.env,s,login)).split(';')[0],r=await d.request('/api/fleet',cookie);assert.equal(r.status,200);
  const body=await r.json();assert.equal(body.user.role,'employee');assert.deepEqual(body.state.trips,s.trips.filter(t=>t.ownerUserId===who.id));
  assert.equal(body.state.maintenanceHistory,undefined);assert.equal(body.state.maintenancePlans.length,1);assert.deepEqual(body.members,[]);assert.deepEqual(d.snapshot(),before);
 });
 for(const method of ['writeState','writeTripOperation'])await test(async()=>{
  const s=base(),d=setup(),before=d.snapshot();s.accounts[1].role='staff';
  await assert.rejects(()=>A[method](d.env,s,7,'unused',{}));assert.equal(d.calls.run,0);assert.equal(d.calls.batch,0);assert.deepEqual(d.snapshot(),before);
  d.replace(s);const invalidBefore=d.snapshot();await assert.rejects(()=>A[method](d.env,base(),7,'unused',{}));assert.deepEqual(d.snapshot(),invalidBefore);
 });
 await test(async()=>{const d=setup(),s=base();d.calls.beforeRun=()=>{const next=base();next.accounts[1].role='staff';d.sql.prepare("UPDATE fleet_store SET payload=?,version=8 WHERE id='main'").run(JSON.stringify(next));};
  assert.equal(await A.writeState(d.env,s,7),false);assert.equal(d.raw().version,8);assert.equal(JSON.parse(d.raw().payload).accounts[1].role,'staff');});
 for(const mutate of invalid.filter((_,i)=>i%3===0))await test(async()=>{
  const s=base(),d=setup(),before=d.snapshot(),b=await A.createBackup(s,'synthetic','demo');mutate(s);
  await assert.rejects(()=>A.createBackup(s,'synthetic','demo'));
  b.state=s;b.sha256=await A.backupDigest(s);await assert.rejects(()=>A.inspectBackup(JSON.stringify(b)));
  assert.deepEqual(d.snapshot(),before);assert.equal(d.calls.run,0);
 });
 // Guarded SQL exports retain accepted valid legacy restore/rotation; invalid targets are untouched.
 const source=setup(),rootCookie=(await A.issueSession(source.env,base(),root)).split(';')[0];
 const exportResponse=await source.request('/api/backup.sql',rootCookie);assert.equal(exportResponse.status,200);const sqlText=await exportResponse.text();
 for(const mutate of invalid.filter((_,i)=>i%3===0))await test(()=>{
  const s=base();mutate(s);const d=setup(s),before=d.snapshot();assert.throws(()=>d.sql.exec(sqlText));assert.deepEqual(d.snapshot(),before);
 });
 await test(()=>{const d=setup({obsolete:true}),before=d.snapshot();assert.throws(()=>d.sql.exec(sqlText));assert.deepEqual(d.snapshot(),before);});
 await test(()=>{const d=setup(),before=d.snapshot();d.sql.exec(sqlText);const restored=JSON.parse(d.raw().payload);assert.notEqual(restored.sessionKey,base().sessionKey);
  assert.deepEqual({...restored,sessionKey:''},{...base(),sessionKey:''});assert.deepEqual(d.snapshot().rows.filter(r=>r.id.startsWith('trip-operation:')),before.rows.filter(r=>r.id.startsWith('trip-operation:')));
  A.assertOperationalAccounts(restored);});
 const artifact=await A.automaticBackupArtifact(base(),7,'staging','2026-11-05','2026-11-05T03:00:00Z');
 for(const occupied of [false,true])for(const status of ['PENDING','REJECTED','DISABLED'])await test(async()=>{
  const b=clone(artifact);b.state.accounts[1].status=status;b.metadata.stateBytes=new TextEncoder().encode(JSON.stringify(b.state)).length;b.metadata.stateSha256=await A.backupDigest(b.state);
  const {sha256,...body}=b;b.sha256=await A.backupDigest(body);const d=setup(base(),occupied),before=d.snapshot();
  await assert.rejects(()=>A.restoreAutomaticBackupToStaging(d.db,JSON.stringify(b),'staging'));assert.deepEqual(d.snapshot(),before);assert.equal(d.calls.run,0);
 });
 await test(async()=>{const d=setup(base(),false);await A.restoreAutomaticBackupToStaging(d.db,JSON.stringify(artifact),'staging');const s=JSON.parse(d.raw().payload);
  assert.notEqual(s.sessionKey,base().sessionKey);assert.deepEqual({...s,sessionKey:''},{...base(),sessionKey:''});});
 // Actual same-ID concurrent return + lost batch acknowledgement and subsequent refusal/recovery.
 await test(async()=>{
  const s=base(),d=setup(s),data={...s.trips[1],end:'2026-11-05T11:00',odoEnd:120},op={id:crypto.randomUUID(),kind:'return'};
  d.calls.ackLost=true;const rs=await Promise.all([d.post(data,op),d.post(data,op)]);assert.deepEqual(rs.map(r=>r.status),[200,200]);
  const values=await Promise.all(rs.map(r=>r.json()));assert.deepEqual(values[0].tripReceipt,values[1].tripReceipt);assert.equal(d.raw().version,8);
  const committed=JSON.parse(d.raw().payload);assert.equal(committed.audit.length,s.audit.length+1);assert.equal(committed.trips.length,s.trips.length);assert.equal(committed.trips[1].odoEnd,120);
  const before=d.snapshot();assert.equal((await d.post(data,op,8)).status,200);assert.deepEqual(d.snapshot(),before);
  assert.equal((await d.post({...data,odoEnd:121},op,8)).status,409);assert.deepEqual(d.snapshot(),before);
  committed.accounts[1].role='staff';d.replace(committed);const incompatible=d.snapshot();assert.equal((await d.post(data,op,8)).status,503);assert.deepEqual(d.snapshot(),incompatible);
  committed.accounts[1].role='employee';d.replace(committed);const repaired=d.snapshot();assert.equal((await d.post(data,op,8)).status,200);assert.deepEqual(d.snapshot(),repaired);
 });
 await test(()=>{
  const historicalRole=a=>a.role==='admin'?'admin':'employee';const s=base();s.accounts[1].role='staff';s.accounts[1].status='PENDING';
  assert.equal(historicalRole(s.accounts[1]),'employee');assert.throws(()=>A.assertOperationalAccounts(s));
  const valid=base(),before=clone(valid);A.assertOperationalAccounts(valid);assert.deepEqual(valid,before); // rollback allowed only while data stays recognized legacy
 });
 await test(()=>{assert.equal(network,0);assert.ok(errors.every(e=>!e.includes(password)&&!e.includes('PRIVATE')&&!e.includes(hash)));});
 console.log('PASS operational compatibility gates: '+cases+' cases, actual storage/auth/session/API/backup guards, JS-SQL refusal parity, future metadata disabled, strict legacy adapter, no-mutation snapshots/CAS, restore rotation and same-ID concurrent/lost-response replay; synthetic offline only');
}finally{globalThis.fetch=savedFetch;console.error=savedError;for(const sql of databases)sql.close();}
