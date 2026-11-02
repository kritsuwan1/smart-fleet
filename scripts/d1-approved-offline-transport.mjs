// Approval-gated MOCK transport rehearsal. Never authenticates to Cloudflare.
import {randomUUID} from 'node:crypto';
import {createD1ReadonlyBroker,describeMockBrokerPolicy} from './d1-readonly-broker.mjs';
import {createD1ReadonlyAdapter} from './d1-readonly-adapter.mjs';
import {DASHBOARD_ACCOUNT_ID} from './d1-provider-identity.mjs';
import {isOfflineApprovalAuthority,encodeOfflineEvidence,persistOfflineArtifact} from './d1-offline-security.mjs';
const fail=code=>{throw Error('D1_OFFLINE_TRANSPORT_'+code);};
const exactOptions=value=>value&&Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).every(k=>['mode','target','config','scenario','authority','signedApproval'].includes(k));

export async function createApprovedOfflineTransport(options={}){
 if(!exactOptions(options))fail('OPTIONS');
 if((options.mode??'offline')!=='offline')fail('LIVE_DISABLED');
 const {target,authority}=options,config=structuredClone(options.config);
 const policy=describeMockBrokerPolicy(target,config);
 if(!isOfflineApprovalAuthority(authority))fail('AUTHORITY');
 for(const key of ['target','accountId','databaseId','binding','configSha256','policySha256'])if(authority.scope[key]!==policy[key])fail('CROSS_SCOPE');
 // Signature verification and durable nonce claim precede any mock metadata call.
 const grant=await authority.accept(options.signedApproval);
 const approved=authority.describe(grant);
 const broker=createD1ReadonlyBroker({target,config,scenario:options.scenario??'reserved'});
 const startedAt=new Date().toISOString();
 let used=false,closed=false,status='NOT_RUN',reason=null,finishedAt=null;
 async function transport(url,request){
  if(closed)fail('CLOSED');
  try{
   authority.consume(grant);
   return await broker.transport(url,request);
  }catch{closed=true;status='REFUSED';reason='APPROVAL_OR_REQUEST_REFUSED';finishedAt=new Date().toISOString();fail('REFUSED');}
 }
 async function run(){
  if(used||closed)fail('REPLAY_OR_CLOSED');used=true;
  if(broker.getEvidence().requests.length){closed=true;status='REFUSED';reason='APPROVAL_OR_REQUEST_REFUSED';finishedAt=new Date().toISOString();fail('ORDER');}
  try{
   const adapter=await createD1ReadonlyAdapter({target,config,expectedAccountId:DASHBOARD_ACCOUNT_ID,transport});
   await adapter.review();authority.describe(grant);status='PASS';finishedAt=new Date().toISOString();return getEvidence();
  }catch{closed=true;status='REFUSED';reason='APPROVAL_OR_TRANSPORT_REFUSED';finishedAt=new Date().toISOString();fail('REFUSED');}
 }
 function getEvidence(){
  const capture=broker.getEvidence();
  // Grant details were established before requests; expired grants cannot grant
  // more requests. A captured identity is historical, not current authorization.
  return{mode:'offline',synthetic:true,liveVerification:'NOT_VERIFIED',operatorEnrollment:'NOT_VERIFIED',tlsVerification:'NOT_EXERCISED',target,scope:{...authority.scope},authorization:{operatorId:approved.operatorId,keyFingerprint:approved.keyFingerprint,approvalDigest:approved.approvalDigest,nonceDigest:approved.nonceDigest,expiresAt:approved.expiresAt,requestBudget:approved.remaining},approvalSignatureVerified:true,startedAt,finishedAt,status,reason,mockMetadata:capture.mockMetadata,schemaEvidence:capture.schemaEvidence,fleetStoreCount:capture.fleetStoreCount,requests:capture.requests,brokerFresh:capture.fresh};
 }
 async function saveEvidence(){
  if(!['PASS','REFUSED'].includes(status))fail('EVIDENCE_NOT_FINISHED');
  const content=encodeOfflineEvidence(getEvidence());
  return persistOfflineArtifact('sealed-evidence',`offline-${target}-${randomUUID()}.json`,content);
 }
 return Object.freeze({run,transport,getEvidence,saveEvidence});
}
