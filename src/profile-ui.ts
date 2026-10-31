export function passwordFeedback(password:string,confirm:string){
 return {validLength:password.length>=6&&password.length<=128,matches:confirm.length>0&&password===confirm};
}
export async function changeOwnPassword(currentPassword:string,password:string,confirm:string,request:typeof fetch=fetch):Promise<{ok:boolean;status:number;error?:string}>{
 const feedback=passwordFeedback(password,confirm);
 if(!currentPassword)return {ok:false,status:400,error:'กรุณากรอกรหัสผ่านปัจจุบัน'};
 if(!feedback.validLength)return {ok:false,status:400,error:'รหัสผ่านใหม่ต้องมี 6–128 ตัวอักษร'};
 if(!feedback.matches)return {ok:false,status:400,error:'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน'};
 try{
  const response=await request('/api/profile/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword,password})});
  let result:any;try{result=await response.json();}catch{return {ok:false,status:response.status,error:'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง'};}
  if(!response.ok)return {ok:false,status:response.status,error:typeof result.error==='string'?result.error:'เปลี่ยนรหัสผ่านไม่ได้ กรุณาลองอีกครั้ง'};
  if(result.success!==true)return {ok:false,status:response.status,error:'ยังยืนยันการบันทึกไม่ได้ กรุณาลองอีกครั้ง'};
  return {ok:true,status:response.status};
 }catch{return {ok:false,status:0,error:'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง'};}
}
