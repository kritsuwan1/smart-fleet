import {validateTrip,type Fleet,type Trip} from './fleet';
import {readState,writeState,writeTripOperation} from './storage';
import {tripOperationContext,readTripOperation,authorizeOperation,OperationError,type OperationRecord} from './trip-operation';
import {tripReceiptFromResponse} from './trip-receipt';
import {currentUser,viewForUser,passwordValid,hashPassword,type User,hex,cleanName,clearSession} from './auth';
import {importedTrips} from './seed';
import {manualFuel,validMonth} from './fuel';
import {planImport} from './import-plan';
import {changeMaintenance} from './maintenance';
import {validOdometer} from './validation';
import {AccountCompatibilityError} from './account-compatibility';
export function fleetApi(env:any,user:User){
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
async function GET(){try{const {state,version,payloadBytes}=await readState(env);return json(viewForUser(state,version,user,payloadBytes));}catch(e){return fail(e);}}
function fail(e:unknown){if(e instanceof AccountCompatibilityError)return json({error:e.message,code:e.message},503);if(e instanceof OperationError)return json({error:e.message,code:e.code},e.status);const m=e instanceof Error?e.message:'เกิดข้อผิดพลาด';return json({error:m},m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:400);}
async function POST(req:Request){try{
 if(req.headers.get('origin')&&new URL(req.headers.get('origin')!).host!==new URL(req.url).host)return json({error:'คำขอไม่ถูกต้อง'},403);
 const raw=await req.text();if(raw.length>1000000)throw Error('ข้อมูลมีขนาดใหญ่เกินกำหนด');
 const b=JSON.parse(raw);
 const scopedEnv=b.action==='trip'&&b.tripOperation!==undefined&&typeof env.DB?.withSession==='function'?{...env,DB:env.DB.withSession('first-primary')}:env;
 const {state:s,version}=await readState(scopedEnv);
 const actorUser=currentUser(user,s),actor=actorUser.name;
 if(actorUser.role!=='admin'&&b.action!=='trip')return json({error:'FORBIDDEN'},403);
 const operation=b.action==='trip'&&b.tripOperation!==undefined?await tripOperationContext(b.tripOperation,b.data,actorUser,s):null;
 function result(record:OperationRecord,state:Fleet,currentVersion:number,replayed:boolean){
  const current=currentUser(user,state);authorizeOperation(record,operation!,state,current);
  return json({...viewForUser(state,currentVersion,current),tripResult:record.tripResult,tripReceipt:record.receipt,tripOperation:{id:record.id,kind:record.kind,version:record.version,replayed}});
 }
 async function replay(record:OperationRecord){
  const latest=await readState(scopedEnv);
  if(latest.state.sessionKey!==s.sessionKey)throw new OperationError('ข้อมูลถูกกู้คืนหรือเปลี่ยนรุ่น กรุณารีเฟรช',409,'OPERATION_STATE_CHANGED');
  return result(record,latest.state,latest.version,true);
 }
 if(operation){const record=await readTripOperation(scopedEnv,operation.key);if(record)return await replay(record);}
 if(b.version!==version)return json({error:'ข้อมูลเปลี่ยนแปลงจากหน้าต่างอื่นแล้ว กรุณารีเฟรชและลองใหม่'},409);
 let before:unknown=null,after:unknown=null,action='';
 let importResult:unknown=undefined;
 let tripResult:{id:string;operation:'start'|'return'|'edit'|'historical'}|undefined;
 if(b.action==='trip'){
  const old=s.trips.find(t=>t.id===b.data.id);before=old||null;
  if(operation?.operation.kind==='return'&&(!old||old.end))throw new OperationError('รายการนี้ไม่อยู่ในสถานะรอคืนรถ',409,'OPERATION_STATE_CHANGED');
  const d=b.data;
  if(actorUser.role!=='admin'){
   if(old&&(old.ownerUserId!==actorUser.id||old.end))return json({error:'ไม่มีสิทธิ์แก้ไขรายการนี้'},403);
   if(!old&&d.end)return json({error:'กรุณาเริ่มใช้รถก่อน แล้วบันทึกคืนรถภายหลัง'},403);
   if(old&&(String(d.carId)!==old.carId||String(d.start)!==old.start||Number(d.odoStart)!==old.odoStart))return json({error:'ไม่สามารถเปลี่ยนข้อมูลออกเดินทางเดิมได้ กรุณาติดต่อผู้ดูแล'},403);
   d.driverId=actorUser.driverId;
  }
  const t:Trip={id:old?.id||crypto.randomUUID(),seq:old?.seq||Math.max(0,...s.trips.map(t=>t.seq))+1,carId:String(d.carId),driverId:String(d.driverId),project:String(d.project||'').trim(),destination:String(d.destination||'').trim(),start:String(d.start||''),end:String(d.end||''),odoStart:Number(d.odoStart),odoEnd:d.end?Number(d.odoEnd):null,note:String(d.note||''),reason:String(d.reason||''),ownerUserId:old?.ownerUserId||(actorUser.id!=='admin'?actorUser.id:undefined)};
  if(d.odoStart===''||t.end&&(d.odoEnd===''||d.odoEnd==null))throw Error('กรุณากรอกเลขไมล์');
  validateTrip(s,t);
  if(!old&&(!s.cars.find(c=>c.id===t.carId)?.active||!s.people.find(p=>p.id===t.driverId)?.active))throw Error('รถหรือพนักงานถูกปิดใช้งานแล้ว');
  s.trips=old?s.trips.map(x=>x.id===t.id?t:x):[...s.trips,t];after=t;action=old?'แก้ไขรายการ / คืนรถ':'เพิ่มรายการใช้รถ';
  tripResult={id:t.id,operation:old?(!old.end&&t.end?'return':'edit'):(t.end?'historical':'start')};
 }else if(b.action==='maintenance'){
  const change=changeMaintenance(s,b.data);before=change.before;after=change.after;action='บำรุงรักษารถยนต์';
 }else if(b.action==='fuelPrice'){
  if(!validMonth(String(b.data?.month||'')))throw Error('เดือนไม่ถูกต้อง');
  before=s.fuelPrices?.find(p=>p.month===b.data.month&&p.product==='b7')||null;
  if(b.data.operation==='save'){const price=manualFuel(b.data,actor);s.fuelPrices=[...(s.fuelPrices||[]).filter(p=>p.month!==price.month||p.product!=='b7'),price];after=price;action='บันทึกราคาอ้างอิงดีเซล';}
  else if(b.data.operation==='remove'){s.fuelPrices=(s.fuelPrices||[]).filter(p=>p.month!==b.data.month||p.product!=='b7');after=null;action='ยกเลิกราคาอ้างอิงดีเซล';}
  else throw Error('คำสั่งราคาอ้างอิงไม่ถูกต้อง');
 }else if(b.action==='account'){
  const member=s.accounts?.find(a=>a.id===b.data?.id);if(!member)throw Error('ไม่พบบัญชีพนักงาน');
  before={id:member.id,username:member.username,name:member.name,active:member.active,role:member.role||'employee'};
  if(b.data.operation==='edit'){
   const name=cleanName(String(b.data.name||'')),username=String(b.data.username||'').trim().toLowerCase(),role=b.data.role;
   if(name.length<2||name.length>100)throw Error('กรุณากรอกชื่อ–นามสกุล 2–100 ตัวอักษร');
   if(!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)||['admin','administrator','root'].includes(username))throw Error('ชื่อผู้ใช้ต้องมี 3–30 ตัว ใช้ a-z ตัวเลข จุด ขีดกลาง หรือขีดล่าง และห้ามใช้ admin');
   if(role!=='admin'&&role!=='employee')throw Error('สิทธิ์บัญชีไม่ถูกต้อง');
   if(member.id===actorUser.id&&role!=='admin')throw Error('ไม่สามารถลดสิทธิ์ของตนเอง ให้ผู้ดูแลคนอื่นหรือบัญชีหลัก admin ดำเนินการ');
   if(s.accounts!.some(a=>a.id!==member.id&&(a.username===username||cleanName(a.name)===name)))throw Error('ชื่อหรือชื่อผู้ใช้นี้มีบัญชีอื่นใช้แล้ว');
   if(s.people.some(p=>p.id!==member.driverId&&cleanName(p.name)===name))throw Error('มีชื่อพนักงานนี้อยู่แล้ว');
   const person=s.people.find(p=>p.id===member.driverId);if(!person)throw Error('ไม่พบข้อมูลพนักงานของบัญชีนี้');
   member.name=name;member.username=username;member.role=role;member.passwordVersion++;person.name=name;
   action='แก้ไขบัญชีและสิทธิ์';
  }else if(b.data.operation==='active'){
   if(member.id===actorUser.id&&!b.data.active)throw Error('ไม่สามารถปิดบัญชีของตนเองได้');
   if(typeof b.data.active!=='boolean')throw Error('สถานะบัญชีไม่ถูกต้อง');member.active=b.data.active;member.passwordVersion++;action=member.active?'เปิดบัญชีพนักงาน':'ปิดบัญชีพนักงาน';
  }else if(b.data.operation==='resetPassword'){
   const password=String(b.data.password||'');if(!passwordValid(password))throw Error('รหัสผ่านต้องมี 6–128 ตัวอักษร');
   member.salt=hex(crypto.getRandomValues(new Uint8Array(16)).buffer);member.passwordHash=await hashPassword(password,member.salt);member.passwordVersion++;action='ตั้งรหัสผ่านใหม่ให้พนักงาน';
  }else throw Error('คำสั่งจัดการบัญชีไม่ถูกต้อง');
  after={id:member.id,username:member.username,name:member.name,active:member.active,role:member.role||'employee'};
 }else if(b.action==='car'){
  const d=b.data;const old=s.cars.find(c=>c.id===d.id);before=old||null;
  const car={id:old?.id||crypto.randomUUID(),plate:String(d.plate||'').trim(),province:String(d.province||'').trim(),model:String(d.model||'').trim(),initialOdo:Number(d.initialOdo),active:d.active!==false};
  const extra=d as Record<string,unknown>;
  const fuelType=String(extra.fuelType??old?.fuelType??'');const imagePreset=String(extra.imagePreset??old?.imagePreset??'');
  if(!['','ดีเซล','เบนซิน','ไฮบริด','ไฟฟ้า','อื่น ๆ'].includes(fuelType)||!['','none','revo'].includes(imagePreset))throw Error('ข้อมูลเชื้อเพลิงหรือภาพรถไม่ถูกต้อง');
  Object.assign(car,{...('fuelType' in extra||old?.fuelType!==undefined?{fuelType}:{}),...(imagePreset?{imagePreset}:{})});
  if(!car.plate||!car.province||car.plate.length>40||car.province.length>100||!validOdometer(car.initialOdo))throw Error('กรุณาตรวจสอบทะเบียน จังหวัด และเลขไมล์เริ่มต้น');
  if(s.cars.some(c=>c.id!==car.id&&c.plate.replace(/\s/g,'')===car.plate.replace(/\s/g,'')&&c.province===car.province))throw Error('มีทะเบียนรถนี้อยู่แล้ว');
  if(!car.active&&s.trips.some(t=>t.carId===car.id&&!t.end))throw Error('ต้องคืนรถก่อนปิดใช้งาน');
  s.cars=old?s.cars.map(c=>c.id===car.id?car:c):[...s.cars,car];after=car;action='จัดการรถยนต์';
 }else if(b.action==='person'){
  const d=b.data,old=s.people.find(p=>p.id===d.id);before=old||null;
  const person={id:old?.id||crypto.randomUUID(),name:String(d.name||'').trim(),active:d.active!==false};
  if(!person.name||person.name.length>150)throw Error('กรุณาระบุชื่อพนักงาน');
  if(s.people.some(p=>p.id!==person.id&&p.name===person.name))throw Error('มีชื่อพนักงานนี้อยู่แล้ว');
  const linked=s.accounts?.find(a=>a.driverId===person.id);
  if(linked){
   person.name=cleanName(person.name);
   if(person.name.length<2||person.name.length>100||s.accounts!.some(a=>a.id!==linked.id&&cleanName(a.name)===person.name)||s.people.some(p=>p.id!==person.id&&cleanName(p.name)===person.name))throw Error('ชื่อบัญชีต้องมี 2–100 ตัวอักษรและไม่ซ้ำ');
   linked.name=person.name;
  }
  s.people=old?s.people.map(p=>p.id===person.id?person:p):[...s.people,person];after=person;action='จัดการพนักงาน';
 }else if(b.action==='project'){
  const name=String(b.data.name||'').trim();if(!name||name.length>300)throw Error('กรุณาระบุชื่อโครงการ');
  if(s.projects.includes(name))throw Error('มีโครงการนี้อยู่แล้ว');s.projects.push(name);after=name;action='เพิ่มโครงการ';
 }else if(b.action==='importExcel'){
  const options=b.data?.options;
  if(!options||typeof options.carId!=='string'||typeof options.updateExisting!=='boolean'||typeof options.createPeople!=='boolean')throw Error('ตัวเลือกนำเข้าไม่ถูกต้อง');
  const plan=planImport(s,b.data.rows,options);
  if(plan.errors.length) return json({error:plan.errors.slice(0,8).join('\n'),importErrors:plan.errors},400);
  if(!plan.counts.new&&!plan.counts.updated)throw Error('ไม่มีรายการใหม่หรือรายการแก้ไขที่จะบันทึก');
  const fileName=String(b.data.fileName||'Excel').slice(0,255),sheetName=String(b.data.sheetName||'').slice(0,100);
  before={trips:plan.items.filter(i=>i.status==='updated').map(i=>i.old)};
  after={fileName,sheetName,counts:plan.counts,trips:plan.items.filter(i=>['new','updated'].includes(i.status)).map(i=>i.trip),newPeople:plan.newPeople};
  s.trips=plan.candidate.trips;s.people=plan.candidate.people;
  s.projects=[...new Set([...s.projects,...plan.items.filter(i=>['new','updated'].includes(i.status)).map(i=>i.trip!.project)])];
  importResult=plan.counts;action='นำเข้า Excel: '+fileName;
 }else if(b.action==='import'){
  if(s.imported)throw Error('นำเข้าไฟล์นี้แล้ว');
  for(const t of importedTrips){if(s.trips.some(x=>x.seq===t.seq))throw Error('ลำดับรายการซ้ำกับข้อมูลเดิม กรุณาตรวจสอบก่อนนำเข้า');s.trips.push(t);}
  for(const t of s.trips.filter(t=>t.carId==='car-1'))validateTrip(s,t);
  s.imported=true;after={count:importedTrips.length,source:'บันทึกการใช้รถ.xlsx'};action='นำเข้า Excel ต้นฉบับ';
 }else throw Error('ไม่รองรับคำสั่งนี้');
 s.audit.unshift({id:crypto.randomUUID(),time:new Date().toISOString(),actor,action,before,after});
 if(operation){
  const receipt=tripReceiptFromResponse({state:s,tripResult});
  if(!receipt||receipt.kind!==operation.operation.kind)throw new OperationError('ผลรายการไม่ตรงกับคำขอ',400,'OPERATION_INVALID');
  const record:OperationRecord={format:1,commitToken:crypto.randomUUID(),...operation.operation,actorId:actorUser.id,actorRole:actorUser.role,actorDriverId:actorUser.driverId,carId:receipt.trip.carId,fingerprint:operation.fingerprint,version:version+1,tripResult:{id:receipt.trip.id,operation:receipt.kind},receipt};
  try{if(await writeTripOperation(scopedEnv,s,version,operation.key,record))return result(record,s,version+1,false);}
  catch(error){
   if(error instanceof OperationError)throw error;
   // An acknowledgement can be lost after commit. Read only; never issue a second write here.
   try{const committed=await readTripOperation(scopedEnv,operation.key);if(committed)return await replay(committed);}catch(e){if(e instanceof OperationError||e instanceof Error&&['UNAUTHORIZED','FORBIDDEN'].includes(e.message))throw e;}
   throw new OperationError('ยังยืนยันผลการบันทึกไม่ได้ กรุณาลองรายการเดิมอีกครั้ง',503,'OPERATION_UNAVAILABLE');
  }
  const committed=await readTripOperation(scopedEnv,operation.key);
  if(committed)return await replay(committed);
  return json({error:'มีการบันทึกพร้อมกัน กรุณารีเฟรชแล้วลองใหม่'},409);
 }
 if(!await writeState(env,s,version))return json({error:'มีการบันทึกพร้อมกัน กรุณารีเฟรชแล้วลองใหม่'},409);
 if(b.action==='account'&&b.data.id===actorUser.id)return new Response(JSON.stringify({reauthenticate:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':clearSession()}});
 return json({...viewForUser(s,version+1,actorUser),importResult,tripResult});
 }catch(e){return fail(e);}}

return {GET,POST};
}
