// Shared value rules only. No state mutation or cross-trip/business-policy checks.
export const MAX_ODOMETER=99999999;
export const validOdometer=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=MAX_ODOMETER;
export const validTripDateTime=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)&&Number.isFinite(Date.parse(value+'+07:00'))&&new Date(Date.parse(value+'+07:00')+7*3600000).toISOString().slice(0,16)===value;

export function validateTripValues(t:{start:string;end:string;odoStart:number;odoEnd:number|null}){
 if(!validTripDateTime(t.start)||typeof t.end!=='string'||t.end&&!validTripDateTime(t.end))throw Error('วันเวลาไม่ถูกต้อง');
 if(t.end&&t.end<t.start)throw Error('วันเวลากลับต้องไม่ก่อนเวลาออกเดินทาง');
 if(!validOdometer(t.odoStart))throw Error('เลขไมล์ออกต้องเป็นจำนวนเต็มตั้งแต่ 0');
 if(t.end&&(!validOdometer(t.odoEnd)||t.odoEnd<t.odoStart))throw Error('เลขไมล์กลับต้องไม่น้อยกว่าเลขไมล์ออก');
 if(!t.end&&t.odoEnd!==null)throw Error('กรุณากรอกวันเวลากลับ');
}
