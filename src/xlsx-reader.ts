import type {ImportRow} from './import-plan';
export type ParsedSheet={name:string;rows:ImportRow[];plate:string;warnings:string[];errors:string[]};
const MAX_XML=10*1024*1024;
const norm=(s:string)=>s.replace(/[\s\u200b\uFEFF()（）.]/g,'').trim();
const xml=(text:string)=>{if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('ไม่รองรับ XML ที่มี DTD');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('โครงสร้าง XML ในไฟล์ไม่สมบูรณ์');return doc;};
const elements=(root:Document|Element,tag:string)=>Array.from(root.getElementsByTagNameNS('*',tag));
const crc32=(bytes:Uint8Array)=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
export async function readZip(buffer:ArrayBuffer){
 const bytes=new Uint8Array(buffer),v=new DataView(buffer);let end=-1;
 for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(v.getUint32(p,true)===0x06054b50&&p+22+v.getUint16(p+20,true)===bytes.length){end=p;break;}
 if(end<0)throw Error('ไฟล์นี้ไม่ใช่ XLSX ที่สมบูรณ์ หรือไฟล์มีรหัสผ่าน');
 if(v.getUint16(end+4,true)||v.getUint16(end+6,true))throw Error('ไม่รองรับไฟล์ ZIP แบบหลายส่วน');
 const count=v.getUint16(end+10,true),size=v.getUint32(end+12,true),offset=v.getUint32(end+16,true);if(count>2000||count===65535||offset+size>end)throw Error('ไฟล์มีโครงสร้างใหญ่เกินกำหนด');
 const entries=new Map<string,{at:number;length:number;size:number;method:number;crc:number}>();let cursor=offset,total=0;
 for(let i=0;i<count;i++){
  if(cursor+46>offset+size||v.getUint32(cursor,true)!==0x02014b50)throw Error('ZIP directory ไม่สมบูรณ์');
  const flags=v.getUint16(cursor+8,true),method=v.getUint16(cursor+10,true),len=v.getUint32(cursor+20,true),out=v.getUint32(cursor+24,true),nameLen=v.getUint16(cursor+28,true),extra=v.getUint16(cursor+30,true),comment=v.getUint16(cursor+32,true),at=v.getUint32(cursor+42,true);
  if(flags&1)throw Error('กรุณานำรหัสผ่านออกจาก Excel ก่อน');
  if(cursor+46+nameLen+extra+comment>offset+size)throw Error('ZIP directory ไม่สมบูรณ์');
  const name=new TextDecoder().decode(bytes.slice(cursor+46,cursor+46+nameLen));
  if(entries.has(name))throw Error('ไฟล์ ZIP มีชื่อไฟล์ซ้ำ');
  if(out>MAX_XML)throw Error('ข้อมูลภายในไฟล์ใหญ่เกินกำหนด');total+=out;if(total>30*1024*1024)throw Error('ไฟล์เมื่อคลายแล้วใหญ่เกิน 30 MB');
  entries.set(name,{at,length:len,size:out,method,crc:v.getUint32(cursor+16,true)});cursor+=46+nameLen+extra+comment;
 }
 return async(name:string)=>{
  const e=entries.get(name);if(!e)return null;
  if(e.at+30>bytes.length||v.getUint32(e.at,true)!==0x04034b50)throw Error('ZIP file header ไม่สมบูรณ์');
  const start=e.at+30+v.getUint16(e.at+26,true)+v.getUint16(e.at+28,true);if(start+e.length>offset)throw Error('ZIP data ไม่สมบูรณ์');
  const compressed=bytes.slice(start,start+e.length);let output:Uint8Array;
  if(e.method===0)output=compressed;
  else if(e.method===8){
   if(typeof DecompressionStream==='undefined')throw Error('กรุณาเปิดผ่าน Chrome หรือ Edge รุ่นปัจจุบัน');
   const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   const reader=stream.getReader(),chunks:Uint8Array[]=[];let length=0;
   while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_XML||length>e.size){await reader.cancel();throw Error('ข้อมูลภายในไฟล์ใหญ่เกินกำหนด');}chunks.push(value);}
   output=new Uint8Array(length);let p=0;for(const chunk of chunks){output.set(chunk,p);p+=chunk.length;}
  }else throw Error('รูปแบบบีบอัด XLSX นี้ยังไม่รองรับ กรุณาบันทึกใหม่ด้วย Excel');
  if(output.length!==e.size||crc32(output)!==e.crc)throw Error('ไฟล์เสียหาย: '+name);
  return new TextDecoder().decode(output);
 };
}
export function excelDate(value:string|number,date1904=false){
 const s=String(value).trim();if(!s)throw Error('ไม่ได้ระบุวันที่');
 if(typeof value==='number'||/^\d{4,6}(\.\d+)?$/.test(s)){
  const n=Number(value);if(!Number.isFinite(n)||n<1)throw Error('วันที่ Excel ไม่ถูกต้อง');
  return new Date(Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:30)+Math.floor(n)*86400000).toISOString().slice(0,10);
 }
 const iso=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/),thai=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
 if(!iso&&!thai)throw Error('วันที่ต้องเป็น วัน/เดือน/ปี หรือ YYYY-MM-DD');
 let y=Number(iso?iso[1]:thai![3]),m=Number(iso?iso[2]:thai![2]),d=Number(iso?iso[3]:thai![1]);
 if(y<100)y+=2500;if(y>=2400)y-=543;
 if(y<1900||y>2200||m<1||m>12||d<1||d>31)throw Error('วันที่อยู่นอกช่วงที่รองรับ');
 const date=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;if(new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('วันที่ไม่มีอยู่จริง');return date;
}
export function excelTime(value:string|number){
 if(value===''||value==null)throw Error('ไม่ได้ระบุเวลา');
 if(typeof value==='number'||/^0?\.\d+$/.test(String(value))){const n=Number(value);if(n<0||n>=1)throw Error('เวลา Excel ไม่ถูกต้อง');const min=Math.round(n*1440);if(min>=1440)throw Error('เวลาเกินหนึ่งวัน');return String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0');}
 const m=String(value).trim().match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?(?:\s*น\.?)?$/);if(!m||Number(m[1])>23||Number(m[2])>59)throw Error('เวลาต้องเป็น HH:mm');return m[1].padStart(2,'0')+':'+m[2];
}
const headers={seq:['ลำดับที่','ลำดับ'],startDate:['วันที่ออกเดินทาง'],startTime:['เวลาออกเดินทาง'],project:['งาน/โครงการ','งานโครงการ'],destination:['สถานที่ไป'],odoStart:['ไมล์เมื่อออกเดินทาง','เลขไมล์ออก','เลขไมล์ออกเดินทาง'],endDate:['วันที่กลับถึงวันที่','วันที่กลับถึง','วันที่กลับ'],endTime:['เวลากลับถึงสำนักงาน','เวลากลับ'],odoEnd:['ไมล์เมื่อรถกลับสำนักงาน','เลขไมล์กลับ'],driverName:['พนักงานขับรถ','ผู้ขับรถ'],note:['หมายเหตุ'],distance:['ระยะทางรวมไป-กลับกม','ระยะทางรวมไปกลับกม','ระยะทางกม'],plate:['ทะเบียนรถ','ทะเบียน']};
export function parseSheet(sheet:Document,strings:string[],name:string,date1904:boolean):ParsedSheet{
 const matrix=elements(sheet,'row').map(row=>({n:Number(row.getAttribute('r')),cells:new Map(elements(row,'c').map(cell=>{
  const ref=cell.getAttribute('r')||'',column=ref.replace(/\d/g,''),type=cell.getAttribute('t');const raw=elements(cell,'v')[0]?.textContent||'';
  let value:string|number=raw;
  if(type==='s'){const i=Number(raw);if(!Number.isInteger(i)||strings[i]===undefined)throw Error('shared string ไม่ถูกต้อง');value=strings[i];}
  else if(type==='inlineStr')value=elements(cell,'t').map(t=>t.textContent||'').join('');
  else if(raw&&(!type||type==='n'))value=Number(raw);
  else if(type==='e')value='[Excel Error]';
  return [column,value] as [string,string|number];
 }))}));
 const result:ParsedSheet={name,rows:[],plate:'',warnings:[],errors:[]};
 const headerIndex=matrix.findIndex(row=>[...row.cells.values()].some(v=>norm(String(v))===norm('วันที่ออกเดินทาง')));
 if(headerIndex<0)throw Error('ไม่พบหัวตาราง วันที่ออกเดินทาง ในชีต '+name);
 const columns:Record<string,string>={};
 for(const [field,aliases] of Object.entries(headers))for(const [col,value] of matrix[headerIndex].cells)if(aliases.some(a=>norm(a)===norm(String(value)))){columns[field]=col;break;}
 for(const field of ['seq','startDate','startTime','project','destination','odoStart','endDate','endTime','odoEnd','driverName'])if(!columns[field])result.errors.push('ไม่พบคอลัมน์ '+(headers as any)[field][0]);
 if(result.errors.length)return result;
 for(const r of matrix.slice(0,headerIndex))for(const value of r.cells.values()){const match=String(value).match(/ทะเบียน\s+([^\s]+)/);if(match)result.plate=match[1];}
 const get=(r:any,k:string)=>r.cells.get(columns[k])??'';
 const number=(value:any,label:string)=>{if(value==='')throw Error('ไม่ได้ระบุ'+label);const n=typeof value==='number'?value:Number(String(value).replace(/,/g,'').trim());if(!Number.isInteger(n)||n<0)throw Error(label+'ต้องเป็นจำนวนเต็มตั้งแต่ 0');return n;};
 for(const r of matrix.slice(headerIndex+1)){
  if(!['seq','startDate','project','odoStart'].some(k=>get(r,k)!==''))continue;
  if(result.rows.length>=1000){result.errors.push('นำเข้าได้สูงสุด 1,000 รายการต่อครั้ง');break;}
  try{
   const seq=number(get(r,'seq'),'ลำดับที่'),odoStart=number(get(r,'odoStart'),'เลขไมล์ออก'),endDate=get(r,'endDate'),endTime=get(r,'endTime'),odoEndValue=get(r,'odoEnd');
   const hasEnd=[endDate,endTime,odoEndValue].some(x=>x!=='');if(hasEnd&&[endDate,endTime,odoEndValue].some(x=>x===''))throw Error('ข้อมูลคืนรถไม่ครบ ต้องมีวันที่ เวลา และเลขไมล์กลับ');
   const row:ImportRow={row:r.n,seq,project:String(get(r,'project')).trim(),destination:String(get(r,'destination')).trim(),start:excelDate(get(r,'startDate'),date1904)+'T'+excelTime(get(r,'startTime')),end:hasEnd?excelDate(endDate,date1904)+'T'+excelTime(endTime):'',odoStart,odoEnd:hasEnd?number(odoEndValue,'เลขไมล์กลับ'):null,driverName:String(get(r,'driverName')).trim(),note:String(get(r,'note')).trim(),plate:String(get(r,'plate')||result.plate).trim()};
   if(row.end&&get(r,'distance')!==''&&Number(get(r,'distance'))!==row.odoEnd!-odoStart)result.warnings.push('แถว '+r.n+': ระยะทางใน Excel ต่างจากเลขไมล์ ระบบจะใช้ '+(row.odoEnd!-odoStart)+' กม. ที่คำนวณใหม่');
   result.rows.push(row);
  }catch(e){result.errors.push('แถว '+r.n+': '+(e instanceof Error?e.message:'อ่านข้อมูลไม่ได้'));}
 }
 if(!result.rows.length&&!result.errors.length)result.errors.push('ไม่พบรายการเดินทางในชีตนี้');return result;
}
export async function readWorkbook(file:File):Promise<ParsedSheet[]>{
 if(!/\.xlsx$/i.test(file.name))throw Error('รองรับไฟล์ .xlsx กรุณาบันทึกใหม่เป็น Excel Workbook');
 if(file.size>5*1024*1024)throw Error('ขนาดไฟล์ต้องไม่เกิน 5 MB');
 const read=await readZip(await file.arrayBuffer()),workbookText=await read('xl/workbook.xml'),relsText=await read('xl/_rels/workbook.xml.rels');
 if(!workbookText||!relsText)throw Error('ไม่พบโครงสร้าง Excel Workbook');
 const workbook=xml(workbookText),rels=xml(relsText),str=await read('xl/sharedStrings.xml');
 const strings=str?elements(xml(str),'si').map(si=>elements(si,'t').map(t=>t.textContent||'').join('')):[];
 const date1904=['1','true'].includes(elements(workbook,'workbookPr')[0]?.getAttribute('date1904')||'');
 const out:ParsedSheet[]=[];const sheets=elements(workbook,'sheet');if(sheets.length>20)throw Error('รองรับไม่เกิน 20 ชีตต่อไฟล์');
 for(const sheet of sheets){
  const id=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'),name=sheet.getAttribute('name')||'Sheet';
  const relation=elements(rels,'Relationship').find(r=>r.getAttribute('Id')===id);if(!relation||relation.getAttribute('TargetMode')==='External')continue;
  const target=relation.getAttribute('Target')||'',path=target.startsWith('/')?target.slice(1):'xl/'+target;
  if(path.includes('..'))throw Error('ไม่รองรับเส้นทางไฟล์ภายใน Workbook นี้');
  const text=await read(path);if(!text)continue;
  try{out.push(parseSheet(xml(text),strings,name,date1904));}catch(e){out.push({name,rows:[],plate:'',warnings:[],errors:[e instanceof Error?e.message:'อ่านชีตไม่ได้']});}
 }
 if(!out.length)throw Error('ไม่พบชีตข้อมูลที่อ่านได้');return out;
}
