import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import worker from '../output/worker.js';
import {seedLegacyAccount} from './fixtures/legacy-account.mjs';
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
const env={APP_PASSWORD:crypto.randomUUID(),DB:{prepare(text){let args=[];const stmt=sql.prepare(text);return {bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async run(){const r=stmt.run(...args);return {meta:{changes:Number(r.changes)}};}};}}};
const origin='https://smart-fleet.kritsuwan1.workers.dev';let ip=1;
const request=(path,options={},cookie='')=>worker.fetch(new Request(origin+path,{...options,headers:{origin,'CF-Connecting-IP':'192.0.2.'+(ip++),...(cookie?{cookie}:{}),...options.headers}}),env);
const form=values=>({method:'POST',body:new URLSearchParams(values)});
const cookieFrom=r=>r.headers.get('set-cookie').split(';')[0];
const get=cookie=>request('/api/fleet',{},cookie).then(r=>r.json());
const login=async(username,password)=>{const r=await request('/login',form({username,password}));assert.equal(r.status,303);return cookieFrom(r);};
const post=(cookie,action,data,version)=>request('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data,version})},cookie);
const root=await login('admin',env.APP_PASSWORD);
await seedLegacyAccount(sql,{name:'Supervisor One',username:'supervisor',password:'abc123'});
await seedLegacyAccount(sql,{name:'Employee Two',username:'stafftwo',password:'def456'});
let r=await request('/login',form({username:'supervisor',password:'abc123'}));assert.equal(r.status,303);let employee=cookieFrom(r);
r=await request('/login',form({username:'stafftwo',password:'def456'}));assert.equal(r.status,303);const staff=cookieFrom(r);
let a=await get(root),member=a.members.find(m=>m.username==='supervisor'),other=a.members.find(m=>m.username==='stafftwo');
const id=member.id,driverId=member.driverId;assert.equal(member.role,'employee');
const edit=(cookie,values,version)=>post(cookie,'account',{id,operation:'edit',name:'Supervisor One',username:'supervisor',role:'admin',...values},version);
assert.equal((await edit(employee,{},a.version)).status,403);
// Legacy v3 accounts with no role always remain employees.
let raw=JSON.parse(sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);delete raw.accounts[0].role;
sql.prepare("UPDATE fleet_store SET payload=?,version=version+1 WHERE id='main'").run(JSON.stringify(raw));a=await get(root);assert.equal((await get(employee)).user.role,'employee');
// Failed edits are atomic; validation cannot alter the linked driver or role.
for(const values of [{username:'admin'},{username:'STAFFTWO'},{name:'Employee Two'},{role:'owner'},{name:'x'},{username:'bad user'}]){
 assert.equal((await edit(root,values,a.version)).status,400);
 assert.equal((await get(root)).version,a.version);
}
assert.equal((await post(root,'account',{id:'admin',operation:'edit',name:'Xx',username:'newroot',role:'employee'},a.version)).status,400);
// Seed a historical trip for the other employee; promotion must reveal the full fleet.
const t={carId:'car-1',driverId:other.driverId,project:'Team journey',destination:'Customer',start:'2026-10-29T08:00',end:'2026-10-29T09:00',odoStart:115784,odoEnd:115800,note:'',reason:''};
r=await post(root,'trip',t,a.version);assert.equal(r.status,200);a=await r.json();assert.equal((await get(employee)).state.trips.length,0);
assert.equal((await edit(root,{},a.version-1)).status,409);
r=await edit(root,{name:'Supervisor Updated',username:'manager'},a.version);assert.equal(r.status,200);a=await r.json();
assert.equal((await request('/api/fleet',{},employee)).status,401);
assert.equal((await request('/login',form({username:'supervisor',password:'abc123'}))).status,401);
let manager=await login('manager','abc123'),m=await get(manager);
assert.equal(m.user.role,'admin');assert.equal(m.user.name,'Supervisor Updated');assert.equal(m.user.driverId,driverId);assert.equal(m.state.people.find(p=>p.id===driverId).name,'Supervisor Updated');assert.equal(m.state.trips.length,1);
assert.equal(m.members.length,2);assert.equal(m.state.accounts,undefined);assert.equal(m.state.sessionKey,undefined);assert.ok(!JSON.stringify(m).includes('passwordHash'));
assert.equal((await request('/api/backup.sql',{},manager)).status,200);assert.equal((await request('/qr',{},manager)).status,200);
// The exact fleet dataset used by the Excel exporter contains team-wide records.
const require=createRequire(import.meta.url),esbuild=require(process.env.FLEET_ESBUILD_PATH||'esbuild');
const built=await esbuild.build({entryPoints:['src/export.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {rows}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
assert.equal(rows(m.state,m.state.trips).length,1);assert.equal(rows(m.state,m.state.trips)[0][4],'Team journey');
// Additional admins can manage other accounts but cannot disable/demote themselves.
assert.equal((await edit(manager,{name:'Supervisor Updated',username:'manager',role:'employee'},m.version)).status,400);
assert.equal((await post(manager,'account',{id,operation:'active',active:false},m.version)).status,400);
r=await post(manager,'account',{id:other.id,operation:'edit',name:'Employee Two',username:'stafftwo',role:'admin'},m.version);assert.equal(r.status,200);a=await r.json();assert.equal((await request('/api/fleet',{},staff)).status,401);
// Promoted admins keep their own password workflow, unlike the root account.
r=await request('/api/profile/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:'abc123',password:'new123'})},manager);assert.equal(r.status,200);assert.equal((await request('/api/fleet',{},manager)).status,401);
manager=await login('manager','new123');m=await get(manager);assert.equal(m.user.role,'admin');
// Admin-created trips retain account ownership for a later demotion.
r=await post(manager,'trip',{...t,start:'2026-10-29T10:00',end:'2026-10-29T11:00',driverId,odoStart:115800,odoEnd:115810},m.version);assert.equal(r.status,200);m=await r.json();assert.equal(m.state.trips[1].ownerUserId,id);
// Editing yourself returns a clean reauthentication response after the write succeeds.
r=await edit(manager,{name:'Supervisor Final',username:'manager'},m.version);assert.equal(r.status,200);assert.deepEqual(await r.json(),{reauthenticate:true});assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
manager=await login('manager','new123');a=await get(root);
r=await edit(root,{name:'Supervisor Final',username:'manager',role:'employee'},a.version);assert.equal(r.status,200);a=await r.json();assert.equal((await request('/api/backup.sql',{},manager)).status,401);
employee=await login('manager','new123');const limited=await get(employee);assert.equal(limited.user.role,'employee');assert.equal(limited.state.trips.length,1);assert.equal(limited.state.trips[0].ownerUserId,id);assert.equal((await request('/api/backup.sql',{},employee)).status,403);assert.equal((await edit(employee,{},limited.version)).status,403);
assert.ok(a.state.audit.some(x=>x.action==='แก้ไขบัญชีและสิทธิ์'&&x.before.role==='admin'&&x.after.role==='employee'));
// Linked person edits remain consistent with account names and duplicate rules.
r=await post(root,'person',{id:driverId,name:'Driver New Name',active:true},a.version);assert.equal(r.status,200);a=await r.json();assert.equal(a.members.find(x=>x.id===id).name,'Driver New Name');
// Restore preserves account roles while rotating sessions.
const backup=await (await request('/api/backup.sql',{},root)).text();const restored=new DatabaseSync(':memory:');restored.exec(backup);const rs=JSON.parse(restored.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);assert.equal(rs.accounts.find(x=>x.id===other.id).role,'admin');assert.equal(rs.trips.length,2);
console.log('PASS roles: legacy migration, no self-promotion, atomic validation/duplicates, promotion/demotion, full fleet and Excel report dataset, stable driver links, admin management, self-account protection, own-password change, session revocation, owner preservation, self-edit reauthentication, audit and backup role preservation');
