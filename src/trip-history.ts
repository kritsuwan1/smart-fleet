import type {Fleet,Trip} from './fleet';

export type TripFilters={query?:string;month?:string;carId?:string;driverId?:string;status?:string};
export function filterTripHistory(s:Fleet,{query='',month='',carId='',driverId='',status=''}:TripFilters={}):Trip[]{
 const text=query.trim().toLocaleLowerCase();
 return s.trips.filter(t=>(!month||t.start.startsWith(month))&&(!carId||t.carId===carId)&&(!driverId||t.driverId===driverId)&&(!status||(status==='active'?!t.end:!!t.end))&&(!text||[t.project,t.destination,s.people.find(p=>p.id===t.driverId)?.name,s.cars.find(c=>c.id===t.carId)?.plate,String(t.seq)].join(' ').toLocaleLowerCase().includes(text))).sort((a,b)=>b.start.localeCompare(a.start)||b.seq-a.seq);
}
export function tripStatusCounts(trips:Trip[]){const active=trips.filter(t=>!t.end).length;return {all:trips.length,active,closed:trips.length-active};}
export const tripDay=(date:string)=>date?new Date(date+'+07:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'}):'—';
export const tripTime=(date:string)=>date.slice(11)+' น.';
export function tripReturnLabel(t:Trip){return t.start.slice(0,10)===t.end.slice(0,10)?`${t.start.slice(11)}–${t.end.slice(11)} น.`:`${tripDay(t.start)} ${tripTime(t.start)} → ${tripDay(t.end)} ${tripTime(t.end)}`;}
