import {backupDigest,createBackup,inspectBackup} from './backup';
import type {Fleet} from './fleet';
import {IS_DEMO} from './environment';
import {APP_VERSION} from './version';

export const BACKUP_CRON='0 19 * * *';
const DAY=86400000,LEASE_MS=15*60000,MAX_BYTES=5_000_000;
type BackupEnvironment='staging'|'production';
type Database={prepare:(sql:string)=>any};
type StoredObject={size:number;text:()=>Promise<string>};
type Bucket={get:(key:string)=>Promise<StoredObject|null>;put:(key:string,value:string,options:any)=>Promise<unknown>;list:(options:any)=>Promise<{objects:{key:string}[];truncated:boolean;cursor?:string}>;delete:(key:string)=>Promise<void>};
export type BackupEnv={DB?:Database;BACKUP_BUCKET?:Bucket;AUTOMATIC_BACKUP_ENABLED?:string;BACKUP_ENVIRONMENT?:string;BACKUP_NOTIFICATION_URL?:string;BACKUP_NOTIFICATION_TOKEN?:string};
type Summary={date:string;completedAt:string;sourceVersion:number;sha256:string;bytes:number};
export type BackupStatus={enabled:boolean;state:'disabled'|'never'|'running'|'success'|'failed';date?:string;code?:string;notification?:'sent'|'failed'|'unconfigured';lastSuccess?:Summary};
type Dependencies={now:()=>number;sleep:(ms:number)=>Promise<void>;fetch:typeof fetch;log:(record:Record<string,unknown>)=>void};
class BackupError extends Error {constructor(public code:string){super(code);}}
function fail(code:string):never {throw new BackupError(code);}
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
export const backupDay=(time:number)=>new Date(time+7*3600000).toISOString().slice(0,10);
const prefix=(environment:BackupEnvironment)=>'fleet/v1/'+environment+'/';
const objectKey=(environment:BackupEnvironment,date:string)=>prefix(environment)+date+'.json';
const publicCodes=new Set(['CONFIGURATION_INVALID','ENVIRONMENT_MISMATCH','SCHEDULE_INVALID','LEASE_UNAVAILABLE','LEASE_LOST','STATE_MISSING','STATE_INVALID','STATE_TOO_LARGE','INTEGRITY_FAILED','STORAGE_READ_FAILED','STORAGE_WRITE_FAILED','READBACK_MISSING','RETENTION_FAILED','BACKUP_FAILED']);
function environment(env:BackupEnv):BackupEnvironment {
 if(env.BACKUP_ENVIRONMENT!=='staging'&&env.BACKUP_ENVIRONMENT!=='production')return fail('CONFIGURATION_INVALID');
 if((env.BACKUP_ENVIRONMENT==='staging')!==IS_DEMO)return fail('ENVIRONMENT_MISMATCH');
 return env.BACKUP_ENVIRONMENT;
}
async function marker(db:Database,expected:string){
 const row=await db.prepare("SELECT payload FROM fleet_store WHERE id='environment'").first();
 if(row?.payload!==expected)fail('ENVIRONMENT_MISMATCH');
}
const counts=(s:Fleet)=>({cars:s.cars.length,people:s.people.length,projects:s.projects.length,trips:s.trips.length,audit:s.audit.length,accounts:s.accounts?.length||0});
export async function automaticBackupArtifact(state:Fleet,sourceVersion:number,env:BackupEnvironment,date:string,createdAt:string){
 await inspectBackup(JSON.stringify(await createBackup(state,APP_VERSION,env==='staging'?'demo':'production')));
 const metadata={environment:env,backupDate:date,createdAt,appVersion:APP_VERSION,sourceVersion,stateBytes:bytes(state),counts:counts(state),stateSha256:await backupDigest(state)};
 const body={format:'smart-fleet-automatic-backup',schemaVersion:1,metadata,state};
 return {...body,sha256:await backupDigest(body)};
}
export async function inspectAutomaticBackup(text:string,expectedEnvironment?:BackupEnvironment,expectedDate?:string){
 try{
  if(new TextEncoder().encode(text).length>MAX_BYTES)fail('INTEGRITY_FAILED');
  const b=JSON.parse(text),m=b?.metadata;
  if(b.format!=='smart-fleet-automatic-backup'||b.schemaVersion!==1||!m||!['staging','production'].includes(m.environment)||!/^\d{4}-\d\d-\d\d$/.test(m.backupDate)||!Number.isFinite(Date.parse(m.backupDate+'T00:00:00Z'))||new Date(m.backupDate+'T00:00:00Z').toISOString().slice(0,10)!==m.backupDate||!Number.isFinite(Date.parse(m.createdAt))||typeof m.appVersion!=='string'||!Number.isInteger(m.sourceVersion)||m.sourceVersion<0)fail('INTEGRITY_FAILED');
  if(expectedEnvironment&&m.environment!==expectedEnvironment||expectedDate&&m.backupDate!==expectedDate)fail('INTEGRITY_FAILED');
  await inspectBackup(JSON.stringify(await createBackup(b.state,m.appVersion,m.environment==='staging'?'demo':'production')));
  if(m.stateBytes!==bytes(b.state)||JSON.stringify(m.counts)!==JSON.stringify(counts(b.state))||m.stateSha256!==await backupDigest(b.state))fail('INTEGRITY_FAILED');
  const {sha256,...body}=b;
  if(typeof sha256!=='string'||sha256!==await backupDigest(body))fail('INTEGRITY_FAILED');
  return b as Awaited<ReturnType<typeof automaticBackupArtifact>>;
 }catch{return fail('INTEGRITY_FAILED');}
}

