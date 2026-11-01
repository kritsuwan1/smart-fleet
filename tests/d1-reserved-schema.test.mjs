import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {DASHBOARD_ACCOUNT_ID,RESERVED_DDL,verifyCloudflareD1Identity} from '../scripts/d1-provider-identity.mjs';
import {prepareD1Initialization,fleetSchema,SCHEMA_QUERY,COUNT_QUERY} from '../scripts/d1-initialization-safety.mjs';
import {createD1ReadonlyAdapter} from '../scripts/d1-readonly-adapter.mjs';
const reserved=()=>({type:'table',name:'_cf_KV',tbl_name:'_cf_KV',sql:RESERVED_DDL});
const fleet={type:'table',name:'fleet_store',tbl_name:'fleet_store',sql:fleetSchema};
const config=target=>JSON.parse(readFileSync(`config/${target==='staging'?'staging-no-r2':'recovery-d1'}.example.jsonc`,'utf8').replace(/^\s*\/\/.*$/gm,''));
async function identity(target,account=DASHBOARD_ACCOUNT_ID){
 const binding=config(target).d1_databases[0];
 return verifyCloudflareD1Identity({target,expectedAccountId:account,read:async path=>path.endsWith(binding.database_id)?{uuid:binding.database_id,name:binding.database_name}:{id:account}});
}
function input(target,metadata,objects,count=0){
 const queries=[];return{target,metadata,config:config(target),expectedAccountId:metadata.account_id,queries,query:async sql=>{queries.push(sql);assert.ok([SCHEMA_QUERY,COUNT_QUERY].includes(sql));return sql===SCHEMA_QUERY?structuredClone(objects):[{row_count:count}];}};
}
// Evaluate the actual first SQL guard against synthetic schema metadata via CTE.
// Never create/query/modify a _cf_KV table, even in local SQLite.
function guardAccepts(sql,objects){
 const db=new DatabaseSync(':memory:');try{
  const first=sql.slice(0,sql.indexOf('-- REVIEW ONLY.'));
  const cte=`WITH sqlite_schema(type,name,tbl_name,sql) AS (SELECT json_extract(value,'$.type'),json_extract(value,'$.name'),json_extract(value,'$.tbl_name'),json_extract(value,'$.sql') FROM json_each(?)) `;
  const before=db.prepare('SELECT * FROM sqlite_schema').all();
  let accepted=true;try{db.prepare(cte+first).get(JSON.stringify(objects));}catch{accepted=false;}
  assert.deepEqual(db.prepare('SELECT * FROM sqlite_schema').all(),before);return accepted;
 }finally{db.close();}
}
let checks=0;
for(const target of ['staging','recovery']){
 const metadata=await identity(target);
 for(const objects of [[reserved()],[reserved(),fleet],[],[fleet]]){
  const args=input(target,metadata,objects),before=structuredClone(objects),plan=await prepareD1Initialization(args);
  assert.match(plan.sql,/VERIFIED_D1_RESERVED_CONTEXT \*\/ 1/);assert.equal(guardAccepts(plan.sql,objects),true);assert.deepEqual(objects,before);
  assert.equal(args.queries.length,objects.includes(fleet)?2:1);checks++;
 }
 const allowedPlan=await prepareD1Initialization(input(target,metadata,[]));
 const raw=readFileSync(`config/initialize-${target}.example.sql`,'utf8');
 assert.equal(guardAccepts(raw,[reserved()]),false);assert.equal(guardAccepts(raw,[]),true);checks++;
 const badSchemas=[
  [{...reserved(),type:'view'}],[{...reserved(),name:'_cf_other',tbl_name:'_cf_other'}],
  [{...reserved(),tbl_name:'wrong'}],[{...reserved(),sql:RESERVED_DDL+';'}],
  [{...reserved(),sql:RESERVED_DDL.replace('BLOB','TEXT')}],
  [{...reserved(),sql:RESERVED_DDL.replace('key TEXT','keyTEXT')}],
  [{...reserved(),sql:RESERVED_DDL.replace('_cf_KV','_cf_ KV')}],
  [{...reserved(),sql:RESERVED_DDL.replace('WITHOUT ROWID','')}],
  [{...reserved(),sql:RESERVED_DDL.replace('value BLOB','value BLOB, extra TEXT')}],
  [{...reserved(),sql:RESERVED_DDL+' -- comment'}],
  [{...reserved(),sql:null}],
  [{...reserved(),name:'_cf_kv',tbl_name:'_cf_kv'}],
  [{...reserved(),sql:RESERVED_DDL.toLowerCase()}],
  [reserved(),reserved()],
  [reserved(),{type:'table',name:'other',tbl_name:'other',sql:'CREATE TABLE other(value TEXT)'}],
  [reserved(),{type:'trigger',name:'other',tbl_name:'_cf_KV',sql:'synthetic metadata'}],
  [reserved(),{type:'index',name:'other',tbl_name:'_cf_KV',sql:'synthetic metadata'}]
 ];
 for(const objects of badSchemas){
  const args=input(target,metadata,objects),before=structuredClone(objects);
  await assert.rejects(prepareD1Initialization(args),/REFUSED_SCHEMA/);assert.deepEqual(args.queries,[SCHEMA_QUERY]);assert.deepEqual(objects,before);
  assert.equal(guardAccepts(allowedPlan.sql,objects),false);checks++;
 }
 for(const unverified of [{...metadata},Object.freeze({...metadata}),await identity(target,'a'.repeat(32))]){
  const args=input(target,unverified,[reserved()]);await assert.rejects(prepareD1Initialization(args),/REFUSED_SCHEMA/);assert.deepEqual(args.queries,[SCHEMA_QUERY]);checks++;
 }
 // Verified metadata for one target cannot certify the other.
 const other=await identity(target==='staging'?'recovery':'staging');
 const crossed=input(target,other,[reserved()]);await assert.rejects(prepareD1Initialization(crossed),/REFUSED_IDENTITY/);assert.deepEqual(crossed.queries,[]);checks++;
 // No application-payload mutation on occupied refusal, even with accepted provider schema.
 const db=new DatabaseSync(':memory:');try{
  db.exec(fleetSchema);db.prepare('INSERT INTO fleet_store VALUES (?,?,?)').run('main','synthetic-preserved',17);const before=db.prepare('SELECT * FROM fleet_store').all();
  const args=input(target,metadata,[reserved(),fleet]);args.query=async sql=>{args.queries.push(sql);return sql===SCHEMA_QUERY?[reserved(),fleet]:db.prepare(sql).all();};
  await assert.rejects(prepareD1Initialization(args),/REFUSED_OCCUPIED/);assert.deepEqual(db.prepare('SELECT * FROM fleet_store').all(),before);checks++;
 }finally{db.close();}
 // End-to-end adapter: only mocked API metadata and schema/count, never KV rows.
 for(const objects of [[reserved()],[reserved(),fleet]]){
  const cfg=config(target),binding=cfg.d1_databases[0],calls=[];
  const adapter=await createD1ReadonlyAdapter({target,config:cfg,expectedAccountId:DASHBOARD_ACCOUNT_ID,transport:async(url,options)=>{
   calls.push({url,options});assert.equal(options.redirect,'error');let result;
   if(options.method==='GET')result=url.endsWith(binding.database_id)?{uuid:binding.database_id,name:binding.database_name}:{id:DASHBOARD_ACCOUNT_ID};
   else{const {sql}=JSON.parse(options.body);assert.ok([SCHEMA_QUERY,COUNT_QUERY].includes(sql));result=[{success:true,results:sql===SCHEMA_QUERY?objects:[{row_count:0}],meta:{rows_written:0,changed_db:false}}];}
   return new Response(JSON.stringify({success:true,result}));
  }});
  const result=await adapter.review();assert.equal(result.preflight,'PASS');assert.equal(result.requiresInitializationApproval,true);assert.equal(calls.length,objects.includes(fleet)?4:3);checks++;
 }
}
// Forged source/verification flags do not substitute for provider responses.
const forged={...(await identity('staging')),apiVerified:true,source:'cloudflare-api'};
await assert.rejects(prepareD1Initialization(input('staging',forged,[reserved()])),/REFUSED_SCHEMA/);checks++;
// Expired evidence cannot enable the exception. No wall-clock wait is needed.
const metadata=await identity('staging'),clock=Date.now;
try{const now=Date.now();Date.now=()=>now+61000;await assert.rejects(prepareD1Initialization(input('staging',metadata,[reserved()])),/REFUSED_SCHEMA/);checks++;}finally{Date.now=clock;}
console.log(`PASS verified D1 reserved schema: ${checks} mock cases, exact DDL/identity capability/TTL, planner-SQL guard parity, strict raw templates, separate targets, unknown schema/occupied refusal and data preservation; no KV table/value operations; live API NOT_VERIFIED`);
