// Replaced at build time. Environment cannot be switched by a query string or visitor.
declare const __FLEET_ENV__: string;
export const IS_DEMO=typeof __FLEET_ENV__!=='undefined'&&__FLEET_ENV__==='demo';
export const ENVIRONMENT=IS_DEMO?'demo':'production';
export const SITE_URL=IS_DEMO?'https://smart-fleet-demo.kritsuwan1.workers.dev':'https://smart-fleet.kritsuwan1.workers.dev';
export const ENVIRONMENT_LABEL=IS_DEMO?'DEMO — ระบบทดสอบ':'PRODUCTION — ระบบใช้งานจริง';
export const ENVIRONMENT_NOTE=IS_DEMO?'ข้อมูลนี้ไม่ใช่ข้อมูลใช้งานจริง · บัญชีและข้อมูลแยกจาก Production':'ข้อมูลใช้งานจริงของบริษัท';
export const ENVIRONMENT_HTML=IS_DEMO?`<div class="environment-banner demo" role="note"><strong>${ENVIRONMENT_LABEL}</strong><span>${ENVIRONMENT_NOTE}</span></div>`:'';
export async function assertDatabaseEnvironment(env:any){
 const marker=await env.DB.prepare("SELECT payload FROM fleet_store WHERE id='environment'").first();
 if(IS_DEMO&&marker?.payload!=='demo'||!IS_DEMO&&marker&&marker.payload!=='production')throw Error('ENVIRONMENT_MISMATCH');
}
