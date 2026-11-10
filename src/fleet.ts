import {validateTripValues} from './validation';
export type Car={id:string;plate:string;province:string;model:string;initialOdo:number;active:boolean;currentOdo?:number;fuelType?:string;imagePreset?:string};
export type Person={id:string;name:string;active:boolean};
export type Trip={id:string;seq:number;carId:string;driverId:string;project:string;destination:string;start:string;end:string;odoStart:number;odoEnd:number|null;note:string;reason:string;ownerUserId?:string};
export type Audit={id:string;time:string;actor:string;action:string;before:unknown;after:unknown};
export type Account={id:string;username:string;name:string;driverId:string|null;active:boolean;salt:string;passwordHash:string;passwordVersion:number;createdAt:string;role?:'admin'|'employee'|'user';accountFormatVersion?:3;accountKind?:'self-user';status?:'ACTIVE'|'DISABLED'|'REJECTED'};
import type {FuelPrice} from './report';
import type {MaintenancePlan,MaintenanceRecord} from './maintenance';
export type Fleet={accountFormatVersion?:1|3;maintenancePlans?:MaintenancePlan[];maintenanceHistory?:MaintenanceRecord[];fuelPrices?:FuelPrice[];accounts?:Account[];sessionKey?:string;cars:Car[];people:Person[];projects:string[];trips:Trip[];audit:Audit[];imported:boolean};
export const initial:Fleet={cars:[{id:'car-1',plate:'8กน3362',province:'กรุงเทพมหานคร',model:'รถยนต์บริษัท',initialOdo:115784,active:true}],people:[{id:'p1',name:'กฤชสุวรรณ',active:true},{id:'p2',name:'ดนุพร',active:true},{id:'p3',name:'พรนิรัตน์',active:true}],projects:['RVM BRB','RVM ANANDA','Smart key','โครงการวางถนนคอนกรีต'],trips:[],audit:[],imported:false};
export const latestOdo=(s:Fleet,id:string)=>s.cars.find(c=>c.id===id)?.currentOdo??s.trips.filter(t=>t.carId===id&&t.end).sort((a,b)=>b.end.localeCompare(a.end)||b.start.localeCompare(a.start)||b.seq-a.seq)[0]?.odoEnd??s.cars.find(c=>c.id===id)?.initialOdo??0;
export function validateTrip(s:Fleet,t:Trip){
 if(!s.cars.some(c=>c.id===t.carId))throw Error('ไม่พบรถที่เลือก');
 if(!s.people.some(p=>p.id===t.driverId))throw Error('ไม่พบพนักงานขับรถ');
 if(!t.project?.trim()||!t.destination?.trim())throw Error('กรุณาระบุงาน/โครงการและสถานที่ไป');
 if(t.project.length>300||t.destination.length>1000||t.note.length>2000||t.reason.length>1000)throw Error('ข้อความยาวเกินกำหนด');
 validateTripValues(t);
 const others=s.trips.filter(x=>x.carId===t.carId&&x.id!==t.id);
 if(others.some(x=>t.start<(x.end||'9999')&&x.start<(t.end||'9999')))throw Error('ช่วงเวลาใช้รถซ้อนกับรายการอื่นของรถคันนี้');
 const prev=others.filter(x=>x.end&&x.end<=t.start).sort((a,b)=>b.end.localeCompare(a.end))[0];
 const expected=prev?.odoEnd??s.cars.find(c=>c.id===t.carId)!.initialOdo;
 const next=others.filter(x=>x.start>=(t.end||'9999')).sort((a,b)=>a.start.localeCompare(b.start))[0];
 if((t.odoStart!==expected || (next&&t.end&&t.odoEnd!==next.odoStart))&&!t.reason?.trim())throw Error('เลขไมล์ไม่ต่อเนื่อง กรุณาระบุเหตุผล');
}
