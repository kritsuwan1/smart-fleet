import type {Fleet} from './fleet';
import {portableChecksum} from './checksum';
export async function backupDigest(state:unknown){
 const input=new TextEncoder().encode(JSON.stringify(state));
 if(!globalThis.crypto?.subtle)return portableChecksum(input);
 const bytes=await crypto.subtle.digest('SHA-256',input);
 return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
}
export async function createBackup(state:Fleet,appVersion:string,environment='production'){return {format:'smart-fleet-backup',schemaVersion:1,environment,exportedAt:new Date().toISOString(),appVersion,sha256:await backupDigest(state),state};}
export async function inspectBackup(text:string){
 if(new TextEncoder().encode(text).length>5_000_000)throw Error('ไฟล์ใหญ่เกิน 5 MB');
 let b:any;try{b=JSON.parse(text);}catch{throw Error('อ่าน JSON ไม่ได้ กรุณาเลือกไฟล์สำรอง JSON ของ Smart Fleet');}
 const s=b?.state;
 const fail=()=>{throw Error('โครงสร้างไฟล์สำรองไม่ครบหรือมีข้อมูลอ้างอิงไม่ถูกต้อง');};
 if(!s||typeof s!=='object'||!['cars','people','projects','trips','audit'].every(k=>Array.isArray(s[k]))||typeof s.imported!=='boolean')fail();
 const ids=(rows:any[])=>{const set=new Set<string>();for(const row of rows){if(!row||typeof row.id!=='string'||!row.id||set.has(row.id))fail();set.add(row.id);}return set;};
 const cars=ids(s.cars),people=ids(s.people);ids(s.trips);ids(s.audit);
 for(const c of s.cars)if(typeof c.plate!=='string'||typeof c.province!=='string'||typeof c.model!=='string'||!Number.isInteger(c.initialOdo)||c.initialOdo<0||typeof c.active!=='boolean')fail();
 for(const p of s.people)if(typeof p.name!=='string'||typeof p.active!=='boolean')fail();
 if(s.projects.some((p:unknown)=>typeof p!=='string'))fail();
 for(const t of s.trips){if(!cars.has(t.carId)||!people.has(t.driverId)||!Number.isInteger(t.seq)||t.seq<1||!Number.isInteger(t.odoStart)||t.odoStart<0||typeof t.start!=='string'||!Number.isFinite(Date.parse(t.start+'+07:00'))||typeof t.end!=='string'||(t.end&&(!Number.isFinite(Date.parse(t.end+'+07:00'))||!Number.isInteger(t.odoEnd)||t.odoEnd<t.odoStart)))fail();}
 if(s.accounts!==undefined){if(!Array.isArray(s.accounts))fail();ids(s.accounts);for(const a of s.accounts)if(!people.has(a.driverId)||typeof a.username!=='string'||typeof a.passwordHash!=='string'||typeof a.salt!=='string')fail();}
 if(typeof b.exportedAt!=='string'||!Number.isFinite(Date.parse(b.exportedAt)))fail();
 const verified=b.format==='smart-fleet-backup';
 if(verified){if(b.schemaVersion!==1)throw Error('ยังไม่รองรับเวอร์ชันไฟล์สำรองนี้');if(typeof b.sha256!=='string'||b.sha256!==await backupDigest(s))throw Error('รหัส SHA-256 ไม่ตรง ข้อมูลอาจถูกแก้ไขหรือไฟล์ไม่ครบ กรุณาสำรองใหม่');}
 else if(b.format!==undefined||b.sha256!==undefined)throw Error('รูปแบบไฟล์สำรองไม่รองรับ');
 return {environment:b.environment==='demo'?'Demo':b.environment==='production'?'Production':'ไม่ระบุ (ไฟล์รุ่นเดิม)',exportedAt:b.exportedAt,appVersion:typeof b.appVersion==='string'?b.appVersion:'รุ่นเดิม',verified,cars:s.cars.length,people:s.people.length,trips:s.trips.length,open:s.trips.filter((t:any)=>!t.end).length,accounts:s.accounts?.length||0,audit:s.audit.length};
}
