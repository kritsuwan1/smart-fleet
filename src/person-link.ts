import type {Fleet} from './fleet';
import {accountEnabled,isSelfAccount} from './account-compatibility';

// Caller must have revalidated current Admin authorization and main version.
// Only first linking is supported; no relink/unlink or identity-document retention.
export async function preparePersonLink(env:any,state:Fleet,input:any,actorId:string){
 if(!input||Object.keys(input).sort().join(',')!=='confirmed,id,operation,personId'||input.operation!=='linkPerson'||input.confirmed!==true||typeof input.id!=='string'||typeof input.personId!=='string'||!input.personId)throw Error('กรุณาเลือกบัญชีและ Person ID พร้อมยืนยันการตรวจสอบตัวตน');
 const account=state.accounts?.find(a=>a.id===input.id);
 if(!account||!isSelfAccount(account)||!accountEnabled(account))throw Error('บัญชี User ไม่พร้อมสำหรับการผูก Person');
 if(account.driverId!==null||account.accountFormatVersion!==3)throw Error('ไม่อนุญาตให้ผูกซ้ำหรือเปลี่ยน Person เดิม');
 const matches=state.people.filter(p=>p.id===input.personId);
 if(matches.length!==1||!matches[0].active)throw Error('Person ID ไม่พบ ถูกปิดใช้งาน หรือไม่เป็นเอกลักษณ์');
 if(state.accounts!.some(a=>a.id!==account.id&&a.driverId===input.personId))throw Error('Person ID นี้ถูกผูกกับบัญชีอื่นแล้ว');
 if(state.trips.some(t=>!t.end&&(t.ownerUserId===account.id||t.driverId===input.personId)))throw Error('มีรายการใช้รถที่ยังไม่ปิด ต้องตรวจสอบก่อนผูก Person');
 // A committed operation may have lost its client response. Do not guess it is resolved.
 const operation=await env.DB.prepare("SELECT id FROM fleet_store WHERE id LIKE 'trip-operation:v1:%' AND CASE WHEN json_valid(payload) THEN COALESCE(json_type(payload,'$.actorId'),'missing')<>'text' OR length(json_extract(payload,'$.actorId'))=0 OR COALESCE(json_extract(payload,'$.format'),0)<>1 OR json_extract(payload,'$.actorId')=? ELSE 1 END LIMIT 1").bind(account.id).first();
 if(operation)throw Error('มี operation ledger ที่ต้องตรวจทาน ไม่สามารถผูก Person โดยอัตโนมัติ');
 const before={id:account.id,driverId:account.driverId,accountFormatVersion:account.accountFormatVersion};
 const verification={personId:input.personId,verifiedBy:actorId,verifiedAt:new Date().toISOString()};
 return {account,before,verification};
}
