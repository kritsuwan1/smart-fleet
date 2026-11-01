import {latestOdo,type Fleet} from './fleet';
export const maintenanceTypes=['oil','inspection','insurance','tax','other'] as const;
export const maintenanceLabels={oil:'เปลี่ยนน้ำมันเครื่อง',inspection:'ตรวจสภาพรถ',insurance:'ประกันภัย',tax:'ภาษี',other:'งานอื่น'};
export type MaintenancePlan={id:string;carId:string;type:typeof maintenanceTypes[number];name:string;active:boolean;dueOdo?:number;dueDate?:string;intervalKm?:number;intervalDays?:number;warnKm:number;warnDays:number};
export type MaintenanceRecord={id:string;planId:string;carId:string;date:string;odometer:number;details:string;costSatang:number};
export const bangkokDay=(now=Date.now())=>new Date(now+7*3600000).toISOString().slice(0,10);
const validDay=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const integer=(v:unknown,max=99999999)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;
function invalid():never{throw Error('ข้อมูลบำรุงรักษาไม่ถูกต้อง');}
export function validateMaintenance(s:Fleet){
 const plans=s.maintenancePlans,history=s.maintenanceHistory;
 if(plans!==undefined&&!Array.isArray(plans)||history!==undefined&&!Array.isArray(history))invalid();
 const ids=new Set<string>();
 for(const p of plans||[]){
  if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||!s.cars.some(c=>c.id===p.carId)||!maintenanceTypes.includes(p.type)||typeof p.name!=='string'||!p.name.trim()||p.name.length>150||typeof p.active!=='boolean'||!integer(p.warnKm)||!integer(p.warnDays,3650))invalid();
  ids.add(p.id);
  if(p.dueOdo===undefined&&p.dueDate===undefined||p.dueOdo!==undefined&&!integer(p.dueOdo)||p.dueDate!==undefined&&!validDay(p.dueDate))invalid();
  if(p.intervalKm!==undefined&&(!integer(p.intervalKm)||!p.intervalKm||p.dueOdo===undefined)||p.intervalDays!==undefined&&(!integer(p.intervalDays,36500)||!p.intervalDays||p.dueDate===undefined))invalid();
 }
 const recordIds=new Set<string>();
 for(const r of history||[]){
  if(!r||typeof r.id!=='string'||!r.id||recordIds.has(r.id)||!(plans||[]).some(p=>p.id===r.planId&&p.carId===r.carId)||!validDay(r.date)||!integer(r.odometer)||typeof r.details!=='string'||r.details.length>2000||!integer(r.costSatang,99999999999))invalid();
  recordIds.add(r.id);
 }
}
export function maintenanceStatus(s:Fleet,p:MaintenancePlan,today=bangkokDay()){
 const km=p.dueOdo===undefined?Infinity:p.dueOdo-latestOdo(s,p.carId);
 const days=p.dueDate===undefined?Infinity:(Date.parse(p.dueDate+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000;
 return km<=0||days<0?'overdue':km<=p.warnKm||days<=p.warnDays?'near':'normal';
}
export function changeMaintenance(s:Fleet,input:any,today=bangkokDay()){
 if(!input||!['plan','complete','editHistory'].includes(input.operation))invalid();
 if(input.operation==='editHistory'){
  const original=s.maintenanceHistory?.find(r=>r.id===input.id),d=input.record;
  if(!original||!d||!validDay(d.date)||d.date>today||!integer(d.odometer)||d.odometer<(s.cars.find(c=>c.id===original.carId)?.initialOdo||0))invalid();
  const storedPlan=s.maintenancePlans?.find(p=>p.id===original.planId);if(!storedPlan)invalid();const p=structuredClone(storedPlan);
  const history=s.maintenanceHistory!.filter(r=>r.planId===p.id).sort((a,b)=>a.date.localeCompare(b.date)||a.odometer-b.odometer),index=history.findIndex(r=>r.id===original.id),previous=history[index-1],next=history[index+1];
  if(previous&&(d.date<previous.date||d.odometer<previous.odometer)||next&&(d.date>next.date||d.odometer>next.odometer))throw Error('การแก้ไขต้องไม่สลับลำดับวันที่หรือเลขไมล์ในประวัติ');
  const record:MaintenanceRecord={...original,date:d.date,odometer:d.odometer,details:d.details,costSatang:d.costSatang};
  if(history.some(r=>r.id!==original.id&&r.date===record.date&&r.odometer===record.odometer&&r.details===record.details&&r.costSatang===record.costSatang))throw Error('มีประวัติบำรุงรักษานี้แล้ว');
  const before={record:structuredClone(original),plan:structuredClone(p)};
  // Recalculate only the latest service and only when due values still derive
  // from that service. Never roll back a later manual plan adjustment.
  if(!next){
   if(p.intervalKm!==undefined&&record.odometer!==original.odometer){if(p.dueOdo!==original.odometer+p.intervalKm)throw Error('แผนถูกปรับภายหลัง กรุณาตรวจรอบบำรุงรักษาก่อนแก้เลขไมล์ประวัติ');p.dueOdo=record.odometer+p.intervalKm;}
   if(p.intervalDays!==undefined&&record.date!==original.date){const due=(date:string)=>new Date(Date.parse(date+'T00:00:00Z')+p.intervalDays!*86400000).toISOString().slice(0,10);if(p.dueDate!==due(original.date))throw Error('แผนถูกปรับภายหลัง กรุณาตรวจรอบบำรุงรักษาก่อนแก้วันที่ประวัติ');p.dueDate=due(record.date);}
  }
  const candidate={...s,maintenancePlans:s.maintenancePlans!.map(plan=>plan.id===p.id?p:plan),maintenanceHistory:s.maintenanceHistory!.map(r=>r.id===original.id?record:r)};validateMaintenance(candidate);
  s.maintenancePlans=candidate.maintenancePlans;s.maintenanceHistory=candidate.maintenanceHistory;return {before,after:{record,plan:p}};
 }
 if(input.operation==='plan'){
  const d=input.plan;if(!d||typeof d!=='object')invalid();
  const old=s.maintenancePlans?.find(p=>p.id===d.id);
  if(d.id&&!old)invalid();
  if(old&&d.carId!==old.carId)throw Error('ไม่สามารถย้ายแผนไปยังรถอื่น');
  const p:MaintenancePlan={id:old?.id||crypto.randomUUID(),carId:d.carId,type:d.type,name:typeof d.name==='string'?d.name.trim():'',active:d.active,warnKm:d.warnKm,warnDays:d.warnDays,
   ...(d.dueOdo!==undefined?{dueOdo:d.dueOdo}:{}),...(d.dueDate!==undefined?{dueDate:d.dueDate}:{}),...(d.intervalKm!==undefined?{intervalKm:d.intervalKm}:{}),...(d.intervalDays!==undefined?{intervalDays:d.intervalDays}:{})};
  const fields:readonly (keyof MaintenancePlan)[]=['carId','type','name','active','dueOdo','dueDate','intervalKm','intervalDays','warnKm','warnDays'];
  if(s.maintenancePlans?.some(existing=>existing.id!==p.id&&fields.every(field=>existing[field]===p[field])))throw Error('มีแผนบำรุงรักษานี้แล้ว');
  s.maintenancePlans=old?s.maintenancePlans!.map(x=>x.id===old.id?p:x):[...(s.maintenancePlans||[]),p];validateMaintenance(s);return {before:old||null,after:p};
 }
 const p=s.maintenancePlans?.find(p=>p.id===input.planId);if(!p||!p.active)invalid();
 const d=input.record;if(!d||!validDay(d.date)||d.date>today)invalid();
 if(s.maintenanceHistory?.some(r=>r.planId===p.id&&r.date===d.date&&r.odometer===d.odometer&&r.details===d.details&&r.costSatang===d.costSatang))throw Error('บันทึกงานบำรุงรักษานี้แล้ว');
 const previous=(s.maintenanceHistory||[]).filter(r=>r.planId===p.id).sort((a,b)=>b.date.localeCompare(a.date)||b.odometer-a.odometer)[0];
 if(previous&&(d.date<previous.date||d.odometer<previous.odometer))throw Error('วันที่หรือเลขไมล์ก่อนประวัติล่าสุด');
 if(!integer(d.odometer)||d.odometer<(s.cars.find(c=>c.id===p.carId)?.initialOdo||0))invalid();
 const record:MaintenanceRecord={id:crypto.randomUUID(),planId:p.id,carId:p.carId,date:d.date,odometer:d.odometer,details:d.details,costSatang:d.costSatang};
 const before=structuredClone(p);
 s.maintenanceHistory=[...(s.maintenanceHistory||[]),record];
 if(p.intervalKm!==undefined)p.dueOdo=record.odometer+p.intervalKm;
 if(p.intervalDays!==undefined)p.dueDate=new Date(Date.parse(record.date+'T00:00:00Z')+p.intervalDays*86400000).toISOString().slice(0,10);
 if(p.intervalKm!==undefined&&p.intervalDays===undefined)delete p.dueDate;
 if(p.intervalDays!==undefined&&p.intervalKm===undefined)delete p.dueOdo;
 // One-off plans are archived; recurring dimensions advance from actual service.
 if(p.intervalKm===undefined&&p.intervalDays===undefined)p.active=false;
 validateMaintenance(s);return {before,after:{record,plan:p}};
}
