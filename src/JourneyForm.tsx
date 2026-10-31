import {useEffect,useRef,useState} from 'react';
import {CarFront,Users,LockKeyhole,Clock3,Route,Info,AlertCircle} from 'lucide-react';
import type {Fleet} from './fleet';
import {latestOdo} from './fleet';
import {vehicleProfile} from './vehicle-profile';
import VehicleActionButton from './VehicleActionButton';

const num=(n:number)=>n.toLocaleString('en-US');
type Props={state:Fleet;trip:any;mode:'start'|'return';busy:boolean;error:string;employee:boolean;occupiedCars:Set<string>;onSubmit:(v:any)=>void;onClose:()=>void};
export default function JourneyForm({state:s,trip,mode,busy,error,employee,occupiedCars,onSubmit,onClose}:Props){
 const [v,setV]=useState({...trip});
 const errorRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 const set=(key:string,value:any)=>setV((p:any)=>({...p,[key]:value}));
 const returning=mode==='return',car=s.cars.find(c=>c.id===v.carId),profile=car?vehicleProfile(car):null;
 const expected=latestOdo(s,v.carId);
 const distance=v.odoEnd!==''&&v.odoEnd!==null&&v.odoEnd!==undefined?Number(v.odoEnd)-Number(v.odoStart):null;
 const discontinuous=!returning&&v.odoStart!==''&&Number(v.odoStart)!==expected;
 return <form className="journey-form" onSubmit={e=>{e.preventDefault();if(!busy)onSubmit(v);}} aria-busy={busy}>
  <fieldset disabled={busy} className="journey-fields"><div className="modal-body">
   <div className="journey-vehicle">{profile?.image==='revo'?<img src="/vehicle-revo-canopy.webp" alt="Toyota Hilux Revo พร้อมหลังคาครอบกระบะ" width="132" height="88"/>:<CarFront size={64}/>}<div><strong>{car?.plate||'เลือกรถยนต์'}</strong><p>{profile?.model||'รถยนต์บริษัท'}</p><small>{profile?.fuel}</small></div></div>
   {!returning&&s.cars.filter(c=>c.active).length>1&&<label className="field journey-car-select"><span>รถยนต์ <b>*</b></span><select value={v.carId} onChange={e=>{const id=e.target.value;setV((p:any)=>({...p,carId:id,odoStart:latestOdo(s,id)}));}} required>{s.cars.filter(c=>c.active).map(c=><option key={c.id} value={c.id} disabled={occupiedCars.has(c.id)}>{c.plate}{occupiedCars.has(c.id)?' · กำลังใช้งาน':''}</option>)}</select></label>}
   {returning?<section className="journey-summary"><h3><Clock3 size={21}/>กำลังใช้งาน</h3><dl><div><dt>งาน / โครงการ</dt><dd>{v.project}</dd></div><div><dt>สถานที่ไป</dt><dd>{v.destination}</dd></div><div><dt>ผู้ขับรถ</dt><dd>{s.people.find(p=>p.id===v.driverId)?.name||'—'}</dd></div><div><dt>เวลาออกเดินทาง</dt><dd>{new Date(v.start+'+07:00').toLocaleString('th-TH',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})} น.</dd></div><div><dt>เลขไมล์ตอนรับรถ</dt><dd>{num(Number(v.odoStart))} กม.</dd></div></dl></section>:employee?<div className="journey-driver"><Users size={23}/><span>ผู้ขับรถ</span><strong>{s.people.find(p=>p.id===v.driverId)?.name||'—'}</strong><LockKeyhole size={17} aria-label="ใช้บัญชีที่เข้าสู่ระบบ"/></div>:<label className="field journey-driver-select"><span>พนักงานขับรถ <b>*</b></span><select value={v.driverId} onChange={e=>set('driverId',e.target.value)} required><option value="">เลือกพนักงาน</option>{s.people.filter(p=>p.active||p.id===v.driverId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
   <h3 className="journey-section-title">{returning?'ข้อมูลคืนรถ':'ข้อมูลการเดินทาง'}</h3>
   <div className="journey-inputs">{!returning&&<><label className="field"><span>งาน / โครงการ <b>*</b></span><input list="journey-projects" value={v.project} onChange={e=>set('project',e.target.value)} placeholder="เลือกหรือพิมพ์ชื่องาน / โครงการ" required maxLength={300}/><datalist id="journey-projects">{s.projects.map(p=><option key={p} value={p}/>)}</datalist></label><label className="field"><span>สถานที่ไป <b>*</b></span><input value={v.destination} onChange={e=>set('destination',e.target.value)} placeholder="ระบุสถานที่หรือชื่อลูกค้า" required maxLength={1000}/></label></>}
   <label className="field"><span>{returning?'วันและเวลาคืน':'วันและเวลาออก'} <b>*</b></span><input type="datetime-local" value={returning?v.end:v.start} min={returning?v.start:undefined} onChange={e=>set(returning?'end':'start',e.target.value)} required/><small className="journey-hint">เวลาไทย · ช่องวันที่ใช้ปี ค.ศ.</small></label></div>
   {!returning&&<h3 className="journey-section-title">เลขไมล์ก่อนออกเดินทาง</h3>}
   <label className="field journey-mileage"><span>{returning?'เลขไมล์เมื่อคืนรถ':'เลขไมล์ออก'} <b>*</b></span>{!returning&&<small id="latest-mileage" className="journey-latest">เลขไมล์ล่าสุด {num(expected)} กม.</small>}<div className="journey-number"><input type="number" inputMode="numeric" min={returning?v.odoStart:0} max="99999999" step="1" value={returning?v.odoEnd??'':v.odoStart} onChange={e=>set(returning?'odoEnd':'odoStart',e.target.value)} required aria-describedby={!returning?'latest-mileage':undefined}/><span>กม.</span></div></label>
   {!returning&&<p className="journey-hint"><Info size={15}/>ตรวจเลขไมล์ให้ตรงกับหน้าปัดรถ</p>}
   {returning&&distance!==null&&distance>=0&&Number.isInteger(distance)&&<div className="journey-distance" aria-live="polite"><Route size={38}/><div><span>ระยะทางครั้งนี้</span><strong>{num(distance)} กม.</strong></div></div>}
   {returning&&distance!==null&&distance<0&&<p className="journey-validation" role="alert">เลขไมล์คืนรถต้องไม่น้อยกว่าเลขไมล์ตอนรับรถ</p>}
   <label className="field journey-notes"><span>{returning?'หมายเหตุการคืนรถ':'หมายเหตุ'} (ถ้ามี)</span><textarea value={v.note||''} onChange={e=>set('note',e.target.value)} rows={2} placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)" maxLength={2000}/><small className="journey-counter">{(v.note||'').length}/2000</small></label>
   {(discontinuous||v.reason||error.includes('เลขไมล์ไม่ต่อเนื่อง'))&&<label className="field journey-reason"><span>เหตุผลกรณีเลขไมล์ไม่ต่อเนื่อง{discontinuous&&<b> *</b>}</span><input value={v.reason||''} onChange={e=>set('reason',e.target.value)} placeholder="เช่น มีการใช้รถก่อนรายการนี้" required={discontinuous} maxLength={1000}/></label>}
  </div></fieldset>
  {error&&<div className="alert error journey-error" role="alert" ref={errorRef} tabIndex={-1}><AlertCircle size={18}/>{error}</div>}
  <div className="modal-footer journey-footer"><VehicleActionButton type="submit" variant={returning?'return':'start'} disabled={busy} aria-busy={busy}>{busy?'กำลังบันทึก…':returning?'ยืนยันคืนรถ':'ยืนยันบันทึกใช้รถ'}</VehicleActionButton><button type="button" className="journey-cancel" disabled={busy} onClick={onClose}>ยกเลิก</button></div>
 </form>;
}
