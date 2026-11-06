import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const cleanupId='cleanup-oct-test-2026-11-06';
export const expected=[
 [137,'2026-10-30T11:16','Project test',117549,117555],
 [138,'2026-10-30T11:35','Pro test',117555,117560],
 [139,'2026-10-30T15:52','project1',117560,117573],
 [140,'2026-10-30T16:38','Project t',117573,117580],
 [141,'2026-10-31T10:51','project t',117580,117594],
 [142,'2026-10-31T14:35','Projects t',117594,117606],
 [143,'2026-10-31T21:12','Project t',117606,117610],
 [144,'2026-10-31T22:06','Project test',117610,117620]
];
export function planCleanup(state){
 if(!Array.isArray(state.cars)||!Array.isArray(state.trips)||!Array.isArray(state.audit))throw Error('Unexpected primary state structure');
 const cars=state.cars.filter(c=>c.plate.replace(/\s/g,'')==='8กน3362'&&c.province==='กรุงเทพมหานคร');
 if(cars.length!==1)throw Error('Vehicle does not match exactly');
 const rows=state.trips.filter(t=>t.carId===cars[0].id&&expected.some(e=>e[0]===t.seq));
 if(!rows.length&&state.audit.some(a=>a.id===cleanupId))return {alreadyDone:true};
 if(rows.length!==8)throw Error('Expected exactly eight records. Nothing was removed.');
 for(const [seq,start,project,odoStart,odoEnd] of expected){
  const found=rows.filter(t=>t.seq===seq);
  if(found.length!==1)throw Error('Duplicate sequence. Nothing was removed.');
  const t=found[0];if(t.start!==start||String(t.project).replace(/\s/g,'').toLowerCase()!==project.replace(/\s/g,'').toLowerCase()||t.odoStart!==odoStart||t.odoEnd!==odoEnd||!t.end)throw Error('Date/project/odometer differs from approved screenshot. Nothing was removed.');
 }
 const ids=new Set(rows.map(t=>t.id));if(ids.size!==8)throw Error('Duplicate trip IDs');
 const distance=rows.reduce((n,t)=>n+t.odoEnd-t.odoStart,0);if(distance!==71)throw Error('Distance mismatch');
 const result=structuredClone(state);result.trips=result.trips.filter(t=>!ids.has(t.id));
 if(result.trips.length!==state.trips.length-8)throw Error('Unexpected number of matching IDs');
 result.audit.unshift({id:cleanupId,time:new Date().toISOString(),actor:'ผู้ดูแลระบบ ตามคำขอล้างข้อมูลทดสอบ',action:'ลบรายการทดสอบ 30–31 ต.ค. 2569 #137–#144',before:{trips:rows},after:{removedCount:8,removedDistanceKm:71,backupRow:'archive-'+cleanupId}});
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
 if(process.env.CLEANUP_REVIEW==='yes'){
  const state=JSON.parse(row.payload),car=state.cars.find(c=>c.plate.replace(/\s/g,'')==='8กน3362');
  for(const [seq,start,project,odoStart,odoEnd] of expected){
   const matches=state.trips.filter(t=>t.carId===car?.id&&t.seq===seq),t=matches[0];
   const flags={sequence:seq,unique:matches.length===1,startMatches:t?.start===start,projectMatches:t?.project===project,projectMatchesIgnoringSpacesAndCase:String(t?.project||'').replace(/\s/g,'').toLowerCase()===project.replace(/\s/g,'').toLowerCase(),odoStartMatches:t?.odoStart===odoStart,odoEndMatches:t?.odoEnd===odoEnd,closed:!!t?.end};
   console.log('SCOPE_CHECK='+JSON.stringify(flags));
  }
  console.log('Read-only comparison completed: no record values exported and no data changed.');return;
 }
 const plan=planCleanup(JSON.parse(row.payload));if(plan.alreadyDone){console.log('Verified: the requested eight test records were already removed by this cleanup.');return;}
 console.log('Verified exact screenshot match: 8 closed test trips, October 30–31, 2026, total 71 km. Other trip records are excluded.');
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
 console.log('SUCCESS: exactly 8 requested test trips removed from active reports (71 km); all other data preserved. Full pre-cleanup state retained in a private immutable database archive; deleted records retained in the admin audit. No app deployment performed.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
