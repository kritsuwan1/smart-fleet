import {ENVIRONMENT} from './environment';
import {createD1Snapshot,inspectD1Snapshot,d1BackupDay,utf8Bytes,validateD1Rows,type SnapshotRow} from './d1-backup-format';
import type {BackupStatus} from './automatic-backup';
type Statement={bind:(...values:any[])=>Statement;first:()=>Promise<any>;all:()=>Promise<{success?:boolean;results:any[]}>;run:()=>Promise<any>};
type Database={prepare:(sql:string)=>Statement;withSession?:(constraint:string)=>Database};
export type D1BackupEnv={DB?:Database;BACKUP_DB?:Database};
type Dependencies={now:()=>number;sleep:(ms:number)=>Promise<void>;log:(record:Record<string,unknown>)=>void;timeoutMs:number};
const DAY=86400000,RETENTION_PAGE_SIZE=10,RETENTION_MAX_PAGES=100;
const codes=new Set(['D1_BACKUP_CONFIGURATION','D1_BACKUP_SCHEMA','D1_BACKUP_INVALID','D1_BACKUP_CAPACITY','D1_BACKUP_PERMISSION','D1_BACKUP_IO','D1_BACKUP_TIMEOUT','D1_BACKUP_SCHEDULE','D1_BACKUP_READBACK','D1_BACKUP_RETENTION','D1_BACKUP_RETENTION_LIMIT','D1_BACKUP_STATUS']);
class Fault extends Error{constructor(public code:string){super(code);}}
function fail(code:string):never{throw new Fault(code);}
function safeCode(error:unknown){const code=error instanceof Error?error.message:'';return codes.has(code)?code:'D1_BACKUP_IO';}
function sessions(env:D1BackupEnv){if(!env.DB||!env.BACKUP_DB||env.DB===env.BACKUP_DB)fail('D1_BACKUP_CONFIGURATION');return {source:env.DB.withSession?.('first-primary')??env.DB,target:env.BACKUP_DB.withSession?.('first-primary')??env.BACKUP_DB};}
async function schema(db:Database,backup:boolean){
 const expected:Record<string,string>=backup?{backup_control:'id:TEXT:1,enabled:INTEGER:0,last_attempt:TEXT:0,last_error:TEXT:0',backup_snapshots:'id:TEXT:1,created_at:TEXT:0,source_version:INTEGER:0,payload:TEXT:0,bytes:INTEGER:0'}:{fleet_store:'id:TEXT:1,payload:TEXT:0,version:INTEGER:0'};
 const objects=await db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' ORDER BY name").all();
 if(objects.success===false||!Array.isArray(objects.results))fail('D1_BACKUP_SCHEMA');
 const names=[];
 for(const o of objects.results){
  if(o.name==='_cf_KV'&&o.type==='table'&&o.tbl_name==='_cf_KV'&&typeof o.sql==='string'&&o.sql.replace(/\s+/g,' ').trim().replace(/;$/,'')==='CREATE TABLE _cf_KV ( key TEXT PRIMARY KEY, value BLOB ) WITHOUT ROWID')continue;
  if(o.type!=='table'||o.name!==o.tbl_name||!Object.hasOwn(expected,o.name))fail('D1_BACKUP_SCHEMA');names.push(o.name);
 }
 if(names.sort().join(',')!==Object.keys(expected).sort().join(','))fail('D1_BACKUP_SCHEMA');
 for(const name of Object.keys(expected)){
  // Fixed table names only; never interpolate a database/request-provided identifier.
  const info=await db.prepare('PRAGMA table_xinfo('+name+')').all();
  if(info.success===false||!Array.isArray(info.results)||info.results.some((c,index)=>c.hidden!==0||c.cid!==index||c.name!=='id'&&c.notnull!==1)||info.results.map(c=>c.name+':'+String(c.type).toUpperCase()+':'+c.pk).join(',')!==expected[name])fail('D1_BACKUP_SCHEMA');
 }
}
// Match SQLite BINARY ordering for arbitrary preserved legacy IDs, including Unicode.
function compareIds(left:string,right:string){const a=new TextEncoder().encode(left),b=new TextEncoder().encode(right);for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])return a[i]-b[i];return a.length-b.length;}
async function control(db:Database){const row=await db.prepare('SELECT id,enabled,last_attempt,last_error FROM backup_control WHERE id=?').bind(ENVIRONMENT).first();if(!row||row.id!==ENVIRONMENT||![0,1].includes(row.enabled)||typeof row.last_attempt!=='string'||typeof row.last_error!=='string')fail('D1_BACKUP_CONFIGURATION');return row;}
async function checked(row:any){
 if(!row||typeof row.id!=='string'||typeof row.payload!=='string'||row.bytes!==utf8Bytes(row.payload))fail('D1_BACKUP_READBACK');
 const snapshot=await inspectD1Snapshot(row.payload,ENVIRONMENT);
 if(snapshot.date!==row.id||snapshot.createdAt!==row.created_at||snapshot.mainVersion!==row.source_version)fail('D1_BACKUP_READBACK');return snapshot;
}
export async function runD1AutomaticBackup(env:D1BackupEnv,scheduledTime:number,overrides:Partial<Dependencies>={}){
 const deps:Dependencies={now:Date.now,sleep:ms=>new Promise(r=>setTimeout(r,ms)),log:r=>console.error('SmartFleet D1 backup',JSON.stringify(r)),timeoutMs:10000,...overrides};
 let target:Database|undefined,started='',snapshotSaved=false;
 async function attempt<T>(fn:()=>Promise<T>):Promise<T>{
  for(let i=0;i<3;i++){
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{return await Promise.race([fn(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Fault('D1_BACKUP_TIMEOUT')),deps.timeoutMs);})]);}
   catch(error){
    if(error instanceof Fault||codes.has(error instanceof Error?error.message:''))throw error;
    const message=error instanceof Error?error.message:'';
    if(/permission|unauthori[sz]ed|forbidden|not authorized|SQLITE_AUTH/i.test(message))fail('D1_BACKUP_PERMISSION');
    if(!/network|timeout|overload|temporar|busy|connection|lost response/i.test(message)||i===2)fail('D1_BACKUP_IO');
    await deps.sleep(100*(i+1));
   }finally{if(timer)clearTimeout(timer);}
  }return fail('D1_BACKUP_IO');
 }
 try{
  const now=deps.now();
  if(!Number.isFinite(now)||!Number.isFinite(scheduledTime)||scheduledTime>now+60000||now-scheduledTime>DAY||d1BackupDay(now)!==d1BackupDay(scheduledTime))fail('D1_BACKUP_SCHEDULE');
  started=new Date(now).toISOString();const date=d1BackupDay(scheduledTime),cutoff=d1BackupDay(now-6*DAY);
  const dbs=sessions(env);await attempt(()=>schema(dbs.target,true));
  const initialControl=await attempt(()=>control(dbs.target));if(initialControl.enabled===0)return {state:'disabled' as const,snapshotSaved:false};target=dbs.target;
  await attempt(()=>schema(dbs.source,false));
  const result=await attempt(()=>dbs.source.prepare('SELECT id,payload,version FROM fleet_store WHERE (SELECT COALESCE(SUM(length(CAST(payload AS BLOB))+length(CAST(id AS BLOB))+32),0) FROM fleet_store)<=1600000 AND (SELECT COUNT(*) FROM fleet_store)<=10000 ORDER BY id').all());
  if(result.success===false||!Array.isArray(result.results))fail('D1_BACKUP_INVALID');
  await validateD1Rows(result.results as SnapshotRow[],ENVIRONMENT);
  let row=await attempt(()=>target!.prepare('SELECT id,created_at,source_version,payload,bytes FROM backup_snapshots WHERE id=?').bind(date).first());
  if(!row){
   const payload=await createD1Snapshot(result.results as SnapshotRow[],ENVIRONMENT,date,started),snapshot=await inspectD1Snapshot(payload,ENVIRONMENT);
   await attempt(()=>target!.prepare('INSERT INTO backup_snapshots(id,created_at,source_version,payload,bytes) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM backup_control WHERE id=? AND enabled=1) ON CONFLICT(id) DO NOTHING').bind(date,started,snapshot.mainVersion,payload,utf8Bytes(payload),ENVIRONMENT).run());
   row=await attempt(()=>target!.prepare('SELECT id,created_at,source_version,payload,bytes FROM backup_snapshots WHERE id=?').bind(date).first());
  }
  const snapshot=await checked(row);snapshotSaved=true;
  // Fix the scan upper bound once. Keyset pagination advances past preserved legacy rows;
  // deletes cannot shift an OFFSET, and new older rows are handled by a later invocation.
  const high=await attempt(()=>target!.prepare('SELECT MAX(id) AS upper FROM backup_snapshots WHERE id<?').bind(cutoff).first());
  if(!high||high.upper!==null&&typeof high.upper!=='string')fail('D1_BACKUP_RETENTION');
  const upper=high.upper as string|null;let cursor='',pages=0;const seen=new Set<string>();
  while(upper!==null&&cursor!==upper){
   if(pages++>=RETENTION_MAX_PAGES)fail('D1_BACKUP_RETENTION_LIMIT');
   const old=await attempt(()=>target!.prepare('SELECT id,created_at,source_version,payload,bytes FROM backup_snapshots WHERE id>? AND id<? AND id<=? ORDER BY id LIMIT 10').bind(cursor,cutoff,upper).all());
   if(old.success===false||!Array.isArray(old.results)||old.results.length>RETENTION_PAGE_SIZE)fail('D1_BACKUP_RETENTION');
   if(!old.results.length)break;
   const next=old.results[old.results.length-1].id;
   if(typeof next!=='string'||compareIds(next,cursor)<=0||seen.has(next))fail('D1_BACKUP_RETENTION');
   let previous=cursor;for(const entry of old.results){if(typeof entry.id!=='string'||compareIds(entry.id,previous)<=0||compareIds(entry.id,upper)>0)fail('D1_BACKUP_RETENTION');previous=entry.id;}
   for(const candidate of old.results){
    // Historical/unknown/corrupt rows are preserved, but do not block later pages.
    try{await checked(candidate);}catch{continue;}
    if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(candidate.id)||candidate.id>=cutoff||candidate.id===date)continue;
    const deletion=await attempt(()=>target!.prepare('DELETE FROM backup_snapshots WHERE id=? AND payload=? AND created_at=? AND source_version=? AND bytes=? AND id<? AND EXISTS(SELECT 1 FROM backup_snapshots WHERE id=? AND payload=?) AND EXISTS(SELECT 1 FROM backup_control WHERE id=? AND enabled=1)').bind(candidate.id,candidate.payload,candidate.created_at,candidate.source_version,candidate.bytes,cutoff,date,row.payload,ENVIRONMENT).run());
    if(deletion.success===false)fail('D1_BACKUP_RETENTION');
   }
   cursor=next;seen.add(cursor);
  }
  const finalRow=await attempt(()=>target!.prepare('SELECT id,created_at,source_version,payload,bytes FROM backup_snapshots WHERE id=?').bind(date).first());
  await checked(finalRow);if(finalRow.payload!==row.payload)fail('D1_BACKUP_READBACK');
  const saved=await attempt(()=>target!.prepare("UPDATE backup_control SET last_attempt=?,last_error='' WHERE id=? AND enabled=1 AND last_attempt<=? AND EXISTS(SELECT 1 FROM backup_snapshots WHERE id=? AND payload=?)").bind(started,ENVIRONMENT,started,date,row.payload).run());
  if(saved.success===false)fail('D1_BACKUP_STATUS');
  let concurrent=false;
  if(saved.meta?.changes!==1){
   // A newer successful job may own status. Revalidate the immutable winner instead
   // of overwriting monotonic control or treating a legitimate supersession as failure.
   const current=await attempt(()=>target!.prepare('SELECT id,created_at,source_version,payload,bytes FROM backup_snapshots WHERE id=?').bind(date).first());
   await checked(current);if(current.payload!==row.payload)fail('D1_BACKUP_READBACK');
   const latest=await attempt(()=>control(target!)),completed=Date.parse(latest.last_attempt);
   if(latest.enabled!==1||latest.last_error!==''||!Number.isFinite(completed)||new Date(completed).toISOString()!==latest.last_attempt||completed<=Date.parse(started)||completed<Date.parse(current.created_at))fail('D1_BACKUP_STATUS');
   concurrent=true;
  }
  deps.log({event:'d1-backup-success',date,concurrent});return {state:'success' as const,snapshotSaved:true,date,sha256:snapshot.sha256,concurrent};
 }catch(error){
  const code=safeCode(error);
  if(target&&started){try{await attempt(()=>target!.prepare('UPDATE backup_control SET last_attempt=?,last_error=? WHERE id=? AND last_attempt<=?').bind(started,code,ENVIRONMENT,started).run());}catch{}}
  deps.log({event:'d1-backup-failed',code,snapshotSaved});return {state:'failed' as const,code,snapshotSaved};
 }
}
export async function d1AutomaticBackupStatus(env:D1BackupEnv,now=Date.now()):Promise<BackupStatus>{
 const {target}=sessions(env);await schema(target,true);const c=await control(target);
 if(!c.enabled)return {enabled:false,state:'disabled'};
 const result=await target.prepare('SELECT id,created_at,source_version,payload,bytes FROM backup_snapshots ORDER BY id DESC LIMIT 8').all();
 if(result.success===false||!Array.isArray(result.results))fail('D1_BACKUP_STATUS');
 let lastSuccess:BackupStatus['lastSuccess'],unverifiedNewest=false;
 for(const row of result.results){try{const s=await checked(row);lastSuccess={date:s.date,completedAt:s.createdAt,sourceVersion:s.mainVersion,sha256:s.sha256,bytes:row.bytes};break;}catch{unverifiedNewest=true;}}
 const unpublished=lastSuccess&&(!Number.isFinite(Date.parse(c.last_attempt))||c.last_attempt<lastSuccess.completedAt||Date.parse(lastSuccess.completedAt)>now+60000);
 const code=unpublished?'D1_BACKUP_UNVERIFIED':unverifiedNewest?'D1_BACKUP_UNVERIFIED':c.last_error?(codes.has(c.last_error)?c.last_error:'D1_BACKUP_IO'):!lastSuccess?'D1_BACKUP_UNVERIFIED':now-Date.parse(lastSuccess.completedAt)>26*3600000?'D1_BACKUP_STALE':undefined;
 return {enabled:true,state:code?'failed':'success',...(code?{code}:{}),...(lastSuccess?{lastSuccess}:{}),notification:'unconfigured'};
}
