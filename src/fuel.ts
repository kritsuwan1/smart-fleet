import type {Fleet} from './fleet';
import type {FuelPrice} from './report';
export const FUEL_SOURCE='สำนักงานนโยบายและแผนพลังงาน (สนพ.) — ราคาขายปลีกในกรุงเทพมหานคร';
export const FUEL_SOURCE_PAGE='https://catalog.eppo.go.th/dataset/dataset_11_58';
export const FUEL_CSV='https://catalog.eppo.go.th/dataset/33ee54ae-0967-46a5-945d-40cdb12cda4f/resource/079c3c22-d46d-4c05-965f-17d44b922e53/download/dataset_11_58.csv';
export function validMonth(s:string){return /^(20\d\d)-(0[1-9]|1[0-2])$/.test(s);}
export function parseCsv(text:string){
 if(text.length>3000000)throw Error('ข้อมูลแหล่งราคามีขนาดเกินกำหนด');
 const rows:string[][]=[];let row:string[]=[],cell='',quote=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else if(!quote&&cell==='')quote=true;else if(quote)quote=false;else throw Error('รูปแบบ CSV ไม่ถูกต้อง');}
  else if(!quote&&(c===','||c==='\n'||c==='\r')){row.push(cell);cell='';if(c!==','){if(row.some(v=>v.trim()))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}}
  else cell+=c;
  if(rows.length>100000||row.length>30)throw Error('ข้อมูลแหล่งราคามีขนาดเกินกำหนด');
 }
 if(quote)throw Error('ข้อมูล CSV ไม่ครบ');if(cell||row.length){row.push(cell);if(row.some(v=>v.trim()))rows.push(row);}return rows;
}
const norm=(s:string)=>s.toLowerCase().replace(/[\s()./_-]/g,'');
export function extractMonthlyB7(csv:string,month:string,now=new Date()):FuelPrice|null{
 if(!validMonth(month))throw Error('เดือนไม่ถูกต้อง');
 const rows=parseCsv(csv.replace(/^\uFEFF/,''));if(rows.length<2)throw Error('แหล่งราคาไม่มีข้อมูล');
 const headers=rows.shift()!.map(v=>v.trim().toLowerCase());
 const cols=['year','month','product','value','unit','price'].map(v=>headers.indexOf(v));if(cols.some(v=>v<0))throw Error('แหล่งราคาเปลี่ยนรูปแบบ กรุณาระบุราคาอ้างอิงเอง');
 const [yi,mi,pi,vi,ui,pricei]=cols;
 const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
 const thai=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
 const shortThai=['มค','กพ','มีค','เมย','พค','มิย','กค','สค','กย','ตค','พย','ธค'];
 const values:number[]=[];
 for(const r of rows){
  let year=Number(r[yi]);if(year>2400)year-=543;
  const ms=norm(r[mi]||''),m=/^\d{1,2}$/.test(ms)?Number(ms):months.findIndex((v,i)=>v===ms||v.slice(0,3)===ms||thai[i]===ms||shortThai[i]===ms)+1;
  if(year!==Number(month.slice(0,4))||m!==Number(month.slice(5)))continue;
  const priceType=norm(r[pricei]||'');if(!priceType.includes('average')&&!priceType.includes('เฉลี่ย'))continue;
  const product=norm(r[pi]||'');if(!['highspeeddieselb7','dieselb7','hsdb7','ดีเซลb7','ดีเซลหมุนเร็วb7','น้ำมันดีเซลหมุนเร็วb7'].includes(product))continue;
  const unit=norm(r[ui]||'');if(!['bahtlitre','bahtliter','bahtl','บาทลิตร'].includes(unit))throw Error('หน่วยราคาน้ำมันไม่ตรงบาทต่อลิตร');
  const raw=(r[vi]||'').trim();if(!/^\d+(\.\d+)?$/.test(raw))throw Error('ราคาจากแหล่งข้อมูลไม่ถูกต้อง');const value=Number(raw);if(value<=0||value>200)throw Error('ราคาจากแหล่งข้อมูลอยู่นอกช่วงที่รับได้');values.push(value);
 }
 const unique=[...new Set(values)];if(unique.length>1)throw Error('พบราคาดีเซลหลายค่าของเดือนเดียวกัน ยังยืนยันค่าเฉลี่ยไม่ได้ กรุณาระบุราคาอ้างอิงเอง');
 if(!unique.length)return null;
 return {month,product:'b7',value:unique[0],source:FUEL_SOURCE,sourceUrl:FUEL_SOURCE_PAGE,method:'official',retrievedAt:now.toISOString()};
}
export function manualFuel(input:any,actor:string):FuelPrice{
 const month=String(input.month||''),value=Number(input.value),source=String(input.source||'').trim(),sourceUrl=String(input.sourceUrl||'').trim();
 if(!validMonth(month)||!Number.isFinite(value)||value<=0||value>200||input.value===''||Math.abs(value*10000-Math.round(value*10000))>0.00001)throw Error('กรุณาตรวจเดือนและราคา 0–200 บาท/ลิตร (มากกว่า 0 ทศนิยมไม่เกิน 4 ตำแหน่ง)');
 if(source.length<3||source.length>200)throw Error('กรุณาระบุแหล่งที่มาของราคา 3–200 ตัวอักษร');
 if(sourceUrl){let u:URL;try{u=new URL(sourceUrl);}catch{throw Error('ลิงก์แหล่งราคาต้องเป็น https://');}if(u.protocol!=='https:'||u.username||u.password||sourceUrl.length>500)throw Error('ลิงก์แหล่งราคาต้องเป็น https:// และไม่มีข้อมูลเข้าสู่ระบบ');}
 return {month,product:'b7',value,source,sourceUrl,method:'manual',retrievedAt:new Date().toISOString(),updatedBy:actor};
}
export async function fuelPrice(env:any,state:Fleet,month:string,fetcher:typeof fetch=fetch){
 if(!validMonth(month))throw Error('กรุณาเลือกเดือนในรูปแบบ YYYY-MM');
 const override=state.fuelPrices?.find(p=>p.month===month&&p.product==='b7');if(override)return {price:override,status:'manual',message:'ใช้ราคาอ้างอิงที่ผู้ดูแลบันทึก'};
 const current=new Date(Date.now()+7*3600000).toISOString().slice(0,7);
 if(month>=current)return {price:null,status:'pending',message:'เดือนนี้ยังไม่สิ้นสุดหรือยังมาไม่ถึง จึงยังไม่มีค่าเฉลี่ยเต็มเดือนที่ยืนยันได้'};
 const id='fuel:b7:'+month,row=await env.DB.prepare('SELECT payload FROM fleet_store WHERE id=?').bind(id).first();
 if(row){try{const cache=JSON.parse(row.payload);if(cache.expires>Date.now())return {...cache.result,cached:true};}catch{}}
 let result:any;
 try{
  const r=await fetcher(FUEL_CSV,{headers:{Accept:'text/csv'},signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error('แหล่งข้อมูลไม่พร้อม (HTTP '+r.status+')');
  if(Number(r.headers.get('Content-Length'))>3000000)throw Error('ข้อมูลแหล่งราคามีขนาดเกินกำหนด');
  const reader=r.body?.getReader();if(!reader)throw Error('แหล่งราคาไม่มีข้อมูล');let size=0;const parts:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3000000){await reader.cancel();throw Error('ข้อมูลแหล่งราคามีขนาดเกินกำหนด');}parts.push(value);}
  const raw=new Uint8Array(size);let offset=0;for(const part of parts){raw.set(part,offset);offset+=part.length;}
  const price=extractMonthlyB7(new TextDecoder('utf-8',{fatal:true}).decode(raw),month);
  result=price?{price,status:'official',message:'ข้อมูลรายเดือนตรงเดือนและดีเซล จาก สนพ.'}:{price:null,status:'missing',message:'ยังไม่พบข้อมูลที่ยืนยันว่าเป็นราคาเฉลี่ยดีเซล ของเดือนที่เลือกในชุดข้อมูล สนพ. ผู้ดูแลระบุราคาอ้างอิงเองได้'};
 }catch(error){result={price:null,status:'unavailable',message:'ดึงราคาอัตโนมัติไม่ได้ในขณะนี้ กรุณาลองภายหลัง หรือให้ผู้ดูแลระบุราคาอ้างอิงพร้อมแหล่งที่มา',detail:error instanceof Error?error.message:'แหล่งข้อมูลไม่พร้อม'};}
 await env.DB.prepare('INSERT INTO fleet_store(id,payload,version) VALUES (?,?,0) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=fleet_store.version+1').bind(id,JSON.stringify({expires:Date.now()+(result.price?86400000:600000),result})).run();
 return {...result,sourceUrl:FUEL_SOURCE_PAGE};
}
