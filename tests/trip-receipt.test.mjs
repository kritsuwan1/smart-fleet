import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import worker from '../output/worker-production.js';

const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
const env={APP_PASSWORD:crypto.randomUUID(),DB:{prepare(q){const stmt=sql.prepare(q);let args=[];return{bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async run(){return{meta:{changes:Number(stmt.run(...args).changes)}};}}}}};
const origin='https://smart-fleet.kritsuwan1.workers.dev';
const req=(path,options={},cookie='')=>worker.fetch(new Request(origin+path,{...options,headers:{origin,'CF-Connecting-IP':'192.0.2.101',...(cookie?{cookie}:{}),...options.headers}}),env);
const form=values=>({method:'POST',body:new URLSearchParams(values)});
let login=await req('/login',form({username:'admin',password:env.APP_PASSWORD}));assert.equal(login.status,303);const admin=login.headers.get('set-cookie').split(';')[0];
const get=cookie=>req('/api/fleet',{},cookie).then(r=>r.json());
const post=(cookie,action,data,version)=>req('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data,version})},cookie);
let state=await get(admin);assert.equal(state.tripResult,undefined);
const first={carId:'car-1',driverId:'p1',start:'2026-11-01T08:30',end:'',odoStart:'115784',odoEnd:null,project:'  งานทดสอบ <script>  ',destination:'  วังน้อย  ',note:'',reason:''};
let response=await post(admin,'trip',first,state.version);assert.equal(response.status,200);state=await response.json();
const firstResult=structuredClone(state);assert.equal(state.tripResult.operation,'start');
const trip=state.state.trips.find(t=>t.id===state.tripResult.id);assert.ok(trip);assert.equal(trip.project,'งานทดสอบ <script>');assert.equal(trip.odoStart,115784);
response=await post(admin,'car',{plate:'ทดสอบ2',province:'กรุงเทพมหานคร',model:'รถทดสอบ',initialOdo:1000,active:true},state.version);assert.equal(response.status,200);state=await response.json();assert.equal(state.tripResult,undefined);
const secondCar=state.state.cars.find(c=>c.plate==='ทดสอบ2');
response=await post(admin,'trip',{...first,carId:secondCar.id,odoStart:1000},state.version);assert.equal(response.status,200);state=await response.json();assert.notEqual(state.tripResult.id,trip.id);
const staleVersion=state.version;
response=await post(admin,'trip',{...trip,end:'2026-11-01T12:15',odoEnd:'115841'},state.version);assert.equal(response.status,200);state=await response.json();
const returnedResult=structuredClone(state);assert.deepEqual(state.tripResult,{id:trip.id,operation:'return'});
response=await post(admin,'trip',{...trip,end:'2026-11-01T12:16',odoEnd:'115842'},staleVersion);assert.equal(response.status,409);assert.equal((await response.json()).tripResult,undefined);
response=await post(admin,'trip',{...trip,end:'2026-11-01T12:15',odoEnd:115783},state.version);assert.equal(response.status,400);assert.equal((await response.json()).tripResult,undefined);
response=await post(admin,'trip',{...state.state.trips.find(t=>t.id===trip.id),note:'ปรับหมายเหตุ'},state.version);assert.equal(response.status,200);state=await response.json();assert.equal(state.tripResult.operation,'edit');

const dir=await mkdtemp(join(tmpdir(),'fleet-receipt-'));
try{
 const file=join(dir,'receipt.cjs');
 await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Confirmation from './src/TripSaveConfirmation';export * from './src/trip-receipt';export const render=p=>renderToStaticMarkup(<Confirmation {...p}/>);`,resolveDir:process.cwd(),loader:'tsx'},outfile:file,bundle:true,platform:'node',format:'cjs',jsx:'automatic',nodePaths:[resolve('node_modules')],logLevel:'silent'});
 const {tripReceiptFromResponse:receipt,render}=createRequire(import.meta.url)(file);
 const started=receipt(firstResult);assert.equal(started.plate,'8กน3362');assert.equal(started.kind,'start');assert.equal(started.trip.id,trip.id);
 const returned=receipt(returnedResult);assert.equal(returned.trip.id,trip.id);assert.equal(returned.trip.odoEnd,115841);assert.equal(returned.kind,'return');
 assert.equal(receipt({state:returnedResult.state,tripResult:{id:'wrong-id',operation:'return'}}),null);
 assert.equal(receipt(state),null);assert.equal(receipt({state:state.state}),null);assert.equal(receipt({}),null);
 assert.equal(receipt({state:returnedResult.state,tripResult:{id:trip.id,operation:'start'}}),null);
 const markup=render({receipt:started,onDetail(){},onClose(){}});assert.match(markup,/115,784/);assert.match(markup,/8กน3362/);assert.match(markup,/1 พ.ย. 2569/);assert.match(markup,/08:30 น./);assert.match(markup,/ดูรายละเอียดรายการ/);assert.match(markup,/งานทดสอบ &lt;script&gt;/);assert.doesNotMatch(markup,/<script>/);
 const returnMarkup=render({receipt:returned,onDetail(){},onClose(){}});assert.match(returnMarkup,/115,841/);assert.match(returnMarkup,/12:15 น./);assert.match(returnMarkup,/57 กม\./);
 const saved=started.trip.project;firstResult.state.trips[0].project='later state';assert.equal(started.trip.project,saved); // Confirmation is a snapshot of the successful save.
 console.log('PASS trip receipts: server-assigned ID and normalized values, exact record among multiple trips, return update, no receipt on stale/invalid write, generic edits, Thai date/time, safe text, persisted odometer/distance, immutable confirmation snapshot.');
}finally{sql.close();await rm(dir,{recursive:true,force:true});}