// Restore has no HTTP route. Only an empty D1 with the existing Demo marker is accepted.
export async function restoreAutomaticBackupToStaging(db:Database,text:string,target:'staging'){
 if(target!=='staging')fail('RESTORE_TARGET_INVALID');
 await marker(db,'demo');
 const artifact=await inspectAutomaticBackup(text),state=structuredClone(artifact.state);
 state.sessionKey=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
 const result=await db.prepare("INSERT INTO fleet_store(id,payload,version) SELECT 'main',?,0 WHERE (SELECT payload FROM fleet_store WHERE id='environment')='demo' AND NOT EXISTS(SELECT 1 FROM fleet_store WHERE id='main')").bind(JSON.stringify(state)).run();
 if(!result.meta.changes)fail('RESTORE_TARGET_NOT_EMPTY');
 const stored=await db.prepare("SELECT payload FROM fleet_store WHERE id='main'").first();
 if(stored?.payload!==JSON.stringify(state))fail('RESTORE_VERIFICATION_FAILED');
 return {sourceVersion:artifact.metadata.sourceVersion,counts:counts(state),sha256:artifact.sha256};
}

function safeStatus(raw:any):BackupStatus {
 const result:BackupStatus={enabled:true,state:['running','success','failed'].includes(raw?.state)?raw.state:'never'};
 if(/^\d{4}-\d\d-\d\d$/.test(raw?.date))result.date=raw.date;
 if(publicCodes.has(raw?.code))result.code=raw.code;
 if(['sent','failed','unconfigured'].includes(raw?.notification))result.notification=raw.notification;
 const last=raw?.lastSuccess;
 if(last&&/^\d{4}-\d\d-\d\d$/.test(last.date)&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(last.completedAt)&&Number.isFinite(Date.parse(last.completedAt))&&Number.isInteger(last.sourceVersion)&&last.sourceVersion>=0&&/^[a-f0-9]{64}$/.test(last.sha256)&&Number.isInteger(last.bytes)&&last.bytes>=0&&last.bytes<=MAX_BYTES)result.lastSuccess={date:last.date,completedAt:last.completedAt,sourceVersion:last.sourceVersion,sha256:last.sha256,bytes:last.bytes};
 return result;
}
export async function automaticBackupStatus(env:BackupEnv):Promise<BackupStatus>{
 if(env.AUTOMATIC_BACKUP_ENABLED!=='true')return {enabled:false,state:'disabled'};
 const e=environment(env);if(!env.DB)fail('CONFIGURATION_INVALID');
 await marker(env.DB!,IS_DEMO?'demo':'production');
 const row=await env.DB!.prepare('SELECT payload FROM fleet_store WHERE id=?').bind('backup:status:'+e).first();
 try{return safeStatus(row?JSON.parse(row.payload):null);}catch{return {enabled:true,state:'never'};}
}

