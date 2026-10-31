import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../output/worker.js';
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
function DB(sql){return {prepare(text){let args=[];const stmt=sql.prepare(text);return {bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async run(){const r=stmt.run(...args);return {meta:{changes:Number(r.changes)}};}};}};}
const env={APP_PASSWORD:crypto.randomUUID(),DB:DB(sql)};
const origin='https://smart-fleet.example.test';let cookie='';
const request=(path,options={})=>worker.fetch(new Request(origin+path,{...options,headers:{origin,'CF-Connecting-IP':'192.0.2.10',...(cookie?{cookie}:{}),...options.headers}}),env);
const login=()=>request('/login',{method:'POST',body:new URLSearchParams({password:env.APP_PASSWORD})});
assert.equal((await worker.fetch(new Request(origin),{DB:env.DB})).status,503);
assert.equal((await request('/api/fleet')).status,401);
assert.equal((await request('/app.js')).headers.get('content-type'),'text/html; charset=utf-8');
let r=await request('/login',{method:'POST',body:new URLSearchParams({password:'wrong'})});assert.equal(r.status,401);
r=await request('/login',{method:'POST',body:'password=x',headers:{origin:'https://evil.example'}});assert.equal(r.status,403);
r=await login();assert.equal(r.status,303);assert.match(r.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Lax/);cookie=r.headers.get('set-cookie').split(';')[0];
assert.equal((await request('/')).status,200);assert.equal((await request('/app.js')).headers.get('content-type'),'text/javascript; charset=utf-8');
let d=await (await request('/api/fleet')).json();assert.equal(d.state.trips.length,0);
const post=(action,data,version=d.version)=>request('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data,version})});
r=await post('import',{});assert.equal(r.status,200);d=await r.json();assert.equal(d.state.trips.length,17);assert.equal(d.state.trips.reduce((n,t)=>n+t.odoEnd-t.odoStart,0),979);
assert.equal((await post('import',{})).status,400);
const t={carId:'car-1',driverId:'p1',project:'Test',destination:'Office',start:'2026-10-28T08:00',end:'',odoStart:116763,odoEnd:null,note:'',reason:''};
r=await post('trip',t);assert.equal(r.status,200);const oldVersion=d.version;d=await r.json();
assert.equal((await post('trip',t,oldVersion)).status,409);
assert.equal((await post('trip',{...t,start:'2026-10-28T09:00'})).status,400);
const saved=d.state.trips.find(t=>!t.end);
assert.equal((await post('trip',{...saved,end:'2026-10-28T09:00',odoEnd:1})).status,400);
r=await post('trip',{...saved,end:'2026-10-28T09:00',odoEnd:116800});assert.equal(r.status,200);d=await r.json();assert.equal(d.state.trips.at(-1).odoEnd-d.state.trips.at(-1).odoStart,37);
// Vehicle presentation metadata survives edits and does not change trip history.
assert.equal((await request('/vehicle-revo-canopy.webp')).headers.get('content-type'),'image/webp');
const oldTrips=structuredClone(d.state.trips);const car=d.state.cars[0];
r=await post('car',{...car,model:'Toyota Hilux Revo 2.4 Double Cab Prerunner',fuelType:'ดีเซล',imagePreset:'revo'});assert.equal(r.status,200);d=await r.json();assert.equal(d.state.cars[0].fuelType,'ดีเซล');assert.equal(d.state.cars[0].imagePreset,'revo');assert.deepEqual(d.state.trips,oldTrips);
const {fuelType,imagePreset,...legacyCar}=d.state.cars[0];r=await post('car',legacyCar);assert.equal(r.status,200);d=await r.json();assert.equal(d.state.cars[0].imagePreset,'revo');
assert.equal((await post('car',{...d.state.cars[0],imagePreset:'https://other.invalid/image.jpg'})).status,400);
r=await post('car',{...d.state.cars[0],imagePreset:'none',fuelType:''});assert.equal(r.status,200);d=await r.json();assert.equal(d.state.cars[0].imagePreset,'none');assert.equal(d.state.cars[0].fuelType,'');
// Reloads use D1 data and do not replace the application row.
assert.equal((await (await request('/api/fleet')).json()).state.trips.length,18);
r=await request('/api/backup.sql');assert.equal(r.status,200);const backup=await r.text();
const restored=new DatabaseSync(':memory:');restored.exec(backup);const restoredData=JSON.parse(restored.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload);assert.deepEqual(restoredData.trips,d.state.trips);assert.equal(typeof restoredData.sessionKey,'string');assert.ok(!d.state.sessionKey);assert.ok(!d.state.accounts);
// Restore also works over a populated target without dropping any tables.
restored.exec(backup);assert.equal(JSON.parse(restored.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload).trips.length,18);
assert.equal(restored.prepare("SELECT count(*) n FROM fleet_store WHERE id LIKE 'restore-%'").get().n,0);
const forged=cookie.replace(/.$/,cookie.endsWith('a')?'b':'a');assert.equal((await request('/api/fleet',{headers:{cookie:forged}})).status,401);
const logout=await request('/logout',{method:'POST'});assert.equal(logout.status,303);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
cookie='';
for(let i=0;i<12;i++)r=await request('/login',{method:'POST',body:'password=wrong',headers:{'CF-Connecting-IP':'192.0.2.20'}});
assert.equal(r.status,429);
console.log('PASS: setup lock, API and asset authentication, wrong password, cross-site POST rejection, signed secure session, import 17 rows/979 km, concurrent version rejection, trip overlap and odometer validation, return 37 km, persistent reload, SQL restore into empty and populated databases, tampered cookie, logout, login attempt limit');
