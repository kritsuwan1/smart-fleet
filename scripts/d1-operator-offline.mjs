// Option A rehearsal ONLY. No network client, credential source or real storage.
import {createHash,randomUUID} from 'node:crypto';
import {win32} from 'node:path';
import {createD1ReadonlyBroker,describeMockBrokerPolicy} from './d1-readonly-broker.mjs';
import {createD1ReadonlyAdapter} from './d1-readonly-adapter.mjs';
import {DASHBOARD_ACCOUNT_ID,INITIALIZATION_TARGETS} from './d1-provider-identity.mjs';
import {SCHEMA_QUERY,COUNT_QUERY} from './d1-initialization-safety.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=code=>{throw Error('D1_OPERATOR_OFFLINE_'+code);};
const exact=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const subset=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).every(k=>keys.includes(k));
const fixtures=new WeakMap();
let processClaimed=false; // Intentionally no reset/release or cross-target process reuse.
const operatorSid='S-1-5-21-100-200-300-1001'; // Synthetic public identifier, not host inspection.
const root='C:\\SyntheticOperator\\AppData\\Local\\SmartFleet\\D1ReadOnly';
const scenarios=new Set(['reserved','empty','fleet-empty','fleet-occupied','permission-account','permission-schema','network-account','wrong-account','wrong-database','wrong-name','schema-mismatch','redirect-account','redirect-schema','invalid-json','query-failure','changed-db','malformed-count','bootstrap-missing','host-shared','operator-wrong','storage-unavailable','storage-sync','storage-reparse','storage-acl','storage-network','storage-path','storage-outside','storage-inherited','storage-owner','storage-corrupt','storage-full','evidence-failure','cancelled','expired','clock-rollback','abort','tls-certificate','tls-hostname','timeout-dns','timeout-connect','timeout-tls','timeout-headers','timeout-body']);

// Inspect names only: never access environment values or print the supplied names.
export function validateOfflineEnvironmentNames(names){
 if(!Array.isArray(names)||names.some(n=>typeof n!=='string'))fail('ENVIRONMENT');
 const unsafe=/^(?:NODE_OPTIONS|NODE_PATH|NODE_USE_ENV_PROXY|NODE_USE_SYSTEM_CA|NODE_EXTRA_CA_CERTS|NODE_TLS_REJECT_UNAUTHORIZED|NODE_V8_COVERAGE|NODE_REDIRECT_WARNINGS|NODE_DEBUG(?:_NATIVE)?|SSLKEYLOGFILE|SSL_CERT_FILE|SSL_CERT_DIR|OPENSSL_CONF|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY)$/i;
 if(names.some(n=>unsafe.test(n)))fail('ENVIRONMENT');
}

