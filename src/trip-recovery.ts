import type {TripOperation} from './trip-operation';
export const RECOVERY_KEY='smartfleet.trip-recovery.v1',RECOVERY_TTL=8*3600000;
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export type RecoveryPointer={format:1;scope:string;id:string;kind:'start'|'return';createdAt:number;expiresAt:number};
export type RecoveryBlocked={blocked:true};
export interface TripRecovery {read():RecoveryPointer|RecoveryBlocked|null;save(operation:TripOperation):void;clear():void;lock():void;}
// The pointer is untrusted metadata, never authorization or a replay payload.
// One tab-scoped record: no credentials, Person ID, account ID or Fleet fields.
export function createTripRecovery(storage:()=>Store,scope:string,now=()=>Date.now()):TripRecovery{
 let unavailable=false;
 const lock=()=>{try{storage().setItem(RECOVERY_KEY,JSON.stringify({blocked:true}));}catch{unavailable=true;}};
 const read=():RecoveryPointer|RecoveryBlocked|null=>{
  if(unavailable)return {blocked:true};
  try{
   const raw=storage().getItem(RECOVERY_KEY);if(raw===null)return null;
   if(raw.length>512)throw Error();const p=JSON.parse(raw);
   if(p?.blocked===true){if(Object.keys(p).join(',')!=='blocked')lock();return {blocked:true};}
   if(!p||Object.keys(p).sort().join(',')!=='createdAt,expiresAt,format,id,kind,scope'||p.format!==1||!/^[a-f0-9]{64}$/.test(scope)||p.scope!==scope||typeof p.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.id)||!['start','return'].includes(p.kind)||!Number.isSafeInteger(p.createdAt)||p.createdAt<0||p.createdAt>now()||p.expiresAt!==p.createdAt+RECOVERY_TTL||p.expiresAt<=now())throw Error();
   return p;
  }catch{lock();return {blocked:true};}
 };
 return {read,lock,clear(){storage().removeItem(RECOVERY_KEY);unavailable=false;},save(operation){
  if(read())throw Error('มีรายการที่ต้องตรวจสอบผลก่อน');
  if(!/^[a-f0-9]{64}$/.test(scope))throw Error('ไม่สามารถยืนยันขอบเขตเซสชัน');
  const createdAt=now(),p:RecoveryPointer={format:1,scope,...operation,createdAt,expiresAt:createdAt+RECOVERY_TTL};
  try{storage().setItem(RECOVERY_KEY,JSON.stringify(p));if(JSON.stringify(read())!==JSON.stringify(p))throw Error();}catch{lock();throw Error('ไม่สามารถเก็บรหัสตรวจสอบรายการอย่างปลอดภัย จึงยังไม่ส่งคำขอ กรุณาตรวจการตั้งค่าเบราว์เซอร์');}
 }};
}
