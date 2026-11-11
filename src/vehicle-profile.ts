import {STATIC_COMPANY_PLATE} from './static-vehicle-data';
import type {Car} from './fleet';
export const REVO_MODEL='Toyota Hilux Revo 2.4 Double Cab Prerunner';
export function vehicleProfile(car:Car){
 const legacyCompanyCar=car.plate.replace(/\s/g,'')===STATIC_COMPANY_PLATE&&(!car.model||car.model==='รถยนต์บริษัท');
 const model=legacyCompanyCar?REVO_MODEL:car.model;
 const revo=/revo/i.test(model);
 return {model,fuel:car.fuelType??(revo?'ดีเซล':''),image:car.imagePreset??(revo?'revo':'none')};
}
