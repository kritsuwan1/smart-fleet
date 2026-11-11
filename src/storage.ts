import {IS_RECOVERY,RecoveryStateError} from './recovery-mode';
import {IS_DEMO,IS_STAGING,assertDatabaseEnvironment} from './environment';
import {initial,type Fleet} from './fleet';
import {MAIN_DATA_LIMIT_BYTES} from './limits';
import {OperationError} from './trip-operation';
import {assertOperationalAccounts,parseOperationalState} from './account-compatibility';
export async function readState(env:any){
 if(IS_RECOVERY){
  try{
   if(!env.DB)throw Error();
   await assertDatabaseEnvironment(env);
   const row=await env.DB.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").first();
   if(!row)throw Error();
   const state=parseOperationalState(row.payload);
   if(typeof state.sessionKey!=='string'||!state.sessionKey.trim()||!Number.isSafeInteger(row.version)||row.version<0)throw Error();
   return {state,version:row.version as number,payloadBytes:new TextEncoder().encode(row.payload).length};
  }catch{throw new RecoveryStateError();}
 }
 if(!env.DB)throw Error('ไม่พบฐานข้อมูล DB');
 await assertDatabaseEnvironment(env);
 let row=await env.DB.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").first();
 if(row){const state=parseOperationalState(row.payload);if(state.sessionKey!==undefined)return {state,version:row.version as number,payloadBytes:new TextEncoder().encode(row.payload).length};}
 const sessionKey=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
 await env.DB.prepare('INSERT OR IGNORE INTO fleet_store(id,payload,version) VALUES (?,?,0)').bind('main',JSON.stringify({...initial,...(IS_DEMO?{people:[{id:'p1',name:'พนักงานทดสอบ 1',active:true},{id:'p2',name:'พนักงานทดสอบ 2',active:true}],projects:['โครงการทดสอบ Demo']}:{}),...(IS_STAGING?{cars:[{id:'staging-car-1',plate:'SYNTHETIC-001',province:'ทดสอบ',model:'Synthetic test vehicle',initialOdo:100,active:true}],projects:['Synthetic staging project']}:{}),accounts:[],sessionKey})).run();
 row=await env.DB.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").first();
 const existing=parseOperationalState(row.payload);
 if(existing.sessionKey===undefined)await env.DB.prepare("UPDATE fleet_store SET payload=json_set(payload,'$.sessionKey',?),version=version+1 WHERE id='main' AND version=? AND json_extract(payload,'$.sessionKey') IS NULL").bind(sessionKey,row.version).run();
 row=await env.DB.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").first();
 const state=parseOperationalState(row.payload);
 if(typeof state.sessionKey!=='string')throw Error('STATE_INITIALIZATION_CONFLICT');
 return {state,version:row.version as number,payloadBytes:new TextEncoder().encode(row.payload).length};
}
export async function writeState(env:any,state:Fleet,version:number){
 assertOperationalAccounts(state);
 await assertDatabaseEnvironment(env);
 const current=await env.DB.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").first();
 if(!current)return false;parseOperationalState(current.payload);if(current.version!==version)return false;
 const payload=JSON.stringify(state);if(new TextEncoder().encode(payload).length>MAIN_DATA_LIMIT_BYTES)throw Error('ข้อมูลใกล้ถึงขีดจำกัด กรุณาสำรองข้อมูลและติดต่อผู้ดูแลเพื่อขยายฐานข้อมูล');
 const result=await env.DB.prepare("UPDATE fleet_store SET payload=?,version=version+1 WHERE id='main' AND version=?").bind(payload,version).run();return !!result.meta.changes;
}

// New clients commit the result record and Fleet CAS in one D1 transaction.
// Rows use the existing table; no DDL or sequential-write fallback is allowed.
export async function writeTripOperation(env:any,state:Fleet,version:number,key:string,record:import('./trip-operation').OperationRecord){
 assertOperationalAccounts(state);
 await assertDatabaseEnvironment(env);
 const current=await env.DB.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").first();
 if(!current)return false;parseOperationalState(current.payload);if(current.version!==version)return false;
 if(typeof env.DB?.batch!=='function')throw Error('OPERATION_BATCH_UNAVAILABLE');
 const payload=JSON.stringify(state);
 if(new TextEncoder().encode(payload).length>MAIN_DATA_LIMIT_BYTES)throw new OperationError('ข้อมูลใกล้ถึงขีดจำกัด กรุณาสำรองข้อมูลและติดต่อผู้ดูแลเพื่อขยายฐานข้อมูล',400,'OPERATION_CAPACITY');
 const stored=JSON.stringify(record);
 const results=await env.DB.batch([
  env.DB.prepare("INSERT OR IGNORE INTO fleet_store(id,payload,version) SELECT ?,?,0 WHERE EXISTS(SELECT 1 FROM fleet_store WHERE id='main' AND version=?)").bind(key,stored,version),
  env.DB.prepare("UPDATE fleet_store SET payload=?,version=version+1 WHERE id='main' AND version=? AND EXISTS(SELECT 1 FROM fleet_store WHERE id=? AND json_extract(payload,'$.commitToken')=?)").bind(payload,version,key,record.commitToken),
  env.DB.prepare("SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fleet_store WHERE id=? AND json_extract(payload,'$.commitToken')=?) OR EXISTS(SELECT 1 FROM fleet_store WHERE id='main' AND version=?) THEN 1 ELSE json('OPERATION_ATOMICITY_FAILED') END AS valid").bind(key,record.commitToken,version+1)
 ]);
 if(!Array.isArray(results)||results.length!==3||results.some((r:any)=>r.success===false))throw Error('OPERATION_BATCH_UNAVAILABLE');
 const inserted=results[0].meta?.changes,updated=results[1].meta?.changes;
 if(inserted===1&&updated===1)return true;
 if(inserted===0&&updated===0)return false;
 throw Error('OPERATION_BATCH_UNAVAILABLE');
}
