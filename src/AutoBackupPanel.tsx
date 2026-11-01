import {useEffect,useState} from 'react';
import {ShieldCheck,Clock3,Download,RefreshCw,AlertTriangle,CheckCircle2} from 'lucide-react';
const when=(s:string)=>s?new Date(s).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+' น.':'ยังไม่มี';
const size=(n:number)=>n<1024?n+' B':n<1024*1024?(n/1024).toFixed(1)+' KB':(n/1024/1024).toFixed(2)+' MB';
export default function AutoBackupPanel(){
 const [data,setData]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function request(body?:any){setBusy(true);setError('');setMessage('');try{const r=await fetch('/api/auto-backup',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(r.status===401?'กรุณาเข้าสู่ระบบใหม่':d.error||'อ่านสถานะสำรองไม่ได้');setData(d);if(body)setMessage(body.action==='run'?'สำรองข้อมูลเรียบร้อยแล้ว':'บันทึกการตั้งค่าแล้ว');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{void request();},[]);
 const last=data?.history?.[0],problem=!!data?.lastError||data?.stale;
 return <section className="auto-backup panel" aria-label="สำรองข้อมูลอัตโนมัติ"><div className="care-section-title"><h2><ShieldCheck size={23}/>สำรองข้อมูลอัตโนมัติ</h2><span className="badge green">เฉพาะ Admin</span></div>
 {error&&<div className="alert error" role="alert">{error}</div>}{message&&<p className="care-success" role="status">{message}</p>}
 {data?<><div className={'backup-hero '+(problem?'warning':'')}>
 {problem?<AlertTriangle size={34}/>:last?<CheckCircle2 size={34}/>:<Clock3 size={34}/>}
 <div><strong>{data.lastError?'สำรองล่าสุดไม่สำเร็จ':data.stale?'ยังไม่มีสำเนาล่าสุดใน 26 ชั่วโมง':last?'สำรองล่าสุดสำเร็จ':'รอการสำรองครั้งแรก'}</strong><p>{last?when(last.created_at):'ยังไม่มีไฟล์สำรอง'}</p>{last&&<small>{size(last.bytes)} · ฝั่ง {data.environment==='demo'?'Demo':'Production'}</small>}</div></div>
 <div className="backup-setting-row"><div><strong>สำรองตามเวลา</strong><p>ทุกวัน {data.schedule}</p></div><button type="button" className={'backup-toggle '+(data.enabled?'on':'')} role="switch" aria-checked={data.enabled} aria-label="เปิดสำรองอัตโนมัติ" disabled={busy} onClick={()=>request({action:'enabled',enabled:!data.enabled})}><span/></button></div>
 {!data.enabled&&<p className="care-warning">ปิดการสำรองตามเวลาอยู่ ยังสำรองด้วยปุ่มได้</p>}
 <p className="muted">เก็บย้อนหลัง {data.retentionDays} วัน · ใช้พื้นที่สำเนา {size(data.totalBytes)}<br/>วันละ 1 ชุด การกดสำรองซ้ำจะอัปเดตชุดของวันนี้</p>
 <p className="backup-location">เก็บในฐานสำรองแยกจากฐานข้อมูลหลัก · ทำงานได้แม้ไม่มีคนเปิดเว็บ</p>
 <div className="backup-actions"><button type="button" className="primary" disabled={busy} onClick={()=>request({action:'run'})}><ShieldCheck size={17}/>{busy?'กำลังทำรายการ…':'สำรองตอนนี้'}</button><button className="secondary" type="button" disabled={busy} onClick={()=>request()}><RefreshCw size={17}/>รีเฟรชสถานะ</button></div>
 <h3>ประวัติการสำรอง</h3><div className="auto-backup-history">{data.history.map((r:any)=><div key={r.id}><div><strong>{when(r.created_at)}</strong><small>สำเร็จ · {size(r.bytes)}</small></div><div className="backup-file-links"><a href={'/api/auto-backup/download?id='+r.id} aria-label={'ดาวน์โหลด JSON '+r.id}><Download size={15}/>JSON</a><a href={'/api/auto-backup/download?id='+r.id+'&format=sql'} aria-label={'ดาวน์โหลด SQL '+r.id}>SQL</a></div></div>)}{!last&&<p className="muted">ยังไม่มีไฟล์สำรอง</p>}</div>
 <p className="care-footnote">ไฟล์มีข้อมูลบัญชีพนักงาน โปรดเก็บเป็นส่วนตัว สำเนายังอยู่ในบัญชี Cloudflare เดียวกัน แนะนำดาวน์โหลดเก็บนอกระบบเป็นระยะ ตารางเวลาอาจคลาดเคลื่อนเล็กน้อย</p>
 </>:<button className="secondary" type="button" disabled={busy} onClick={()=>request()}>{busy?'กำลังอ่านสถานะ…':'ลองอ่านสถานะอีกครั้ง'}</button>}</section>;
}
