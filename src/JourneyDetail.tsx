import {CarFront,CheckCircle2,Clock3,MapPin,Users,FileText,Route} from 'lucide-react';
import type {Fleet,Trip} from './fleet';
import {vehicleProfile} from './vehicle-profile';
import {tripDay,tripTime} from './trip-history';

const num=(n:number)=>n.toLocaleString('en-US');
export default function JourneyDetail({trip:t,state:s}:{trip:Trip;state:Fleet}){
 const car=s.cars.find(c=>c.id===t.carId),profile=car?vehicleProfile(car):null;
 return <div className="journey-detail"><div className="journey-vehicle">{profile?.image==='revo'?<img src="/vehicle-revo-canopy.webp" alt="Toyota Hilux Revo พร้อมหลังคาครอบกระบะ" width="132" height="88"/>:<CarFront size={64}/>}<div><strong>{car?.plate||'ไม่พบรถ'}</strong><p>{profile?.model||'รถยนต์บริษัท'}</p><small>{[profile?.fuel,car?.province].filter(Boolean).join(' · ')}</small></div></div>
  <div className="journey-detail-status"><span className={'badge '+(t.end?'green':'amber')}>{t.end?<CheckCircle2 size={18}/>:<Clock3 size={18}/>} {t.end?'คืนรถแล้ว':'รอคืนรถ'}</span><small>รายการ #{t.seq}</small></div>
  <h3 className="journey-detail-project">{t.project}</h3><p className="journey-detail-line"><MapPin size={19}/>{t.destination}</p><p className="journey-detail-line"><Users size={19}/><span>ผู้ขับรถ · {s.people.find(p=>p.id===t.driverId)?.name||'—'}</span></p>
  <ol className="journey-timeline"><li className="departure"><h4>ออกเดินทาง</h4><p>{tripDay(t.start)} · {tripTime(t.start)}</p><p>เลขไมล์ {num(t.odoStart)} กม.</p></li><li className={t.end?'returned':'awaiting'}><h4>{t.end?'คืนรถ':'รอบันทึกคืนรถ'}</h4>{t.end?<><p>{tripDay(t.end)} · {tripTime(t.end)}</p><p>เลขไมล์ {num(t.odoEnd!)} กม.</p></>:<p>บันทึกเวลาและเลขไมล์เมื่อเดินทางกลับ</p>}</li></ol>
  {t.end&&<div className="journey-distance journey-detail-distance"><Route size={34}/><div><span>ระยะทางรวม</span><strong>{num(t.odoEnd!-t.odoStart)} กม.</strong></div></div>}
  <section className="journey-detail-notes"><h4><FileText size={19}/>หมายเหตุ</h4><p>{t.note||'ไม่มีหมายเหตุ'}</p></section>{t.reason&&<section className="journey-detail-notes"><h4>เหตุผลกรณีเลขไมล์ไม่ต่อเนื่อง</h4><p>{t.reason}</p></section>}
 </div>;
}
