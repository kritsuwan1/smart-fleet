import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {prepareD1Initialization,fleetSchema} from '../scripts/d1-initialization-safety.mjs';

const config=target=>JSON.parse(readFileSync(`config/${target==='staging'?'staging-no-r2':'recovery-d1'}.example.jsonc`,'utf8').replace(/^\s*\/\/.*$/gm,''));
const script=target=>readFileSync(`config/initialize-${target}.example.sql`,'utf8');
const snapshot=db=>({schema:db.prepare('SELECT * FROM sqlite_schema ORDER BY name').all(),rows:db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT GLOB 'sqlite_*' ORDER BY name").all().map(({name})=>[name,db.prepare(`SELECT * FROM "${name.replaceAll('"','""')}"`).all()])});
let checks=0;
async function fixture(name,test){const db=new DatabaseSync(':memory:');try{await test(db);checks++;}catch(error){throw new Error(name,{cause:error});}finally{db.close();}}
function input(db,target='staging'){
 const cfg=config(target),binding=cfg.d1_databases[0],queries=[];
 return{target,config:cfg,expectedAccountId:'synthetic-account',metadata:{account_id:'synthetic-account',database_id:binding.database_id,database_name:binding.database_name},queries,
  query:async sql=>{assert.match(sql,/^(SELECT|PRAGMA)\b/);assert.doesNotMatch(sql,/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE)\b/i);queries.push(sql);return db.prepare(sql).all();}};
}
for(const target of ['staging','recovery']){
 await fixture(target+' empty',async db=>{
  const before=snapshot(db),args=input(db,target),plan=await prepareD1Initialization(args);
  assert.deepEqual(snapshot(db),before);assert.equal(args.queries.length,1);assert.match(args.queries[0],/sqlite_schema/);assert.equal(plan.requiresApproval,true);assert.equal(Object.isFrozen(plan),true);assert.match(plan.sha256,/^[0-9a-f]{64}$/);
  // Synthetic SQLite execution only. There is no remote execution API in the planner.
  db.exec(plan.sql);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM fleet_store').get().n,target==='staging'?2:1);
  const initialized=snapshot(db);await assert.rejects(prepareD1Initialization(input(db,target)),/REFUSED_OCCUPIED/);
  assert.throws(()=>db.exec(script(target)),/malformed JSON/);assert.deepEqual(snapshot(db),initialized);
 });
 await fixture(target+' expected empty fleet_store',async db=>{
  db.exec(fleetSchema);const before=snapshot(db);await prepareD1Initialization(input(db,target));assert.deepEqual(snapshot(db),before);db.exec(script(target));assert.ok(db.prepare('SELECT COUNT(*) AS n FROM fleet_store').get().n>0);
 });
 for(const setup of [
  "CREATE TABLE other(value TEXT); INSERT INTO other VALUES('synthetic sentinel')",
  fleetSchema+"; CREATE TABLE other(value TEXT)",
  'CREATE TABLE fleet_store(id TEXT PRIMARY KEY,payload TEXT,version INTEGER)',
  fleetSchema+'; CREATE INDEX unexpected_index ON fleet_store(payload)',
  'CREATE VIEW unexpected_view AS SELECT 1 AS value',
  fleetSchema+"; CREATE TRIGGER unexpected_trigger AFTER INSERT ON fleet_store BEGIN UPDATE fleet_store SET version=version+1; END",
  'CREATE TABLE _cf_unverified(value TEXT)',
  'CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0,extra TEXT)'
 ])await fixture(target+' unexpected schema '+setup,async db=>{
  db.exec(setup);const before=snapshot(db);await assert.rejects(prepareD1Initialization(input(db,target)),/REFUSED_SCHEMA/);assert.deepEqual(snapshot(db),before);
  assert.throws(()=>db.exec(script(target)),/malformed JSON/);assert.deepEqual(snapshot(db),before);
 });
 for(const id of ['main','environment','unrelated-row'])await fixture(target+' occupied '+id,async db=>{
  db.exec(fleetSchema);db.prepare('INSERT INTO fleet_store VALUES (?,?,?)').run(id,id==='environment'?'production':'synthetic preserved value',17);
  const before=snapshot(db);await assert.rejects(prepareD1Initialization(input(db,target)),/REFUSED_OCCUPIED/);assert.throws(()=>db.exec(script(target)));assert.deepEqual(snapshot(db),before);
 });
}
await fixture('identity and binding reject before DB query',async db=>{
 const mutations=[
  a=>a.target='production',a=>a.target='demo',a=>a.target='toString',
  a=>a.config.d1_databases[0].database_id='00000000-0000-0000-0000-000000000000',
  a=>a.config.d1_databases[0].binding='DB',a=>a.config.d1_databases[0].binding='RECOVERY_DB',
  a=>a.config.d1_databases[0].database_name='smart-fleet-demo-db',
  a=>a.config.d1_databases.push({...a.config.d1_databases[0]}),
  a=>a.metadata.database_id=config('recovery').d1_databases[0].database_id,
  a=>a.metadata.database_name='wrong-name',a=>a.metadata.account_id='wrong-account',
  a=>a.expectedAccountId='',a=>a.metadata=undefined,a=>a.config.main='../output/worker-production.js'
 ];
 for(const mutate of mutations){const args=input(db);mutate(args);await assert.rejects(prepareD1Initialization(args),/INITIALIZATION_REFUSED_/);assert.deepEqual(args.queries,[]);}
 assert.deepEqual(snapshot(db),{schema:[],rows:[]});
});
await fixture('query failures and malformed responses fail closed',async db=>{
 for(const query of [async()=>{throw Error('private provider failure');},async()=>null])await assert.rejects(prepareD1Initialization({...input(db),query}),/^Error: INITIALIZATION_REFUSED_SCHEMA_QUERY$/);
 db.exec(fleetSchema);const args=input(db);await assert.rejects(prepareD1Initialization({...args,query:async sql=>sql.includes('COUNT')?[]:args.query(sql)}),/REFUSED_OCCUPIED/);
});
console.log(`PASS d1 initialization safety: ${checks} fixtures, read-only whole-schema preflight, exact target/account/binding checks, SQL guards before DDL, repeat/occupied/schema refusal and complete synthetic data preservation`);
