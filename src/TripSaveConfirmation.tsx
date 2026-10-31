import {CheckCircle2,CarFront,ArrowRight,Route} from 'lucide-react';
import type {TripReceipt} from './trip-receipt';
import {tripDay,tripTime} from './trip-history';

const num=(v:number)=>v.toLocaleString('en-US');
export default function TripSaveConfirmation({receipt,onDetail,onClose}:{receipt:TripReceipt;onDetail:()=>void;onClose:()=>void}){
 const {trip,kind}=receipt,returning=kind==='return';
 const date=returning?trip.end:trip.start,odometer=returning?trip.odoEnd!:trip.odoStart;
 return <section className={'trip-receipt '+(returning?'returned':'started')} aria-label="สรุปรายการที่บันทึกสำเร็จ">
  <div className="modal-body"><div className="trip-receipt-check" aria-hidden="true"><CheckCircle2 size={47}/></div><p className="trip-receipt-intro">ข้อมูลรายการนี้ถูกบันทึกเข้าระบบแล้ว</p><div className="trip-receipt-car"><CarFront size={30}/><div><h3>{receipt.plate}</h3><p>{receipt.province}</p></div><span>#{trip.seq}</span></div>
   <dl className="trip-receipt-fields"><div><dt>{returning?'วันเวลาคืนรถ':'วันเวลาออกเดินทาง'}</dt><dd>{tripDay(date)}<span>{tripTime(date)} · เวลาไทย</span></dd></div><div className="trip-receipt-mileage"><dt>{returning?'เลขไมล์คืนรถที่บันทึก':'เลขไมล์ออกที่บันทึก'}</dt><dd>{num(odometer)} <small>กม.</small></dd></div><div><dt>งาน / โครงการ</dt><dd>{trip.project}</dd></div><div><dt>ผู้ขับรถ</dt><dd>{receipt.driverName}</dd></div></dl>
   {returning&&<div className="trip-receipt-distance"><Route size={24}/><span>ระยะทางครั้งนี้</span><strong>{num(trip.odoEnd!-trip.odoStart)} กม.</strong></div>}
  </div><div className="modal-footer trip-receipt-actions"><button type="button" className="primary" onClick={onDetail}>ดูรายละเอียดรายการ<ArrowRight size={18}/></button><button type="button" className="secondary" onClick={onClose}>เรียบร้อย</button></div>
 </section>;
}
