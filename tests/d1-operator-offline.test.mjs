import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createSyntheticOperatorFixture,prepareOperatorOfflineVerifier,describeOperatorOfflineScope,validateOfflineEnvironmentNames,validateSyntheticWindowsStorage,verifyOperatorOfflineEvidence} from '../scripts/d1-operator-offline.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const cfg=async target=>JSON.parse((await readFile(new URL('../config/'+(target==='staging'?'staging-no-r2':'recovery-d1')+'.example.jsonc',import.meta.url),'utf8')).replace(/^\s*\/\/.*$/gm,''));
const root=fileURLToPath(new URL('../',import.meta.url));
const filename=fileURLToPath(import.meta.url);

if(process.argv[2]==='fixture-case'){
 const target=process.argv[3],scenario=process.argv[4],config=await cfg(target);
 let calls=0;globalThis.fetch=()=>{calls++;throw Error('external network forbidden');};
 const prerequisite=['bootstrap-missing','host-shared','operator-wrong','storage-unavailable','storage-sync','storage-reparse','storage-acl','storage-network','storage-path','storage-outside','storage-inherited','storage-owner'];
 const fixture=createSyntheticOperatorFixture({scenario});
 if(prerequisite.includes(scenario))assert.throws(()=>prepareOperatorOfflineVerifier({target,config,fixture}));
 else{
  const v=prepareOperatorOfflineVerifier({target,config,fixture});
  const preview=v.presentation();
  assert.ok(preview.text.includes(config.d1_databases[0].database_id));assert.ok(preview.text.includes('8853419a19293131998afe07ee651e62'));
  assert.ok(preview.text.includes('SELECT type,name,tbl_name,sql FROM sqlite_schema'));assert.ok(preview.text.includes('SELECT COUNT(*) AS row_count FROM fleet_store'));
  assert.throws(()=>v.presentation(),/PRESENTATION_REPLAY/);
  if(['storage-full','storage-corrupt','evidence-failure','cancelled','expired'].includes(scenario))await assert.rejects(v.run(preview.confirmation));
  else{
   const r=await v.run(preview.confirmation),p=verifyOperatorOfflineEvidence(r.content,r.receiptSha256);
   const success=['reserved','empty','fleet-empty'].includes(scenario);
   assert.equal(r.status,success?'PASS':'REFUSED');assert.equal(p.liveReady,false);assert.equal(p.actualOperator,'NOT_VERIFIED');assert.equal(p.actualAuth,'NOT_VERIFIED');assert.equal(p.actualTls,'NOT_VERIFIED');assert.equal(p.actualCloudflare,'NOT_VERIFIED');
   assert.equal(p.storage,'SYNTHETIC_MEMORY_ONLY');assert.ok(p.requests.length<=4);
   assert.deepEqual(p.sequence.slice(0,3),['scope-presented','synthetic-confirmation','attempt-claimed-in-memory']);
   if(success){assert.equal(p.requests.length,scenario==='fleet-empty'?4:3);assert.equal(p.fleetStoreCount,scenario==='fleet-empty'?0:null);}
   if(scenario.startsWith('timeout-')){assert.equal(p.requests.length,1);assert.equal(p.requests[0].aborted,true);}
   if(scenario==='schema-mismatch')assert.doesNotMatch(r.content,/MOCK_PRIVATE_LITERAL|CREATE TABLE unknown/);
   assert.doesNotMatch(r.content,/Authorization|Bearer|Cookie|confidential/);
   // External receipt detects replacement even when embedded hash is recalculated.
   const e=JSON.parse(r.content);e.payload.databaseId='forged';e.sha256=hash(JSON.stringify(e.payload));assert.throws(()=>verifyOperatorOfflineEvidence(JSON.stringify(e),r.receiptSha256),/INTEGRITY/);
   const injected=JSON.parse(r.content);injected.payload.Authorization='synthetic forbidden field';injected.sha256=hash(JSON.stringify(injected.payload));const text=JSON.stringify(injected);assert.throws(()=>verifyOperatorOfflineEvidence(text,hash(text)),/FORMAT/);
  }
  await assert.rejects(v.run(preview.confirmation),/REPLAY/);
 }
 assert.throws(()=>prepareOperatorOfflineVerifier({target:target==='staging'?'recovery':'staging',config,fixture}),/PROCESS_ALREADY_USED/);
 assert.equal(calls,0);
 console.log('PASS fixture '+target+' '+scenario);
}else if(process.argv[2]==='guard-case'){
 const kind=process.argv[3],config=await cfg('staging');
 const fixture=createSyntheticOperatorFixture();
 if(kind==='missing')assert.throws(()=>prepareOperatorOfflineVerifier({target:'staging',config}),/PREREQUISITES/);
 if(kind==='forged')assert.throws(()=>prepareOperatorOfflineVerifier({target:'staging',config,fixture:{synthetic:true,notOperatorAuthority:true}}),/PREREQUISITES/);
 if(kind==='live')assert.throws(()=>prepareOperatorOfflineVerifier({target:'staging',config,fixture,mode:'live'}),/LIVE_OR_OPTIONS/);
 if(kind==='transport')assert.throws(()=>prepareOperatorOfflineVerifier({target:'staging',config,fixture,transport:()=>{throw Error('forbidden');}}),/LIVE_OR_OPTIONS/);
 if(kind==='multi')assert.throws(()=>prepareOperatorOfflineVerifier({target:['staging','recovery'],config,fixture}));
 if(kind==='confirm-first'){const v=prepareOperatorOfflineVerifier({target:'staging',config,fixture});await assert.rejects(v.run(describeOperatorOfflineScope('staging',config).confirmation),/CONFIRMATION/);}
 if(kind==='wrong-confirm'){const v=prepareOperatorOfflineVerifier({target:'staging',config,fixture});v.presentation();await assert.rejects(v.run('yes'),/CONFIRMATION/);}
 if(kind==='scope'){const v=prepareOperatorOfflineVerifier({target:'staging',config,fixture});v.presentation();const other=await cfg('recovery');await assert.rejects(v.run(describeOperatorOfflineScope('recovery',other).confirmation),/CONFIRMATION/);}
 console.log('PASS guard '+kind);
}else{
 let checks=0;
 const run=args=>{const r=spawnSync(process.execPath,[filename,...args],{cwd:root,env:{},encoding:'utf8',timeout:20000});assert.equal(r.status,0,JSON.stringify({args,status:r.status,stdout:r.stdout,stderr:r.stderr,error:r.error?.code}));checks++;};
 const cases=['reserved','empty','fleet-empty','fleet-occupied','permission-account','permission-schema','network-account','wrong-account','wrong-database','wrong-name','schema-mismatch','redirect-account','redirect-schema','invalid-json','query-failure','changed-db','malformed-count','bootstrap-missing','host-shared','operator-wrong','storage-unavailable','storage-sync','storage-reparse','storage-acl','storage-network','storage-path','storage-outside','storage-inherited','storage-owner','storage-corrupt','storage-full','evidence-failure','cancelled','expired','clock-rollback','abort','tls-certificate','tls-hostname','timeout-dns','timeout-connect','timeout-tls','timeout-headers','timeout-body'];
 for(const target of ['staging','recovery'])for(const scenario of cases)run(['fixture-case',target,scenario]);
 for(const kind of ['missing','forged','live','transport','multi','confirm-first','wrong-confirm','scope'])run(['guard-case',kind]);
 for(const name of ['NODE_OPTIONS','NODE_PATH','NODE_USE_ENV_PROXY','NODE_USE_SYSTEM_CA','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED','NODE_V8_COVERAGE','NODE_REDIRECT_WARNINGS','NODE_DEBUG','NODE_DEBUG_NATIVE','SSLKEYLOGFILE','SSL_CERT_FILE','SSL_CERT_DIR','OPENSSL_CONF','http_proxy','HTTPS_PROXY','ALL_PROXY','NO_PROXY']){assert.throws(()=>validateOfflineEnvironmentNames([name]),/ENVIRONMENT/);checks++;}
 validateOfflineEnvironmentNames(['PATH','SystemRoot']);checks++;
 // Unattended/piped CLI cannot run a synthetic operator attempt, let alone live.
 for(const args of [['staging'],['staging','--synthetic-rehearsal'],['staging','recovery','--synthetic-rehearsal'],['staging','--live']]){
  const r=spawnSync(process.execPath,['scripts/rehearse-operator-d1.mjs',...args],{cwd:root,env:{},input:'yes\n',encoding:'utf8',timeout:10000});assert.equal(r.status,1);assert.match(r.stderr,/REFUSED/);assert.doesNotMatch(r.stdout,/evidence|8853419/);checks++;
 }
 const path='C:\\SyntheticOperator\\AppData\\Local\\SmartFleet\\D1ReadOnly',sid='S-1-5-21-100-200-300-1001';
 const facts={resolvedRoot:path,expectedRoot:path,operatorSid:sid,ownerSid:sid,local:true,reparse:false,inherited:false,aces:[sid,'S-1-5-18','S-1-5-32-544'].map(sid=>({sid,access:'full'})),excludedRoots:['C:\\SyntheticCheckout']};
 assert.equal(validateSyntheticWindowsStorage(facts).actualAcl,'NOT_VERIFIED');checks++;
 for(const path of ['\\\\server\\share','C:\\unsafe.','C:\\unsafe ','C:\\safe:stream','C:\\SyntheticCheckout\\private','C:\\Dropbox\\private','C:\\OneDrive - Org\\private','C:\\CON','C:\\NUL.txt']){assert.throws(()=>validateSyntheticWindowsStorage({...facts,resolvedRoot:path,expectedRoot:path}),/STORAGE/);checks++;}
 for(const option of ['proxy','dispatcher','fetch','headers','credentials','token']){assert.throws(()=>createSyntheticOperatorFixture({[option]:'synthetic-invalid-option'}),/FIXTURE_OPTIONS/);checks++;}
 console.log('PASS operator-run offline verifier: '+checks+' cases, one target/process, synthetic bootstrap/host/path/ACL/attempt/evidence, exact scope confirmation, bounded Mock HTTP/TLS failures, no unattended CLI/external network/keys/credentials; Live NOT_READY');
}