// Pure decision over SYNTHETIC facts. This does not obtain/attest Windows ACLs.
export function validateSyntheticWindowsStorage(facts){
 if(!exact(facts,['resolvedRoot','expectedRoot','operatorSid','ownerSid','local','reparse','inherited','aces','excludedRoots']))fail('STORAGE');
 const validPath=p=>typeof p==='string'&&/^[A-Za-z]:\\/.test(p)&&!/[<>"|?*\x00-\x1f]/.test(p)&&!p.slice(2).includes(':')&&p.split('\\').slice(1).every(s=>s&&s!=='.'&&s!=='..'&&!/[. ]$/.test(s)&&!/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(s))&&win32.normalize(p)===p;
 if(!validPath(facts.resolvedRoot)||!validPath(facts.expectedRoot)||facts.resolvedRoot.toLowerCase()!==facts.expectedRoot.toLowerCase()||facts.operatorSid!==operatorSid||facts.ownerSid!==operatorSid||facts.local!==true||facts.reparse!==false||facts.inherited!==false)fail('STORAGE');
 if(!Array.isArray(facts.excludedRoots)||!facts.excludedRoots.length||facts.excludedRoots.some(p=>!validPath(p)))fail('STORAGE');
 const inside=(p,parent)=>p.toLowerCase()===parent.toLowerCase()||p.toLowerCase().startsWith(parent.toLowerCase()+'\\');
 if(facts.excludedRoots.some(p=>inside(facts.resolvedRoot,p))||/(?:^|\\)(?:\.git|OneDrive(?: - [^\\]+)?|Dropbox)(?:\\|$)/i.test(facts.resolvedRoot))fail('STORAGE');
 const allowed=[operatorSid,'S-1-5-18','S-1-5-32-544'];
 if(!Array.isArray(facts.aces)||facts.aces.length!==3||new Set(facts.aces.map(a=>a?.sid)).size!==3||facts.aces.some(a=>!exact(a,['sid','access'])||!allowed.includes(a.sid)||a.access!=='full'))fail('STORAGE');
 return Object.freeze({synthetic:true,decision:'ACCEPTED_MODEL_ONLY',actualAcl:'NOT_VERIFIED'});
}

export function createSyntheticOperatorFixture(options={}){
 if(!subset(options,['scenario','environmentNames']))fail('FIXTURE_OPTIONS');
 const {scenario='reserved',environmentNames=[]}=options;
 if(!scenarios.has(scenario))fail('SCENARIO');
 validateOfflineEnvironmentNames(environmentNames);
 const facts={resolvedRoot:root,expectedRoot:root,operatorSid,ownerSid:operatorSid,local:true,reparse:false,inherited:false,aces:[operatorSid,'S-1-5-18','S-1-5-32-544'].map(sid=>({sid,access:'full'})),excludedRoots:['C:\\SyntheticOperator\\OneDrive','C:\\SyntheticCheckout']};
 if(scenario==='storage-sync')facts.resolvedRoot=facts.expectedRoot='C:\\SyntheticOperator\\OneDrive\\SmartFleet';
 if(scenario==='storage-reparse')facts.reparse=true;
 if(scenario==='storage-acl')facts.aces.push({sid:'S-1-1-0',access:'full'});
 if(scenario==='storage-network')facts.local=false;
 if(scenario==='storage-path')facts.resolvedRoot=facts.expectedRoot='C:\\SyntheticOperator\\..\\Shared';
 if(scenario==='storage-outside')facts.resolvedRoot='C:\\Shared';
 if(scenario==='storage-inherited')facts.inherited=true;
 if(scenario==='storage-owner')facts.ownerSid='S-1-1-0';
 const token=Object.freeze({synthetic:true,notOperatorAuthority:true});
 fixtures.set(token,{scenario,facts,journal:new Map(),events:[],bootstrap:scenario!=='bootstrap-missing',isolated:scenario!=='host-shared',principal:scenario==='operator-wrong'?'S-1-1-0':operatorSid});
 return token;
}

export function describeOperatorOfflineScope(target,config){
 const policy=describeMockBrokerPolicy(target,config),expected=INITIALIZATION_TARGETS[target];
 const account='https://api.cloudflare.com/client/v4/accounts/'+DASHBOARD_ACCOUNT_ID;
 const database=account+'/d1/database/'+expected.id;
 const requests=[{stage:'account',method:'GET',url:account},{stage:'database',method:'GET',url:database},{stage:'schema',method:'POST',url:database+'/query',sql:SCHEMA_QUERY},{stage:'count',method:'POST',url:database+'/query',sql:COUNT_QUERY,conditional:true}];
 const scope={mode:'offline-synthetic',target,accountId:DASHBOARD_ACCOUNT_ID,databaseId:expected.id,databaseName:expected.name,binding:expected.binding,configSha256:policy.configSha256,policySha256:policy.policySha256,maximumRequests:4,requests};
 return structuredClone({...scope,scopeSha256:hash(JSON.stringify(scope)),confirmation:'REHEARSE '+target+' '+expected.id+' '+hash(JSON.stringify(scope))});
}

// No external callback/client is accepted. HTTP/TLS failures are internal scenarios.
function syntheticHttp(broker,scenario,events){
 let calls=0;
 return async(url,request)=>{
  if(calls>=4)fail('BUDGET');
  const stage=['account','database','schema','count'][calls++];
  const event={stage,result:'PENDING',aborted:false};events.push(event);
  const controller=new AbortController();
  let timer;
  const abort=()=>controller.abort();
  request.signal.addEventListener('abort',abort,{once:true});
  const timed=scenario.startsWith('timeout-');
  const operation=(async()=>{
   if(request.signal.aborted||scenario==='abort')controller.abort();
   if(scenario.startsWith('tls-'))fail('TLS_SIMULATED');
   if(timed&&scenario!=='timeout-body')return new Promise(()=>{});
   const response=await broker.transport(url,{...request,signal:controller.signal});
   if(scenario==='timeout-body')return new Promise(()=>{});
   // Include body consumption in deadline; never return an unbounded stream.
   const body=await response.json();
   if(controller.signal.aborted)fail('ABORTED');
   return new Response(JSON.stringify(body));
  })();
  try{
   const aborted=new Promise((_,reject)=>{
    const stop=()=>{event.aborted=true;reject(Error('D1_OPERATOR_OFFLINE_ABORTED'));};
    controller.signal.addEventListener('abort',stop,{once:true});
    if(controller.signal.aborted)stop();
   });
   // Short synthetic timer exercises cancellation; production deadline is design only.
   timer=setTimeout(abort,timed?5:15000);
   const response=await Promise.race([operation,aborted]);event.result='PASS';return response;
  }catch{event.result='REFUSED';fail('TRANSPORT');}
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);}
 };
}

