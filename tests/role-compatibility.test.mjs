import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {fixture} from './fixtures/role-compatibility.mjs';
import * as C from '../scripts/offline-role-compatibility.mjs';
const built = await build({stdin: {contents: `export {createBackup,inspectBackup} from './src/backup';
export {currentUser,viewForUser} from './src/auth';export {maintenanceStatus} from './src/maintenance';
export {tripOperationContext,authorizeOperation} from './src/trip-operation';`, resolveDir: process.cwd()},
bundle: true, write: false, format: 'esm', platform: 'node', define: {__FLEET_ENV__: '"demo"'}});
const app = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
let cases = 0, network = 0;
const previousFetch = globalThis.fetch;
globalThis.fetch = () => { network++; throw Error('EXTERNAL_NETWORK_FORBIDDEN'); };
const stores = [];
const test = async fn => { await fn(); cases++; };
const fresh = () => { const {fleet, ledger} = fixture(); return C.migrateSnapshot(fleet, ledger); };
const store = () => { const {fleet, ledger} = fixture(), s = C.syntheticStore(fleet, ledger); stores.push(s); return s; };
const clone = structuredClone;
const at = '2026-11-05T00:00:00Z';
const inspectFleet = async fleet => app.inspectBackup(JSON.stringify(await app.createBackup(fleet,'synthetic','demo')));
function approved(role = 'user', id = 'new-user', personId = 'p4') {
  let d = C.pendingApplication(fresh(), {id, displayName: 'SAME DISPLAY NAME'});
  d = C.reviewApplication(d, 'manager', 3, id, {status: 'APPROVED', personId, identityVerified: true, at});
  if (role !== 'user') d = C.changeAccess(d, 'manager', 3, id, {role, status: 'APPROVED', at});
  return d;
}
try {
  await test(() => {
    const {fleet, ledger} = fixture(), before = clone({fleet, ledger}), d = C.migrateSnapshot(fleet, ledger);
    assert.deepEqual({fleet, ledger}, before); assert.deepEqual(d.fleet, fleet); assert.deepEqual(d.ledger, ledger);
    assert.deepEqual(d.accounts.map(a => [a.id, a.role, a.status]), [['manager','admin','APPROVED'],['employee','legacy-employee','APPROVED'],['missing-role','legacy-employee','APPROVED'],['disabled','legacy-employee','DISABLED']]);
    assert.equal(Object.hasOwn(d.fleet.accounts[2], 'role'), true); // preserves explicitly undefined in pure clone
    assert.equal(C.principal(d, 'missing-role', 3).role, 'legacy-employee');
  });
  for (const role of ['staff', 'user', 'owner', '', null]) await test(() => {
    const {fleet} = fixture(); fleet.accounts[1].role = role; const before = clone(fleet);
    assert.throws(() => C.migrateSnapshot(fleet), /UNSUPPORTED_LEGACY/); assert.deepEqual(fleet, before);
  });
  for (const key of ['status', 'approvalStatus', 'personId', 'accessRevision', 'authorizationVersion']) await test(() => {
    const {fleet} = fixture(); fleet.accounts[1][key] = 'PENDING'; assert.throws(() => C.legacyReader(fleet), /UNSUPPORTED_LEGACY/);
  });
  for (const version of [0, 1, 3, '2', null]) await test(() => { const d = fresh(); d.formatVersion = version; assert.throws(() => C.validateSnapshot(d)); });
  await test(() => { const d = fresh(); assert.throws(() => C.legacyReader(d), /READER_VERSION_UNSUPPORTED/); assert.deepEqual(C.legacyReader(d.fleet), d.fleet); });
  for (const mutate of [d => d.accounts[1].role = 'user', d => d.accounts[1].personId = 'p4', d => d.accounts.splice(1, 1), d => d.accounts[1].origin = 'new', d => d.accounts[0].role = 'owner']) await test(() => {
    const d = fresh(); mutate(d); assert.throws(() => C.validateSnapshot(d));
  });
  await test(() => {
    const d = fresh(), before = clone(d), p = C.pendingApplication(d, {id: 'applicant', displayName: d.fleet.people[1].name});
    assert.deepEqual(d, before); assert.deepEqual(p.fleet, d.fleet); assert.equal(p.accounts.at(-1).personId, null);
    assert.equal(p.accounts.at(-1).status, 'PENDING'); assert.equal(p.accounts.at(-1).role, 'user');
    assert.throws(() => C.principal(p, 'applicant', 0), /UNAUTHORIZED/);
  });
  for (const extra of [{role: 'admin'}, {status: 'APPROVED'}, {driverId: 'p1'}, {personId: 'p1'}, {ownerUserId: 'employee'}]) await test(() => {
    assert.throws(() => C.pendingApplication(fresh(), {id: 'applicant', displayName: 'Same', ...extra}), /INVALID_APPLICATION/);
  });
  for (const decision of [
    {status: 'APPROVED', personId: null, identityVerified: true, at},
    {status: 'APPROVED', personId: 'p4', identityVerified: false, at},
    {status: 'APPROVED', personId: 'p1', identityVerified: true, at},
    {status: 'APPROVED', personId: 'p8', identityVerified: true, at},
    {status: 'APPROVED', personId: 'SAME DISPLAY NAME', identityVerified: true, at},
    {status: 'REJECTED', personId: 'p4', identityVerified: false, at}
  ]) await test(() => {
    const d = C.pendingApplication(fresh(), {id: 'new-user', displayName: 'Same'}), before = clone(d);
    assert.throws(() => C.reviewApplication(d, 'manager', 3, 'new-user', decision)); assert.deepEqual(d, before);
  });
  for (const actor of [['employee', 3], ['manager', 2], ['disabled', 3], ['nobody', 0]]) await test(() => {
    const d = C.pendingApplication(fresh(), {id: 'new-user', displayName: 'Same'});
    assert.throws(() => C.reviewApplication(d, ...actor, 'new-user', {status: 'APPROVED', personId: 'p4', identityVerified: true, at}));
  });
  await test(() => {
    const d = approved(); assert.deepEqual(d.fleet.trips, fixture().fleet.trips); assert.equal(d.accounts.at(-1).role, 'user');
    assert.equal(d.decisions[0].actorId, 'manager'); assert.equal(C.can(d, 'new-user', 1, 'history', d.fleet.trips[2]), false);
  });
  // Complete role/status cross-product: unsupported states never fall back to Employee.
  for (const role of ['admin', 'staff', 'user', 'legacy-employee']) for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'DISABLED']) await test(() => {
    const d = role === 'legacy-employee' ? fresh() : approved(role), id = role === 'legacy-employee' ? 'employee' : 'new-user';
    const a = d.accounts.find(a => a.id === id); a.status = status; a.revision++;
    const actions = ['checkout','return','amend','history','personal-report','aggregate-report','maintenance-read','maintenance-write','account-manage','backup','unknown'];
    const own = {...d.fleet.trips[1], ownerUserId: id};
    if (status !== 'APPROVED') { for (const action of actions) assert.throws(() => C.can(d, id, a.revision, action, own)); return; }
    assert.equal(C.can(d,id,a.revision,'return',own), true);
    assert.equal(C.can(d,id,a.revision,'amend',own), ['admin','legacy-employee'].includes(role));
    assert.equal(C.can(d,id,a.revision,'personal-report',own), true); assert.equal(C.can(d,id,a.revision,'maintenance-read',own), true);
    for (const action of ['aggregate-report','maintenance-write']) assert.equal(C.can(d,id,a.revision,action,own), ['admin','staff'].includes(role));
    assert.equal(C.can(d,id,a.revision,'account-manage',own), role === 'admin');
    assert.equal(C.can(d,id,a.revision,'backup',own), role === 'admin');
    assert.equal(C.can(d,id,a.revision,'return',{...own,ownerUserId:'someone-else'}), role === 'admin');
    assert.equal(C.can(d,id,a.revision,'history',{...own,ownerUserId:undefined}), ['admin','staff'].includes(role));
    assert.equal(C.can(d,id,a.revision,'unknown',own), false);
  });
  await test(() => {
    const d = approved('staff'), r = C.staffReport(d,'new-user',2,'2026-11');
    assert.deepEqual(r.totals, {trips:3, open:1, distanceKm:40}); assert.equal(r.history.length,3);
    assert.deepEqual(Object.keys(r.history[0]).sort(), ['id','carId','plate','start','end','odoStart','odoEnd','distanceKm','isOwn'].sort());
    assert.ok(!JSON.stringify(r).includes('PRIVATE')); assert.ok(!JSON.stringify(r).includes('passwordHash'));
    assert.equal(r.history[2].isOwn,false); assert.throws(() => C.staffReport(approved(),'new-user',1,'2026-11'), /FORBIDDEN/);
    assert.equal(C.staffReport(d,'new-user',2,'2026-12').totals.trips,0);
  });
  await test(() => {
    const d = approved(), r = C.basicReminders(d,'new-user',1,app.maintenanceStatus,'2026-11-05');
    assert.deepEqual(r,[{id:'m1',carId:'c1',plate:'SYNTHETIC-1',type:'oil',status:'near',dueOdo:120,dueDate:'2026-11-05'}]);
    assert.ok(!JSON.stringify(r).includes('PRIVATE')); assert.ok(!JSON.stringify(r).includes('cost'));
    d.fleet.cars[0].active=false; assert.deepEqual(C.basicReminders(d,'new-user',1,app.maintenanceStatus,'2026-11-05'),[]);
  });
  for (const role of ['staff','user']) await test(()=>{
    const d=approved(role),rev=role==='staff'?2:1, own={...d.fleet.trips[0],ownerUserId:'new-user'};
    assert.equal(C.can(d,'new-user',rev,'return',own),false);assert.equal(C.can(d,'new-user',rev,'amend',own),false);
  });
  for (const [today,status] of [['2026-10-01','normal'],['2026-11-04','near'],['2026-11-06','overdue']]) await test(()=>{
    const d=approved();d.fleet.maintenancePlans[0].dueOdo=200;
    assert.equal(C.basicReminders(d,'new-user',1,app.maintenanceStatus,today)[0].status,status);
  });
  await test(async()=>{
    const d=C.pendingApplication(fresh(),{id:'pending',displayName:'Same'});
    assert.deepEqual(await C.inspectDocumentBackup(C.backupDocument(d),2,inspectFleet),JSON.parse(JSON.stringify(d)));
    const rejected=C.reviewApplication(d,'manager',3,'pending',{status:'REJECTED',personId:null,identityVerified:false,at});
    assert.equal(rejected.accounts.at(-1).personId,null);assert.throws(()=>C.principal(rejected,'pending',1));
    assert.throws(()=>C.reviewApplication(rejected,'manager',3,'pending',{status:'APPROVED',personId:'p4',identityVerified:true,at}));
  });
  for (const role of ['admin','staff','user','legacy-employee','unknown']) await test(() => {
    const d=fresh(), before=clone(d); assert.throws(()=>C.changeAccess(d,'employee',3,'missing-role',{role,status:'APPROVED',at})); assert.deepEqual(d,before);
  });
  await test(() => {
    const d=approved('staff'), changed=C.changeAccess(d,'manager',3,'new-user',{role:'user',status:'APPROVED',at});
    assert.throws(()=>C.principal(changed,'new-user',2)); assert.equal(C.principal(changed,'new-user',3).role,'user');
    const disabled=C.changeAccess(changed,'manager',3,'new-user',{role:'user',status:'DISABLED',at});
    assert.throws(()=>C.principal(disabled,'new-user',4));
    const enabled=C.changeAccess(disabled,'manager',3,'new-user',{role:'user',status:'APPROVED',at});
    assert.throws(()=>C.principal(enabled,'new-user',3)); assert.equal(C.principal(enabled,'new-user',5).role,'user');
    assert.deepEqual(enabled.fleet,d.fleet); assert.deepEqual(enabled.ledger,d.ledger);
  });
  for (const role of ['staff','user','admin']) await test(()=>assert.throws(()=>C.changeAccess(fresh(),'manager',3,'employee',{role,status:'APPROVED',at}),/LEGACY_CONVERSION_REFUSED/));
  // Legacy operational behavior preserved; explicitly demonstrate why an old binary must never get new state.
  await test(async()=>{
    const d=fresh(), user={...d.fleet.accounts[1]}, view=app.viewForUser(d.fleet,0,user);
    assert.equal(view.state.trips.length,2); assert.equal(view.user.role,'employee'); assert.equal(view.state.maintenanceHistory,undefined);
    const unsafe=clone(d.fleet); unsafe.accounts[1].role='staff'; unsafe.accounts[1].status='PENDING';
    assert.equal(app.currentUser(user,unsafe).role,'employee'); // real old coercion, not claimed refusal
    assert.throws(()=>C.legacyReader(unsafe)); assert.throws(()=>C.legacyReader(d));
    const legacyBackup=JSON.stringify(await app.createBackup(d.fleet,'synthetic','demo'));
    await C.inspectLegacyApplicationBackup(legacyBackup,app.inspectBackup);
    const poisoned=JSON.stringify(await app.createBackup(unsafe,'synthetic','demo'));
    await app.inspectBackup(poisoned); // old inspector does not understand new authorization policy
    await assert.rejects(()=>C.inspectLegacyApplicationBackup(poisoned,app.inspectBackup));
  });
  for (const reader of [1,2]) await test(async()=>{
    const d=fresh(), text=C.backupDocument(d);
    if(reader===1) await assert.rejects(()=>C.inspectDocumentBackup(text,reader,inspectFleet),/READER_VERSION_UNSUPPORTED/);
    else assert.deepEqual(await C.inspectDocumentBackup(text,reader,inspectFleet),JSON.parse(JSON.stringify(d)));
    assert.deepEqual(await C.inspectDocumentBackup(C.backupDocument(d.fleet),reader,inspectFleet),JSON.parse(JSON.stringify(d.fleet)));
  });
  for (const mutate of [b=>b.sha256='0'.repeat(64), b=>{b.payload.accounts[1].role='owner';b.sha256=C.digest(b.payload);},
    b=>{b.payload.accounts[1].status='PENDING';b.sha256=C.digest(b.payload);}, b=>{b.payload.formatVersion=99;b.sha256=C.digest(b.payload);},
    b=>{b.payload.accounts[1].personId='p4';b.sha256=C.digest(b.payload);},
    b=>{b.payload.fleet.trips[0].end='2026-11-05T07:00';b.sha256=C.digest(b.payload);},
    b=>{b.payload.fleet.cars[0].initialOdo=100000000;b.sha256=C.digest(b.payload);}]) await test(async()=>{
    const s=store(), before=C.snapshot(s), b=JSON.parse(C.backupDocument(fresh()));mutate(b);
    await assert.rejects(()=>C.restoreSynthetic(s,JSON.stringify(b),2,inspectFleet));assert.deepEqual(C.snapshot(s),before);
  });
  for (const fault of ['after-state','after-event']) await test(()=>{
    const s=store(), before=C.snapshot(s), plan=C.migrationPlan(s);assert.throws(()=>C.applyMigration(s,plan,fault),/SYNTHETIC_FAILURE/);
    assert.deepEqual(C.snapshot(s),before);
  });
  await test(()=>{
    const s=store(), before=C.snapshot(s), plan=C.migrationPlan(s);C.applyMigration(s,plan);
    assert.throws(()=>C.readDocument(s,1),/READER_VERSION_UNSUPPORTED/);assert.deepEqual(C.readDocument(s).fleet,JSON.parse(before.state[0].document));
    assert.deepEqual(C.snapshot(s).ledger,before.ledger);assert.deepEqual(C.snapshot(s).schema,before.schema);
    const after=C.snapshot(s);assert.throws(()=>C.applyMigration(s,plan));assert.deepEqual(C.snapshot(s),after);
    C.rollbackMigration(s,plan);assert.deepEqual(C.readDocument(s,1),JSON.parse(before.state[0].document));
    assert.deepEqual(C.snapshot(s).ledger,before.ledger);assert.deepEqual(C.snapshot(s).schema,before.schema);
    assert.equal(C.snapshot(s).state[0].version,2);assert.equal(C.snapshot(s).events.length,2); // keep decision history
  });
  for(const fault of ['after-state','after-event']) await test(()=>{
    const s=store(),plan=C.migrationPlan(s);C.applyMigration(s,plan);const before=C.snapshot(s);
    assert.throws(()=>C.rollbackMigration(s,plan,fault));assert.deepEqual(C.snapshot(s),before);
  });
  await test(()=>{
    const s=store(),plan=C.migrationPlan(s),bad=clone(plan);bad.candidate.fleet.trips=[];bad.candidateSha=C.digest(bad.candidate);
    const before=C.snapshot(s);assert.throws(()=>C.applyMigration(s,bad));assert.deepEqual(C.snapshot(s),before);
  });
  await test(()=>{
    const s=store(), plan=C.migrationPlan(s);C.applyMigration(s,plan);const d=C.pendingApplication(C.readDocument(s),{id:'application',displayName:'same'});
    C.replaceSynthetic(s,d,1);const before=C.snapshot(s);assert.throws(()=>C.rollbackMigration(s,plan),/ROLLBACK_UNSAFE/);assert.deepEqual(C.snapshot(s),before);
    const rewrite=clone(d);rewrite.fleet.trips[0].ownerUserId='application';assert.throws(()=>C.replaceSynthetic(s,rewrite,2),/HISTORY_REWRITE_REFUSED/);
    assert.deepEqual(C.snapshot(s),before);
  });
  await test(async()=>{
    const s=store(),p=C.migrationPlan(s),before=C.snapshot(s);await assert.rejects(()=>C.restoreSynthetic(s,C.backupDocument(p.candidate),1,inspectFleet));assert.deepEqual(C.snapshot(s),before);
    await assert.rejects(()=>C.restoreSynthetic(s,C.backupDocument(p.candidate),2),/FLEET_INSPECTOR_REQUIRED/);assert.deepEqual(C.snapshot(s),before);
    await C.restoreSynthetic(s,C.backupDocument(p.candidate),2,inspectFleet);assert.deepEqual(C.readDocument(s),p.candidate);assert.deepEqual(C.snapshot(s).ledger,before.ledger);
  });
  for (const fault of ['after-state','after-event']) await test(async()=>{
    const s=store(),p=C.migrationPlan(s),before=C.snapshot(s);
    await assert.rejects(()=>C.restoreSynthetic(s,C.backupDocument(p.candidate),2,inspectFleet,fault));assert.deepEqual(C.snapshot(s),before);
  });
  // Concurrent review candidates share the source version: first wins, stale second cannot steal Person.
  await test(()=>{
    const s=store(),p=C.migrationPlan(s);C.applyMigration(s,p);
    let d=C.pendingApplication(C.readDocument(s),{id:'one',displayName:'Same'});d=C.pendingApplication(d,{id:'two',displayName:'Same'});C.replaceSynthetic(s,d,1);
    const one=C.reviewApplication(d,'manager',3,'one',{status:'APPROVED',personId:'p4',identityVerified:true,at});
    const two=C.reviewApplication(d,'manager',3,'two',{status:'APPROVED',personId:'p4',identityVerified:true,at});
    C.replaceSynthetic(s,one,2);const before=C.snapshot(s);assert.throws(()=>C.replaceSynthetic(s,two,2),/STALE_PLAN/);assert.deepEqual(C.snapshot(s),before);
    assert.throws(()=>C.reviewApplication(C.readDocument(s),'manager',3,'two',{status:'APPROVED',personId:'p4',identityVerified:true,at}));
  });
  for(const change of ['status','role','driver','session','owner','payload']) await test(async()=>{
    let d=approved('staff'), a=d.accounts.at(-1),who={id:a.id,role:'staff',driverId:'p4'},data={carId:'c2',id:'t3',end:'2026-11-04T09:00'};
    d.fleet.trips[2].ownerUserId=a.id;const op={id:crypto.randomUUID(),kind:'return'},ctx=await app.tripOperationContext(op,data,who,d.fleet);
    const record={...op,actorId:a.id,actorRole:'staff',actorDriverId:'p4',carId:'c2',fingerprint:ctx.fingerprint,tripResult:{id:'t3'},receipt:{trip:clone(d.fleet.trips[2])}};
    const before=clone(d);app.authorizeOperation(record,ctx,d.fleet,C.replayPrincipal(d,a.id,2,record));assert.deepEqual(d,before);
    if(change==='status') {a.status='DISABLED';a.revision++;}
    if(change==='role') {a.role='user';a.revision++;}
    if(change==='driver') {a.personId='p5';a.revision++;}
    if(change==='session') a.revision++;
    if(change==='owner') d.fleet.trips[2].ownerUserId='someone-else';
    if(change==='payload') ctx.fingerprint='different';
    const refused=clone(d);assert.throws(()=>app.authorizeOperation(record,ctx,d.fleet,C.replayPrincipal(d,a.id,2,record)));assert.deepEqual(d,refused);
  });
  await test(async()=>{
    const d=fresh(),a=d.accounts.find(a=>a.id==='employee'),t=d.fleet.trips[1];
    const op={id:crypto.randomUUID(),kind:'return'},ctx=await app.tripOperationContext(op,{...t,end:'2026-11-05T11:00'}, {id:a.id},d.fleet);
    const r={...op,actorId:a.id,actorRole:'employee',actorDriverId:a.personId,carId:t.carId,fingerprint:ctx.fingerprint,tripResult:{id:t.id}};
    app.authorizeOperation(r,ctx,d.fleet,C.replayPrincipal(d,a.id,3,r));assert.deepEqual(d.ledger,fixture().ledger);
  });
  await test(()=>assert.throws(()=>C.readDocument({}),/SYNTHETIC_STORE_REQUIRED/));
  await test(async()=>{
    for(const path of ['src/auth.ts','src/api.ts','src/worker.ts','src/backup.ts','src/storage.ts','build.mjs']) {
      assert.ok(!(await readFile(path,'utf8')).includes('offline-role-compatibility'), 'offline helper leaked into app '+path);
    }
    assert.equal(network,0);
  });
  console.log('PASS offline role compatibility: '+cases+' cases, policy1.0/versioned quarantine, strict legacy preservation/refusal, pending exact-Person review, DTO minimization, backup pre-write refusal, SQLite atomic migration/rollback/CAS and actual replay guards; operational roles/signup unchanged');
} finally { globalThis.fetch=previousFetch; for(const s of stores) C.closeSynthetic(s); }
