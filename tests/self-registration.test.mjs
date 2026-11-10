import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {readFile,writeFile,mkdtemp,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import worker from '../output/worker-demo.js';
import {fixture} from './fixtures/role-compatibility.mjs';
const compiled=await build({stdin:{contents:`export {issueSession,checkLogin,sessionUser,currentUser} from './src/auth';
export {assertOperationalAccounts,operationalAccountsSql,accountEnabled} from './src/account-compatibility';
export {createBackup,inspectBackup,backupDigest} from './src/backup';export {automaticBackupArtifact,restoreAutomaticBackupToStaging} from './src/automatic-backup';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',define:{__FLEET_ENV__:'"demo"'}});
const A=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const dbs=[],savedFetch=globalThis.fetch,savedError=console.error;let network=0,cases=0;
globalThis.fetch=()=>{network++;throw Error('EXTERNAL_NETWORK_FORBIDDEN');};console.error=()=>{};
const clone=structuredClone,form=data=>({method:'POST',body:new URLSearchParams(data)}),cookie=r=>r.headers.get('set-cookie')?.split(';')[0];
const signup={name:'PRIVATE PERSON 1',username:'new.user',password:'abc123'};
const test=async fn=>{await fn();cases++;};
function setup(main=true){
 const sql=new DatabaseSync(':memory:');dbs.push(sql);sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0); CREATE TABLE sentinel(value TEXT); INSERT INTO sentinel VALUES (\'preserve\')');
 sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('environment','demo');
 sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('trip-operation:v1:retain','{"retain":"original"}');
 if(main)sql.prepare('INSERT INTO fleet_store VALUES (?,?,7)').run('main',JSON.stringify(fixture().fleet));
 const stats={batches:0,writes:0};
 const db={prepare(q){const stmt=sql.prepare(q);let args=[];return{bind(...values){args=values;return this;},first:async()=>stmt.get(...args)||null,
  run:async()=>{stats.writes++;return{success:true,meta:{changes:Number(stmt.run(...args).changes)}};},execute(){return /^SELECT/.test(q)?{success:true,meta:{changes:0},results:stmt.all(...args)}:{success:true,meta:{changes:Number(stmt.run(...args).changes)}};}};},async batch(statements){stats.batches++;sql.exec('BEGIN IMMEDIATE');try{const rs=statements.map(s=>s.execute());sql.exec('COMMIT');return rs;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const env={APP_PASSWORD:'synthetic-root-password',DB:db,DEMO_DB:db};let ip=0;
 const req=(path,opt={},session='')=>worker.fetch(new Request('https://self.test'+path,{...opt,headers:{origin:'https://self.test','CF-Connecting-IP':'192.0.2.'+(++ip),...(session?{cookie:session}:{}),...opt.headers}}),env);
 const state=()=>JSON.parse(sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);
 const rows=()=>sql.prepare('SELECT * FROM fleet_store ORDER BY id').all();
 const snapshot=()=>({schema:sql.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY name').all(),rows:rows(),sentinel:sql.prepare('SELECT * FROM sentinel').all()});
 const root=async()=>cookie(await req('/login',form({username:'admin',password:env.APP_PASSWORD})));
 const get=session=>req('/api/fleet',{},session).then(r=>r.json());
 const post=(session,action,data,version)=>req('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data,version})},session);
 return{sql,db,env,stats,req,state,rows,snapshot,root,get,post};
}
async function registered(input=signup){const d=setup(),before=d.state(),r=await d.req('/register',form(input));assert.equal(r.status,303);const session=cookie(r),view=await d.get(session);return{...d,before,session,view,r};}
try{
 await test(async()=>{
  const d=await registered(),s=d.state(),a=s.accounts.at(-1);assert.equal(d.r.headers.get('location'),'/');
  assert.match(d.r.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Lax/);
  assert.deepEqual({role:a.role,kind:a.accountKind,version:a.accountFormatVersion,status:a.status,driverId:a.driverId,active:a.active},{role:'user',kind:'self-user',version:3,status:'ACTIVE',driverId:null,active:false});
  assert.equal(s.accountFormatVersion,3);assert.equal(a.passwordHash.length,64);assert.notEqual(a.passwordHash,signup.password);
  for(const field of ['cars','people','trips','maintenancePlans','maintenanceHistory','projects'])assert.deepEqual(s[field],d.before[field]);
  assert.deepEqual(s.accounts.slice(0,-1),d.before.accounts);assert.deepEqual(s.audit.slice(1),d.before.audit);
  assert.equal(d.view.scope,'self-account');assert.equal(d.view.user.role,'user');assert.equal(d.view.personLinked,false);
  assert.deepEqual(Object.keys(d.view).sort(),['scope','user','actor','personLinked'].sort());
  assert.ok(!JSON.stringify(d.view).includes('PRIVATE PROJECT'));assert.ok(!JSON.stringify(d.view).includes('passwordHash'));assert.ok(!JSON.stringify(d.view).includes('sessionKey'));
  assert.equal(d.rows().find(r=>r.id==='trip-operation:v1:retain').payload,'{"retain":"original"}');
 });
 for(const role of ['admin','staff','employee','user','root'])await test(async()=>{
  const d=await registered({...signup,role,active:'true',status:'APPROVED',driverId:'p1',personId:'p1',employeeId:'p1',accountFormatVersion:'1'});
  assert.equal(d.view.user.role,'user');assert.equal(d.state().accounts.at(-1).driverId,null);assert.equal(d.state().accounts.at(-1).active,false);
 });
 for(const password of ['','12345','x'.repeat(129)])await test(async()=>{const d=setup(),before=d.state();assert.equal((await d.req('/register',form({...signup,password}))).status,400);assert.deepEqual(d.state(),before);});
 for(const password of ['123456','x'.repeat(128)])await test(async()=>{const d=await registered({...signup,password});assert.equal((await d.req('/login',form({username:signup.username,password}))).status,303);});
 for(const name of ['PRIVATE PERSON 1','SAME DISPLAY NAME'])await test(async()=>{const d=await registered({...signup,name});assert.deepEqual(d.state().people,d.before.people);assert.equal(d.state().accounts.at(-1).driverId,null);});
 await test(async()=>{
  const d=await registered(),before=d.state();assert.equal((await d.req('/register',form({...signup,name:'Different',username:'NEW.USER'}))).status,400);
  assert.equal((await d.req('/register',form({...signup,username:'other-user'}))).status,400);assert.deepEqual(d.state(),before);
 });
 await test(async()=>{
  const d=setup(),before=d.state(),rs=await Promise.all([d.req('/register',form(signup)),d.req('/register',form({...signup,name:'Different'}))]);
  assert.deepEqual(rs.map(r=>r.status).sort(),[303,400]);assert.equal(d.state().accounts.length,before.accounts.length+1);assert.deepEqual(d.state().people,before.people);assert.deepEqual(d.state().trips,before.trips);
 });
 await test(async()=>{
  const d=setup(),before=d.state(),rs=await Promise.all([d.req('/register',form(signup)),d.req('/register',form({...signup,name:'Another name',username:'another.user'}))]);
  assert.deepEqual(rs.map(r=>r.status),[303,303]);assert.equal(d.state().accounts.length,before.accounts.length+2);assert.deepEqual(d.state().people,before.people);
 });
 for(const returnTo of ['/?car=c1&action=start','/qr','https://evil.invalid','//evil.invalid'])await test(async()=>{
  const d=await registered({...signup,returnTo});assert.equal(d.r.headers.get('location'),'/');const login=await d.req('/login',form({username:signup.username,password:signup.password,returnTo}));assert.equal(login.headers.get('location'),'/');
 });
 const forbidden=['/api/backup.sql','/api/backup.json','/api/backup-status','/api/system-status','/api/fuel-price?month=2026-11','/qr','/report-font-regular.ttf','/vehicle-revo-canopy.webp'];
 for(const path of forbidden)await test(async()=>{const d=await registered(),before=d.snapshot();assert.equal((await d.req(path,{},d.session)).status,403);assert.deepEqual(d.snapshot(),before);});
 for(const action of ['trip','account','person','car','project','maintenance','import','importExcel','fuelPrice'])await test(async()=>{
  const d=await registered(),before=d.snapshot();const r=await d.req('/api/fleet',{method:'POST',body:JSON.stringify({action,version:8,data:{id:'t2',carId:'c1',driverId:'p1',end:'2026-11-05T11:00',odoEnd:120},tripOperation:{id:crypto.randomUUID(),kind:'return'}})},d.session);
  assert.equal(r.status,403);assert.equal((await r.json()).code,'PERSON_LINK_REQUIRED');assert.deepEqual(d.snapshot(),before);assert.equal(d.stats.batches,0);
 });
 await test(async()=>{
  const d=await registered();assert.equal((await d.req('/login',form({username:signup.username,password:'wrong12'}))).status,401);
  const r=await d.req('/api/profile/password',{method:'POST',body:JSON.stringify({currentPassword:signup.password,password:'new123'})},d.session);assert.equal(r.status,200);
  assert.match(r.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await d.req('/api/fleet',{},d.session)).status,401);
  assert.equal((await d.req('/login',form({username:signup.username,password:signup.password}))).status,401);assert.equal((await d.req('/login',form({username:signup.username,password:'new123'}))).status,303);
  assert.equal(d.state().accounts.at(-1).driverId,null);assert.deepEqual(d.state().people,d.before.people);
 });
 for(const status of ['DISABLED','REJECTED'])await test(async()=>{
  const d=await registered(),s=d.state();s.accounts.at(-1).status=status;s.accounts.at(-1).passwordVersion++;
  d.sql.prepare("UPDATE fleet_store SET payload=?,version=version+1 WHERE id='main'").run(JSON.stringify(s));const before=d.snapshot();
  assert.equal((await d.req('/api/fleet',{},d.session)).status,401);assert.equal((await d.req('/login',form({username:signup.username,password:signup.password}))).status,401);
  assert.deepEqual(d.state(),s); // only auth rate-limit rows may change, no business state
  assert.equal(d.rows().find(r=>r.id==='trip-operation:v1:retain').payload,before.rows.find(r=>r.id==='trip-operation:v1:retain').payload);
 });
 await test(async()=>{
  const d=await registered(),root=await d.root();let admin=await d.get(root),a=d.state().accounts.at(-1);
  assert.equal(admin.members.at(-1).role,'user');assert.equal(admin.members.at(-1).active,true);
  let r=await d.post(root,'account',{id:a.id,operation:'active',active:false},admin.version);assert.equal(r.status,200);admin=await r.json();
  assert.equal((await d.req('/api/fleet',{},d.session)).status,401);r=await d.post(root,'account',{id:a.id,operation:'active',active:true},admin.version);assert.equal(r.status,200);admin=await r.json();
  assert.equal((await d.req('/api/fleet',{},d.session)).status,401);assert.equal(d.state().accounts.at(-1).active,false);assert.equal(d.state().accounts.at(-1).status,'ACTIVE');
  for(const role of ['admin','staff','employee','user']){const before=d.state();assert.equal((await d.post(root,'account',{id:a.id,operation:'edit',role,name:a.name,username:a.username},admin.version)).status,400);assert.deepEqual(d.state(),before);}
  r=await d.post(root,'account',{id:a.id,operation:'resetPassword',password:'reset6'},admin.version);assert.equal(r.status,200);
  assert.equal((await d.req('/login',form({username:signup.username,password:'reset6'}))).status,303);
 });
 await test(async()=>{
  const d=await registered(),before=d.state(),b=await A.createBackup(before,'synthetic','demo');assert.equal(b.schemaVersion,2);assert.equal((await A.inspectBackup(JSON.stringify(b))).accounts,before.accounts.length);
  assert.equal((await A.createBackup(d.before,'synthetic','demo')).schemaVersion,1);
  await assert.rejects(()=>A.inspectBackup(JSON.stringify({...b,schemaVersion:1})));await assert.rejects(()=>A.inspectBackup(JSON.stringify({exportedAt:b.exportedAt,state:before})));
  const root=await d.root(),sqlText=await(await d.req('/api/backup.sql',{},root)).text(),target=setup(false);target.sql.exec(sqlText);
  const restored=target.state();assert.notEqual(restored.sessionKey,before.sessionKey);assert.deepEqual({...restored,sessionKey:''},{...before,sessionKey:''});assert.equal(restored.accounts.at(-1).driverId,null);
  const artifact=await A.automaticBackupArtifact(before,8,'staging','2026-11-10','2026-11-10T00:00:00Z'),target2=setup(false);
  await A.restoreAutomaticBackupToStaging(target2.db,JSON.stringify(artifact),'staging');assert.deepEqual({...target2.state(),sessionKey:''},{...before,sessionKey:''});assert.equal((await target2.req('/api/fleet',{},d.session)).status,401);
 });
 await test(async()=>{
  const d=setup(),root=await d.root(),current=await(await d.req('/api/backup.sql',{},root)).text();
  const guard=`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fleet_store WHERE id='main' AND NOT (${A.operationalAccountsSql('payload')})) THEN 1 ELSE json('ACCOUNT_FORMAT_UNSUPPORTED') END`;
  const old=(await readFile('tests/fixtures/account-guard-v1.txt','utf8')).trimEnd();assert.ok(current.includes(guard));
  const dir=await mkdtemp(join(tmpdir(),'fleet-v1-backup-')),path=join(dir,'synthetic.sql');
  try{await writeFile(path,current.replace(guard,old));let r=spawnSync(process.execPath,['--experimental-sqlite','scripts/check-sql-backup.mjs',path],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
   await writeFile(path,current.replace(guard,old.replace('THEN 1','THEN 0')));r=spawnSync(process.execPath,['--experimental-sqlite','scripts/check-sql-backup.mjs',path],{encoding:'utf8'});assert.equal(r.status,1);
  }finally{await unlink(path).catch(()=>{});await rmdir(dir);}
 });
 const mutations=[a=>a.role='admin',a=>a.role='staff',a=>a.role='employee',a=>a.active=true,a=>a.driverId='p1',a=>a.personId='p1',a=>a.status='PENDING',a=>a.status='APPROVED',a=>a.accountFormatVersion=2,a=>delete a.accountKind];
 for(const mutate of mutations)await test(async()=>{
  const d=await registered(),s=d.state(),b=await A.createBackup(s,'synthetic','demo');mutate(s.accounts.at(-1));const before=d.snapshot();
  assert.throws(()=>A.assertOperationalAccounts(s));b.state=s;b.sha256=await A.backupDigest(s);await assert.rejects(()=>A.inspectBackup(JSON.stringify(b)));assert.deepEqual(d.snapshot(),before);
  assert.equal(d.sql.prepare('WITH x(payload)AS(VALUES(?)) SELECT '+A.operationalAccountsSql('payload')+' AS valid FROM x').get(JSON.stringify(s)).valid,0);
  const valid=d.state();mutate(valid.accounts.at(-1));d.sql.prepare("UPDATE fleet_store SET payload=? WHERE id='main'").run(JSON.stringify(valid));const invalid=d.snapshot();assert.equal((await d.req('/api/fleet',{},d.session)).status,503);assert.deepEqual(d.snapshot(),invalid);
 });
 for(const status of ['ACTIVE','DISABLED','REJECTED'])await test(async()=>{
  const d=await registered(),s=d.state();s.accounts.at(-1).status=status;A.assertOperationalAccounts(s);
  const q=d.sql.prepare('WITH x(payload)AS(VALUES(?)) SELECT '+A.operationalAccountsSql('payload')+' AS valid FROM x');assert.equal(q.get(JSON.stringify(s)).valid,1);
 });
 await test(async()=>{
  const d=await registered(),a=d.state().accounts.at(-1);
  // Pre-gate login/session reader required active=true. New self records deliberately fail it.
  assert.equal(a.active,false);assert.equal(Boolean(a.active&&a.passwordVersion===0),false);
  const b=await A.createBackup(d.state(),'synthetic','demo');assert.notEqual(b.schemaVersion,1); // old JSON inspector refuses version2
 });
 await test(async()=>{
  const d=await registered(),second=await d.req('/register',form({...signup,name:'Another User',username:'another.user'})),other=await d.get(cookie(second));
  assert.notEqual(other.user.id,d.view.user.id);assert.equal(other.scope,'self-account');assert.equal(other.state,undefined);
  const s=d.state();s.trips[0].ownerUserId=d.view.user.id;d.sql.prepare("UPDATE fleet_store SET payload=? WHERE id='main'").run(JSON.stringify(s));
  const view=await d.get(d.session);assert.equal(view.state,undefined);assert.equal(view.personLinked,false);
  const parts=d.session.split('.');parts[0]=parts[0].replace(/=.+$/,'='+btoa(JSON.stringify({uid:'admin',ver:0,exp:Math.floor(Date.now()/1000)+3600,nonce:'forged'})));assert.equal((await d.req('/api/fleet',{},parts.join('.'))).status,401);
 });
 await test(async()=>{
  const d=setup(),legacy=fixture().fleet.accounts[1],oldCookie=(await A.issueSession(d.env,d.state(),{...legacy,role:'employee'})).split(';')[0];
  const before=d.state();await d.req('/register',form(signup));assert.equal((await d.req('/api/fleet',{},oldCookie)).status,200);
  const t={...before.trips[1],end:'2026-11-05T11:00',odoEnd:120},op={id:crypto.randomUUID(),kind:'return'},version=(await d.get(oldCookie)).version;
  const send=()=>d.req('/api/fleet',{method:'POST',body:JSON.stringify({action:'trip',version,data:t,tripOperation:op})},oldCookie);
  const rs=await Promise.all([send(),send()]);assert.deepEqual(rs.map(r=>r.status),[200,200]);const bodies=await Promise.all(rs.map(r=>r.json()));assert.deepEqual(bodies[0].tripReceipt,bodies[1].tripReceipt);
  const committed=d.snapshot();assert.equal((await send()).status,200);assert.deepEqual(d.snapshot(),committed);assert.deepEqual(d.state().accounts.slice(0,-1),before.accounts);
 });
 await test(()=>assert.equal(network,0));
 console.log('PASS self-registration v1.1: '+cases+' cases, immediate unlinked User/self-only DTO, no Person claim/promotion, credentials/sessions/revocation, versioned backup/SQL parity/restore, legacy preservation and keyed replay; synthetic offline only');
}finally{globalThis.fetch=savedFetch;console.error=savedError;for(const d of dbs)d.close();}
