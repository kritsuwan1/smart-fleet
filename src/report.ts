import {IS_DEMO} from './environment';
import type {Fleet,Trip} from './fleet';
export const dieselText=(value:string)=>value.replace(/\bB7\b/gi,'').replace(/ {2,}/g,' ').trim();
export type FuelPrice={month:string;product:'b7';value:number;source:string;sourceUrl:string;method:'manual'|'official';retrievedAt:string;updatedBy?:string};
export type ReportModel={month:string;monthLabel:string;plate:string;province:string;scope:string;count:number;closedCount:number;openCount:number;total:number;average:number|null;maximum:number|null;odoStart:number|null;odoEnd:number|null;longest:string;longestDestination:string;note:string;generatedAt:string};
export const monthLabel=(month:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(month)?new Date(month+'-01T00:00:00+07:00').toLocaleDateString('th-TH',{month:'long',year:'numeric',timeZone:'Asia/Bangkok'}):'กรุณาเลือกเดือน';
export function makeReport(state:Fleet,month:string,carId:string,options:{employeeName?:string;generatedAt?:string}={}):ReportModel{
 const car=state.cars.find(c=>c.id===carId);if(!car)throw Error('กรุณาเลือกรถสำหรับรายงาน');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('กรุณาเลือกเดือนสำหรับรายงาน');
 const trips=state.trips.filter(t=>t.carId===carId&&t.start.startsWith(month)).sort((a,b)=>a.start.localeCompare(b.start)||a.seq-b.seq);
 const closed=trips.filter(t=>t.end),total=closed.reduce((n,t)=>n+t.odoEnd!-t.odoStart,0);
 const longest=[...closed].sort((a,b)=>(b.odoEnd!-b.odoStart)-(a.odoEnd!-a.odoStart)||a.seq-b.seq)[0];
 return {month,monthLabel:monthLabel(month),plate:car.plate,province:car.province,scope:options.employeeName?'เฉพาะรายการที่บัญชี '+options.employeeName+' บันทึก':'รายการใช้รถของบริษัท',count:trips.length,closedCount:closed.length,openCount:trips.length-closed.length,total,average:closed.length?total/closed.length:null,maximum:longest?longest.odoEnd!-longest.odoStart:null,odoStart:trips[0]?.odoStart??null,odoEnd:closed.at(-1)?.odoEnd??null,longest:longest?.destination||longest?.project||'—',longestDestination:longest?.project||'',note:'นับตามวันที่ออกเดินทาง · ระยะทางรวม/เฉลี่ย/สูงสุดใช้เฉพาะเที่ยวที่คืนรถแล้ว'+(trips.length>closed.length?' · ยังไม่คืนรถ '+(trips.length-closed.length)+' เที่ยว':''),generatedAt:options.generatedAt||new Date().toISOString()};
}
export const number=(value:number|null,digits=0)=>value===null?'—':value.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
// One-page A4 landscape PDF containing a high-resolution JPEG of the report.
// Rendering to canvas keeps Thai shaping consistent without a PDF text-shaping dependency.
export function jpegPdf(bytes:Uint8Array,width:number,height:number):Uint8Array{
 if(bytes[0]!==255||bytes[1]!==216||width<=0||height<=0)throw Error('ภาพรายงาน PDF ไม่ถูกต้อง');
 const enc=new TextEncoder(),parts:Uint8Array[]=[],offsets=[0];let size=0;
 const add=(b:Uint8Array|string)=>{const v=typeof b==='string'?enc.encode(b):b;parts.push(v);size+=v.length;};
 const object=(id:number,text:string)=>{offsets[id]=size;add(`${id} 0 obj\n${text}\nendobj\n`);};
 add('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
 offsets[4]=size;add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);add(bytes);add('\nendstream\nendobj\n');
 const content='q\n841.89 0 0 595.28 0 0 cm\n/Im0 Do\nQ\n';object(5,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);
 const xref=size;add('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
 const out=new Uint8Array(size);let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;
}
export const REPORT_WIDTH=1684,REPORT_HEIGHT=1191;
export function paintReport(ctx:CanvasRenderingContext2D,m:ReportModel,fuel:FuelPrice|null,placeholder='ยังไม่มีราคาอ้างอิง'){
 const W=REPORT_WIDTH,H=REPORT_HEIGHT,navy='#173d63',blue='#307db9',green='#2d915c',muted='#566c86';
 ctx.fillStyle='#f5f8fc';ctx.fillRect(0,0,W,H);
 const text=(s:string,x:number,y:number,size=20,color=navy,bold=false,align:CanvasTextAlign='left')=>{ctx.font=`${bold?'700':'400'} ${size}px FleetReport`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);};
 const box=(x:number,y:number,w:number,h:number,r:number,fill:string,stroke:string)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();};
 const fit=(s:string,maxWidth:number,size=22)=>{ctx.font=`400 ${size}px FleetReport`;if(ctx.measureText(s).width<=maxWidth)return s;let out=s;while(out&&ctx.measureText(out+'…').width>maxWidth)out=out.slice(0,-1);return out+'…';};
 ctx.fillStyle=navy;ctx.fillRect(0,0,W,180);text('สรุปการใช้รถประจำเดือน '+m.monthLabel,70,83,37,'#ffffff',true);text('ทะเบียน '+m.plate+' '+m.province,70,133,21,'#ffffff');text(IS_DEMO?'DEMO — ข้อมูลทดสอบ':'SMART MACHINE & SOFTWARE',W-70,132,16,'#dce9f6',false,'right');
 text('ภาพรวมการใช้งาน',72,251,24,navy,true);text(fit(m.scope,900,19),W-72,251,19,muted,false,'right');
 const cards=[['จำนวนครั้งที่ใช้รถ',number(m.count),'เที่ยว'],['ระยะทางรวม',number(m.total),'กม.'],['ระยะทางเฉลี่ย',number(m.average,1),'กม./เที่ยว'],['ระยะทางสูงสุด',number(m.maximum),'กม.']];
 cards.forEach(([label,value,unit],i)=>{const x=72+i*394;box(x,282,364,179,12,'#ffffff','#d5e1ee');text(value,x+25,354,46,i===3?green:blue,true);text(unit,x+336,353,18,muted,false,'right');text(label,x+25,423,19,navy);});
 box(72,514,814,410,42,'#ffffff','#d5e1ee');box(923,514,689,410,42,'#e9f2f9','#c7dff1');
 text('เลขไมล์และการเดินทาง',110,579,24,navy,true);
 const entries=[['เลขไมล์ต้น',number(m.odoStart)+' กม.'],['เลขไมล์ปลายเที่ยวที่คืนแล้ว',number(m.odoEnd)+' กม.']];
 entries.forEach(([label,value],i)=>{const y=655+i*87;text(label,110,y,19,muted);text(value,845,y,25,navy,true,'right');ctx.beginPath();ctx.moveTo(110,y+30);ctx.lineTo(845,y+30);ctx.strokeStyle='#d8e3ef';ctx.stroke();});
 text('เที่ยวไกลที่สุด',110,827,19,muted);text(fit(m.longest,500,24),845,827,24,navy,true,'right');text(fit(m.longestDestination,700,17),845,870,17,muted,false,'right');
 text('ราคาน้ำมันดีเซลเฉลี่ย',969,579,24,navy,true);
 text(fuel?number(fuel.value,2):'—',969,685,66,green,true);text('บาท / ลิตร',1547,681,22,navy,true,'right');text(m.monthLabel,969,742,21,muted);
 text(fuel?(fuel.method==='official'?'อ้างอิงข้อมูลรายเดือนจาก สนพ.':'ราคาอ้างอิงที่ผู้ดูแลระบุ'):'ไม่แสดงราคาแทนเดือนอื่น',969,792,19,navy);
 text(fit(dieselText(fuel?.source||placeholder),595,17),969,838,17,muted);text('ใช้อ้างอิงเท่านั้น ไม่ใช่ยอดค่าน้ำมันที่จ่ายจริง',969,881,17,muted);
 text(fit(m.note,1540,18),72,980,18,muted);text('เลขไมล์ต้น–ปลายไม่ใช่ระยะทางรวม หากมีช่วงขาดหรือการแก้เลขไมล์',72,1013,17,muted);
 const source=fuel?('แหล่งราคา: '+dieselText(fuel.source)+(fuel.sourceUrl?' · '+fuel.sourceUrl:'')):'แหล่งราคา: ยังไม่มีข้อมูลยืนยันสำหรับเดือนนี้';text(fit(source,1540,16),72,1059,16,muted);
 text('ข้อมูลการเดินทาง: บันทึกการใช้รถของบริษัท',72,1116,16,muted);text('จัดทำ '+new Date(m.generatedAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}),W-72,1116,16,muted,false,'right');
}
