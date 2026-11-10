import {ACCOUNT_LIMIT} from './limits';
import {systemStatus} from './system-status';
import {maintenanceStatus} from './maintenance';
import {readState,writeState} from './storage';
import {type Fleet,type Account,latestOdo} from './fleet';
import {assertOperationalAccounts,accountRole,accountEnabled,isSelfAccount} from './account-compatibility';
export type User={id:string;username:string;name:string;role:'admin'|'employee'|'user';driverId:string;passwordVersion:number};
const encode=new TextEncoder();export const COOKIE='__Host-smartfleet';export const MAX_AGE=8*3600;
export const hex=(v:ArrayBuffer)=>Array.from(new Uint8Array(v),n=>n.toString(16).padStart(2,'0')).join('');
async function key(secret:string){return crypto.subtle.importKey('raw',encode.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function sign(secret:string,text:string){return hex(await crypto.subtle.sign('HMAC',await key(secret),encode.encode(text)));}
export async function digest(text:string){return hex(await crypto.subtle.digest('SHA-256',encode.encode(text)));}
async function signingKey(env:any,state:Fleet){return state.sessionKey+':'+await digest(env.APP_PASSWORD);}
export async function hashPassword(password:string,salt:string){const key=await crypto.subtle.importKey('raw',encode.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encode.encode(salt),iterations:100000},key,256));}
export function passwordValid(p:string){return typeof p==='string'&&p.length>=6&&p.length<=128;}
const constantEqual=(a:string,b:string)=>{if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0;};
export async function verifyPassword(p:string,account:Account){return constantEqual(await hashPassword(p,account.salt),account.passwordHash);}
export const cleanName=(s:string)=>s.trim().replace(/\s+/g,' ');
const userFromAccount=(a:Account):User=>({id:a.id,username:a.username,name:a.name,role:accountRole(a),driverId:a.driverId??'',passwordVersion:a.passwordVersion});
export async function checkLogin(env:any,username:string,password:string,state:Fleet):Promise<User|null>{
 assertOperationalAccounts(state);
 username=(username||'admin').trim().toLowerCase();
 if(username==='admin')return constantEqual(await digest(password),await digest(env.APP_PASSWORD))?{id:'admin',username:'admin',name:'ผู้ดูแลระบบ',role:'admin',driverId:'',passwordVersion:0}:null;
 const account=state.accounts?.find(a=>a.username===username);
 if(!account){await hashPassword(password,'smart-fleet-unknown-user');return null;}
 if(!accountEnabled(account))return null;
 return await verifyPassword(password,account)?userFromAccount(account):null;
}
export async function issueSession(env:any,state:Fleet,user:User){
 user=currentUser(user,state);
 const value={uid:user.id,ver:user.passwordVersion,exp:Math.floor(Date.now()/1000)+MAX_AGE,nonce:crypto.randomUUID(),...(user.role==='user'?{link:await digest('person:'+user.driverId)}:{})};
 const body=btoa(JSON.stringify(value)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 return `${COOKIE}=${body}.${await sign(await signingKey(env,state),body)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`;
}
export const clearSession=()=>`${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
export async function sessionUser(req:Request,env:any,state:Fleet):Promise<User|null>{
 try{
  assertOperationalAccounts(state);
  const cookie=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
  const [body,sig,...extra]=cookie.split('.');if(extra.length||!body||body.length>500||!/^[A-Za-z0-9_-]+$/.test(body)||!/^[a-f\d]{64}$/.test(sig||''))return null;
  const bytes=Uint8Array.from(sig.match(/../g)!,v=>parseInt(v,16));if(!await crypto.subtle.verify('HMAC',await key(await signingKey(env,state)),bytes,encode.encode(body)))return null;
  const claims=JSON.parse(atob(body.replaceAll('-','+').replaceAll('_','/'))),now=Math.floor(Date.now()/1000);
  if(!Number.isInteger(claims.exp)||claims.exp<=now||claims.exp>now+MAX_AGE+30||!Number.isInteger(claims.ver)||typeof claims.uid!=='string')return null;
  if(claims.uid==='admin')return {id:'admin',username:'admin',name:'ผู้ดูแลระบบ',role:'admin',driverId:'',passwordVersion:0};
  const account=state.accounts?.find(a=>a.id===claims.uid&&accountEnabled(a)&&a.passwordVersion===claims.ver);if(!account)return null;
  const user=userFromAccount(account);if(user.role==='user'&&(claims.link!==undefined||user.driverId)&&claims.link!==await digest('person:'+user.driverId))return null;return user;
 }catch{return null;}
}
export function currentUser(user:User,state:Fleet){
 assertOperationalAccounts(state);
 if(user.id==='admin'&&user.role==='admin')return user;
 const account=state.accounts?.find(a=>a.id===user.id&&accountEnabled(a)&&a.passwordVersion===user.passwordVersion);if(!account)throw Error('UNAUTHORIZED');const current=userFromAccount(account);if(current.role==='user'&&current.driverId!==user.driverId)throw Error('UNAUTHORIZED');return current;
}
export function viewForUser(state:Fleet,version:number,user:User,payloadBytes?:number){
 user=currentUser(user,state);
 if(user.role==='user'){
  if(!user.driverId)return {scope:'self-account' as const,user,actor:user.name,personLinked:false};
  const trips=structuredClone(state.trips.filter(t=>t.ownerUserId===user.id));
  const cars=state.cars.filter(c=>c.active||trips.some(t=>t.carId===c.id)).map(c=>({id:c.id,plate:c.plate,province:c.province,model:c.model,initialOdo:c.initialOdo,active:c.active,fuelType:c.fuelType,imagePreset:c.imagePreset,currentOdo:latestOdo(state,c.id)}));
  const own:Fleet={cars,people:structuredClone(state.people.filter(p=>p.id===user.driverId)),projects:[...new Set(trips.map(t=>t.project))],trips,audit:[],imported:false};
  const basicReminders=(state.maintenancePlans||[]).filter(p=>p.active&&cars.some(c=>c.id===p.carId&&c.active)).map(p=>({id:p.id,carId:p.carId,type:p.type,status:maintenanceStatus(state,p),dueDate:p.dueDate,dueOdo:p.dueOdo}));
  return {scope:'verified-user' as const,user,actor:user.name,personLinked:true,state:own,version,members:[],occupiedCars:state.trips.filter(t=>!t.end&&t.ownerUserId!==user.id).map(t=>t.carId),basicReminders};
 }
 const view=structuredClone(state);delete view.accounts;delete view.sessionKey;
 const members=user.role==='admin'?(state.accounts||[]).map(a=>({id:a.id,username:a.username,name:a.name,active:accountEnabled(a),createdAt:a.createdAt,driverId:a.driverId,role:accountRole(a)})):[];
 const occupiedCars=state.trips.filter(t=>!t.end&&t.ownerUserId!==user.id).map(t=>t.carId);
 if(user.role!=='admin'){
  delete view.maintenanceHistory;
  if(view.maintenancePlans)view.maintenancePlans=view.maintenancePlans.filter(p=>p.active&&state.cars.some(c=>c.id===p.carId&&c.active));
  view.cars=view.cars.map(c=>({...c,currentOdo:latestOdo(state,c.id)}));
  view.trips=view.trips.filter(t=>t.ownerUserId===user.id);view.audit=[];view.people=view.people.filter(p=>p.id===user.driverId);
 }
 return {state:view,version,actor:user.name,user,members,occupiedCars,...(user.role==='admin'?{systemStatus:systemStatus(state,payloadBytes)}:{})};
}
export async function registerSelfUser(env:any,input:{name:string;username:string;password:string}){
 const name=cleanName(input.name||''),username=(input.username||'').trim().toLowerCase(),password=input.password||'';
 if(name.length<2||name.length>100)throw Error('กรุณากรอกชื่อ–นามสกุล 2–100 ตัวอักษร');
 if(!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)||['admin','administrator','root'].includes(username))throw Error('ชื่อผู้ใช้ต้องมี 3–30 ตัว ใช้ a-z ตัวเลข จุด ขีดกลาง หรือขีดล่าง และห้ามใช้ admin');
 if(!passwordValid(password))throw Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร และไม่เกิน 128 ตัวอักษร');
 const salt=hex(crypto.getRandomValues(new Uint8Array(16)).buffer),passwordHash=await hashPassword(password,salt),id=crypto.randomUUID();
 for(let retry=0;retry<3;retry++){
  const {state,version}=await readState(env);state.accounts||=[];
  if(state.accounts.length>=ACCOUNT_LIMIT)throw Error('จำนวนบัญชีเต็ม กรุณาติดต่อผู้ดูแล');
  if(state.accounts.some(a=>a.username===username))throw Error('ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น');
  if(state.accounts.some(a=>cleanName(a.name)===name))throw Error('ชื่อนี้มีบัญชีแล้ว หากลืมรหัสผ่านให้ติดต่อผู้ดูแล');
  const account:Account={id,username,name,driverId:null,active:false,role:'user',accountFormatVersion:3,accountKind:'self-user',status:'ACTIVE',salt,passwordHash,passwordVersion:0,createdAt:new Date().toISOString()};state.accounts.push(account);if(state.accountFormatVersion!==4)state.accountFormatVersion=3;
  state.audit.unshift({id:crypto.randomUUID(),time:new Date().toISOString(),actor:name,action:'สมัครบัญชี User',before:null,after:{id,username,name,role:'user',personLinked:false}});
  if(await writeState(env,state,version))return {state,user:userFromAccount(account)};
 }
 throw Error('มีการบันทึกพร้อมกัน กรุณากดสมัครอีกครั้ง');
}
export async function rateLimit(req:Request,env:any,state:Fleet,scope:string,max=10){
 const ip=req.headers.get('CF-Connecting-IP');if(!ip)throw Error('ไม่สามารถยืนยันการเชื่อมต่อ กรุณาเปิดผ่าน URL ของ Cloudflare');
 const bucket=Math.floor(Date.now()/900000),id='auth:'+await sign(state.sessionKey!,scope+':'+ip+':'+bucket);
 const row=await env.DB.prepare('INSERT INTO fleet_store(id,payload,version) VALUES (?,?,1) ON CONFLICT(id) DO UPDATE SET version=version+1 RETURNING version').bind(id,JSON.stringify({expires:(bucket+1)*900})).first();
 if(row.version>max)return false;
 if(row.version===1)await env.DB.prepare("DELETE FROM fleet_store WHERE id LIKE 'auth:%' AND CAST(json_extract(payload,'$.expires') AS INTEGER) < ?").bind(Math.floor(Date.now()/1000)-900).run();return true;
}
export function safeReturn(value:string){
 try{const url=new URL(value,'https://app.local');if(!value.startsWith('/')||value.startsWith('//')||url.origin!=='https://app.local'||!['/','/trips','/qr'].includes(url.pathname))return '/';return url.pathname+url.search;}catch{return '/';}
}
