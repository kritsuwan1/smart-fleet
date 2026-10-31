import type {Fleet} from './fleet';
import {MAIN_DATA_LIMIT_BYTES,ACCOUNT_LIMIT} from './limits';
import {APP_VERSION} from './version';
export type SystemStatus=ReturnType<typeof systemStatus>;
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
export function systemStatus(state:Fleet,payloadBytes=bytes(state)){
 const percent=payloadBytes/MAIN_DATA_LIMIT_BYTES*100;
 const level=percent>=100?'full':percent>=90?'critical':percent>=70?'warning':'normal';
 const labels={normal:'พื้นที่ยังเพียงพอ',warning:'เริ่มใกล้เต็ม ควรวางแผนขยาย',critical:'พื้นที่เหลือน้อย ควรขยายโดยเร็ว',full:'ถึงขีดจำกัดข้อมูลหลักแล้ว'};
 const categories=[['trips','รายการใช้รถ',state.trips],['audit','ประวัติการแก้ไข',state.audit],['accounts','บัญชีผู้ใช้งาน',state.accounts||[]],['cars','รถยนต์',state.cars],['people','พนักงานขับรถ',state.people],['projects','โครงการ',state.projects],['fuelPrices','ราคาอ้างอิงดีเซล',state.fuelPrices||[]]] as const;
 const breakdown=categories.map(([key,label,value])=>({key,label,bytes:bytes(value),count:value.length})).sort((a,b)=>b.bytes-a.bytes);
 return {version:APP_VERSION,checkedAt:new Date().toISOString(),storage:{usedBytes:payloadBytes,limitBytes:MAIN_DATA_LIMIT_BYTES,remainingBytes:Math.max(0,MAIN_DATA_LIMIT_BYTES-payloadBytes),percent:Number(percent.toFixed(2)),level,label:labels[level],breakdown,otherBytes:Math.max(0,payloadBytes-breakdown.reduce((n,b)=>n+b.bytes,0))},counts:{trips:state.trips.length,openTrips:state.trips.filter(t=>!t.end).length,closedTrips:state.trips.filter(t=>!!t.end).length,cars:state.cars.length,people:state.people.length,projects:state.projects.length,audit:state.audit.length,accounts:state.accounts?.length||0,activeAccounts:state.accounts?.filter(a=>a.active).length||0,accountLimit:ACCOUNT_LIMIT}};
}
