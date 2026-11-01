import {ENVIRONMENT,assertDatabaseEnvironment} from './environment';
import {APP_VERSION} from './version';
import {createBackup,inspectBackup} from './backup';
import {thaiToday} from './maintenance';
import {MAIN_DATA_LIMIT_BYTES} from './limits';
export async function backupControl(env:any){
 if(!env.BACKUP_DB||env.BACKUP_DB===env.DB)throw Error('BACKUP_NOT_CONFIGURED');
 const row=await env.BACKUP_DB.prepare('SELECT * FROM backup_control WHERE id=?').bind(ENVIRONMENT).first();
 if(!row)throw Error('BACKUP_ENVIRONMENT_MISMATCH');return row;
}
export async function captureBackup(env:any,manual=false,now=Date.now()){
 await assertDatabaseEnvironment(env);const control=await backupControl(env);
 if(!manual&&!control.enabled)return {skipped:true};
 const time=new Date(now).toISOString();
 try{
  const row=await env.DB.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").first();
  if(!row)throw Error('NO_MAIN_DATA');
  if(new TextEncoder().encode(row.payload).length>MAIN_DATA_LIMIT_BYTES)throw Error('BACKUP_TOO_LARGE');
  const b=await createBackup(JSON.parse(row.payload),APP_VERSION,ENVIRONMENT);b.exportedAt=time;
  const payload=JSON.stringify(b),id=thaiToday(now),bytes=new TextEncoder().encode(payload).length;
  // One snapshot per Thai calendar day. A slower request cannot replace a newer source version.
  await env.BACKUP_DB.prepare('INSERT INTO backup_snapshots(id,created_at,source_version,payload,bytes) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET created_at=excluded.created_at,source_version=excluded.source_version,payload=excluded.payload,bytes=excluded.bytes WHERE excluded.source_version>=backup_snapshots.source_version AND excluded.created_at>=backup_snapshots.created_at').bind(id,time,row.version,payload,bytes).run();
  // Prune only after the new complete snapshot was saved; never delete the main database.
  await env.BACKUP_DB.prepare('DELETE FROM backup_snapshots WHERE id<?').bind(thaiToday(now-6*86400000)).run();
  await env.BACKUP_DB.prepare("UPDATE backup_control SET last_attempt=?,last_error='' WHERE id=?").bind(time,ENVIRONMENT).run();
  return {skipped:false,id};
 }catch(e){
  try{await env.BACKUP_DB.prepare('UPDATE backup_control SET last_attempt=?,last_error=? WHERE id=?').bind(time,'สำรองไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแล',ENVIRONMENT).run();}catch{}
  throw e;
 }
}
export async function automaticBackupStatus(env:any,now=Date.now()){
 const control=await backupControl(env);
 const result=await env.BACKUP_DB.prepare('SELECT id,created_at,source_version,bytes FROM backup_snapshots ORDER BY id DESC LIMIT 7').all();
 const history=result.results||[],last=history[0];
 return {enabled:!!control.enabled,environment:ENVIRONMENT,retentionDays:7,schedule:'02:00 น. เวลาไทย',lastAttempt:control.last_attempt,lastError:control.last_error,stale:!!control.enabled&&(!last||now-Date.parse(last.created_at)>26*3600000),totalBytes:history.reduce((n:number,r:any)=>n+r.bytes,0),history};
}
export async function savedBackup(env:any,id:string){
 await backupControl(env);if(!/^\d{4}-\d\d-\d\d$/.test(id))throw Error('INVALID_BACKUP_ID');
 const row=await env.BACKUP_DB.prepare('SELECT payload FROM backup_snapshots WHERE id=?').bind(id).first();
 if(!row)return null;
 const b=JSON.parse(row.payload);if(b.environment!==ENVIRONMENT)throw Error('BACKUP_ENVIRONMENT_MISMATCH');
 await inspectBackup(row.payload);return b;
}
