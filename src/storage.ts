import {IS_DEMO,assertDatabaseEnvironment} from './environment';
import {initial,type Fleet} from './fleet';
import {MAIN_DATA_LIMIT_BYTES} from './limits';
export async function readState(env:any){
 if(!env.DB)throw Error('ไม่พบฐานข้อมูล DB');
 await assertDatabaseEnvironment(env);
 const sessionKey=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
 await env.DB.prepare('INSERT OR IGNORE INTO fleet_store(id,payload,version) VALUES (?,?,0)').bind('main',JSON.stringify({...initial,...(IS_DEMO?{people:[{id:'p1',name:'พนักงานทดสอบ 1',active:true},{id:'p2',name:'พนักงานทดสอบ 2',active:true}],projects:['โครงการทดสอบ Demo']}:{}),accounts:[],sessionKey})).run();
 await env.DB.prepare("UPDATE fleet_store SET payload=json_set(payload,'$.sessionKey',?),version=version+1 WHERE id='main' AND json_extract(payload,'$.sessionKey') IS NULL").bind(sessionKey).run();
 const row=await env.DB.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").first();
 return {state:JSON.parse(row.payload) as Fleet,version:row.version as number,payloadBytes:new TextEncoder().encode(row.payload).length};
}
export async function writeState(env:any,state:Fleet,version:number){
 await assertDatabaseEnvironment(env);
 const payload=JSON.stringify(state);if(new TextEncoder().encode(payload).length>MAIN_DATA_LIMIT_BYTES)throw Error('ข้อมูลใกล้ถึงขีดจำกัด กรุณาสำรองข้อมูลและติดต่อผู้ดูแลเพื่อขยายฐานข้อมูล');
 const result=await env.DB.prepare("UPDATE fleet_store SET payload=?,version=version+1 WHERE id='main' AND version=?").bind(payload,version).run();return !!result.meta.changes;
}
