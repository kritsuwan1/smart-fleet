import type {Fleet,Trip} from './fleet';
// Build-time substitutes only; recovery readers never initialize these placeholders.
export const initial:Fleet={cars:[],people:[],projects:[],trips:[],audit:[],imported:false};
export const importedTrips:Trip[]=[];
export const qrPage=()=>'';
export const STATIC_COMPANY_PLATE=null;
