import assert from 'node:assert/strict';
import {createPrivateKey,sign,randomUUID} from 'node:crypto';
import {readFile,unlink} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createOfflineApprovalAuthority,offlineApprovalBytes,digest,verifyOfflineEvidence,encodeOfflineEvidence,persistOfflineArtifact} from '../scripts/d1-offline-security.mjs';
import {createApprovedOfflineTransport} from '../scripts/d1-approved-offline-transport.mjs';

// RFC 8032 section 7.1 TEST 1 PUBLIC TEST VECTOR. Not a real credential.
// No key generation, operator key, credential file, environment or API token.
const publicSpki='302a300506032b6570032100'+'d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a';
const testVectorKey=createPrivateKey({key:Buffer.from('302e020100300506032b657004220420'+'9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60','hex'),format:'der',type:'pkcs8'});
const config=async target=>JSON.parse((await readFile(`config/${target==='staging'?'staging-no-r2':'recovery-d1'}.example.jsonc`,'utf8')).replace(/^\s*\/\/.*$/gm,''));
const configs={staging:await config('staging'),recovery:await config('recovery')},sourceCommit='1'.repeat(40),ids=new Set(),artifacts=[];
const root=fileURLToPath(new URL('../',import.meta.url)),domain='SmartFleet-D1-OFFLINE-Approval-v1\0';
const anchor=(extra={})=>({operatorId:'operator-public-test',keyId:'key-public-test',publicKeySpki:publicSpki,targets:['staging','recovery'],notBefore:Date.now()-60000,expiresAt:Date.now()+300000,revoked:false,...extra});
const authority=(target='staging',roots=[anchor()])=>createOfflineApprovalAuthority({target,config:configs[target],sourceCommit,trustAnchors:roots});
function payload(auth,extra={}){
 const approvalId=randomUUID().replaceAll('-','');ids.add(approvalId);const now=Date.now();
 return{version:1,purpose:'offline-readonly-rehearsal',approvalId,operatorId:'operator-public-test',keyId:'key-public-test',...auth.scope,issuedAt:now-1000,notBefore:now-1000,expiresAt:now+30000,requestBudget:4,...extra};
}
const signed=payload=>({payload,signature:sign(null,offlineApprovalBytes(payload),testVectorKey).toString('base64')});
let checks=0,networkCalls=0;const realFetch=globalThis.fetch;
globalThis.fetch=()=>{networkCalls++;throw Error('forbidden network');};
async function test(fn){await fn();checks++;}
try{
 for(const target of ['staging','recovery'])await test(async()=>{
  const a=authority(target),p=payload(a),grant=await a.accept(signed(p));assert.equal(a.describe(grant).operatorId,'operator-public-test');assert.equal(a.describe(grant).target,target);
  for(let i=0;i<4;i++)a.consume(grant);assert.throws(()=>a.consume(grant),/BUDGET/);await assert.rejects(a.accept(signed(p)),/REPLAY_OR_EXISTS/);
 });
 await test(async()=>{const a=authority('staging',[]);await assert.rejects(a.accept(signed(payload(a))),/UNTRUSTED_OPERATOR/);});
 for(const change of [p=>p.target='recovery',p=>p.accountId='b'.repeat(32),p=>p.databaseId=configs.recovery.d1_databases[0].database_id,p=>p.configSha256='0'.repeat(64),p=>p.policySha256='0'.repeat(64),p=>p.sourceCommit='2'.repeat(40),p=>p.binding='DB',p=>p.operatorId='operator-forged',p=>p.keyId='key-forged',p=>p.expiresAt=Date.now()-1,p=>p.notBefore=Date.now()+10000,p=>p.purpose='live-readonly',p=>p.requestBudget=5])await test(async()=>{
  const a=authority(),p=payload(a),e=signed(p);change(e.payload);await assert.rejects(a.accept(e));
 });
 await test(async()=>{const a=authority(),e=signed(payload(a));const bytes=Buffer.from(e.signature,'base64');bytes[0]^=1;e.signature=bytes.toString('base64');await assert.rejects(a.accept(e),/SIGNATURE/);});
 await test(async()=>{const a=authority();await assert.rejects(a.accept({payload:payload(a)}),/FORMAT/);});
 await test(async()=>{const a=authority(),e=signed(payload(a));e.publicKeySpki=publicSpki;await assert.rejects(a.accept(e),/FORMAT/);});
 await test(async()=>{const a=authority(),e=signed(payload(a));e.signature='!!!!';await assert.rejects(a.accept(e),/SIGNATURE/);});
 await test(async()=>{const a=authority(),e=signed(payload(a));e.signature='a'.repeat(1000);await assert.rejects(a.accept(e),/SIGNATURE/);});
 await test(async()=>{const a=authority(),e=signed(payload(a));e.payload.keyId='x'.repeat(257);await assert.rejects(a.accept(e),/FORMAT/);});
 await test(async()=>{const a=authority(),p=payload(a),e=signed(p);e.payload=Object.fromEntries(Object.entries(p).reverse());await a.accept(e);});
 await test(async()=>{const a=authority('staging',[anchor({revoked:true})]);await assert.rejects(a.accept(signed(payload(a))),/UNTRUSTED_OPERATOR/);});
 await test(async()=>{const a=authority('recovery',[anchor({targets:['staging']})]);await assert.rejects(a.accept(signed(payload(a))),/UNTRUSTED_OPERATOR/);});
 await test(async()=>{const a=authority('staging',[anchor({publicKeySpki:'302a300506032b6570032100'+'3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c'})]);await assert.rejects(a.accept(signed(payload(a))),/SIGNATURE/);});
 await test(async()=>assert.throws(()=>authority('staging',[anchor({publicKeySpki:'-----BEGIN PRIVATE KEY-----MOCK-NOT-A-KEY'})]),/PUBLIC_KEY/));
 await test(async()=>assert.throws(()=>authority('staging',[anchor(),anchor()]),/TRUST/));
 await test(async()=>{const a=authority(),g=await a.accept(signed(payload(a)));assert.throws(()=>a.consume({...g}),/FORGED_GRANT/);});
 await test(async()=>{const a=authority(),p=payload(a),g=await a.accept(signed(p)),now=Date.now;try{Date.now=()=>p.expiresAt+1;assert.throws(()=>a.consume(g),/EXPIRED/);}finally{Date.now=now;}});
 await test(async()=>{const a=authority(),p=payload(a),g=await a.accept(signed(p)),now=Date.now;try{Date.now=()=>p.issuedAt-10000;assert.throws(()=>a.consume(g),/EXPIRED/);}finally{Date.now=now;}});
 await test(async()=>{
  const a=authority(),p=payload(a),e=signed(p),now=Date.now,initial=Date.now();let reads=0;
  try{Date.now=()=>reads++===0?initial:p.expiresAt+1;await assert.rejects(a.accept(e),/EXPIRED/);}finally{Date.now=now;}
  await assert.rejects(a.accept(e),/REPLAY_OR_EXISTS/); // Expired-after-claim is never refunded.
 });
 await test(async()=>{
  const expires=Date.now()+10000,a=authority('staging',[anchor({expiresAt:expires})]),p=payload(a),g=await a.accept(signed(p));assert.equal(a.describe(g).expiresAt,expires);
  const now=Date.now;try{Date.now=()=>expires+1;assert.throws(()=>a.consume(g),/EXPIRED/);}finally{Date.now=now;}
 });
 await test(async()=>{
  const a=authority(),p=payload(a),other=authority();const results=await Promise.allSettled([a.accept(signed(p)),other.accept(signed(p))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 });
 await test(async()=>{
  const a=authority('staging'),p=payload(a);await a.accept(signed(p));const b=authority('recovery'),q=payload(b,{approvalId:p.approvalId});await assert.rejects(b.accept(signed(q)),/REPLAY_OR_EXISTS/);
 });
 await test(async()=>{
  // Two separate Node processes share one atomic file-backed nonce ledger.
  // Child environment is empty; only public roots and offline signatures are passed.
  const a=authority(),p=payload(a),e=signed(p),roots=[anchor()];
  const code=`import {createOfflineApprovalAuthority} from ${JSON.stringify(new URL('../scripts/d1-offline-security.mjs',import.meta.url).href)};const a=createOfflineApprovalAuthority(${JSON.stringify({target:'staging',config:configs.staging,sourceCommit,trustAnchors:roots})});try{await a.accept(${JSON.stringify(e)});console.log('ACCEPT');}catch{console.log('REFUSE');}`;
  const launch=()=>promisify(execFile)(process.execPath,['--input-type=module','-e',code],{env:{},cwd:root});
  const outcomes=await Promise.all([launch(),launch()]);assert.equal(outcomes.filter(r=>r.stdout.trim()==='ACCEPT').length,1);assert.equal(outcomes.filter(r=>r.stdout.trim()==='REFUSE').length,1);
 });
 for(const target of ['staging','recovery'])for(const scenario of ['reserved','fleet-empty'])await test(async()=>{
  const a=authority(target),session=await createApprovedOfflineTransport({target,config:configs[target],authority:a,signedApproval:signed(payload(a)),scenario});
  const evidence=await session.run();assert.equal(evidence.status,'PASS');assert.equal(evidence.liveVerification,'NOT_VERIFIED');assert.equal(evidence.operatorEnrollment,'NOT_VERIFIED');assert.equal(evidence.approvalSignatureVerified,true);assert.equal(evidence.requests.length,scenario==='reserved'?3:4);assert.equal(evidence.scope.target,target);
  assert.equal(evidence.authorization.operatorId,'operator-public-test');await assert.rejects(session.run(),/REPLAY_OR_CLOSED/);
  const saved=await session.saveEvidence();artifacts.push(saved.path);const text=await readFile(saved.path,'utf8');assert.equal(verifyOfflineEvidence(text,saved.sha256).target,target);assert.doesNotMatch(text,/Authorization|Cookie|Bearer|9d61b19d|MOCK_PRIVATE_LITERAL/);
  await assert.rejects(Promise.resolve().then(()=>verifyOfflineEvidence(text.replace('"status": "PASS"','"status": "REFUSED"'),saved.sha256)),/INTEGRITY/);
 });
 for(const scenario of ['permission-account','network-schema','wrong-database','schema-mismatch','redirect-schema'])await test(async()=>{
  const a=authority(),p=payload(a),session=await createApprovedOfflineTransport({target:'staging',config:configs.staging,authority:a,signedApproval:signed(p),scenario});
  await assert.rejects(session.run());const e=session.getEvidence();assert.equal(e.status,'REFUSED');assert.doesNotMatch(JSON.stringify(e),/confidential|MOCK_PRIVATE_LITERAL|Authorization/);await assert.rejects(a.accept(signed(p)),/REPLAY_OR_EXISTS/);
  const serialized=encodeOfflineEvidence(e);assert.equal(verifyOfflineEvidence(serialized,digest(serialized)).status,'REFUSED');
 });
 await test(async()=>{const a=authority(),p=payload(a,{requestBudget:2}),s=await createApprovedOfflineTransport({target:'staging',config:configs.staging,authority:a,signedApproval:signed(p)});await assert.rejects(s.run());assert.equal(s.getEvidence().requests.length,2);});
 await test(async()=>{const a=authority();await assert.rejects(createApprovedOfflineTransport({target:'recovery',config:configs.recovery,authority:a,signedApproval:signed(payload(a))}),/CROSS_SCOPE/);});
 await test(async()=>{const a=authority();await assert.rejects(createApprovedOfflineTransport({target:'staging',config:configs.staging,authority:{...a},signedApproval:signed(payload(a))}),/AUTHORITY/);});
 for(const mode of ['live','mock-live'])await test(async()=>{const a=authority();await assert.rejects(createApprovedOfflineTransport({mode,target:'staging',config:configs.staging,authority:a,signedApproval:signed(payload(a))}),/LIVE_DISABLED/);});
 for(const extra of [{token:'MOCK_PRIVATE_LITERAL'},{transport:()=>{}},{credentials:{}},{proxy:'https://outside.invalid/'},{tls:{rejectUnauthorized:false}},{dispatcher:()=>{}}])await test(async()=>{const a=authority();await assert.rejects(createApprovedOfflineTransport({...extra,target:'staging',config:configs.staging,authority:a,signedApproval:signed(payload(a))}),/OPTIONS/);});
 await test(async()=>{const a=authority(),p=payload(a),s=await createApprovedOfflineTransport({target:'staging',config:configs.staging,authority:a,signedApproval:signed(p)}),now=Date.now;try{Date.now=()=>p.expiresAt+1;await assert.rejects(s.run());assert.equal(s.getEvidence().requests.length,0);}finally{Date.now=now;}});
 await test(async()=>{assert.throws(()=>encodeOfflineEvidence({mode:'offline',liveVerification:'NOT_VERIFIED',token:'MOCK_PRIVATE_LITERAL'}),/FORMAT/);await assert.rejects(persistOfflineArtifact('approval-ledger','offline-unsafe.json','MOCK_PRIVATE_LITERAL'),/FORMAT/);});
 for(const url of ['http://api.cloudflare.com/client/v4/accounts/'+configs.staging.d1_databases[0].database_id,'https://outside.invalid/','https://api.cloudflare.com/client/v4/accounts/'+('b'.repeat(32))])await test(async()=>{
  const a=authority(),s=await createApprovedOfflineTransport({target:'staging',config:configs.staging,authority:a,signedApproval:signed(payload(a))});
  await assert.rejects(s.transport(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'}}));assert.deepEqual(s.getEvidence().requests,[]);
 });
 await test(async()=>{
  const a=authority(),s=await createApprovedOfflineTransport({target:'staging',config:configs.staging,authority:a,signedApproval:signed(payload(a))});
  const controller=new AbortController();controller.abort();await assert.rejects(s.transport('https://api.cloudflare.com/client/v4/accounts/'+a.scope.accountId,{method:'GET',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json'}}));assert.deepEqual(s.getEvidence().requests,[]);
 });
 await test(async()=>{
  const a=authority(),s=await createApprovedOfflineTransport({target:'staging',config:configs.staging,authority:a,signedApproval:signed(payload(a))});const result=await s.run();
  result.authorization.Authorization='MOCK_PRIVATE_LITERAL';assert.throws(()=>encodeOfflineEvidence(result),/FORMAT/);
 });
 await test(async()=>{
  const a=authority(),s=await createApprovedOfflineTransport({target:'staging',config:configs.staging,authority:a,signedApproval:signed(payload(a))});
  const url='https://api.cloudflare.com/client/v4/accounts/'+a.scope.accountId,request={method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'}};
  await s.transport(url,request);await assert.rejects(s.run(),/ORDER/);await assert.rejects(s.transport(url,request),/CLOSED/);assert.equal(s.getEvidence().status,'REFUSED');
 });
 assert.equal(networkCalls,0);
 console.log(`PASS offline signed approval/transport: ${checks} cases, Ed25519 pinned public test vector, forged/expired/cross-target refusal, atomic cross-process replay claim, request budget, sealed redacted evidence and live/credential/network denial; real operator enrollment/API/TLS NOT_VERIFIED`);
}finally{
 globalThis.fetch=realFetch;
 for(const id of ids){try{await unlink(join(root,'.qa','d1-offline-security','approval-ledger','offline-'+digest(domain+id)+'.json'));}catch(error){if(error.code!=='ENOENT')throw error;}}
 for(const path of artifacts)await unlink(path);
}
