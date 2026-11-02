// MOCK ONLY. No fetch/http client, injected transport, credential source or live path.
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,realpath,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,relative,isAbsolute} from 'node:path';
import {createD1ReadonlyAdapter} from './d1-readonly-adapter.mjs';
import {DASHBOARD_ACCOUNT_ID,RESERVED_DDL} from './d1-provider-identity.mjs';
import {SCHEMA_QUERY,COUNT_QUERY,fleetSchema,validateInitializationTarget,validateInitializationSchema} from './d1-initialization-safety.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=code=>{throw Error('D1_BROKER_'+code);};
const fields=(value,allowed)=>value&&Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).every(key=>allowed.includes(key));
const scenarios=new Set(['reserved','empty','fleet-empty','fleet-occupied','permission-account','permission-database','permission-schema','permission-count','unauthorized-account','network-account','network-schema','wrong-account','wrong-database','wrong-name','schema-mismatch','query-failure','redirect-account','redirect-schema','invalid-json','changed-db','malformed-count']);

export function describeMockBrokerPolicy(target,config){
 const expected=validateInitializationTarget(target,config);
 const configSha256=hash(JSON.stringify(config));
 const policy={version:1,mode:'mock',accountId:DASHBOARD_ACCOUNT_ID,target,databaseId:expected.id,binding:expected.binding,origin:'https://api.cloudflare.com',methods:['GET','POST'],sql:[SCHEMA_QUERY,COUNT_QUERY],maximumRequests:4,timeoutMs:15000,liveEnabled:false};
 return Object.freeze({...policy,configSha256,policySha256:hash(JSON.stringify(policy))});
}

function checkMockApproval(approval,policy,now){
 if(!fields(approval,['mode','target','accountId','databaseId','configSha256','policySha256','issuedAt','expiresAt','requestBudget']))fail('APPROVAL');
 if(approval.mode!=='mock'||approval.target!==policy.target||approval.accountId!==policy.accountId||approval.databaseId!==policy.databaseId||approval.configSha256!==policy.configSha256||approval.policySha256!==policy.policySha256)fail('APPROVAL');
 if(!Number.isSafeInteger(approval.issuedAt)||!Number.isSafeInteger(approval.expiresAt)||approval.issuedAt>now||approval.expiresAt<=now||approval.expiresAt-approval.issuedAt>300000)fail('APPROVAL_EXPIRED');
 if(!Number.isInteger(approval.requestBudget)||approval.requestBudget<1||approval.requestBudget>4)fail('APPROVAL');
}

