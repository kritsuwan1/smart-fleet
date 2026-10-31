import type {Fleet,Trip} from './fleet';

export type TripReceipt={kind:'start'|'return';trip:Trip;plate:string;province:string;driverName:string};
export function tripReceiptFromResponse(response:{state?:Fleet;tripResult?:{id:string;operation:string}}):TripReceipt|null{
 const result=response.tripResult,state=response.state;
 if(!state||!result||!['start','return'].includes(result.operation))return null;
 const trip=state.trips.find(t=>t.id===result.id);
 const car=trip&&state.cars.find(c=>c.id===trip.carId);
 if(!trip||!car||result.operation==='start'&&!!trip.end||result.operation==='return'&&(!trip.end||trip.odoEnd===null))return null;
 return {kind:result.operation as 'start'|'return',trip:{...trip},plate:car.plate,province:car.province,driverName:state.people.find(p=>p.id===trip.driverId)?.name||'—'};
}
