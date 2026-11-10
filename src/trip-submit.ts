import {tripReceiptFromResponse} from './trip-receipt';
import {canonicalTripPayload,type TripOperation} from './trip-operation';
import type {TripRecovery} from './trip-recovery';
type Pending={tripOperation:TripOperation;data:any;uncertain:boolean};
export class TripSubmitError extends Error {constructor(message:string,public status:number,public uncertain:boolean){super(message);}}
export function createTripSubmitter(send:(body:any,signal:AbortSignal)=>Promise<Response>,timeoutMs=15000,recovery?:TripRecovery){
 let active=false,pending:Pending|null=null;
 return {
  getPending:()=>pending?structuredClone(pending):null,
  discard(){if(!active&&!pending?.uncertain)pending=null;},
  confirm(body:any){
   const p=recovery?.read();
   if(active||!p||'blocked' in p||!['cars','trips','people'].every(k=>Array.isArray(body.state?.[k]))||body.recoveryScope!==p.scope||body.reconciliation?.state!=='confirmed'||body.reconciliation.id!==p.id||body.reconciliation.kind!==p.kind||body.tripOperation?.id!==p.id||body.tripOperation?.kind!==p.kind||tripReceiptFromResponse(body)?.kind!==p.kind||!Number.isInteger(body.version))throw new TripSubmitError('ยังยืนยันผลรายการเดิมไม่ได้',0,true);
   recovery!.clear();pending=null;return body;
  },
  async submit(kind:'start'|'return',data:any,version:number){
   if(active)throw new TripSubmitError('กำลังบันทึกรายการเดิม',0,false);
   const saved=recovery?.read();if(saved&&('blocked' in saved||!pending||saved.id!==pending.tripOperation.id))throw new TripSubmitError('มีรายการที่ยังไม่ยืนยันผล กรุณาตรวจสอบผลเดิมก่อนเริ่มรายการใหม่',0,true);
   const same=pending&&pending.tripOperation.kind===kind&&canonicalTripPayload(pending.data)===canonicalTripPayload(data);
   if(pending?.uncertain&&!same)throw new TripSubmitError('ยังไม่ยืนยันรายการเดิม กรุณาลองรายการเดิมอีกครั้ง',0,true);
   if(!same)pending={tripOperation:{id:crypto.randomUUID(),kind},data:structuredClone(data),uncertain:false};
   const attempt=pending!;active=true;
   let sent=false;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    if(recovery&&!saved)recovery.save(attempt.tripOperation);sent=true;
    const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},timeoutMs);});
    const work=(async()=>{const response=await send({action:'trip',data:structuredClone(attempt.data),version,tripOperation:{...attempt.tripOperation}},controller.signal);return {response,body:await response.json()};})();
    const {response,body}=await Promise.race([work,timeout]);
    if(!response.ok){
     const uncertain=attempt.uncertain||![400,401,403,409].includes(response.status)||body.code==='OPERATION_CONFLICT';
     attempt.uncertain=uncertain;
     if(!uncertain)recovery?.clear();
     throw new TripSubmitError(body.error||'บันทึกไม่สำเร็จ',response.status,uncertain);
    }
    const receipt=tripReceiptFromResponse(body);
    if(!Number.isInteger(body.version)||!['cars','trips','people'].every(k=>Array.isArray(body.state?.[k]))||body.tripOperation?.id!==attempt.tripOperation.id||body.tripOperation?.kind!==kind||receipt?.kind!==kind)throw Error('invalid acknowledgement');
    recovery?.clear();pending=null;return body;
   }catch(e){
    if(e instanceof TripSubmitError)throw e;
    attempt.uncertain=true;
    if(!sent)throw new TripSubmitError(e instanceof Error?e.message:'พื้นที่เก็บรหัสรายการไม่พร้อม ยังไม่ได้ส่งคำขอ',0,true);
    throw new TripSubmitError('ยังยืนยันผลไม่ได้ กรุณาลองรายการเดิมโดยไม่เปลี่ยนข้อมูล หรือรีเฟรชเพื่อตรวจสอบผลแบบอ่านอย่างเดียว ห้ามเริ่มรายการซ้ำ',0,true);
   }finally{clearTimeout(timer);active=false;}
  }
 };
}
