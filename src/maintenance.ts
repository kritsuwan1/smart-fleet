import {latestOdo,type Fleet} from './fleet';
export type CareReminder={id:string;carId:string;kind:'service'|'expiry';title:string;dueDate:string;dueOdo:number|null;warnDays:number;warnKm:number;note:string;active:boolean};
export type CareCompletion={id:string;reminderId:string;carId:string;title:string;date:string;odometer:number;note:string;actor:string;time:string};
export const thaiToday=(now=Date.now())=>new Date(now+7*3600000).toISOString().slice(0,10);
export const validCareDate=(s:string)=>/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s&&s>='2000-01-01'&&s<='2100-12-31';
const integer=(v:unknown,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=max;
export function normalizeReminder(s:Fleet,d:any,old?:CareReminder):CareReminder{
 const r:CareReminder={id:old?.id||crypto.randomUUID(),carId:String(d.carId||''),kind:d.kind,title:String(d.title||'').trim(),dueDate:String(d.dueDate||''),dueOdo:d.dueOdo===''||d.dueOdo==null?null:Number(d.dueOdo),warnDays:Number(d.warnDays),warnKm:Number(d.warnKm),note:String(d.note||'').trim(),active:d.active!==false};
 if(!s.cars.some(c=>c.id===r.carId))throw Error('ไม่พบรถที่เลือก');
 if(!['service','expiry'].includes(r.kind)||!r.title||r.title.length>150||r.note.length>500)throw Error('กรุณาตรวจชื่อ ประเภท และหมายเหตุ');
 if(!r.dueDate&&r.dueOdo===null)throw Error('ระบุวันครบกำหนดหรือเลขไมล์อย่างน้อยหนึ่งอย่าง');
 if(r.dueDate&&!validCareDate(r.dueDate)||r.dueOdo!==null&&!integer(r.dueOdo,99999999)||!integer(r.warnDays,365)||!integer(r.warnKm,100000))throw Error('วันครบกำหนด เลขไมล์ หรือช่วงเตือนไม่ถูกต้อง');
 return r;
}
export function reminderStatus(r:CareReminder,s:Fleet,today=thaiToday()){
 const days=r.dueDate?Math.round((Date.parse(r.dueDate+'T00:00Z')-Date.parse(today+'T00:00Z'))/86400000):null;
 const km=r.dueOdo===null?null:r.dueOdo-latestOdo(s,r.carId);
 const level=!r.active?'inactive':days!==null&&days<0||km!==null&&km<0?'overdue':days===0||km===0?'due':days!==null&&days<=r.warnDays||km!==null&&km<=r.warnKm?'soon':'normal';
 return {days,km,level};
}
export function applyCare(s:Fleet,d:any,actor:string){
 s.careReminders||=[];s.careHistory||=[];
 const old=s.careReminders.find(r=>r.id===d?.id);
 if(d?.operation==='save'){
  if(d.id&&!old)throw Error('ไม่พบรายการเตือน');
  if(!old&&s.careReminders.length>=200)throw Error('รายการเตือนครบ 200 รายการแล้ว');
  const r=normalizeReminder(s,d,old);s.careReminders=old?s.careReminders.map(x=>x.id===r.id?r:x):[...s.careReminders,r];
  return {before:old||null,after:r,action:'บันทึกรายการเตือนดูแลรถ'};
 }
 if(!old)throw Error('ไม่พบรายการเตือน');
 const before={...old};
 if(d.operation==='archive'){old.active=false;return {before,after:{...old},action:'ปิดรายการเตือนดูแลรถ'};}
 if(d.operation!=='complete'||!old.active)throw Error('คำสั่งรายการเตือนไม่ถูกต้อง');
 const date=String(d.date||''),odometer=Number(d.odometer),note=String(d.note||'').trim();
 if(!validCareDate(date)||date>thaiToday()||d.odometer===''||d.odometer==null||!integer(odometer,99999999)||note.length>500)throw Error('ตรวจวันดำเนินการ เลขไมล์ และหมายเหตุ (ห้ามเป็นวันในอนาคต)');
 if(s.careHistory.length>=1000)throw Error('ประวัติบริการครบ 1,000 รายการ กรุณาติดต่อผู้ดูแล');
 const nextDate=String(d.nextDate||''),nextOdo=d.nextOdo===''||d.nextOdo==null?null:Number(d.nextOdo);
 if(nextDate&&(!validCareDate(nextDate)||nextDate<=date)||nextOdo!==null&&(!integer(nextOdo,99999999)||nextOdo<=odometer))throw Error('กำหนดรอบถัดไปต้องหลังวันหรือเลขไมล์ที่ดำเนินการ');
 const history:CareCompletion={id:crypto.randomUUID(),reminderId:old.id,carId:old.carId,title:old.title,date,odometer,note,actor,time:new Date().toISOString()};
 s.careHistory.unshift(history);old.dueDate=nextDate;old.dueOdo=nextOdo;old.active=!!nextDate||nextOdo!==null;
 return {before,after:{reminder:{...old},history},action:'บันทึกดำเนินการดูแลรถแล้ว'};
}
