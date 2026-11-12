import {backupDigest,createBackup,inspectBackup} from './backup';
import {parseOperationalState} from './account-compatibility';
import {readTripOperation} from './trip-operation';
import {APP_VERSION} from './version';
export const D1_BACKUP_MAX_BYTES=1_800_000;
export type SnapshotRow={id:string;payload:string;version:number};
export const utf8Bytes=(text:string)=>new TextEncoder().encode(text).length;
export const d1BackupDay=(time:number)=>new Date(time+7*3600000).toISOString().slice(0,10);
export const D1_FORMAT='smart-fleet-d1-snapshot';
function invalid():never{throw Error('D1_BACKUP_INVALID');}
export async function validateD1Rows(rows:SnapshotRow[],environment:string){
 if(!Array.isArray(rows)||!rows.length||rows.length>10000||!['production','demo'].includes(environment))invalid();
 const ids=new Set<string>();let prior='';
 for(const row of rows){
  if(!row||Object.keys(row).sort().join(',')!=='id,payload,version'||typeof row.id!=='string'||row.id<=prior||ids.has(row.id)||typeof row.payload!=='string'||!Number.isSafeInteger(row.version)||row.version<0)invalid();
  prior=row.id;ids.add(row.id);
  if(!['main','environment'].includes(row.id)&&!/^trip-operation:v1:[a-f0-9]{64}$/.test(row.id)&&!/^auth:[a-f0-9]{64}$/.test(row.id)&&!/^fuel:b7:\d{4}-\d{2}$/.test(row.id)&&!/^backup:(lease|status):(production|staging)$/.test(row.id))invalid();
 }
 const main=rows.find(r=>r.id==='main');if(!main)invalid();
 const marker=rows.find(r=>r.id==='environment');
 if(environment==='demo'&&!marker||marker&&marker.payload!==environment)invalid();
 const state=parseOperationalState(main.payload);
 if(typeof state.sessionKey!=='string'||!state.sessionKey.trim())invalid();
 await inspectBackup(JSON.stringify(await createBackup(state,APP_VERSION,environment)));
 for(const row of rows.filter(r=>r.id.startsWith('trip-operation:'))){
  const op=await readTripOperation({DB:{prepare(){return{bind(){return this;},first:async()=>({payload:row.payload})};}}},row.id);
  if(!op||op.version>main.version||typeof op.commitToken!=='string'||!op.commitToken||typeof op.id!=='string'||!op.id)invalid();
 }
 return main;
}
export async function createD1Snapshot(rows:SnapshotRow[],environment:string,date:string,createdAt:string){
 const main=await validateD1Rows(rows,environment);
 const body={format:D1_FORMAT,formatVersion:1,environment,date,createdAt,appVersion:APP_VERSION,mainVersion:main.version,rowCount:rows.length,rows};
 const text=JSON.stringify({...body,sha256:await backupDigest(body)});
 if(utf8Bytes(text)>D1_BACKUP_MAX_BYTES)throw Error('D1_BACKUP_CAPACITY');
 await inspectD1Snapshot(text,environment);return text;
}
export async function inspectD1Snapshot(text:string,environment:string){
 if(typeof text!=='string'||utf8Bytes(text)>D1_BACKUP_MAX_BYTES)invalid();
 let value:any;try{value=JSON.parse(text);}catch{invalid();}
 if(!value||Object.keys(value).sort().join(',')!=='appVersion,createdAt,date,environment,format,formatVersion,mainVersion,rowCount,rows,sha256'||value.format!==D1_FORMAT||value.formatVersion!==1||value.environment!==environment||typeof value.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||typeof value.createdAt!=='string'||!Number.isFinite(Date.parse(value.createdAt))||new Date(value.createdAt).toISOString()!==value.createdAt||d1BackupDay(Date.parse(value.createdAt))!==value.date||typeof value.appVersion!=='string'||typeof value.sha256!=='string'||!/^[a-f0-9]{64}$/.test(value.sha256))invalid();
 const {sha256,...body}=value;if(await backupDigest(body)!==sha256)invalid();
 const main=await validateD1Rows(value.rows,environment);
 if(value.rowCount!==value.rows.length||value.mainVersion!==main.version)invalid();
 return value as {format:string;formatVersion:number;environment:string;date:string;createdAt:string;appVersion:string;mainVersion:number;rowCount:number;rows:SnapshotRow[];sha256:string};
}
