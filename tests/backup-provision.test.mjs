import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const script=resolve('scripts/prepare-backups.mjs'),schema=await readFile('schema-backup.sql','utf8'),dir=await mkdtemp(join(tmpdir(),'fleet-backup-provision-'));
const oldCwd=process.cwd(),oldFetch=globalThis.fetch,keys=['FLEET_DEPLOY_TARGET','CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN'],oldEnv=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
const source=new DatabaseSync(':memory:'),copies=new DatabaseSync(':memory:');source.exec('CREATE TABLE fleet_store(id TEXT PRIMARY KEY,payload TEXT,version INTEGER)');const payload=JSON.stringify({cars:[],trips:[],people:[],projects:[],audit:[],imported:false,sessionKey:'synthetic-only'});source.prepare("INSERT INTO fleet_store VALUES('main',?,4)").run(payload);
let listed=false,created=0,fail=false;
try{
 process.chdir(dir);process.env.FLEET_DEPLOY_TARGET='demo';process.env.CLOUDFLARE_ACCOUNT_ID='0'.repeat(32);process.env.CLOUDFLARE_API_TOKEN='synthetic-token';
 await writeFile('schema-backup.sql',schema);await writeFile('package.json',JSON.stringify({version:'3.9.0'}));
 const config={name:'smart-fleet-demo',d1_databases:[{binding:'DEMO_DB',database_id:'source-id'}]};
 globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;const b=options.body?JSON.parse(options.body):{};const method=options.method||'GET';let result;
  if(fail)return Response.json({success:false},{status:403});
  if(path.endsWith('/d1/database')&&method==='GET')result=listed?[{name:'smart-fleet-demo-backups',uuid:'backup-id'}]:[];
  else if(path.endsWith('/d1/database')&&method==='POST'){assert.equal(b.name,'smart-fleet-demo-backups');created++;listed=true;result={name:b.name,uuid:'backup-id'};}
  else if(path.endsWith('/query')){
   const sql=path.includes('/source-id/')?source:copies;
   if(sql===source)assert.match(b.sql,/^SELECT payload,version FROM fleet_store/);
   let results=[];
   if(b.sql.includes('CREATE TABLE'))sql.exec(b.sql);
   else if(/^SELECT/.test(b.sql))results=sql.prepare(b.sql).all(...b.params);
   else sql.prepare(b.sql).run(...b.params);
   result=[{success:true,results}];
  }else throw Error('Unexpected endpoint');
  return Response.json({success:true,result});
 };
 await writeFile('.deploy.config.json',JSON.stringify(config));await import(script+'?first');
 let c=JSON.parse(await readFile('.deploy.config.json','utf8'));assert.equal(c.d1_databases[0].database_id,'source-id');assert.equal(c.d1_databases[1].binding,'DEMO_BACKUP_DB');assert.equal(c.d1_databases[1].database_id,'backup-id');assert.deepEqual(c.triggers.crons,['0 19 * * *']);assert.equal(created,1);
 const saved=JSON.parse(copies.prepare('SELECT payload FROM backup_snapshots').get().payload);assert.deepEqual(saved.state,JSON.parse(payload));assert.equal(saved.environment,'demo');assert.equal(source.prepare("SELECT version FROM fleet_store WHERE id='main'").get().version,4);
 await writeFile('.deploy.config.json',JSON.stringify(config));await import(script+'?retry');assert.equal(created,1);assert.equal(copies.prepare('SELECT count(*) n FROM backup_snapshots').get().n,1);
 copies.exec("UPDATE backup_control SET id='production'");await writeFile('.deploy.config.json',JSON.stringify(config));await assert.rejects(import(script+'?wrong-marker'),/marker mismatch/);
 copies.exec("UPDATE backup_control SET id='demo'");fail=true;await assert.rejects(import(script+'?denied'),/HTTP 403/);
 assert.equal(source.prepare("SELECT payload FROM fleet_store WHERE id='main'").get().payload,payload);
 console.log('PASS backup deployment provisioning: one separate DB, retry reuse, environment mismatch rejected, 403 blocks deployment, pre-deploy checksum snapshot, UTC schedule, no primary writes.');
}finally{process.chdir(oldCwd);globalThis.fetch=oldFetch;for(const k of keys)oldEnv[k]===undefined?delete process.env[k]:process.env[k]=oldEnv[k];source.close();copies.close();await rm(dir,{recursive:true,force:true});}
