import {validateTrip,type Fleet,type Trip} from './fleet';
export type ImportRow={row:number;seq:number;project:string;destination:string;start:string;end:string;odoStart:number;odoEnd:number|null;driverName:string;note:string;plate?:string};
export type ImportOptions={carId:string;updateExisting:boolean;createPeople:boolean};
export type ImportItem={row:number;seq:number;status:'new'|'updated'|'same'|'skipped'|'error';trip?:Trip;old?:Trip;changes:string[];message?:string};
const norm=(s:string)=>s.trim().replace(/\s+/g,' ');
export const fieldLabels:Record<string,string>={start:'วันเวลาออก',end:'วันเวลากลับ',project:'งาน/โครงการ',destination:'สถานที่ไป',odoStart:'เลขไมล์ออก',odoEnd:'เลขไมล์กลับ',driverId:'ผู้ขับรถ',note:'หมายเหตุ'};
export function planImport(state:Fleet,rows:ImportRow[],options:ImportOptions){
 const candidate:Fleet=structuredClone(state),items:ImportItem[]=[],errors:string[]=[];
 const car=state.cars.find(c=>c.id===options.carId);
 if(!car?.active)errors.push('กรุณาเลือกรถที่เปิดใช้งาน');
 if(!Array.isArray(rows)||!rows.length||rows.length>1000)return {candidate,items,errors:['ไฟล์ต้องมี 1–1,000 รายการต่อการนำเข้า'],newPeople:[],counts:{new:0,updated:0,same:0,skipped:0,error:0}};
 const seqs=new Set<number>(),newPeople:string[]=[];
 for(const input of rows){
  const item:ImportItem={row:Number(input?.row),seq:Number(input?.seq),status:'error',changes:[]};items.push(item);
  try{
   if(!input||typeof input!=='object')throw Error('ข้อมูลรายการไม่ถูกต้อง');
   if(!Number.isInteger(input.seq)||input.seq<1)throw Error('ลำดับที่ต้องเป็นจำนวนเต็มบวก');
   if(seqs.has(input.seq))throw Error('ลำดับที่ซ้ำกันภายในไฟล์');seqs.add(input.seq);
   for(const k of ['project','destination','start','end','driverName','note'] as const)if(typeof input[k]!=='string')throw Error('ข้อมูล '+k+' ไม่ถูกต้อง');
   if(input.plate&&car&&input.plate.replace(/\s/g,'')!==car.plate.replace(/\s/g,''))throw Error('ทะเบียนในไฟล์ '+input.plate+' ไม่ตรงกับรถที่เลือก '+car.plate);
   const matches=state.trips.filter(t=>t.carId===options.carId&&t.seq===input.seq);if(matches.length>1)throw Error('มีหลายรายการในระบบที่ใช้ทะเบียนและลำดับนี้ ต้องตรวจสอบก่อนนำเข้า');
   const old=matches[0];item.old=old;
   const name=norm(input.driverName);if(!name||name.length>150)throw Error('ชื่อผู้ขับรถต้องมี 1–150 ตัวอักษร');
   const people=candidate.people.filter(p=>norm(p.name)===name);if(people.length>1)throw Error('พบชื่อพนักงานซ้ำในระบบ กรุณาตรวจสอบข้อมูลพนักงาน');
   let person=people[0];
   if(!person){
    if(!options.createPeople)throw Error('ยังไม่มีพนักงาน '+name+' ในระบบ กรุณาเลือกอนุญาตเพิ่มพนักงานใหม่');
    person={id:'excel-person-'+encodeURIComponent(name),name,active:true};candidate.people.push(person);newPeople.push(name);
   }
   const trip:Trip={id:old?.id||'excel-'+options.carId+'-'+input.seq,seq:input.seq,carId:options.carId,driverId:person.id,project:input.project.trim(),destination:input.destination.trim(),start:input.start,end:input.end,odoStart:input.odoStart,odoEnd:input.odoEnd,note:input.note.trim(),reason:old?.reason||'',ownerUserId:old?.ownerUserId};
   item.trip=trip;
   if(old){item.changes=Object.keys(fieldLabels).filter(k=>(old as any)[k]!== (trip as any)[k]);item.status=!item.changes.length?'same':options.updateExisting?'updated':'skipped';}
   else item.status='new';
   // Validate individual fields first; continuity is checked only after the complete merge.
   validateTrip({...candidate,trips:[],cars:candidate.cars.map(c=>c.id===trip.carId?{...c,initialOdo:trip.odoStart}:c)},trip);
   if(item.status==='new')candidate.trips.push(trip);
   if(item.status==='updated')candidate.trips=candidate.trips.map(t=>t.id===trip.id?trip:t);
  }catch(e){item.status='error';item.message=e instanceof Error?e.message:'ข้อมูลไม่ถูกต้อง';errors.push('แถว '+item.row+' / #'+item.seq+': '+item.message);}
 }
 // Validate the final timeline, including existing entries that border the import.
 if(car&&!items.some(i=>i.status==='error')){
  const timeline=candidate.trips.filter(t=>t.carId===car.id).sort((a,b)=>a.start.localeCompare(b.start)||a.seq-b.seq);
  for(const trip of timeline){try{validateTrip(candidate,trip);}catch(e){
   let message=e instanceof Error?e.message:'ข้อมูลไม่ถูกต้อง';
   if(message.includes('เลขไมล์ไม่ต่อเนื่อง')){
    const prev=timeline.filter(t=>t.id!==trip.id&&t.end&&t.end<=trip.start).sort((a,b)=>b.end.localeCompare(a.end)||b.start.localeCompare(a.start))[0];
    const next=timeline.filter(t=>t.id!==trip.id&&t.start>=(trip.end||'9999')).sort((a,b)=>a.start.localeCompare(b.start))[0];
    const expected=prev?.odoEnd??car.initialOdo;
    if(trip.odoStart!==expected)message='เลขไมล์ออก '+trip.odoStart+' ไม่ตรงกับ '+(prev?'เลขไมล์กลับ #'+prev.seq:'เลขไมล์เริ่มต้นของรถ')+' ('+expected+')';
    else if(next&&trip.odoEnd!==next.odoStart)message='เลขไมล์กลับ '+trip.odoEnd+' ไม่ตรงกับเลขไมล์ออกของรายการถัดไป #'+next.seq+' ('+next.odoStart+')';
   }
   const item=items.find(i=>i.trip?.id===trip.id);
   const source=item?'แถว '+item.row+' / #'+trip.seq:'รายการเดิม #'+trip.seq;
   errors.push(source+' ('+trip.start.replace('T',' ')+'): '+message);
   if(item){item.status='error';item.message=message;}
  }}
 }
 // Do not retain proposed master records unless a changed row actually uses them.
 const used=new Set(candidate.trips.map(t=>t.driverId));candidate.people=candidate.people.filter(p=>state.people.some(x=>x.id===p.id)||used.has(p.id));
 const counts={new:0,updated:0,same:0,skipped:0,error:0};for(const item of items)counts[item.status]++;
 return {candidate,items,errors:[...new Set(errors)],newPeople:newPeople.filter(n=>candidate.people.some(p=>p.name===n)),counts};
}
