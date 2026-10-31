export const REVIEW_AFTER_HOURS=24;
export function tripElapsed(start:string,clock=Date.now()){
 const time=Date.parse(start+'+07:00');
 if(!Number.isFinite(time)||time>clock)return {text:'ตรวจสอบเวลาเริ่มใช้รถ',review:true};
 const minutes=Math.floor((clock-time)/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
 return {text:minutes<1?'ไม่ถึง 1 นาที':`${days?days+' วัน ':''}${hours?hours+' ชั่วโมง ':''}${mins?mins+' นาที':''}`.trim(),review:minutes>=REVIEW_AFTER_HOURS*60};
}
