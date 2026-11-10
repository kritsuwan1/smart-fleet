import {CarFront,Clock3,Users,ChevronRight,CheckCircle2,MapPin} from 'lucide-react';
import type {Fleet,Trip} from './fleet';
import {latestOdo} from './fleet';
import {vehicleProfile} from './vehicle-profile';
import VehicleActionButton from './VehicleActionButton';

const num=(n:number)=>n.toLocaleString('en-US');
const date=(s:string)=>new Date(s+'+07:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'});
type Props={operationsBlocked?:boolean;checkoutDisabled?:boolean;state:Fleet;name:string;occupiedCars:Set<string>;onStart:(id:string)=>void;onReturn:(trip:Trip)=>void;onDetail:(trip:Trip)=>void;onHistory:()=>void};
export default function EmployeeDashboard({state:s,name,operationsBlocked=false,checkoutDisabled=false,occupiedCars,onStart,onReturn,onDetail,onHistory}:Props){
 const active=s.trips.filter(t=>!t.end).sort((a,b)=>b.start.localeCompare(a.start));
 const recent=s.trips.filter(t=>t.end).sort((a,b)=>b.start.localeCompare(a.start)||b.seq-a.seq).slice(0,3);
 // Include a car with an open trip even if an administrator has since disabled it.
 const cars=s.cars.filter(c=>c.active||active.some(t=>t.carId===c.id)).sort((a,b)=>Number(active.some(t=>t.carId===b.id))-Number(active.some(t=>t.carId===a.id)));
 return <div className="employee-home">
  <div className="employee-greeting"><span className="employee-avatar"><Users size={25}/></span><div><h1>สวัสดี คุณ{name}</h1><p>{new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'})}</p></div></div>
  <div className="employee-section-heading"><h2>{active.length?'การเดินทางของฉัน':'เลือกรถเพื่อเริ่มเดินทาง'}</h2><span>{cars.length} คัน</span></div>
  <div className="employee-cars">{cars.map(c=>{
   const trip=active.find(t=>t.carId===c.id),occupied=occupiedCars.has(c.id),profile=vehicleProfile(c);
   return <section className="employee-car" key={c.id}>
    <div className="employee-car-heading"><h3>{c.plate}</h3><span className={'badge '+(trip||occupied?'amber':'green')}>{trip?'กำลังใช้งาน':occupied?'มีผู้ใช้งาน':'พร้อมใช้งาน'}</span></div>
    <p className="employee-model">{profile.model||'รถยนต์บริษัท'}</p><p className="employee-car-meta">{[profile.fuel,c.province].filter(Boolean).join(' · ')}</p>
    {profile.image==='revo'?<img className="employee-car-image" src="/vehicle-revo-canopy.webp" alt="ภาพประกอบ Toyota Hilux Revo พร้อมหลังคาครอบกระบะ" width="640" height="426"/>:<div className="employee-car-placeholder"><CarFront size={74}/></div>}
    {trip?<div className="employee-pending"><h4><Clock3 size={21}/>รอคืนรถ</h4><dl><div><dt>ผู้ขับรถ</dt><dd>{s.people.find(p=>p.id===trip.driverId)?.name||name}</dd></div><div><dt>งาน / โครงการ</dt><dd>{trip.project}</dd></div><div><dt>สถานที่ไป</dt><dd>{trip.destination}</dd></div><div><dt>เวลาออกเดินทาง</dt><dd>{date(trip.start)} · {trip.start.slice(11)} น.</dd></div><div><dt>เลขไมล์ตอนออก</dt><dd>{num(trip.odoStart)} กม.</dd></div></dl><VehicleActionButton disabled={operationsBlocked} card variant="return" onClick={()=>onReturn(trip)}/><button className="employee-detail" onClick={()=>onDetail(trip)}>ดูรายละเอียด<ChevronRight size={16}/></button></div>:occupied?<div className="employee-unavailable"><Clock3 size={19}/><p>รถคันนี้มีพนักงานใช้งานอยู่<br/><small>เริ่มบันทึกได้เมื่อมีการคืนรถแล้ว</small></p></div>:<><p className="employee-odometer">เลขไมล์ล่าสุด <strong>{num(latestOdo(s,c.id))} กม.</strong></p><VehicleActionButton disabled={operationsBlocked||checkoutDisabled} card onClick={()=>onStart(c.id)}/></>}
   </section>;
  })}</div>
  {!cars.length&&<div className="panel employee-empty"><CarFront size={36}/><h3>ยังไม่มีรถพร้อมใช้งาน</h3><p>ติดต่อผู้ดูแลเพื่อเพิ่มหรือเปิดใช้งานรถ</p></div>}
  <section className="employee-history"><div className="employee-section-heading"><h2>ประวัติล่าสุด</h2><button className="textbutton" onClick={onHistory}>ดูทั้งหมด<ChevronRight size={16}/></button></div>{recent.map(t=><button className="employee-history-item" key={t.id} onClick={()=>onDetail(t)}><div className="employee-history-status"><span><CheckCircle2 size={16}/>คืนรถแล้ว</span><small>{date(t.start)}</small></div><strong>{t.project}</strong><span className="employee-history-place"><MapPin size={14}/>{t.destination}</span><div className="employee-history-bottom"><span>{s.cars.find(c=>c.id===t.carId)?.plate} · {t.start.slice(11)}–{t.end.slice(11)} น.</span><strong>{num(t.odoEnd!-t.odoStart)} กม.<ChevronRight size={16}/></strong></div></button>)}{!recent.length&&<p className="employee-empty-history">เมื่อคืนรถแล้ว รายการจะแสดงที่นี่</p>}</section>
 </div>;
}
