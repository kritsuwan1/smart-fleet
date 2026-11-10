import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import staging from '../output/worker-staging.js';
const config=JSON.parse((await readFile('config/staging-no-r2.example.jsonc','utf8')).replace(/^\s*\/\/.*$/gm,''));
const recovery=JSON.parse((await readFile('config/recovery-d1.example.jsonc','utf8')).replace(/^\s*\/\/.*$/gm,''));
assert.equal(config.name,'smart-fleet-staging');assert.equal(config.main,'../output/worker-staging.js');assert.equal(config.d1_databases[0].binding,'DEMO_DB');assert.equal(config.d1_databases[0].database_name,'smart-fleet-staging-db');
assert.equal(recovery.d1_databases[0].database_name,'smart-fleet-recovery-db');assert.equal(recovery.d1_databases[0].binding,'RECOVERY_DB');assert.equal(recovery.main,undefined);
assert.equal(config.r2_buckets,undefined);assert.deepEqual(config.triggers.crons,[]);assert.equal(config.vars.AUTOMATIC_BACKUP_ENABLED,'false');assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);assert.deepEqual(config.routes,[]);
const prod=JSON.parse(await readFile('wrangler.production.jsonc','utf8'));assert.notEqual(config.d1_databases[0].database_id,prod.d1_databases[0].database_id);assert.notEqual(recovery.d1_databases[0].database_id,prod.d1_databases[0].database_id);assert.notEqual(config.d1_databases[0].database_id,recovery.d1_databases[0].database_id);
const databases=[];function db(){const sql=new DatabaseSync(':memory:');databases.push(sql);const adapter={prepare(q){let args=[];const stmt=sql.prepare(q);return{bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async run(){return{meta:{changes:Number(stmt.run(...args).changes)}};}};}};return{sql,adapter};}
try{
 const source=db(),target=db(),initialize=await readFile('config/initialize-staging.example.sql','utf8'),recoverInit=await readFile('config/initialize-recovery.example.sql','utf8');
 source.sql.exec(initialize);const before=source.sql.prepare('SELECT * FROM fleet_store ORDER BY id').all();assert.equal(before.length,2);assert.throws(()=>source.sql.exec(initialize));assert.deepEqual(source.sql.prepare('SELECT * FROM fleet_store ORDER BY id').all(),before);
 target.sql.exec(recoverInit);assert.equal(target.sql.prepare("SELECT * FROM fleet_store WHERE id='main'").get(),undefined);assert.equal(target.sql.prepare("SELECT payload FROM fleet_store WHERE id='environment'").get().payload,'demo');
 const occupied=db();occupied.sql.exec(await readFile('schema.sql','utf8'));occupied.sql.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('environment','production');assert.throws(()=>occupied.sql.exec(initialize));assert.equal(occupied.sql.prepare("SELECT * FROM fleet_store WHERE id='main'").get(),undefined);
 const env={DEMO_DB:source.adapter,APP_PASSWORD:'synthetic-staging-password',...config.vars};
 const request=(path,options={},cookie='')=>staging.fetch(new Request('https://staging.test'+path,{...options,headers:{origin:'https://staging.test','CF-Connecting-IP':'192.0.2.8',...(cookie?{cookie}:{}),...options.headers}}),env);
 assert.match(await(await request('/login')).text(),/STAGING — ข้อมูลจำลอง/);for(const path of ['/qr','/qr-site.svg','/qr-car.svg'])assert.equal((await request(path)).status,404);
 for(const host of ['smart-fleet.kritsuwan1.workers.dev','smart-fleet-demo.kritsuwan1.workers.dev'])assert.equal((await staging.fetch(new Request('https://'+host+'/'),env)).status,503);
 assert.equal((await request('/api/fleet')).status,401);
 const login=await request('/login',{method:'POST',body:new URLSearchParams({username:'admin',password:env.APP_PASSWORD})});assert.equal(login.status,303);const admin=login.headers.get('set-cookie').split(';')[0];
 const result=await(await request('/api/fleet',{},admin)).json();assert.equal(result.user.role,'admin');assert.equal(result.state.cars[0].plate,'SYNTHETIC-001');assert.equal(result.state.trips.length,0);
 const bytes=source.sql.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").get();await staging.scheduled({cron:'0 19 * * *',scheduledTime:Date.now()},env);assert.deepEqual(source.sql.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").get(),bytes);
 const registration=await request('/register',{method:'POST',body:new URLSearchParams({name:'Synthetic staging employee',username:'stage-employee',password:'synthetic-employee-pass'})});assert.equal(registration.status,303);const employee=registration.headers.get('set-cookie').split(';')[0];
 const employeeView=await(await request('/api/fleet',{},employee)).json();assert.equal(employeeView.user.role,'user');assert.equal(employeeView.scope,'verified-user');assert.equal(employeeView.user.personLinkSource,'self-registration');assert.deepEqual(employeeView.state.trips,[]);
 assert.equal((await request('/api/fleet',{method:'POST',body:JSON.stringify({version:employeeView.version,action:'maintenance',data:{operation:'plan',plan:{}}})},employee)).status,403);
 const badEnv={...env,DEMO_DB:occupied.adapter};assert.equal((await staging.fetch(new Request('https://staging.test/api/fleet'),badEnv)).status,503);
 // Even accidental app initialization on empty demo-marked Staging seeds only synthetic cars.
 const fresh=db();fresh.sql.exec(recoverInit);await staging.fetch(new Request('https://staging.test/login'),{...env,DEMO_DB:fresh.adapter});assert.equal(JSON.parse(fresh.sql.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload).cars[0].plate,'SYNTHETIC-001');
 console.log('PASS staging readiness: no-R2/no-cron/private placeholder config, separate recovery binding, atomic empty-only synthetic initialization/rerun refusal, staging build label, disabled QR and wrong-host rejection, admin authentication, synthetic state and disabled scheduled handler, production marker rejection');
}finally{for(const sql of databases)sql.close();}
