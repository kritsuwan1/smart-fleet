import assert from 'node:assert/strict';
import {readFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createD1ReadonlyBroker,describeMockBrokerPolicy} from '../scripts/d1-readonly-broker.mjs';
import {DASHBOARD_ACCOUNT_ID} from '../scripts/d1-provider-identity.mjs';
import {SCHEMA_QUERY,COUNT_QUERY} from '../scripts/d1-initialization-safety.mjs';
const config=async target=>JSON.parse((await readFile(`config/${target==='staging'?'staging-no-r2':'recovery-d1'}.example.jsonc`,'utf8')).replace(/^\s*\/\/.*$/gm,''));
const cfg={staging:await config('staging'),recovery:await config('recovery')};
const originalFetch=globalThis.fetch;let networkCalls=0,checks=0;
globalThis.fetch=()=>{networkCalls++;throw Error('network forbidden');};
async function test(fn){await fn();checks++;}
const options=(target='staging',extra={})=>({target,config:structuredClone(cfg[target]),...extra});
function request(method='GET',sql){return{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},...(sql?{body:JSON.stringify({sql,params:[]})}:{})};}
const base='https://api.cloudflare.com/client/v4/accounts/'+DASHBOARD_ACCOUNT_ID;
function approval(target='staging',extra={}){const p=describeMockBrokerPolicy(target,cfg[target]);return{mode:'mock',target,accountId:DASHBOARD_ACCOUNT_ID,databaseId:p.databaseId,configSha256:p.configSha256,policySha256:p.policySha256,issuedAt:Date.now()-1000,expiresAt:Date.now()+30000,requestBudget:4,...extra};}
try{
 for(const target of ['staging','recovery'])for(const scenario of ['reserved','empty','fleet-empty'])await test(async()=>{
  const broker=createD1ReadonlyBroker(options(target,{scenario})),evidence=await broker.run();
  assert.equal(evidence.mode,'mock');assert.equal(evidence.synthetic,true);assert.equal(evidence.status,'PASS');assert.equal(evidence.liveVerification,'NOT_VERIFIED');assert.equal(evidence.fleetStoreCount,scenario==='fleet-empty'?0:null);
  assert.equal(evidence.requests.length,scenario==='fleet-empty'?4:3);assert.deepEqual(evidence.requests.map(r=>r.stage),scenario==='fleet-empty'?['account','database','schema','count']:['account','database','schema']);
  assert.equal(evidence.mockMetadata.databaseId,cfg[target].d1_databases[0].database_id);assert.equal(evidence.fresh,true);assert.equal(evidence.reason,null);
  evidence.expected.accountId='modified-snapshot';assert.equal(broker.getEvidence().expected.accountId,DASHBOARD_ACCOUNT_ID);
  await assert.rejects(broker.run(),/REPLAY/);
 });
 for(const mode of ['live','offline-live',true,'LIVE'])await test(async()=>{
  assert.throws(()=>createD1ReadonlyBroker(options('staging',{mode,approval:approval()})),/LIVE_DISABLED/);
 });
 for(const extra of [{transport:()=>{}},{fetch:()=>{}},{token:'MOCK_SENSITIVE_SENTINEL'},{credentials:{}},{headers:{Authorization:'MOCK_SENSITIVE_SENTINEL'}}])await test(async()=>{
  assert.throws(()=>createD1ReadonlyBroker(options('staging',extra)),/OPTIONS/);
 });
 for(const target of ['production','demo','toString'])await test(async()=>assert.throws(()=>createD1ReadonlyBroker({target,config:cfg.staging})));
 for(const mutate of [c=>c.d1_databases[0].database_id='wrong',c=>c.d1_databases[0].binding='DB',c=>c.d1_databases[0].database_name='wrong'])await test(async()=>{
  const args=options();mutate(args.config);assert.throws(()=>createD1ReadonlyBroker(args));
 });
 for(const scenario of ['permission-account','permission-database','permission-schema','permission-count','unauthorized-account','network-account','network-schema','wrong-account','wrong-database','wrong-name','schema-mismatch','query-failure','redirect-account','redirect-schema','invalid-json','changed-db','malformed-count','fleet-occupied'])await test(async()=>{
  const broker=createD1ReadonlyBroker(options('staging',{scenario}));await assert.rejects(broker.run(),/^Error: D1_BROKER_/);
  const evidence=broker.getEvidence();assert.equal(evidence.status,'REFUSED');assert.ok(evidence.requests.length<=4);assert.equal(evidence.liveVerification,'NOT_VERIFIED');
  const count=evidence.requests.length;await assert.rejects(broker.transport(base,request()));assert.equal(broker.getEvidence().requests.length,count);
  const serialized=JSON.stringify(evidence);assert.doesNotMatch(serialized,/confidential|MOCK_PRIVATE_LITERAL|Authorization|Cookie|Bearer/);
  if(scenario==='schema-mismatch'){assert.equal(evidence.schemaEvidence.accepted,false);assert.match(evidence.schemaEvidence.digest,/^[0-9a-f]{64}$/);assert.equal(evidence.schemaEvidence.objects,undefined);}
 });
 for(const url of [base.replace('https:','http:'),base.replace('api.cloudflare.com','outside.invalid'),base+'?token=MOCK_SENSITIVE_SENTINEL',base+'#fragment',base.replace(DASHBOARD_ACCOUNT_ID,'b'.repeat(32)),base+'/d1/database/'+cfg.recovery.d1_databases[0].database_id,base.replace('api.cloudflare.com','user@api.cloudflare.com'),base+'/../'+DASHBOARD_ACCOUNT_ID])await test(async()=>{
  const broker=createD1ReadonlyBroker(options());await assert.rejects(broker.transport(url,request()),/URL/);assert.deepEqual(broker.getEvidence().requests,[]);assert.doesNotMatch(JSON.stringify(broker.getEvidence()),/MOCK_SENSITIVE_SENTINEL|outside.invalid/);
 });
 for(const change of [r=>r.method='DELETE',r=>r.redirect='follow',r=>r.body='unexpected',r=>r.headers.Authorization='MOCK_SENSITIVE_SENTINEL',r=>r.credentials='include',r=>r.signal=AbortSignal.abort()])await test(async()=>{
  const broker=createD1ReadonlyBroker(options()),r=request();change(r);await assert.rejects(broker.transport(base,r));assert.deepEqual(broker.getEvidence().requests,[]);assert.doesNotMatch(JSON.stringify(broker.getEvidence()),/MOCK_SENSITIVE_SENTINEL|Authorization/);
 });
 for(const sql of ["SELECT * FROM _cf_KV","SELECT COUNT(*) FROM _cf_KV",SCHEMA_QUERY+'; DELETE FROM fleet_store','PRAGMA writable_schema=ON','SELECT payload FROM fleet_store'])await test(async()=>{
  const broker=createD1ReadonlyBroker(options());await broker.transport(base,request());const path=base+'/d1/database/'+cfg.staging.d1_databases[0].database_id;await broker.transport(path,request());
  await assert.rejects(broker.transport(path+'/query',request('POST',sql)),/SQL/);assert.equal(broker.getEvidence().requests.length,2);
 });
 await test(async()=>{
  const broker=createD1ReadonlyBroker(options());await broker.transport(base,request());const path=base+'/d1/database/'+cfg.staging.d1_databases[0].database_id;await broker.transport(path,request());await assert.rejects(broker.transport(path+'/query',request('POST',COUNT_QUERY)),/SQL/);
 });
 await test(async()=>{
  const broker=createD1ReadonlyBroker(options()),first=broker.transport(base,request());const second=broker.transport(base,request());const result=await Promise.allSettled([first,second]);assert.ok(result.every(r=>r.status==='rejected'));assert.equal(broker.getEvidence().requests.length,1);
 });
 await test(async()=>{
  const broker=createD1ReadonlyBroker(options()),controller=new AbortController(),r=request();r.signal=controller.signal;const pending=broker.transport(base,r);controller.abort();await assert.rejects(pending,/ABORTED/);assert.equal(broker.getEvidence().status,'REFUSED');
 });
 await test(async()=>{
  const args=options(),broker=createD1ReadonlyBroker(args);args.config.d1_databases[0].database_id='changed';assert.equal((await broker.run()).mockMetadata.databaseId,cfg.staging.d1_databases[0].database_id);
 });
 await test(async()=>{
  const broker=createD1ReadonlyBroker(options('recovery',{approval:approval('recovery')}));assert.equal((await broker.run()).mockApprovalChecked,true);
 });
 for(const mutation of [{target:'recovery'},{accountId:'b'.repeat(32)},{databaseId:cfg.recovery.d1_databases[0].database_id},{policySha256:'0'.repeat(64)},{configSha256:'0'.repeat(64)},{expiresAt:Date.now()-1},{mode:'live'},{requestBudget:5}])await test(async()=>assert.throws(()=>createD1ReadonlyBroker(options('staging',{approval:approval('staging',mutation)}))));
 await test(async()=>{
  const broker=createD1ReadonlyBroker(options('staging',{approval:approval('staging',{requestBudget:2})}));await assert.rejects(broker.run(),/BUDGET/);assert.equal(broker.getEvidence().requests.length,2);
 });
 await test(async()=>{
  const broker=createD1ReadonlyBroker(options()),now=Date.now;try{const future=Date.now()+61000;Date.now=()=>future;await assert.rejects(broker.run(),/EVIDENCE_EXPIRED/);assert.equal(broker.getEvidence().fresh,false);assert.deepEqual(broker.getEvidence().requests,[]);}finally{Date.now=now;}
 });
 await test(async()=>{
  const broker=createD1ReadonlyBroker(options());await broker.run();const now=Date.now;try{const future=Date.now()+61000;Date.now=()=>future;assert.equal(broker.getEvidence().fresh,false);}finally{Date.now=now;}
 });
 await test(async()=>{
  const broker=createD1ReadonlyBroker(options());await assert.rejects(broker.saveEvidence(),/NOT_FINISHED/);await broker.run();const saved=await broker.saveEvidence();
  try{const content=await readFile(saved.path,'utf8');assert.equal(createHash('sha256').update(content).digest('hex'),saved.sha256);assert.equal(JSON.parse(content).mode,'mock');assert.match(saved.path,/[\\/]\.qa[\\/]d1-evidence[\\/]mock-staging-/);assert.doesNotMatch(content,/Authorization|Cookie|Bearer|confidential/);await assert.rejects(broker.saveEvidence(),error=>error.code==='EEXIST');}finally{await unlink(saved.path);}
 });
 assert.equal(networkCalls,0);
 console.log(`PASS mock-only D1 broker: ${checks} cases, no network/live/credentials, exact request/identity/schema policy, failure/expiry/budget/replay refusal and redacted evidence persistence`);
}finally{globalThis.fetch=originalFetch;}