export function prepareOperatorOfflineVerifier(options={}){
 if(processClaimed)fail('PROCESS_ALREADY_USED');
 processClaimed=true;
 if(!subset(options,['target','config','fixture','mode'])||(options.mode??'offline')!=='offline')fail('LIVE_OR_OPTIONS');
 const {target}=options,config=structuredClone(options.config),scope=describeOperatorOfflineScope(target,config);
 const fixture=fixtures.get(options.fixture);
 if(!fixture||!fixture.bootstrap||!fixture.isolated||fixture.principal!==operatorSid)fail('PREREQUISITES_NOT_ESTABLISHED');
 if(fixture.scenario==='storage-unavailable')fail('STORAGE');
 validateSyntheticWindowsStorage(fixture.facts);
 const created=Date.now(),start=performance.now(),attemptId=randomUUID();
 let presented=false,used=false;
 function presentation(){
  if(presented||used)fail('PRESENTATION_REPLAY');presented=true;fixture.events.push('scope-presented');
  return Object.freeze({text:'OFFLINE SYNTHETIC REHEARSAL ONLY\n'+JSON.stringify(scope,null,2),confirmation:scope.confirmation});
 }
 async function run(confirmation){
  if(used)fail('REPLAY');used=true;
  if(!presented||confirmation!==scope.confirmation||fixture.scenario==='cancelled')fail('CONFIRMATION');
  if(fixture.scenario==='expired'||Date.now()<created||Date.now()-created>=300000||performance.now()-start>=300000)fail('EXPIRED');
  fixture.events.push('synthetic-confirmation');
  if(['storage-full','storage-corrupt'].includes(fixture.scenario)||fixture.journal.size)fail('JOURNAL');
  fixture.journal.set(attemptId,'PENDING');fixture.events.push('attempt-claimed-in-memory');
  const brokerScenarios=new Set(['reserved','empty','fleet-empty','fleet-occupied','permission-account','permission-schema','network-account','wrong-account','wrong-database','wrong-name','schema-mismatch','redirect-account','redirect-schema','invalid-json','query-failure','changed-db','malformed-count']);
  const broker=createD1ReadonlyBroker({target,config,scenario:brokerScenarios.has(fixture.scenario)?fixture.scenario:'reserved'}),events=[];
  const raw=syntheticHttp(broker,fixture.scenario,events),runStart=performance.now();
  const stillFresh=()=>Date.now()>=created&&Date.now()-created<300000&&performance.now()-runStart<60000;
  let status='PASS';
  try{
   const transport=async(url,request)=>{
    if(fixture.scenario==='clock-rollback'||!stillFresh())fail('EXPIRED');
    fixture.events.push('synthetic-request');
    return raw(url,request);
   };
   const adapter=await createD1ReadonlyAdapter({target,config,expectedAccountId:DASHBOARD_ACCOUNT_ID,transport});
   await adapter.review();
   if(!stillFresh())fail('EXPIRED');
  }catch{status='REFUSED';}
  const capture=broker.getEvidence();
  const payload={format:1,mode:'offline-synthetic',synthetic:true,target,accountId:scope.accountId,databaseId:scope.databaseId,scopeSha256:scope.scopeSha256,attemptId,status,actualOperator:'NOT_VERIFIED',actualAuth:'NOT_VERIFIED',actualTls:'NOT_VERIFIED',actualCloudflare:'NOT_VERIFIED',liveReady:false,storage:'SYNTHETIC_MEMORY_ONLY',requests:events,sequence:fixture.events.slice(),schemaDigest:capture.schemaEvidence?hash(JSON.stringify(capture.schemaEvidence)):null,fleetStoreCount:capture.fleetStoreCount};
  const content=encodeEvidence(payload),receiptSha256=hash(content);
  if(fixture.scenario==='evidence-failure') {fixture.journal.set(attemptId,'REFUSED');fail('EVIDENCE');}
  fixture.journal.set(attemptId,status);
  verifyOperatorOfflineEvidence(content,receiptSha256); // independently held fixture receipt
  if(!stillFresh()){fixture.journal.set(attemptId,'REFUSED');fail('EXPIRED');}
  return Object.freeze({status,content,receiptSha256,liveReady:false});
 }
 return Object.freeze({presentation,run});
}

