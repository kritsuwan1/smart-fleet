import type {Fleet} from './fleet';
import type {User} from './auth';
import type {TripReceipt} from './trip-receipt';
export type TripOperation={id:string;kind:'start'|'return'};
export type OperationRecord={format:1;commitToken:string;id:string;kind:'start'|'return';actorId:string;actorRole:string;actorDriverId:string;carId:string;fingerprint:string;version:number;tripResult:{id:string;operation:'start'|'return'};receipt:TripReceipt};
export class OperationError extends Error {constructor(message:string,public status=409,public code='OPERATION_CONFLICT'){super(message);}}
export const canonicalTripPayload=(v:any):string=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonicalTripPayload).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonicalTripPayload(v[k])).join(',')+'}';
const sha=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))),n=>n.toString(16).padStart(2,'0')).join('');
export async function tripOperationContext(operation:any,data:any,user:User,state:Fleet){
 if(!operation||Object.keys(operation).sort().join(',')!=='id,kind'||typeof operation.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(operation.id)||!['start','return'].includes(operation.kind)||!data||typeof data.carId!=='string')throw new OperationError('รหัสรายการไม่ถูกต้อง',400,'OPERATION_INVALID');
 if(operation.kind==='start'&&(data.id||data.end)||operation.kind==='return'&&(!data.id||!data.end))throw new OperationError('ประเภทการบันทึกไม่ตรงกับข้อมูล',400,'OPERATION_INVALID');
 const key='trip-operation:v1:'+await sha(JSON.stringify([state.sessionKey,user.id,operation.id]));
 const fingerprint=await sha(canonicalTripPayload({actorId:user.id,kind:operation.kind,carId:data.carId,data}));
 return {key,fingerprint,operation:{...operation} as TripOperation};
}
export async function readTripOperation(env:any,key:string):Promise<OperationRecord|null>{
 const row=await env.DB.prepare('SELECT payload FROM fleet_store WHERE id=?').bind(key).first();
 if(!row)return null;
 try{const r=JSON.parse(row.payload);if(r.format!==1||!r.receipt?.trip||typeof r.fingerprint!=='string'||!r.tripResult?.id)throw Error();return r;}catch{throw new OperationError('ไม่สามารถตรวจผลรายการเดิมได้ กรุณาลองใหม่',503,'OPERATION_UNAVAILABLE');}
}
export function authorizeOperation(r:OperationRecord,context:Awaited<ReturnType<typeof tripOperationContext>>,state:Fleet,user:User){
 if(r.actorId!==user.id||r.actorRole!==user.role||r.actorDriverId!==user.driverId)throw new OperationError('FORBIDDEN',403,'OPERATION_FORBIDDEN');
 if(r.id!==context.operation.id||r.kind!==context.operation.kind||r.fingerprint!==context.fingerprint)throw new OperationError('รหัสรายการนี้ถูกใช้กับข้อมูลอื่นแล้ว',409);
 const trip=state.trips.find(t=>t.id===r.tripResult.id);
 if(!trip||trip.carId!==r.carId||user.role!=='admin'&&trip.ownerUserId!==user.id)throw new OperationError('ไม่สามารถยืนยันผลรายการเดิมได้ กรุณารีเฟรช',409,'OPERATION_STATE_CHANGED');
}
