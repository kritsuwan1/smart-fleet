import {tripReceiptFromResponse} from './trip-receipt';
import {canonicalTripPayload,type TripOperation} from './trip-operation';
type Pending={tripOperation:TripOperation;data:any;uncertain:boolean};
export class TripSubmitError extends Error {constructor(message:string,public status:number,public uncertain:boolean){super(message);}}
export function createTripSubmitter(send:(body:any,signal:AbortSignal)=>Promise<Response>,timeoutMs=15000){
 let active=false,pending:Pending|null=null;
 return {
  getPending:()=>pending?structuredClone(pending):null,
  discard(){if(!active&&!pending?.uncertain)pending=null;},
  async submit(kind:'start'|'return',data:any,version:number){
   if(active)throw new TripSubmitError('กำลังบันทึกรายการเดิม',0,false);
   const same=pending&&pending.tripOperation.kind===kind&&canonicalTripPayload(pending.data)===canonicalTripPayload(data);
   if(pending?.uncertain&&!same)throw new TripSubmitError('ยังไม่ยืนยันรายการเดิม กรุณาลองรายการเดิมอีกครั้ง',0,true);
   if(!same)pending={tripOperation:{id:crypto.randomUUID(),kind},data:structuredClone(data),uncertain:false};
   const attempt=pending!;active=true;
   const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},timeoutMs);});
    const work=(async()=>{const response=await send({action:'trip',data:structuredClone(attempt.data),version,tripOperation:{...attempt.tripOperation}},controller.signal);return {response,body:await response.json()};})();
    const {response,body}=await Promise.race([work,timeout]);
    if(!response.ok){
     const uncertain=![400,401,403,409].includes(response.status)||body.code==='OPERATION_CONFLICT';
     attempt.uncertain=uncertain;
     throw new TripSubmitError(body.error||'บันทึกไม่สำเร็จ',response.status,uncertain);
    }
    const receipt=tripReceiptFromResponse(body);
    if(!Number.isInteger(body.version)||!['cars','trips','people'].every(k=>Array.isArray(body.state?.[k]))||body.tripOperation?.id!==attempt.tripOperation.id||body.tripOperation?.kind!==kind||receipt?.kind!==kind)throw Error('invalid acknowledgement');
    pending=null;return body;
   }catch(e){
    if(e instanceof TripSubmitError)throw e;
    attempt.uncertain=true;
    throw new TripSubmitError('ยังยืนยันผลไม่ได้ กรุณากดยืนยันรายการเดิมอีกครั้ง โดยไม่เปลี่ยนข้อมูลหรือปิดหน้านี้',0,true);
   }finally{clearTimeout(timer);active=false;}
  }
 };
}