function validateEvidence(p){
 const keys=['format','mode','synthetic','target','accountId','databaseId','scopeSha256','attemptId','status','actualOperator','actualAuth','actualTls','actualCloudflare','liveReady','storage','requests','sequence','schemaDigest','fleetStoreCount'];
 if(!exact(p,keys)||p.format!==1||p.mode!=='offline-synthetic'||p.synthetic!==true||!Object.hasOwn(INITIALIZATION_TARGETS,p.target)||p.accountId!==DASHBOARD_ACCOUNT_ID||p.databaseId!==INITIALIZATION_TARGETS[p.target].id||!/^[a-f0-9]{64}$/.test(p.scopeSha256)||!/^[a-f0-9-]{36}$/.test(p.attemptId)||!['PASS','REFUSED'].includes(p.status)||p.liveReady!==false||p.storage!=='SYNTHETIC_MEMORY_ONLY'||['actualOperator','actualAuth','actualTls','actualCloudflare'].some(k=>p[k]!=='NOT_VERIFIED'))fail('EVIDENCE_FORMAT');
 if(!Array.isArray(p.requests)||p.requests.length>4||p.requests.some((r,i)=>!exact(r,['stage','result','aborted'])||r.stage!==['account','database','schema','count'][i]||!['PASS','REFUSED'].includes(r.result)||typeof r.aborted!=='boolean')||!Array.isArray(p.sequence)||p.sequence.length>7||p.sequence.some(s=>!['scope-presented','synthetic-confirmation','attempt-claimed-in-memory','synthetic-request'].includes(s))||!(p.schemaDigest===null||/^[a-f0-9]{64}$/.test(p.schemaDigest))||![null,0].includes(p.fleetStoreCount))fail('EVIDENCE_FORMAT');
}
function encodeEvidence(payload){validateEvidence(payload);return JSON.stringify({format:'operator-offline-evidence-v1',payload,sha256:hash(JSON.stringify(payload))})+'\n';}
export function verifyOperatorOfflineEvidence(content,receiptSha256){
 if(typeof content!=='string'||content.length>1000000||typeof receiptSha256!=='string'||hash(content)!==receiptSha256)fail('EVIDENCE_INTEGRITY');
 let e;try{e=JSON.parse(content);}catch{fail('EVIDENCE_FORMAT');}
 if(!exact(e,['format','payload','sha256'])||e.format!=='operator-offline-evidence-v1'||e.sha256!==hash(JSON.stringify(e.payload)))fail('EVIDENCE_INTEGRITY');
 validateEvidence(e.payload);return structuredClone(e.payload);
}
