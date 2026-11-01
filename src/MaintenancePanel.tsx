import {useEffect,useRef,useState} from 'react';
import type {Fleet} from './fleet';
import {latestOdo} from './fleet';
import {bangkokDay,maintenanceLabels,maintenanceStatus,maintenanceTypes,type MaintenancePlan,type MaintenanceRecord} from './maintenance';
type Props={state:Fleet;version:number;admin:boolean;onSaved:(data:any)=>void;onRefresh:()=>Promise<void>};
const labels={normal:'ปกติ',near:'ใกล้ครบกำหนด',overdue:'เกินกำหนด'};
export default function MaintenancePanel({state:s,version,admin,onSaved,onRefresh}:Props){
 const [edit,setEdit]=useState<Partial<MaintenancePlan>|null>(null),[complete,setComplete]=useState<MaintenancePlan|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [editingRecord,setEditingRecord]=useState<MaintenanceRecord|null>(null);
 const saving=useRef(false);
 const [today,setToday]=useState(bangkokDay());
 useEffect(()=>{const timer=setInterval(()=>setToday(bangkokDay()),60000);return()=>clearInterval(timer);},[]);
 async function submit(data:unknown){
  if(saving.current)return;saving.current=true;setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'maintenance',version,data})});
   const body=await response.json();
   if(response.status===401){window.location.assign('/login');return;}
   if(response.status===409){await onRefresh();throw Error('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาตรวจข้อมูลล่าสุดและลองใหม่');}
   if(!response.ok)throw Error(body.error||'บันทึกไม่สำเร็จ');
   onSaved(body);setEdit(null);setComplete(null);setEditingRecord(null);setNotice('บันทึกบำรุงรักษาแล้ว');
  }catch(e){setError(e instanceof Error?e.message:'เชื่อมต่อไม่สำเร็จ');}finally{saving.current=false;setBusy(false);}
 }
 function planSubmit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);const optional=(name:string)=>data.get(name)===''?{}:{[name]:Number(data.get(name))};
  submit({operation:'plan',plan:{id:edit?.id,carId:data.get('carId'),type:data.get('type'),name:data.get('name'),active:data.get('active')==='on',warnKm:Number(data.get('warnKm')),warnDays:Number(data.get('warnDays')),...optional('dueOdo'),...optional('intervalKm'),...optional('intervalDays'),...(data.get('dueDate')?{dueDate:data.get('dueDate')}:{})}});
 }
 const plans=s.maintenancePlans||[],shown=admin?plans:plans.filter(p=>p.active&&s.cars.some(c=>c.id===p.carId&&c.active));
 return <section className="panel maintenance-panel" aria-label="บำรุงรักษารถยนต์"><div className="panel-title"><h2>บำรุงรักษารถยนต์</h2>{admin&&<button className="secondary" disabled={busy||!!edit||!!complete||!s.cars.length} onClick={()=>{setError('');setEdit({carId:s.cars[0]?.id,type:'oil',active:true,warnKm:500,warnDays:30});}}>เพิ่มแผนบำรุงรักษา</button>}</div>
 {error&&<p className="alert error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {!shown.length&&<p>ยังไม่มีแผนบำรุงรักษา</p>}
 <div className="maintenance-cards">{shown.map(p=><article key={p.id} className="maintenance-card"><h3>{s.cars.find(c=>c.id===p.carId)?.plate} · {p.name}</h3><span className={'badge '+(maintenanceStatus(s,p,today)==='normal'?'green':'amber')}>{p.active?labels[maintenanceStatus(s,p,today)]:'ปิดแผน'}</span><p>{maintenanceLabels[p.type]}{p.dueOdo!==undefined&&<> · ครบ {p.dueOdo.toLocaleString()} กม.</>}{p.dueDate&&<> · วันที่ {p.dueDate}</>}</p>{p.active&&<small>เลขไมล์ล่าสุด {latestOdo(s,p.carId).toLocaleString()} กม.</small>}{admin&&<div className="maintenance-actions"><button className="secondary" disabled={busy||!!edit||!!complete} onClick={()=>{setError('');setEdit({...p});}}>แก้ไขแผน</button>{p.active&&<button className="primary" disabled={busy||!!edit||!!complete} onClick={()=>{setError('');setComplete(p);}}>บันทึกงานที่เสร็จ</button>}</div>}</article>)}</div>
 {admin&&edit&&<form className="maintenance-form" onSubmit={planSubmit}><h3>{edit.id?'แก้ไข':'เพิ่ม'}แผนบำรุงรักษา</h3><fieldset disabled={busy}>
 <label>รถ<select name="carId" defaultValue={edit.carId}>{s.cars.filter(c=>!edit.id||c.id===edit.carId).map(c=><option key={c.id} value={c.id}>{c.plate}</option>)}</select></label>
 <label>ประเภท<select name="type" defaultValue={edit.type}>{maintenanceTypes.map(t=><option key={t} value={t}>{maintenanceLabels[t]}</option>)}</select></label>
 <label>ชื่องาน<input name="name" required maxLength={150} defaultValue={edit.name}/></label>
 <label>เลขไมล์ครบกำหนด<input name="dueOdo" type="number" min="0" max="99999999" step="1" defaultValue={edit.dueOdo}/></label>
 <label>วันที่ครบกำหนด<input name="dueDate" type="date" defaultValue={edit.dueDate}/></label>
 <label>รอบระยะทาง (กม.)<input name="intervalKm" type="number" min="1" max="99999999" step="1" defaultValue={edit.intervalKm}/></label>
 <label>รอบระยะเวลา (วัน)<input name="intervalDays" type="number" min="1" max="36500" step="1" defaultValue={edit.intervalDays}/></label>
 <label>เตือนล่วงหน้า (กม.)<input name="warnKm" type="number" required min="0" max="99999999" step="1" defaultValue={edit.warnKm}/></label>
 <label>เตือนล่วงหน้า (วัน)<input name="warnDays" type="number" required min="0" max="3650" step="1" defaultValue={edit.warnDays}/></label>
 <label><input name="active" type="checkbox" defaultChecked={edit.active}/> เปิดแผน</label>
 <p>กำหนดเลขไมล์หรือวันที่อย่างน้อยหนึ่งอย่าง เมื่อใช้ทั้งสองอย่างจะแจ้งเตือนตามเงื่อนไขที่ถึงก่อน รอบครั้งถัดไปนับจากวันที่/เลขไมล์ที่บำรุงรักษาจริง</p>
 <div className="maintenance-actions"><button className="primary" type="submit">{busy?'กำลังบันทึก…':'บันทึกแผน'}</button><button className="secondary" type="button" onClick={()=>setEdit(null)}>ยกเลิก</button></div></fieldset></form>}
 {admin&&complete&&<form className="maintenance-form" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);submit({operation:editingRecord?'editHistory':'complete',id:editingRecord?.id,planId:complete.id,record:{date:data.get('date'),odometer:Number(data.get('odometer')),details:data.get('details'),costSatang:Math.round(Number(data.get('cost'))*100)}});}}><h3>{editingRecord?'แก้ไขประวัติ':'บันทึกงานที่เสร็จ'} · {complete.name}</h3><fieldset disabled={busy}>
 <label>วันที่บำรุงรักษา<input name="date" type="date" required max={bangkokDay()} defaultValue={editingRecord?.date||bangkokDay()}/></label>
 <label>เลขไมล์ขณะบำรุงรักษา<input name="odometer" type="number" required min={s.cars.find(c=>c.id===complete.carId)?.initialOdo||0} max="99999999" step="1" defaultValue={editingRecord?.odometer??latestOdo(s,complete.carId)}/></label>
 <label>รายละเอียด<textarea aria-label="รายละเอียด" name="details" maxLength={2000} defaultValue={editingRecord?.details}/></label><label>ค่าใช้จ่าย (บาท)<input name="cost" type="number" required min="0" max="999999999.99" step="0.01" defaultValue={editingRecord?editingRecord.costSatang/100:0}/></label>
 <p>{editingRecord?'การแก้ไขจะเก็บค่าเดิมในประวัติการเปลี่ยนแปลง และไม่เปลี่ยนรายการเดินทาง การแก้วันที่หรือเลขไมล์ล่าสุดอาจปรับรอบถัดไป โดยไม่ทับรอบที่ปรับไว้ภายหลัง':'การบันทึกนี้ไม่เปลี่ยนเลขไมล์หรือรายการเดินทาง แผนที่ไม่มีรอบซ้ำจะปิดหลังบันทึกงาน'}</p><div className="maintenance-actions"><button className="primary" type="submit">{busy?'กำลังบันทึก…':'ยืนยันบันทึก'}</button><button className="secondary" type="button" onClick={()=>{setComplete(null);setEditingRecord(null);}}>ยกเลิก</button></div></fieldset></form>}
 {admin&&<details className="maintenance-history"><summary>ประวัติการบำรุงรักษา ({s.maintenanceHistory?.length||0})</summary>{[...(s.maintenanceHistory||[])].sort((a,b)=>b.date.localeCompare(a.date)).map(r=><article className="maintenance-card" key={r.id}><strong>{s.cars.find(c=>c.id===r.carId)?.plate} · {plans.find(p=>p.id===r.planId)?.name}</strong><p>{r.date} · {r.odometer.toLocaleString()} กม. · {(r.costSatang/100).toLocaleString('th-TH',{minimumFractionDigits:2})} บาท</p><p>{r.details}</p><button className="secondary" disabled={busy||!!edit||!!complete} onClick={()=>{setError('');setEditingRecord(r);setComplete(plans.find(p=>p.id===r.planId)!);}}>แก้ไขประวัติ</button></article>)}</details>}
 </section>;
}
