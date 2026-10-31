import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';

const dir=await mkdtemp(join(tmpdir(),'fleet-ui-'));
try{
 const file=join(dir,'render.cjs');
 await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Home from './src/EmployeeDashboard';import Form from './src/JourneyForm';export const home=p=>renderToStaticMarkup(<Home {...p}/>);export const form=p=>renderToStaticMarkup(<Form {...p}/>);`,resolveDir:process.cwd(),loader:'tsx'},outfile:file,bundle:true,platform:'node',format:'cjs',jsx:'automatic',nodePaths:[resolve('node_modules')],logLevel:'silent'});
 const {home,form}=createRequire(import.meta.url)(file);
 const state={cars:[{id:'car',plate:'8กน3362',province:'กรุงเทพมหานคร',model:'รถยนต์บริษัท',initialOdo:115784,active:true}],people:[{id:'person',name:'พนักงานทดสอบ',active:true}],projects:['งานทดสอบ'],trips:[],audit:[],imported:false};
 const trip={id:'trip',seq:1,carId:'car',driverId:'person',project:'โครงการ <script>',destination:'สถานที่ทดสอบ',start:'2026-10-31T08:30',end:'',odoStart:115784,odoEnd:null,note:'',reason:''};
 const props={state,name:'พนักงานทดสอบ',occupiedCars:new Set(),onStart(){},onReturn(){},onDetail(){},onHistory(){}};
 assert.match(home(props),/บันทึกใช้รถ/);
 const occupied=home({...props,occupiedCars:new Set(['car'])});
 assert.match(occupied,/รถคันนี้มีพนักงานใช้งานอยู่/);assert.doesNotMatch(occupied,/บันทึกใช้รถ|รอคืนรถ/);
 const active=home({...props,state:{...state,trips:[trip]},occupiedCars:new Set(['car'])});
 assert.match(active,/รอคืนรถ/);assert.match(active,/คืนรถ/);assert.doesNotMatch(active,/บันทึกใช้รถ/);
 assert.match(active,/โครงการ &lt;script&gt;/);assert.doesNotMatch(active,/<script>/);
 const disabledCar=home({...props,state:{...state,cars:[{...state.cars[0],active:false}],trips:[trip]}});
 assert.match(disabledCar,/รอคืนรถ/); // A disabled car must still be returnable.
 const shared={state,trip,mode:'start',busy:false,error:'',employee:true,occupiedCars:new Set(),onSubmit(){},onClose(){}};
 const start=form(shared);assert.match(start,/115,784/);assert.match(start,/ใช้บัญชีที่เข้าสู่ระบบ/);assert.doesNotMatch(start,/<select/);assert.match(start,/ยืนยันบันทึกใช้รถ/);
 const returning=form({...shared,mode:'return',trip:{...trip,end:'2026-10-31T12:15',odoEnd:115841}});
 assert.match(returning,/ระยะทางครั้งนี้/);assert.match(returning,/57 กม\./);assert.match(returning,/min="115784"/);assert.match(returning,/ยืนยันคืนรถ/);
 const blank=form({...shared,mode:'return',trip:{...trip,end:'2026-10-31T12:15',odoEnd:''}});assert.doesNotMatch(blank,/ระยะทางครั้งนี้/);
 const invalid=form({...shared,mode:'return',trip:{...trip,end:'2026-10-31T12:15',odoEnd:115783}});assert.match(invalid,/ต้องไม่น้อยกว่า/);assert.doesNotMatch(invalid,/ระยะทางครั้งนี้/);
 const busy=form({...shared,busy:true});assert.match(busy,/<fieldset disabled=""/);assert.match(busy,/กำลังบันทึก/);
 const discontinuous=form({...shared,trip:{...trip,odoStart:115785}});assert.match(discontinuous,/เหตุผลกรณีเลขไมล์ไม่ต่อเนื่อง/);
 console.log('PASS mobile UI: available/occupied/own active car actions, disabled-car return, escaped project, employee identity, odometer reference, return distance and bounds, empty value, busy lock, mismatch reason.');
}finally{await rm(dir,{recursive:true,force:true});}
