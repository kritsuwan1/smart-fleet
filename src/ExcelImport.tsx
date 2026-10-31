import {useMemo,useState} from 'react';
import {FileSpreadsheet,Upload,CheckCircle2,AlertCircle,ArrowRight,Download} from 'lucide-react';
import type {Fleet} from './fleet';
import {readWorkbook,type ParsedSheet} from './xlsx-reader';
import {planImport,fieldLabels} from './import-plan';
const labels={new:'รายการใหม่',updated:'แก้ไขรายการเดิม',same:'ข้อมูลเหมือนเดิม',skipped:'ข้ามการแก้ไข',error:'ต้องตรวจสอบ'};
const format=(v:any)=>v===null||v===undefined||v===''?'—':String(v);
export default function ExcelImport({state,busy,error,onSubmit,onClose}:{state:Fleet;busy:boolean;error:string;onSubmit:(v:any)=>void;onClose:()=>void}){
 const [sheets,setSheets]=useState<ParsedSheet[]>([]),[sheetIndex,setSheetIndex]=useState(0),[fileName,setFileName]=useState(''),[reading,setReading]=useState(false),[fileError,setFileError]=useState(''),[carId,setCarId]=useState(state.cars.find(c=>c.active)?.id||''),[updateExisting,setUpdateExisting]=useState(false),[createPeople,setCreatePeople]=useState(false);
 const sheet=sheets[sheetIndex];
 const options={carId,updateExisting,createPeople};
 const plan=useMemo(()=>sheet?planImport(state,sheet.rows,{carId,updateExisting,createPeople}):null,[state,sheet,carId,updateExisting,createPeople]);
 const errors=[...(sheet?.errors||[]),...(plan?.errors||[])];
 const changed=(plan?.counts.new||0)+(plan?.counts.updated||0);
 async function choose(file?:File){
  setSheets([]);setFileError('');setSheetIndex(0);if(!file)return;setReading(true);setFileName(file.name);
  try{const parsed=await readWorkbook(file);setSheets(parsed);const valid=parsed.findIndex(s=>s.rows.length>0);setSheetIndex(Math.max(0,valid));const plate=parsed[Math.max(0,valid)]?.plate;const car=state.cars.find(c=>c.plate.replace(/\s/g,'')===plate?.replace(/\s/g,''));if(car)setCarId(car.id);}
  catch(e){setFileError(e instanceof Error?e.message:'อ่านไฟล์ไม่ได้');}finally{setReading(false);}
 }
 return <><div className="modal-body excel-import"><div className="alert info"><FileSpreadsheet size={20}/><div><strong>เลือก Excel ฉบับล่าสุดจากเครื่อง</strong><p>จับคู่รายการด้วยทะเบียนรถและลำดับที่ในไฟล์ · เก็บรายการที่ไม่ได้อยู่ในไฟล์ไว้<br/>รายการที่เปลี่ยนแปลงจะถูกข้าม จนกว่าจะเลือกอนุญาตให้อัปเดต</p></div></div>
 <label className="file-picker"><Upload size={22}/><strong>{reading?'กำลังอ่านไฟล์…':'เลือกไฟล์ .xlsx'}</strong><span>{fileName||'สูงสุด 5 MB และ 1,000 รายการต่อชีต'}</span><input aria-label="เลือกไฟล์ Excel" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy||reading} onChange={e=>choose(e.target.files?.[0])}/></label>
 {fileError&&<div className="alert error" role="alert">{fileError}</div>}
 <div className="form-grid import-options"><label className="field"><span>นำเข้าข้อมูลของรถ <b>*</b></span><select value={carId} onChange={e=>setCarId(e.target.value)} disabled={busy}>{state.cars.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.plate} · {c.province}</option>)}</select></label>{sheets.length>0&&<label className="field"><span>ชีตข้อมูล</span><select value={sheetIndex} disabled={busy} onChange={e=>setSheetIndex(Number(e.target.value))}>{sheets.map((s,i)=><option key={i} value={i}>{s.name} ({s.rows.length} รายการ)</option>)}</select></label>}</div>
 <label className="checkbox import-check"><input type="checkbox" checked={updateExisting} disabled={busy} onChange={e=>setUpdateExisting(e.target.checked)}/>อัปเดตรายการเดิมที่ทะเบียนรถและลำดับที่ตรงกันตาม Excel</label><label className="checkbox import-check"><input type="checkbox" checked={createPeople} disabled={busy} onChange={e=>setCreatePeople(e.target.checked)}/>อนุญาตเพิ่มชื่อพนักงานใหม่ที่พบในไฟล์</label>
 {plan&&sheet&&<><div className="import-summary">{(['new','updated','same','skipped','error'] as const).map(k=><div key={k}><strong>{plan.counts[k]}</strong><span>{labels[k]}</span></div>)}</div><p className="import-total">ไฟล์มี {sheet.rows.length} รายการ · ระยะทางที่คำนวณใหม่ {sheet.rows.reduce((n,t)=>n+(t.end&&t.odoEnd!==null?t.odoEnd-t.odoStart:0),0).toLocaleString('en-US')} กม.</p>
 {plan.newPeople.length>0&&<div className="alert info">จะเพิ่มพนักงาน: {plan.newPeople.join(', ')}</div>}
 <div className="import-preview import-review"><table><thead><tr><th>สถานะ</th><th>ลำดับ / แถว</th><th>ออกเดินทาง / งาน</th><th>เลขไมล์ ออก → กลับ</th><th>รายละเอียด</th></tr></thead><tbody>{plan.items.map((item,index)=>{const row=sheet.rows[index];return <tr key={index}><td><span className={'badge '+(item.status==='error'?'red':item.status==='updated'?'amber':item.status==='new'?'green':'gray')}>{labels[item.status]}</span></td><td>#{item.seq}<small>แถว {item.row}</small></td><td>{row.start.replace('T',' ')}<small>{row.project}</small></td><td className="numeric">{row.odoStart.toLocaleString('en-US')} → {row.odoEnd?.toLocaleString('en-US')||'—'}</td><td>{item.message||(!item.changes.length?'—':<details><summary>เปลี่ยน {item.changes.length} ช่อง</summary>{item.changes.map(k=><p className="change-line" key={k}><strong>{fieldLabels[k]}</strong><br/><del>{k==='driverId'?state.people.find(p=>p.id===item.old?.driverId)?.name:format((item.old as any)?.[k])}</del><br/><span>→ {k==='driverId'?row.driverName:format((item.trip as any)?.[k])}</span></p>)}</details>)}</td></tr>;})}</tbody></table></div>
 {sheet.warnings.length>0&&<div className="alert info import-messages"><strong>ข้อสังเกต</strong><ul>{sheet.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
 {errors.length>0&&<div className="alert error import-messages" role="alert"><strong>ยังนำเข้าไม่ได้ กรุณาตรวจรายการต่อไปนี้</strong><ul>{errors.slice(0,30).map((e,i)=><li key={i}>{e}</li>)}</ul>{errors.length>30&&<p>และอีก {errors.length-30} รายการ</p>}<p>ยังไม่มีข้อมูลใดถูกเปลี่ยนแปลง กรุณาแก้ใน Excel หรือข้อมูลเดิมในเว็บ แล้วเลือกไฟล์อีกครั้ง</p></div>}
 {plan.counts.skipped>0&&<p className="field-hint">มี {plan.counts.skipped} รายการที่ข้อมูลต่างจากระบบและจะถูกข้าม เปิด “อัปเดตรายการเดิม” หากต้องการใช้ค่าจาก Excel</p>}
 {changed===0&&!errors.length&&<div className="alert info">ไม่มีรายการใหม่หรือรายการแก้ไขที่จะบันทึก</div>}
 </>}
 {error&&<div className="alert error" role="alert"><AlertCircle size={18}/>{error}</div>}
 </div><div className="modal-footer import-footer"><a href="/api/backup.sql" className="textbutton"><Download size={14}/>สำรอง SQL ก่อนนำเข้า</a><button className="secondary" disabled={busy} onClick={onClose}>ยกเลิก</button><button className="primary" disabled={busy||reading||!plan||errors.length>0||changed===0} onClick={()=>onSubmit({rows:sheet.rows,options,fileName,sheetName:sheet.name})}>{busy?'กำลังนำเข้า…':`ยืนยันเพิ่ม ${plan?.counts.new||0} / แก้ไข ${plan?.counts.updated||0} รายการ`}<ArrowRight size={16}/></button></div></>;
}
