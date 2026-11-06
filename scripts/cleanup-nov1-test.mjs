import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const cleanupId='cleanup-nov1-test-145-2026-11-06';
export const expected=[[145,'2026-11-01T00:31','Project t',117620,117630]];
export function planCleanup(state){
 if(!Array.isArray(state.cars)||!Array.isArray(state.trips)||!Array.isArray(state.audit))throw Error('Unexpected primary state structure');
 const cars=state.cars.filter(c=>c.plate.replace(/\s/g,'')==='8กน3362'&&c.province==='กรุงเทพมหานคร');
 if(cars.length!==1)throw Error('Vehicle does not match exactly');
 const rows=state.trips.filter(t=>t.carId===cars[0].id&&expected.some(e=>e[0]===t.seq));
 if(!rows.length&&state.audit.some(a=>a.id===cleanupId))return {alreadyDone:true};
 if(rows.length!==1)throw Error('Expected exactly one approved record. Nothing was removed.');
 for(const [seq,start,project,odoStart,odoEnd] of expected){
  const found=rows.filter(t=>t.seq===seq);
  if(found.length!==1)throw Error('Duplicate sequence. Nothing was removed.');
  const t=found[0];if(t.start!==start||String(t.project).replace(/\s/g,'').toLowerCase()!==project.replace(/\s/g,'').toLowerCase()||t.odoStart!==odoStart||t.odoEnd!==odoEnd||!t.end)throw Error('Date/project/odometer differs from approved screenshot. Nothing was removed.');
 }
 const ids=new Set(rows.map(t=>t.id));if(ids.size!==1)throw Error('Duplicate trip IDs');
 const distance=rows.reduce((n,t)=>n+t.odoEnd-t.odoStart,0);if(distance!==10)throw Error('Distance mismatch');
 const result=structuredClone(state);result.trips=result.trips.filter(t=>!ids.has(t.id));
 if(result.trips.length!==state.trips.length-1)throw Error('Unexpected number of matching IDs');
 result.audit.unshift({id:cleanupId,time:new Date().toISOString(),actor:'ผู้ดูแลระบบ ตามคำขอล้างข้อมูลทดสอบ',action:'ลบรายการทดสอบ 1 พ.ย. 2569 #145',before:{trips:rows},after:{removedCount:1,removedDistanceKm:10,backupRow:'archive-'+cleanupId}});
 return {alreadyDone:false,result,ids:[...ids],distance};
}
async function run(){
 const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
 if(!account||!token)throw Error('Missing Cloudflare connection');
 const db='ebbca318-17d1-4486-b925-d6c787472ba5';
 async function api(path,method='GET',body){const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});const d=await r.json();if(!r.ok||!d.success)throw Error(`Cloudflare rejected cleanup request (HTTP ${r.status})`);return d;}
 async function query(sql,params=[]){const d=await api(`/d1/database/${db}/query`,'POST',{sql,params});if(!d.result?.[0]?.success)throw Error('Database query failed');return d.result[0];}
 const settings=await api('/workers/scripts/smart-fleet/settings');
 const binding=settings.result?.bindings?.find(b=>b.name==='DB'&&b.type==='d1');if(binding?.id!==db)throw Error('Production binding mismatch');
 const marker=(await query("SELECT payload FROM fleet_store WHERE id='environment'")).results[0];if(marker&&marker.payload!=='production')throw Error('Production marker mismatch');
 const row=(await query("SELECT payload,version FROM fleet_store WHERE id='main'")).results[0];if(!row)throw Error('Primary state missing');
 const plan=planCleanup(JSON.parse(row.payload));if(plan.alreadyDone){console.log('Verified: the requested test record were already removed by this cleanup.');return;}
 console.log('Verified exact screenshot match: 1 closed test trip #145, November 1, 2026, total 10 km. Other trip records are excluded.');
 if(process.env.CLEANUP_APPLY!=='yes'){console.log('PREVIEW ONLY: no database data changed.');return;}
 const backupId='archive-'+cleanupId;
 await query('INSERT OR IGNORE INTO fleet_store(id,payload,version) SELECT ?,payload,version FROM fleet_store WHERE id=\'main\' AND version=? AND payload=?',[backupId,row.version,row.payload]);
 const saved=(await query('SELECT payload,version FROM fleet_store WHERE id=?',[backupId])).results[0];
 const sha=s=>createHash('sha256').update(s).digest('hex');
 if(!saved||saved.version!==row.version||sha(saved.payload)!==sha(row.payload))throw Error('Verified immutable archive is unavailable, or the source changed. Nothing was removed.');
 const updated=await query("UPDATE fleet_store SET payload=?,version=version+1 WHERE id='main' AND version=? AND payload=?",[JSON.stringify(plan.result),row.version,row.payload]);
 if(updated.meta?.changes!==1)throw Error('Concurrent update detected. Nothing was removed; reload and review before retry.');
 const after=(await query("SELECT payload,version FROM fleet_store WHERE id='main'")).results[0],state=JSON.parse(after.payload);
 if(state.trips.some(t=>plan.ids.includes(t.id))||!state.audit.some(a=>a.id===cleanupId))throw Error('Post-cleanup verification failed');
 if(after.version===row.version+1&&after.payload!==JSON.stringify(plan.result))throw Error('Unexpected state after cleanup');
 console.log('SUCCESS: exactly 1 requested test trip #145 removed from active reports (10 km); all other data preserved. Full pre-cleanup state retained in a private immutable database archive; deleted records retained in the admin audit. No app deployment performed.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
