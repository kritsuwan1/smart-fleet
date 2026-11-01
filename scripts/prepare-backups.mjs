import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const config=JSON.parse(await readFile('.deploy.config.json','utf8'));
const target=process.env.FLEET_DEPLOY_TARGET,account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!['demo','production'].includes(target)||!account||!token)throw Error('Missing verified deployment context.');
async function api(path,method='GET',body){
 const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 const d=await r.json();if(!r.ok||!d.success)throw Error(`Backup setup failed (HTTP ${r.status}). Cloudflare token needs D1 Read/Write access. Existing main data was not changed.`);return d;
}
async function query(id,sql,params=[]){const r=await api(`/d1/database/${id}/query`,'POST',{sql,params});if(!r.result?.every(x=>x.success!==false))throw Error('Backup database query failed.');return r.result;}
const name=`smart-fleet-${target}-backups`,binding=target==='demo'?'DEMO_BACKUP_DB':'BACKUP_DB';
const listed=await api('/d1/database?per_page=100');let db=listed.result.find(x=>x.name===name);
if(!db){
 db=(await api('/d1/database','POST',{name,primary_location_hint:'apac'})).result;
 if(!db.uuid)throw Error('Backup database ID missing.');
 const schema=await readFile('schema-backup.sql','utf8');await query(db.uuid,schema);
 await query(db.uuid,'INSERT INTO backup_control(id,enabled) VALUES(?,1)',[target]);
}
const source=config.d1_databases[0].database_id;
if(db.uuid===source)throw Error('Backup must use a separate database.');
const control=(await query(db.uuid,'SELECT id FROM backup_control'))[0].results;
if(control.length!==1||control[0].id!==target)throw Error('Backup database environment marker mismatch.');
config.d1_databases=config.d1_databases.filter(x=>!['BACKUP_DB','DEMO_BACKUP_DB'].includes(x.binding));
config.d1_databases.push({binding,database_name:name,database_id:db.uuid});
config.triggers={crons:['0 19 * * *']}; // 02:00 Asia/Bangkok; works without a visitor.
// Save a real pre-deployment checkpoint. Only SELECT the primary; write snapshots to the separate DB.
const row=(await query(source,"SELECT payload,version FROM fleet_store WHERE id='main'"))[0].results[0];
if(row){
 const bytes=Buffer.byteLength(row.payload);if(bytes>1500000)throw Error('Main state exceeds supported backup size.');
 const state=JSON.parse(row.payload),pkg=JSON.parse(await readFile('package.json','utf8')),now=new Date().toISOString();
 const envelope={format:'smart-fleet-backup',schemaVersion:1,environment:target,exportedAt:now,appVersion:pkg.version,sha256:createHash('sha256').update(JSON.stringify(state)).digest('hex'),state};
 const payload=JSON.stringify(envelope),day=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
 await query(db.uuid,'INSERT INTO backup_snapshots(id,created_at,source_version,payload,bytes) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET created_at=excluded.created_at,source_version=excluded.source_version,payload=excluded.payload,bytes=excluded.bytes WHERE excluded.source_version>=backup_snapshots.source_version AND excluded.created_at>=backup_snapshots.created_at',[day,now,row.version,payload,Buffer.byteLength(payload)]);
 await query(db.uuid,'DELETE FROM backup_snapshots WHERE id<?',[new Date(Date.now()+7*3600000-6*86400000).toISOString().slice(0,10)]);
 await query(db.uuid,"UPDATE backup_control SET last_attempt=?,last_error='' WHERE id=?",[now,target]);
}
await writeFile('.deploy.config.json',JSON.stringify(config,null,2)+'\n',{mode:0o600});
console.log(`Separate backup database ready: ${name}; daily 02:00 Bangkok; seven-day retention; primary data preserved.`);