export async function runAutomaticBackup(env:BackupEnv,scheduledTime:number,overrides:Partial<Dependencies>={}){
 if(env.AUTOMATIC_BACKUP_ENABLED!=='true')return {state:'disabled' as const};
 const deps:Dependencies={now:Date.now,sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms)),fetch:globalThis.fetch,log:r=>console.error('SmartFleet backup',JSON.stringify(r)),...overrides};
 let e:BackupEnvironment|undefined,date:string|undefined,owned=false;
 const token=crypto.randomUUID();let status:BackupStatus={enabled:true,state:'running'};
 let leaseId='';
 // A deadline bounds waiting, while conditional R2 creation fences late writes after timeout.
 async function retry<T>(operation:()=>Promise<T>,code:string):Promise<T>{
  for(let attempt=0;attempt<3;attempt++){
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{return await Promise.race([operation(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new BackupError(code)),10000);})]);}
   catch(error){if(error instanceof BackupError&&error.code!==code)throw error;if(attempt===2)fail(code);await deps.sleep(100*2**attempt);}
   finally{if(timer)clearTimeout(timer);}
  }
  return fail(code);
 }
 async function renew(){
  const row=await env.DB!.prepare("UPDATE fleet_store SET payload=json_set(payload,'$.expires',?) WHERE id=? AND json_extract(payload,'$.token')=? AND json_extract(payload,'$.expires')>? RETURNING id").bind(deps.now()+LEASE_MS,leaseId,token,deps.now()).first();
  if(!row)fail('LEASE_LOST');
 }
 async function saveStatus(){
  await renew();
  const result=await env.DB!.prepare("INSERT INTO fleet_store(id,payload,version) SELECT ?,?,0 WHERE EXISTS(SELECT 1 FROM fleet_store WHERE id=? AND json_extract(payload,'$.token')=? AND json_extract(payload,'$.expires')>?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=fleet_store.version+1").bind('backup:status:'+e,JSON.stringify(status),leaseId,token,deps.now()).run();
  if(!result.meta.changes)fail('LEASE_LOST');
 }
 async function readArtifact(key:string){
  const text=await retry(async()=>{const object=await env.BACKUP_BUCKET!.get(key);if(!object)return null;if(object.size>MAX_BYTES)fail('INTEGRITY_FAILED');return object.text();},'STORAGE_READ_FAILED');
  if(text===null)return null;
  return {artifact:await inspectAutomaticBackup(text,e,key.slice(prefix(e!).length,-5)),bytes:new TextEncoder().encode(text).length};
 }
 async function notify(code:string):Promise<'sent'|'failed'|'unconfigured'>{
  if(!env.BACKUP_NOTIFICATION_URL)return 'unconfigured';
  try{
   const url=new URL(env.BACKUP_NOTIFICATION_URL);
   if(url.protocol!=='https:'||url.username||url.password)throw Error();
   await retry(async()=>{const response=await deps.fetch(url.href,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',...(env.BACKUP_NOTIFICATION_TOKEN?{Authorization:'Bearer '+env.BACKUP_NOTIFICATION_TOKEN}:{})},body:JSON.stringify({event:'smartfleet.backup.failed',environment:e||'unknown',date:date||'unknown',code})});if(!response.ok)throw Error();},'NOTIFICATION_FAILED');
   return 'sent';
  }catch{deps.log({event:'backup-notification-failed',code:'NOTIFICATION_FAILED',environment:e||'unknown'});return 'failed';}
 }
 try{
  e=environment(env);
  if(!env.DB||!env.BACKUP_BUCKET)fail('CONFIGURATION_INVALID');
  await marker(env.DB!,IS_DEMO?'demo':'production');
  if(!Number.isFinite(scheduledTime)||Math.abs(deps.now()-scheduledTime)>DAY)fail('SCHEDULE_INVALID');
  date=backupDay(scheduledTime);leaseId='backup:lease:'+e;
  const lease=await retry(()=>env.DB!.prepare("INSERT INTO fleet_store(id,payload,version) VALUES (?,?,0) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=fleet_store.version+1 WHERE json_extract(fleet_store.payload,'$.expires')<=? OR json_extract(fleet_store.payload,'$.token')=? RETURNING id").bind(leaseId,JSON.stringify({token,expires:deps.now()+LEASE_MS}),deps.now(),token).first(),'LEASE_UNAVAILABLE');
  if(!lease)return {state:'skipped' as const,code:'ALREADY_RUNNING'};
  owned=true;status=await automaticBackupStatus(env);
  if(status.lastSuccess&&date<status.lastSuccess.date)return {state:'skipped' as const,code:'STALE_SCHEDULE'};
  status={enabled:true,state:'running',date,...(status.lastSuccess?{lastSuccess:status.lastSuccess}:{})};
  await saveStatus();
  const key=objectKey(e,date);let verified=await readArtifact(key);
  if(!verified){
   // Unlike readState(), this SELECT cannot initialize or mutate main/sessionKey.
   const snapshot=await env.DB!.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").first();
   if(!snapshot)fail('STATE_MISSING');
   let artifact:Awaited<ReturnType<typeof automaticBackupArtifact>>;
   try{artifact=await automaticBackupArtifact(JSON.parse(snapshot.payload),snapshot.version,e,date,new Date(deps.now()).toISOString());}catch{return fail('STATE_INVALID');}
   const text=JSON.stringify(artifact);if(new TextEncoder().encode(text).length>MAX_BYTES)fail('STATE_TOO_LARGE');
   await renew();
   await retry(()=>env.BACKUP_BUCKET!.put(key,text,{onlyIf:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType:'application/json',cacheControl:'no-store'},customMetadata:{environment:e!,date:date!,sha256:artifact.sha256}}),'STORAGE_WRITE_FAILED');
   verified=await readArtifact(key);if(!verified)fail('READBACK_MISSING');
  }
  status.lastSuccess={date,completedAt:new Date(deps.now()).toISOString(),sourceVersion:verified.artifact.metadata.sourceVersion,sha256:verified.artifact.sha256,bytes:verified.bytes};
  await saveStatus();
  // Keep today plus six prior Bangkok calendar days. Never purge before verified read-back.
  const cutoff=new Date(Date.parse(date+'T00:00:00Z')-6*DAY).toISOString().slice(0,10);
  let cursor:string|undefined;const seen=new Set<string>();
  do{
   await renew();
   const page=await retry(()=>env.BACKUP_BUCKET!.list({prefix:prefix(e!),limit:1000,...(cursor?{cursor}:{})}),'RETENTION_FAILED');
   for(const object of page.objects){
    const name=object.key.slice(prefix(e).length);
    if(object.key.startsWith(prefix(e))&&/^\d{4}-\d\d-\d\d\.json$/.test(name)&&name.slice(0,10)<cutoff&&object.key!==key){
     await renew();await retry(()=>env.BACKUP_BUCKET!.delete(object.key),'RETENTION_FAILED');
    }
   }
   cursor=page.truncated?page.cursor:undefined;
   if(page.truncated&&(!cursor||seen.has(cursor)))fail('RETENTION_FAILED');
   if(cursor)seen.add(cursor);
  }while(cursor);
  status.state='success';await saveStatus();return {state:'success' as const,date};
 }catch(error){
  const code=error instanceof BackupError?error.code:'BACKUP_FAILED';
  deps.log({event:'backup-failed',environment:e||'unknown',date:date||'unknown',code});
  status={...status,state:'failed',code,notification:await notify(code)};
  if(owned){try{await saveStatus();}catch{deps.log({event:'backup-status-failed',code:'STATUS_UNAVAILABLE',environment:e||'unknown'});}}
  return {state:'failed' as const,code};
 }finally{
  if(owned){try{await env.DB!.prepare("DELETE FROM fleet_store WHERE id=? AND json_extract(payload,'$.token')=?").bind(leaseId,token).run();}catch{deps.log({event:'backup-lease-release-failed',code:'LEASE_UNAVAILABLE',environment:e||'unknown'});}}
 }
}
