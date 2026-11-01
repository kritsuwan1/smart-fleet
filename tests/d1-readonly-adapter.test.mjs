import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createD1ReadonlyAdapter} from '../scripts/d1-readonly-adapter.mjs';
import {fleetSchema,SCHEMA_QUERY,COUNT_QUERY} from '../scripts/d1-initialization-safety.mjs';
const accountId='a'.repeat(32);
const config=target=>JSON.parse(readFileSync(`config/${target==='staging'?'staging-no-r2':'recovery-d1'}.example.jsonc`,'utf8').replace(/^\s*\/\/.*$/gm,''));
const response=(result,status=200)=>new Response(JSON.stringify({success:true,result}),{status});
let checks=0;
async function fixture(fn){const db=new DatabaseSync(':memory:');try{await fn(db);checks++;}finally{db.close();}}
function mock(db,target='staging',intercept=()=>{}){
 const cfg=config(target),binding=structuredClone(cfg.d1_databases[0]),calls=[];
 return{target,config:cfg,expectedAccountId:accountId,calls,transport:async(url,options)=>{
  const n=calls.length;calls.push({url,options});assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);
  const base='https://api.cloudflare.com/client/v4/accounts/'+accountId;
  assert.ok([base,base+'/d1/database/'+binding.database_id,base+'/d1/database/'+binding.database_id+'/query'].includes(url));
  const override=intercept(n,url,options);if(override)return override;
  if(url===base){assert.equal(options.method,'GET');return response({id:accountId,name:'Synthetic account'});}
  if(!url.endsWith('/query')){assert.equal(options.method,'GET');return response({uuid:binding.database_id,name:binding.database_name});}
  assert.equal(options.method,'POST');const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body).sort(),['params','sql']);assert.deepEqual(body.params,[]);
  assert.ok([SCHEMA_QUERY,COUNT_QUERY].includes(body.sql));assert.ok(!body.sql.includes(';'));assert.ok(!/\b(INSERT|DELETE|UPDATE|CREATE|DROP|ALTER|REPLACE|ATTACH)\b/i.test(body.sql));
  return response([{success:true,results:db.prepare(body.sql).all(),meta:{rows_written:0,changed_db:false}}]);
 }};
}
for(const target of ['staging','recovery'])for(const existing of [false,true])await fixture(async db=>{
 if(existing)db.exec(fleetSchema);const before=db.prepare('SELECT * FROM sqlite_schema').all(),args=mock(db,target),adapter=await createD1ReadonlyAdapter(args);
 assert.deepEqual(Object.keys(adapter),['review']);const result=await adapter.review();assert.equal(result.preflight,'PASS');assert.equal(result.metadata.account_id,accountId);assert.equal(result.metadata.database_id,args.config.d1_databases[0].database_id);assert.equal(result.dashboardSchema,'NOT_VERIFIED');assert.equal(result.requiresInitializationApproval,true);assert.equal(result.sql,undefined);
 assert.equal(args.calls.length,existing?4:3);assert.deepEqual(db.prepare('SELECT * FROM sqlite_schema').all(),before);if(existing)assert.equal(db.prepare('SELECT COUNT(*) AS n FROM fleet_store').get().n,0);
});
for(const mutate of [a=>a.target='production',a=>a.target='demo',a=>a.target='toString',a=>a.expectedAccountId='../escape',a=>a.config.d1_databases[0].database_id='bad-id',a=>a.config.d1_databases[0].binding='DB',a=>a.config.d1_databases[0].binding='RECOVERY_DB',a=>a.transport=undefined])await fixture(async db=>{
 const args=mock(db);mutate(args);await assert.rejects(createD1ReadonlyAdapter(args));assert.equal(args.calls.length,0);
});
for(const [stage,result] of [[0,{id:'b'.repeat(32)}],[1,{uuid:'bad-id',name:'smart-fleet-staging-db'}],[1,{uuid:config('staging').d1_databases[0].database_id,name:'unexpected-name'}]])await fixture(async db=>{
 const args=mock(db,'staging',n=>n===stage?response(result):undefined);await assert.rejects(createD1ReadonlyAdapter(args),/D1_PREFLIGHT_IDENTITY/);assert.equal(args.calls.length,stage+1);assert.ok(!args.calls.some(c=>c.url.endsWith('/query')));
});
for(const setup of ['CREATE TABLE unexpected(value TEXT)',fleetSchema+'; CREATE VIEW other AS SELECT 1',fleetSchema+"; INSERT INTO fleet_store VALUES ('main','synthetic sentinel',17)"] )await fixture(async db=>{
 db.exec(setup);const schema=db.prepare('SELECT * FROM sqlite_schema').all(),before=setup.includes('INSERT')?db.prepare('SELECT * FROM fleet_store').all():null,args=mock(db),adapter=await createD1ReadonlyAdapter(args);
 await assert.rejects(adapter.review(),/INITIALIZATION_REFUSED_(SCHEMA|OCCUPIED)/);assert.deepEqual(db.prepare('SELECT * FROM sqlite_schema').all(),schema);if(before)assert.deepEqual(db.prepare('SELECT * FROM fleet_store').all(),before);
 assert.equal(args.calls.filter(c=>c.options.body&&JSON.parse(c.options.body).sql===COUNT_QUERY).length,before?1:0);
});
for(const stage of [0,1,2,3])for(const status of [401,403])await fixture(async db=>{
 db.exec(fleetSchema);const args=mock(db,'staging',n=>n===stage?new Response('private provider message',{status}):undefined);
 const operation=async()=>{const adapter=await createD1ReadonlyAdapter(args);return adapter.review();};await assert.rejects(operation(),error=>!error.message.includes('private provider message'));assert.equal(args.calls.length,stage+1);
});
for(const override of [()=>{throw Error('sensitive transport text');},()=>new Response('redirect',{status:302}),()=>new Response('invalid json'),()=>new Response(JSON.stringify({success:false,errors:[{message:'sensitive'}]})),()=>response([{success:false,results:[]}]),()=>response([{success:true,results:null}]),()=>response([{success:true,results:[{type:'table'}]}]),()=>response([{success:true,results:[]},{success:true,results:[]}])])await fixture(async db=>{
 const args=mock(db,'staging',n=>n===2?override():undefined),adapter=await createD1ReadonlyAdapter(args);await assert.rejects(adapter.review(),error=>!error.message.includes('sensitive'));assert.equal(args.calls.length,3);await assert.rejects(adapter.review());assert.equal(args.calls.length,3);
});
for(const meta of [{changed_db:true},{rows_written:1}])await fixture(async db=>{
 const args=mock(db,'staging',n=>n===2?response([{success:true,results:[],meta}]):undefined),adapter=await createD1ReadonlyAdapter(args);await assert.rejects(adapter.review());assert.equal(args.calls.length,3);
});
await fixture(async db=>{
 const args=mock(db),adapter=await createD1ReadonlyAdapter(args);args.config.d1_databases[0].database_id='attempted-mutation';assert.equal((await adapter.review()).metadata.database_id,config('staging').d1_databases[0].database_id);
});
// Schema evidence only: never create/query/modify a real or simulated _cf_KV table.
// A matching reserved-table definition alone does not establish database provenance.
const reserved={type:'table',name:'_cf_KV',tbl_name:'_cf_KV',sql:'CREATE TABLE _cf_KV ( key TEXT PRIMARY KEY, value BLOB ) WITHOUT ROWID'};
for(const target of ['staging','recovery'])for(const schema of [
 [reserved],
 [reserved,{type:'table',name:'fleet_store',tbl_name:'fleet_store',sql:fleetSchema}],
 [{...reserved,sql:'CREATE TABLE _cf_KV ( key TEXT PRIMARY KEY, value TEXT )'}],
 [{...reserved,type:'view',sql:'CREATE VIEW _cf_KV AS SELECT 1'}],
 [reserved,{type:'table',name:'unrelated',tbl_name:'unrelated',sql:'CREATE TABLE unrelated(value TEXT)'}]
])await fixture(async db=>{
 const before=db.prepare('SELECT * FROM sqlite_schema').all();
 const args=mock(db,target,n=>n===2?response([{success:true,results:schema,meta:{rows_written:0,changed_db:false}}]):undefined);
 const adapter=await createD1ReadonlyAdapter(args);await assert.rejects(adapter.review(),/INITIALIZATION_REFUSED_SCHEMA/);
 assert.equal(args.calls.length,3);assert.deepEqual(args.calls.filter(c=>c.options.body).map(c=>JSON.parse(c.options.body).sql),[SCHEMA_QUERY]);
 assert.deepEqual(db.prepare('SELECT * FROM sqlite_schema').all(),before);
});
console.log(`PASS D1 read-only adapter: ${checks} mock fixtures, provider metadata identity, exact target/SQL/URL allowlists, unknown schema/occupied refusal, permission/query/network failures, reserved-table evidence fails closed separately for staging/recovery without value reads; actual Cloudflare NOT_VERIFIED`);
