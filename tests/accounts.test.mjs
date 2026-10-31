import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../output/worker.js';
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
const env={APP_PASSWORD:crypto.randomUUID(),DB:{prepare(text){let args=[];const stmt=sql.prepare(text);return {bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async run(){const r=stmt.run(...args);return {meta:{changes:Number(r.changes)}};}};}}};
const origin='https://smart-fleet.kritsuwan1.workers.dev';
const request=(path,options={},cookie='',ip='192.0.2.1')=>worker.fetch(new Request(origin+path,{...options,headers:{origin,'CF-Connecting-IP':ip,...(cookie?{cookie}:{}),...options.headers}}),env);
const form=(values)=>({method:'POST',body:new URLSearchParams(values)});
const get=(cookie)=>request('/api/fleet',{},cookie).then(r=>r.json());
const post=(cookie,action,data,version)=>request('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data,version})},cookie);
const cookieFrom=r=>r.headers.get('set-cookie').split(';')[0];
assert.match(await (await request('/?car=car-1&action=start')).text(),/name="username"/);
assert.match(await (await request('/register')).text(),/กรอกเพียง 3 ช่อง/);
assert.equal((await request('/register',form({name:'Test One',username:'testone',password:'12345'}))).status,400);
assert.equal((await request('/register',form({name:'Test Admin',username:'admin',password:'a12345'}))).status,400);
let r=await request('/register',form({name:'Employee One',username:'employee.one',password:'one123',role:'admin',returnTo:'/?car=car-1&action=start'}));
assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/?car=car-1&action=start');assert.match(r.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Lax/);const e1=cookieFrom(r);
let d1=await get(e1);assert.equal(d1.user.role,'employee');assert.equal(d1.user.username,'employee.one');assert.equal(d1.state.people.length,1);assert.equal(d1.state.accounts,undefined);assert.equal(d1.state.sessionKey,undefined);assert.deepEqual(d1.members,[]);
let raw=JSON.parse(sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);assert.equal(raw.accounts.length,1);assert.notEqual(raw.accounts[0].passwordHash,'one123');assert.ok(!JSON.stringify(raw).includes('one123'));assert.equal(raw.accounts[0].passwordHash.length,64);
assert.equal((await request('/register',form({name:'Other Name',username:'EMPLOYEE.ONE',password:'new123'}))).status,400);
assert.equal((await request('/register',form({name:'Employee One',username:'another',password:'new123'}))).status,400);
r=await request('/register',form({name:'Employee Two',username:'employee.two',password:'two123',returnTo:'https://evil.example'}));assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/');const e2=cookieFrom(r);
r=await request('/login',form({username:'admin',password:env.APP_PASSWORD}));assert.equal(r.status,303);const admin=cookieFrom(r);let a=await get(admin);assert.equal(a.user.role,'admin');assert.equal(a.members.length,2);assert.equal(a.state.accounts,undefined);assert.equal(a.state.sessionKey,undefined);assert.ok(!JSON.stringify(a).includes('passwordHash'));
assert.equal((await request('/api/backup.sql',{},e1)).status,403);assert.equal((await request('/api/backup.json',{},e1)).status,403);assert.equal((await request('/qr',{},e1)).status,403);assert.equal((await request('/qr',{},admin)).status,200);assert.match(await (await request('/qr-car.svg')).text(),/<svg/);
assert.equal((await post(e1,'person',{name:'forbidden'},a.version)).status,403);
assert.equal((await post(e1,'importExcel',{rows:[],options:{}},a.version)).status,403);
const t={carId:'car-1',driverId:'p1',project:'Employee trip',destination:'Office',start:'2026-10-29T08:00',end:'',odoStart:115784,odoEnd:null,note:'',reason:''};
d1=await get(e1);r=await post(e1,'trip',t,d1.version);assert.equal(r.status,200);d1=await r.json();const saved=d1.state.trips[0];assert.equal(saved.ownerUserId,d1.user.id);assert.equal(saved.driverId,d1.user.driverId);assert.notEqual(saved.driverId,'p1');
let d2=await get(e2);assert.equal(d2.state.trips.length,0);assert.ok(d2.occupiedCars.includes('car-1'));assert.deepEqual(d2.state.audit,[]);
assert.equal((await post(e2,'trip',{...saved,end:'2026-10-29T09:00',odoEnd:115800},d2.version)).status,403);
assert.equal((await post(e2,'trip',t,d2.version)).status,400);
assert.equal((await post(e1,'trip',{...saved,start:'2026-10-28T08:00'},d1.version)).status,403);
r=await post(e1,'trip',{...saved,end:'2026-10-29T09:00',odoEnd:115800},d1.version);assert.equal(r.status,200);d1=await r.json();assert.equal(d1.state.trips[0].odoEnd,115800);
assert.equal((await post(e1,'trip',{...d1.state.trips[0],note:'closed edit'},d1.version)).status,403);
d2=await get(e2);assert.equal(d2.state.cars[0].currentOdo,115800);assert.equal(d2.state.trips.length,0);
a=await get(admin);assert.equal(a.state.trips.length,1);assert.ok(a.state.audit.some(a=>a.action==='สมัครบัญชีพนักงาน'));
// Admin disable invalidates existing sessions immediately; enable does not revive an old cookie.
const member=a.members.find(m=>m.username==='employee.two');r=await post(admin,'account',{id:member.id,operation:'active',active:false},a.version);assert.equal(r.status,200);a=await r.json();assert.equal((await request('/api/fleet',{},e2)).status,401);assert.equal((await request('/login',form({username:'employee.two',password:'two123'}))).status,401);
r=await post(admin,'account',{id:member.id,operation:'active',active:true},a.version);assert.equal(r.status,200);a=await r.json();assert.equal((await request('/api/fleet',{},e2)).status,401);
r=await post(admin,'account',{id:member.id,operation:'resetPassword',password:'new456'},a.version);assert.equal(r.status,200);
assert.equal((await request('/login',form({username:'employee.two',password:'two123'}))).status,401);r=await request('/login',form({username:'employee.two',password:'new456'}));assert.equal(r.status,303);const e2new=cookieFrom(r);
r=await request('/api/profile/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:'new456',password:'fresh789'})},e2new);assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await request('/api/fleet',{},e2new)).status,401);
const changedPage=await request('/password-changed');assert.equal(changedPage.status,200);const changedHTML=await changedPage.text();assert.match(changedHTML,/เปลี่ยนรหัสผ่านสำเร็จ/);assert.match(changedHTML,/href="\/login"/);assert.doesNotMatch(changedHTML,/passwordHash|sessionKey|APP_PASSWORD/);
assert.equal((await request('/login',form({username:'employee.two',password:'fresh789'}))).status,303);
// A six-character admin password remains supported; the signing key is random and not derived from that weak secret alone.
env.APP_PASSWORD='abc123';r=await request('/login',form({username:'admin',password:'abc123'}));assert.equal(r.status,303);const admin6=cookieFrom(r);assert.equal((await request('/api/fleet',{},admin)).status,401);
const backup=await (await request('/api/backup.sql',{},admin6)).text();const restored=new DatabaseSync(':memory:');restored.exec(backup);const restoredState=JSON.parse(restored.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);assert.equal(restoredState.accounts.length,2);assert.equal(restoredState.trips.length,1);assert.ok(restoredState.accounts.every(a=>a.salt&&a.passwordHash));
console.log('PASS accounts: 6-character registration and admin login, automatic employee-only role, secure hashes, duplicate names/usernames, safe QR return, no credentials in API, employee data isolation, driver spoof rejection, ownership and closed-record permissions, occupied car status, current odometer, admin-only management/import/backup, disable/enable/session invalidation, admin password reset, own password change, complete SQL account backup');
// Concurrent sign-ups remain atomic and cannot overwrite fleet data or create duplicate usernames.
const concurrent=await Promise.all([
 request('/register',form({name:'Concurrent A',username:'concurrent.a',password:'con123'}),'','192.0.2.10'),
 request('/register',form({name:'Concurrent B',username:'concurrent.b',password:'con456'}),'','192.0.2.11')
]);assert.ok(concurrent.every(r=>r.status===303));
raw=JSON.parse(sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);assert.equal(raw.accounts.length,4);assert.equal(raw.trips.length,1);
const competing=await Promise.all([
 request('/register',form({name:'Same User A',username:'same.user',password:'same12'}),'','192.0.2.12'),
 request('/register',form({name:'Same User B',username:'same.user',password:'same34'}),'','192.0.2.13')
]);assert.deepEqual(competing.map(r=>r.status).sort(),[303,400]);
console.log('PASS concurrent registration: preserves trips and other accounts; a duplicate username is created only once');
// Migration from v2 adds private authentication fields without replacing fleet data.
const legacy=structuredClone(raw);delete legacy.accounts;delete legacy.sessionKey;for(const t of legacy.trips)delete t.ownerUserId;
sql.prepare("UPDATE fleet_store SET payload=?,version=version+1 WHERE id='main'").run(JSON.stringify(legacy));
r=await request('/login',form({username:'admin',password:env.APP_PASSWORD}));assert.equal(r.status,303);const migrated=await get(cookieFrom(r));assert.deepEqual(migrated.state,legacy);assert.equal(migrated.members.length,0);assert.equal((await request('/api/fleet',{},admin6)).status,401);
console.log('PASS v2 migration: preserves fleet data, creates private session key, requires a fresh login, and exposes no secret fields');
