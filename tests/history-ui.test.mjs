import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';

const dir=await mkdtemp(join(tmpdir(),'fleet-history-'));
try{
 const file=join(dir,'history.cjs');
 await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {HistoryToolbar,MobileTripCards} from './src/TripHistory';import Detail from './src/JourneyDetail';export * from './src/trip-history';export const cards=p=>renderToStaticMarkup(<MobileTripCards {...p}/>);export const toolbar=p=>renderToStaticMarkup(<HistoryToolbar {...p}/>);export const detail=p=>renderToStaticMarkup(<Detail {...p}/>);`,resolveDir:process.cwd(),loader:'tsx'},outfile:file,bundle:true,platform:'node',format:'cjs',jsx:'automatic',nodePaths:[resolve('node_modules')],logLevel:'silent'});
 const {filterTripHistory,tripStatusCounts,tripReturnLabel,cards,toolbar,detail}=createRequire(import.meta.url)(file);
 const base={id:'one',seq:1,carId:'car',driverId:'driver',project:'งานทดสอบ',destination:'วังน้อย',start:'2026-10-29T09:00',end:'2026-10-29T16:20',odoStart:116515,odoEnd:116641,note:'คืนรถแล้ว',reason:''};
 const pending={...base,id:'two',seq:2,start:'2026-10-31T08:30',end:'',odoStart:116641,odoEnd:null,project:'ติดตั้ง <script>'};
 const crossDay={...base,id:'three',seq:3,start:'2026-09-30T22:00',end:'2026-10-01T03:00'};
 const state={cars:[{id:'car',plate:'8กน3362',province:'กรุงเทพมหานคร',model:'รถยนต์บริษัท',initialOdo:116515,active:true}],people:[{id:'driver',name:'สมชาย',active:true}],projects:[],trips:[base,pending,crossDay],audit:[],imported:false};
 const october=filterTripHistory(state,{month:'2026-10'});
 assert.deepEqual(october.map(t=>t.id),['two','one']);assert.deepEqual(tripStatusCounts(october),{all:2,active:1,closed:1});
 assert.deepEqual(filterTripHistory(state,{month:'2026-10',status:'active'}).map(t=>t.id),['two']);
 assert.deepEqual(filterTripHistory(state,{query:' สมชาย ',status:'closed'}).map(t=>t.id),['one','three']);
 assert.equal(filterTripHistory(state,{carId:'other'}).length,0);assert.equal(filterTripHistory(state,{driverId:'other'}).length,0);
 assert.equal(filterTripHistory(state,{query:'8กน3362'}).length,3);assert.equal(filterTripHistory(state,{query:'วังน้อย'}).length,3);
 assert.equal(state.trips[0].id,'one'); // Filtering never mutates the saved order.
 assert.equal(tripReturnLabel(base),'09:00–16:20 น.');
 assert.match(tripReturnLabel(crossDay),/30 ก.ย./);assert.match(tripReturnLabel(crossDay),/1 ต.ค./);
 const props={state,onDetail(){},onReturn(){},onReset(){}};
 const closedHTML=cards({...props,trips:[base]});assert.match(closedHTML,/126/);assert.doesNotMatch(closedHTML,/vehicle-action-return/);
 const pendingHTML=cards({...props,trips:[pending]});assert.match(pendingHTML,/vehicle-action-return/);assert.match(pendingHTML,/ติดตั้ง &lt;script&gt;/);assert.doesNotMatch(pendingHTML,/<script>/);
 const emptyHTML=cards({...props,trips:[]});assert.match(emptyHTML,/ไม่พบรายการตามตัวกรอง/);assert.match(emptyHTML,/ล้างตัวกรอง/);
 const toolbarProps={state,isAdmin:false,query:'',month:'',carId:'',driverId:'',status:'active',counts:{all:3,active:1,closed:2},onQuery(){},onMonth(){},onCar(){},onDriver(){},onStatus(){},onReset(){}};
 const employeeToolbar=toolbar(toolbarProps);assert.doesNotMatch(employeeToolbar,/ผู้ขับในประวัติ/);assert.match(employeeToolbar,/aria-pressed="true"/);
 assert.match(toolbar({...toolbarProps,isAdmin:true}),/ผู้ขับในประวัติ/);
 const completedDetail=detail({state,trip:base});assert.match(completedDetail,/126 กม\./);assert.match(completedDetail,/คืนรถแล้ว/);assert.match(completedDetail,/116,515/);assert.match(completedDetail,/116,641/);
 const activeDetail=detail({state,trip:pending});assert.match(activeDetail,/รอบันทึกคืนรถ/);assert.doesNotMatch(activeDetail,/ระยะทางรวม/);
 console.log('PASS history UI: combined filters and counts, own driver/plate search, no state mutation, cross-day labels, pending-only return action, safe text, empty/reset, admin driver filter, completed and active timeline.');
}finally{await rm(dir,{recursive:true,force:true});}