export function createD1ReadonlyBroker(options={}){
 if(!fields(options,['mode','target','config','scenario','approval']))fail('OPTIONS');
 const {mode='mock',target,scenario='reserved'}=options;
 // Explicit approval cannot unlock live mode in a mock-only implementation.
 if(mode!=='mock')fail('LIVE_DISABLED');
 if(!scenarios.has(scenario))fail('SCENARIO');
 const config=structuredClone(options.config),expected=validateInitializationTarget(target,config);
 const policy=describeMockBrokerPolicy(target,config),created=Date.now();
 const approval=options.approval===undefined?null:structuredClone(options.approval);
 if(approval)checkMockApproval(approval,policy,created);
 const budget=approval?.requestBudget??4;
 const deadline=Math.min(created+60000,approval?.expiresAt??Infinity);
 const base='https://api.cloudflare.com/client/v4/accounts/'+DASHBOARD_ACCOUNT_ID;
 const database=base+'/d1/database/'+expected.id;
 let state='account',busy=false,closed=false,used=false,attempts=0,hasFleet=false;
 const evidence={formatVersion:1,mode:'mock',synthetic:true,liveVerification:'NOT_VERIFIED',runId:randomUUID(),target,expected:{accountId:DASHBOARD_ACCOUNT_ID,databaseId:expected.id,databaseName:expected.name,binding:expected.binding},policySha256:policy.policySha256,configSha256:policy.configSha256,mockApprovalChecked:!!approval,createdAt:new Date(created).toISOString(),expiresAt:new Date(deadline).toISOString(),startedAt:null,finishedAt:null,status:'NOT_RUN',reason:null,mockMetadata:null,schemaEvidence:null,fleetStoreCount:null,requests:[]};
 const stamp=()=>new Date().toISOString();
 function stop(code){closed=true;evidence.status='REFUSED';evidence.reason=code;evidence.finishedAt=stamp();fail(code);}
 function fresh(){const now=Date.now();if(now<created||now>=deadline)stop('EVIDENCE_EXPIRED');if(approval){try{checkMockApproval(approval,policy,now);}catch{stop('APPROVAL_EXPIRED');}}}
 function mockResponse(stage){
  if(scenario==='network-'+stage)throw Error('mock confidential transport detail');
  if(scenario==='permission-'+stage)return new Response('mock confidential permission detail',{status:403});
  if(scenario==='unauthorized-'+stage)return new Response('mock confidential authentication detail',{status:401});
  if(scenario==='redirect-'+stage)return new Response('mock confidential redirect',{status:302,headers:{Location:'https://outside.invalid/'}});
  if(scenario==='invalid-json'&&stage==='schema')return new Response('mock confidential invalid body');
  let result;
  if(stage==='account')result={id:scenario==='wrong-account'?'b'.repeat(32):DASHBOARD_ACCOUNT_ID,name:'Synthetic account'};
  else if(stage==='database')result={uuid:scenario==='wrong-database'?'00000000-0000-0000-0000-000000000000':expected.id,name:scenario==='wrong-name'?'unexpected':expected.name};
  else{
   const objects=scenario==='empty'?[]:[{type:'table',name:'_cf_KV',tbl_name:'_cf_KV',sql:RESERVED_DDL}];
   if(['fleet-empty','fleet-occupied','permission-count','malformed-count'].includes(scenario))objects.push({type:'table',name:'fleet_store',tbl_name:'fleet_store',sql:fleetSchema});
   if(scenario==='schema-mismatch')objects.push({type:'table',name:'unknown',tbl_name:'unknown',sql:"CREATE TABLE unknown(value TEXT DEFAULT 'MOCK_PRIVATE_LITERAL')"});
   result=[{success:true,results:stage==='schema'?objects:[{row_count:scenario==='malformed-count'?-1:scenario==='fleet-occupied'?1:0}],meta:{rows_written:0,changed_db:scenario==='changed-db'}}];
  }
  if(scenario==='query-failure'&&stage==='schema')return new Response(JSON.stringify({success:false,errors:[{message:'mock confidential query detail'}]}));
  return new Response(JSON.stringify({success:true,result}));
 }
 async function transport(url,request={}){
  if(closed)fail('CLOSED');
  fresh();
  if(busy)stop('CONCURRENT');
  if(state==='complete')stop('REPLAY');
  if(!fields(request,['method','redirect','signal','headers','body']))stop('REQUEST_OPTIONS');
  const expectedUrl=state==='account'?base:state==='database'?database:database+'/query';
  if(typeof url!=='string'||url!==expectedUrl)stop('URL');
  const method=['schema','count'].includes(state)?'POST':'GET';
  if(request.method!==method||request.redirect!=='error')stop('METHOD_OR_REDIRECT');
  if(!(request.signal instanceof AbortSignal)||request.signal.aborted)stop('ABORTED');
  // Inspect header names before any values. Never accept/read an auth header.
  if(!fields(request.headers,['Content-Type'])||request.headers['Content-Type']!=='application/json')stop('HEADERS');
  if(method==='GET'&&request.body!==undefined)stop('BODY');
  if(method==='POST'){
   let body;try{body=JSON.parse(request.body);}catch{stop('BODY');}
   if(!fields(body,['sql','params'])||!Array.isArray(body.params)||body.params.length!==0||body.sql!==(state==='schema'?SCHEMA_QUERY:COUNT_QUERY))stop('SQL');
   if(state==='count'&&!hasFleet)stop('ORDER');
  }
  if(attempts>=budget)stop('BUDGET');
  const stage=state;attempts++;busy=true;
  evidence.startedAt??=stamp();
  const event={stage,method,startedAt:stamp(),finishedAt:null,httpStatus:null,result:'PENDING'};
  evidence.requests.push(event);
  try{
   const response=mockResponse(stage);event.httpStatus=response.status;
   if(response.status===401||response.status===403)stop('PERMISSION');
   if(!response.ok||response.redirected)stop('HTTP_OR_REDIRECT');
   const body=await response.json();fresh();if(request.signal.aborted)stop('ABORTED');if(closed)fail('CLOSED');
   if(body?.success!==true||body.result==null||body.errors?.length)stop('QUERY_OR_RESPONSE');
   const result=body.result;
   if(stage==='account'){
    if(result.id!==DASHBOARD_ACCOUNT_ID)stop('IDENTITY');
    evidence.mockMetadata={accountId:result.id};state='database';
   }else if(stage==='database'){
    if(result.uuid!==expected.id||result.name!==expected.name)stop('IDENTITY');
    Object.assign(evidence.mockMetadata,{databaseId:result.uuid,databaseName:result.name});state='schema';
   }else{
    if(!Array.isArray(result)||result.length!==1||result[0]?.success!==true||!Array.isArray(result[0].results)||result[0].meta?.changed_db===true||result[0].meta?.rows_written>0)stop('QUERY_RESPONSE');
    const rows=result[0].results;
    if(stage==='schema'){
     // Mock metadata identity was checked above; policy is shared with planner.
     try{hasFleet=validateInitializationSchema(rows,true);}catch{
      evidence.schemaEvidence={accepted:false,objectCount:rows.length,digest:hash(JSON.stringify(rows))};stop('SCHEMA');
     }
     evidence.schemaEvidence={accepted:true,objects:rows.map(row=>({type:'table',name:row.name,tbl_name:row.tbl_name,ddlSha256:hash(row.sql),definition:row.name==='_cf_KV'?RESERVED_DDL:fleetSchema}))};
     state=hasFleet?'count':'complete';
    }else{
     if(rows.length!==1||rows[0]?.row_count!==0)stop('OCCUPIED_OR_COUNT');
     evidence.fleetStoreCount=0;state='complete';
    }
   }
   event.result='PASS';event.finishedAt=stamp();
   // Return a new body with no headers; never forward an unknown response object.
   return new Response(JSON.stringify(body));
  }catch{
   event.result='REFUSED';event.finishedAt=stamp();
   if(!closed){closed=true;evidence.status='REFUSED';evidence.reason='NETWORK_OR_RESPONSE';evidence.finishedAt=stamp();}
   fail(evidence.reason||'CLOSED');
  }finally{busy=false;}
 }
 function getEvidence(){
  const now=Date.now(),copy=structuredClone(evidence);
  copy.fresh=now>=created&&now<deadline;
  copy.createdAtBangkok=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',dateStyle:'short',timeStyle:'long'}).format(new Date(created));
  return copy;
 }
 async function run(){
  if(used)fail('REPLAY');used=true;fresh();
  if(state!=='account'||attempts!==0)stop('ORDER');
  try{
   const adapter=await createD1ReadonlyAdapter({target,config,expectedAccountId:DASHBOARD_ACCOUNT_ID,transport});
   await adapter.review();fresh();if(closed||state!=='complete')stop('INCOMPLETE');
   evidence.status='PASS';evidence.finishedAt=stamp();return getEvidence();
  }catch{
   if(!closed){closed=true;evidence.status='REFUSED';evidence.reason='ADAPTER_REFUSED';evidence.finishedAt=stamp();}
   fail(evidence.reason);
  }
 }
 async function saveEvidence(){
  if(evidence.status==='NOT_RUN'||busy)fail('EVIDENCE_NOT_FINISHED');
  const root=await realpath(fileURLToPath(new URL('../',import.meta.url)));
  const inside=path=>{const rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+(process.platform==='win32'?'\\':'/')))fail('EVIDENCE_PATH');};
  const qa=join(root,'.qa');await mkdir(qa,{recursive:true});inside(await realpath(qa));
  const dir=join(qa,'d1-evidence');await mkdir(dir,{recursive:true});inside(await realpath(dir));
  const path=join(dir,`mock-${target}-${evidence.runId}.json`),content=JSON.stringify(getEvidence(),null,2)+'\n';
  await writeFile(path,content,{flag:'wx',mode:0o600});return{path,sha256:hash(content)};
 }
 return Object.freeze({run,transport,getEvidence,saveEvidence});
}
