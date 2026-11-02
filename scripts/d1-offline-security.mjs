// Public-key verification only; no signer, private-key loader or live transport.
import {createHash,createPublicKey,verify} from 'node:crypto';
import {mkdir,lstat,realpath,open} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {describeMockBrokerPolicy} from './d1-readonly-broker.mjs';
import {DASHBOARD_ACCOUNT_ID,INITIALIZATION_TARGETS,RESERVED_DDL} from './d1-provider-identity.mjs';
import {fleetSchema} from './d1-initialization-safety.mjs';

export const digest=value=>createHash('sha256').update(value).digest('hex');
const fail=code=>{throw Error('D1_APPROVAL_'+code);};
const plain=value=>!!value&&Object.getPrototypeOf(value)===Object.prototype;
const exact=(value,keys)=>plain(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const hex=(value,length)=>typeof value==='string'&&new RegExp('^[a-f0-9]{'+length+'}$').test(value);
const fields=['version','purpose','approvalId','operatorId','keyId','target','accountId','databaseId','binding','configSha256','policySha256','sourceCommit','issuedAt','notBefore','expiresAt','requestBudget'];
const domain='SmartFleet-D1-OFFLINE-Approval-v1\0';
const authorities=new WeakSet();

// Fixed ordered fields/domain, not caller-controlled JSON serialization/algorithm.
export function offlineApprovalBytes(payload){
 if(!exact(payload,fields))fail('FORMAT');
 if(fields.some(key=>typeof payload[key]==='string'?payload[key].length>256:!Number.isSafeInteger(payload[key])))fail('FORMAT');
 return Buffer.from(domain+JSON.stringify(fields.map(key=>payload[key])),'utf8');
}

export async function persistOfflineArtifact(kind,name,content){
 if(!['approval-ledger','sealed-evidence'].includes(kind)||!/^offline-[a-z0-9-]+\.json$/.test(name))fail('STORAGE_PATH');
 if(kind==='approval-ledger'&&content!=='{"format":"offline-approval-claim-v1"}\n')fail('STORAGE_FORMAT');
 if(kind==='sealed-evidence')verifyOfflineEvidence(content,digest(content));
 const root=await realpath(fileURLToPath(new URL('../',import.meta.url)));
 let directory=root;
 for(const part of ['.qa','d1-offline-security',kind]){
  directory=join(directory,part);
  try{await mkdir(directory,{mode:0o700});}catch(error){if(error.code!=='EEXIST')fail('STORAGE');}
  const stat=await lstat(directory);
  if(stat.isSymbolicLink()||!stat.isDirectory()||(await realpath(directory))!==directory)fail('STORAGE_PATH');
 }
 const path=join(directory,name);let handle;
 try{
  handle=await open(path,'wx',0o600);await handle.writeFile(content,'utf8');await handle.sync();
 }catch(error){if(error.code==='EEXIST')fail('REPLAY_OR_EXISTS');fail('STORAGE');}
 finally{if(handle)await handle.close();}
 return{path,sha256:digest(content)};
}

export function createOfflineApprovalAuthority({target,config,sourceCommit,trustAnchors=[]}={}){
 const policy=describeMockBrokerPolicy(target,config);
 if(!hex(sourceCommit,40)||!Array.isArray(trustAnchors))fail('TRUST');
 const scope=Object.freeze({target,accountId:policy.accountId,databaseId:policy.databaseId,binding:policy.binding,configSha256:policy.configSha256,policySha256:policy.policySha256,sourceCommit});
 const anchors=new Map();
 for(const anchor of structuredClone(trustAnchors)){
  if(!exact(anchor,['operatorId','keyId','publicKeySpki','targets','notBefore','expiresAt','revoked'])||!/^operator-[a-z0-9-]{1,40}$/.test(anchor.operatorId)||!/^key-[a-z0-9-]{1,40}$/.test(anchor.keyId)||!Array.isArray(anchor.targets)||!anchor.targets.length||anchor.targets.some(t=>!['staging','recovery'].includes(t))||!Number.isSafeInteger(anchor.notBefore)||!Number.isSafeInteger(anchor.expiresAt)||typeof anchor.revoked!=='boolean')fail('TRUST');
  // Exact Ed25519 PUBLIC SPKI format: never accept PEM/private-key input.
  if(typeof anchor.publicKeySpki!=='string'||!/^302a300506032b6570032100[a-f0-9]{64}$/.test(anchor.publicKeySpki))fail('PUBLIC_KEY');
  const key=createPublicKey({key:Buffer.from(anchor.publicKeySpki,'hex'),format:'der',type:'spki'});
  if(key.type!=='public'||key.asymmetricKeyType!=='ed25519'||anchors.has(anchor.keyId))fail('TRUST');
  anchors.set(anchor.keyId,{...anchor,key,fingerprint:digest(Buffer.from(anchor.publicKeySpki,'hex'))});
 }
 const grants=new WeakMap();
 async function accept(envelope){
  if(!exact(envelope,['payload','signature']))fail('FORMAT');
  const payload=structuredClone(envelope.payload),bytes=offlineApprovalBytes(payload);
  const anchor=anchors.get(payload.keyId),now=Date.now();
  if(!anchor||anchor.revoked||anchor.operatorId!==payload.operatorId||!anchor.targets.includes(target)||now<anchor.notBefore||now>=anchor.expiresAt)fail('UNTRUSTED_OPERATOR');
  if(payload.version!==1||payload.purpose!=='offline-readonly-rehearsal'||!hex(payload.approvalId,32))fail('FORMAT');
  for(const key of Object.keys(scope))if(payload[key]!==scope[key])fail('SCOPE');
  if(![payload.issuedAt,payload.notBefore,payload.expiresAt].every(Number.isSafeInteger)||payload.issuedAt>payload.notBefore||payload.notBefore>now||now>=payload.expiresAt||payload.expiresAt-payload.issuedAt>300000||payload.expiresAt<=payload.notBefore)fail('EXPIRED');
  if(!Number.isInteger(payload.requestBudget)||payload.requestBudget<1||payload.requestBudget>4)fail('BUDGET');
  let signature;
  if(typeof envelope.signature!=='string'||envelope.signature.length!==88)fail('SIGNATURE');
  try{signature=Buffer.from(envelope.signature,'base64');}catch{fail('SIGNATURE');}
  if(signature.length!==64||signature.toString('base64')!==envelope.signature||!verify(null,bytes,anchor.key,signature))fail('SIGNATURE');
  // Claim before returning any authority. A crash/failure burns the nonce; never refund.
  const nonce=digest(domain+payload.approvalId);
  await persistOfflineArtifact('approval-ledger','offline-'+nonce+'.json','{"format":"offline-approval-claim-v1"}\n');
  const afterClaim=Date.now();
  if(afterClaim<now||afterClaim>=payload.expiresAt||afterClaim>=anchor.expiresAt)fail('EXPIRED');
  const grant=Object.freeze({offlineOnly:true});
  grants.set(grant,{payload,remaining:payload.requestBudget,created:now,anchor,approvalDigest:digest(bytes),nonce});
  return grant;
 }
 function check(grant){
  const state=grants.get(grant),now=Date.now();
  if(!state)fail('FORGED_GRANT');
  if(now<state.created||now>=state.payload.expiresAt||now>=state.anchor.expiresAt)fail('EXPIRED');
  return state;
 }
 function consume(grant){const state=check(grant);if(state.remaining<=0)fail('BUDGET');state.remaining--;}
 function describe(grant){const state=check(grant);return Object.freeze({...scope,operatorId:state.anchor.operatorId,keyFingerprint:state.anchor.fingerprint,approvalDigest:state.approvalDigest,nonceDigest:state.nonce,remaining:state.remaining,expiresAt:Math.min(state.payload.expiresAt,state.anchor.expiresAt),offlineOnly:true});}
 const authority=Object.freeze({accept,consume,describe,scope});authorities.add(authority);return authority;
}
export const isOfflineApprovalAuthority=value=>!!value&&authorities.has(value);

function canonical(value){
 if(value===null||['string','boolean'].includes(typeof value))return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return'['+value.map(canonical).join(',')+']';
 if(plain(value))return'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
 fail('EVIDENCE_FORMAT');
}
function validateEvidence(payload){
 const keys=['mode','synthetic','liveVerification','operatorEnrollment','tlsVerification','target','scope','authorization','approvalSignatureVerified','startedAt','finishedAt','status','reason','mockMetadata','schemaEvidence','fleetStoreCount','requests','brokerFresh'];
 if(!exact(payload,keys)||payload.mode!=='offline'||payload.synthetic!==true||payload.liveVerification!=='NOT_VERIFIED'||payload.operatorEnrollment!=='NOT_VERIFIED'||payload.tlsVerification!=='NOT_EXERCISED'||!Object.hasOwn(INITIALIZATION_TARGETS,payload.target)||payload.approvalSignatureVerified!==true||typeof payload.brokerFresh!=='boolean')fail('EVIDENCE_FORMAT');
 const expected=INITIALIZATION_TARGETS[payload.target],scope=payload.scope,auth=payload.authorization;
 if(!exact(scope,['target','accountId','databaseId','binding','configSha256','policySha256','sourceCommit'])||scope.target!==payload.target||scope.accountId!==DASHBOARD_ACCOUNT_ID||scope.databaseId!==expected.id||scope.binding!==expected.binding||!hex(scope.configSha256,64)||!hex(scope.policySha256,64)||!hex(scope.sourceCommit,40))fail('EVIDENCE_FORMAT');
 if(!exact(auth,['operatorId','keyFingerprint','approvalDigest','nonceDigest','expiresAt','requestBudget'])||!/^operator-[a-z0-9-]{1,40}$/.test(auth.operatorId)||!['keyFingerprint','approvalDigest','nonceDigest'].every(k=>hex(auth[k],64))||!Number.isSafeInteger(auth.expiresAt)||!Number.isInteger(auth.requestBudget)||auth.requestBudget<1||auth.requestBudget>4)fail('EVIDENCE_FORMAT');
 const time=value=>value===null||typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
 if(!time(payload.startedAt)||!time(payload.finishedAt)||!['PASS','REFUSED','NOT_RUN'].includes(payload.status)||![null,'APPROVAL_OR_REQUEST_REFUSED','APPROVAL_OR_TRANSPORT_REFUSED'].includes(payload.reason)||![null,0].includes(payload.fleetStoreCount)||!Array.isArray(payload.requests)||payload.requests.length>4)fail('EVIDENCE_FORMAT');
 for(const item of payload.requests)if(!exact(item,['stage','method','startedAt','finishedAt','httpStatus','result'])||!['account','database','schema','count'].includes(item.stage)||!['GET','POST'].includes(item.method)||!time(item.startedAt)||!time(item.finishedAt)||!(item.httpStatus===null||Number.isInteger(item.httpStatus)&&item.httpStatus>=100&&item.httpStatus<=599)||!['PENDING','PASS','REFUSED'].includes(item.result))fail('EVIDENCE_FORMAT');
 const meta=payload.mockMetadata;
 if(meta!==null&&(!plain(meta)||meta.accountId!==DASHBOARD_ACCOUNT_ID||Object.keys(meta).some(k=>!['accountId','databaseId','databaseName'].includes(k))||meta.databaseId!==undefined&&meta.databaseId!==expected.id||meta.databaseName!==undefined&&meta.databaseName!==expected.name))fail('EVIDENCE_FORMAT');
 const schema=payload.schemaEvidence;
 if(schema!==null){
  if(schema.accepted===false){if(!exact(schema,['accepted','objectCount','digest'])||!Number.isSafeInteger(schema.objectCount)||schema.objectCount<0||!hex(schema.digest,64))fail('EVIDENCE_FORMAT');}
  else if(schema.accepted===true){
   if(!exact(schema,['accepted','objects'])||!Array.isArray(schema.objects)||schema.objects.length>2)fail('EVIDENCE_FORMAT');
   for(const item of schema.objects)if(!exact(item,['type','name','tbl_name','ddlSha256','definition'])||item.type!=='table'||!['_cf_KV','fleet_store'].includes(item.name)||item.tbl_name!==item.name||!hex(item.ddlSha256,64)||item.definition!==(item.name==='_cf_KV'?RESERVED_DDL:fleetSchema))fail('EVIDENCE_FORMAT');
  }else fail('EVIDENCE_FORMAT');
 }
}
export function encodeOfflineEvidence(payload){
 validateEvidence(payload);
 const envelope={format:'smartfleet-offline-evidence-v1',payload,integritySha256:digest(canonical(payload))};
 return JSON.stringify(envelope,null,2)+'\n';
}
export function verifyOfflineEvidence(content,expectedFileSha256){
 if(typeof content!=='string'||content.length>1000000||!hex(expectedFileSha256,64)||digest(content)!==expectedFileSha256)fail('EVIDENCE_INTEGRITY');
 let parsed;try{parsed=JSON.parse(content);}catch{fail('EVIDENCE_FORMAT');}
 if(!exact(parsed,['format','payload','integritySha256'])||parsed.format!=='smartfleet-offline-evidence-v1'||digest(canonical(parsed.payload))!==parsed.integritySha256)fail('EVIDENCE_INTEGRITY');
 validateEvidence(parsed.payload);
 return structuredClone(parsed.payload);
}
