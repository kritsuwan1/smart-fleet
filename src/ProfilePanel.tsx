import {useEffect,useRef,useState} from 'react';
import {UserRound,KeyRound,ShieldCheck,ChevronRight,LogOut,Info,ArrowLeft,Eye,EyeOff,CheckCircle2,AlertCircle} from 'lucide-react';
import type {User} from './auth';
import {APP_VERSION} from './version';
import {passwordFeedback,changeOwnPassword} from './profile-ui';

type PasswordFieldProps={name:string;label:string;value:string;onChange:(value:string)=>void;autoComplete:string;minLength?:number;hintId?:string};
export function PasswordField({name,label,value,onChange,autoComplete,minLength,hintId}:PasswordFieldProps){
 const [visible,setVisible]=useState(false);
 return <label className="field account-password-field" htmlFor={'account-'+name}><span>{label} <b>*</b></span><div className="account-password-input"><input id={'account-'+name} name={name} type={visible?'text':'password'} value={value} onChange={e=>onChange(e.target.value)} autoComplete={autoComplete} required minLength={minLength} maxLength={128} aria-describedby={hintId}/><button type="button" aria-label={(visible?'ซ่อน':'แสดง')+label} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={21}/>:<Eye size={21}/>}</button></div></label>;
}

export function PasswordForm({onBack}:{onBack:()=>void}){
 const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const sending=useRef(false),errorRef=useRef<HTMLDivElement>(null),backRef=useRef<HTMLButtonElement>(null);
 const feedback=passwordFeedback(password,confirm);
 useEffect(()=>{backRef.current?.focus();},[]);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);setError('');
  const result=await changeOwnPassword(current,password,confirm);
  if(result.ok){setCurrent('');setPassword('');setConfirm('');window.location.replace('/password-changed');return;}
  if(result.status===401){window.location.assign('/login');return;}
  setError(result.error||'เปลี่ยนรหัสผ่านไม่ได้');sending.current=false;setBusy(false);
 }
 return <section className="account-password-view"><header className="account-password-header"><button type="button" aria-label="กลับหน้าบัญชี" ref={backRef} disabled={busy} onClick={onBack}><ArrowLeft size={24}/></button><h1>เปลี่ยนรหัสผ่าน</h1></header><form className="account-password-form" onSubmit={submit} aria-busy={busy}>
  <div className="account-password-intro"><span><KeyRound size={37}/></span><h2>ตั้งรหัสผ่านใหม่</h2><p>ใช้รหัสผ่านอย่างน้อย 6 ตัวอักษร</p></div>
  <fieldset disabled={busy}><PasswordField name="currentPassword" label="รหัสผ่านปัจจุบัน" value={current} onChange={setCurrent} autoComplete="current-password"/><PasswordField name="password" label="รหัสผ่านใหม่" value={password} onChange={setPassword} autoComplete="new-password" minLength={6} hintId={password?"new-password-feedback":undefined}/>{password&&<p id="new-password-feedback" className={'account-password-feedback '+(feedback.validLength?'valid':'invalid')} aria-live="polite">{feedback.validLength?<CheckCircle2 size={17}/>:<Info size={17}/>} {feedback.validLength?'ครบอย่างน้อย 6 ตัวอักษร':'ใช้รหัสผ่าน 6–128 ตัวอักษร'}</p>}<PasswordField name="confirm" label="ยืนยันรหัสผ่านใหม่" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={6} hintId={confirm?"confirm-password-feedback":undefined}/>{confirm&&<p id="confirm-password-feedback" className={'account-password-feedback '+(feedback.matches?'valid':'invalid')} aria-live="polite">{feedback.matches?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>} {feedback.matches?'รหัสผ่านตรงกัน':'รหัสผ่านยังไม่ตรงกัน'}</p>}</fieldset>
  <div className="account-password-notice"><ShieldCheck size={24}/><p>หลังเปลี่ยนรหัสผ่าน ต้องเข้าสู่ระบบอีกครั้ง</p></div>
  {error&&<div className="alert error account-password-error" ref={errorRef} tabIndex={-1} role="alert"><AlertCircle size={19}/>{error}</div>}
  <div className="account-password-actions"><button type="submit" className="primary" disabled={busy}>{busy?'กำลังบันทึก…':'บันทึกรหัสผ่านใหม่'}</button><button type="button" className="account-password-cancel" disabled={busy} onClick={onBack}>ยกเลิก</button></div>
 </form></section>;
}

export default function ProfilePanel({user}:{user:User}){
 const [editing,setEditing]=useState(false);
 const passwordButton=useRef<HTMLButtonElement>(null);
 function back(){setEditing(false);requestAnimationFrame(()=>passwordButton.current?.focus());}
 if(editing)return <PasswordForm onBack={back}/>;
 return <section className="account-overview"><div className="account-page-heading"><h1>บัญชีของฉัน</h1><p>ข้อมูลส่วนตัวและการเข้าสู่ระบบ</p></div><div className="account-layout"><div className="account-identity-card"><div className="account-person"><span className="account-person-avatar"><UserRound size={39}/></span><div><h2>{user.name}</h2><p>@{user.username}</p><span className="badge green">{user.role==='admin'?'ผู้ดูแลระบบ':'พนักงาน'}</span></div></div><dl><div><dt>ชื่อ–นามสกุล</dt><dd>{user.name}</dd></div><div><dt>ชื่อผู้ใช้</dt><dd>{user.username}</dd></div><div><dt>สิทธิ์การใช้งาน</dt><dd>{user.role==='admin'?'ผู้ดูแลระบบ':'พนักงาน'}</dd></div></dl><p className="account-contact">หากต้องการแก้ไขข้อมูล กรุณาติดต่อผู้ดูแล</p></div>
 <div className="account-actions"><h2>การเข้าสู่ระบบ</h2>{user.id==='admin'?<div className="account-root-note"><ShieldCheck size={25}/><div><strong>บัญชีผู้ดูแลหลัก</strong><p>เปลี่ยนรหัสผ่านได้ที่ Cloudflare Secret ชื่อ APP_PASSWORD แล้ว Deploy อีกครั้ง</p></div></div>:<button type="button" ref={passwordButton} className="account-action-row" onClick={()=>setEditing(true)}><span className="account-action-icon"><KeyRound size={25}/></span><span><strong>เปลี่ยนรหัสผ่าน</strong><small>ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ</small></span><ChevronRight size={21}/></button>}
 <details className="account-about"><summary><span className="account-action-icon"><Info size={25}/></span><span><strong>เกี่ยวกับ Smart Fleet</strong><small>บันทึกการใช้รถยนต์ของบริษัท</small></span><ChevronRight size={21}/></summary><div><p>Smart Machine & Software</p><p>Smart Fleet v{APP_VERSION}</p><p>สำหรับบันทึกการใช้รถและติดตามการเดินทางของบริษัท</p></div></details>
 <form action="/logout" method="post"><button type="submit" className="account-logout"><LogOut size={23}/>ออกจากระบบ</button></form></div></div></section>;
}
