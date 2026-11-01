// Read-only planning API. No network client, credentials, SQL executor or CLI.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const targets=Object.freeze({
 staging:Object.freeze({binding:'DEMO_DB',name:'smart-fleet-staging-db',id:'f71ba325-027c-4b3f-abb2-71492493a8cf'}),
 recovery:Object.freeze({binding:'RECOVERY_DB',name:'smart-fleet-recovery-db',id:'5ec99f9c-4919-41f4-9bc4-c8c564a60296'})
});
export const fleetSchema='CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)';
const normalize=sql=>typeof sql==='string'?sql.replace(/\s/g,'').toLowerCase():'';
const refuse=code=>{throw new Error('INITIALIZATION_REFUSED_'+code);};

// query must return an array of rows from an independently verified target.
// Metadata must come from trusted provider inspection, never from config alone.
export async function prepareD1Initialization({target,config,metadata,expectedAccountId,query}){
 const expected=Object.hasOwn(targets,target)?targets[target]:null;
 if(!expected)refuse('TARGET');
 const bindings=config?.d1_databases;
 if(!Array.isArray(bindings)||bindings.length!==1)refuse('BINDING');
 const binding=bindings[0];
 if(binding.binding!==expected.binding||binding.database_name!==expected.name||binding.database_id!==expected.id)refuse('BINDING');
 if(target==='staging'&&(config.name!=='smart-fleet-staging'||config.main!=='../output/worker-staging.js'))refuse('CONFIG');
 if(target==='recovery'&&(config.main!==undefined||config.name!==undefined))refuse('CONFIG');
 if(typeof expectedAccountId!=='string'||!expectedAccountId.trim()||metadata?.account_id!==expectedAccountId||metadata?.database_id!==expected.id||metadata?.database_name!==expected.name)refuse('IDENTITY');
 if(typeof query!=='function')refuse('QUERY');
 let objects;
 try{objects=await query("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name");}catch{refuse('SCHEMA_QUERY');}
 if(!Array.isArray(objects))refuse('SCHEMA_QUERY');
 // No guessed exemptions for _cf_* or other provider/user tables. Unknown means stop.
 if(objects.length>1||objects.some(o=>o.type!=='table'||o.name!=='fleet_store'||o.tbl_name!=='fleet_store'||normalize(o.sql)!==normalize(fleetSchema)))refuse('SCHEMA');
 if(objects.length){
  let rows;
  try{rows=await query('SELECT COUNT(*) AS row_count FROM fleet_store');}catch{refuse('COUNT_QUERY');}
  if(!Array.isArray(rows)||rows.length!==1||rows[0].row_count!==0)refuse('OCCUPIED');
 }
 const sql=await readFile(new URL('../config/initialize-'+target+'.example.sql',import.meta.url),'utf8');
 // A plan is a point-in-time review artifact, not permission or a remote executor.
 return Object.freeze({target,databaseId:expected.id,binding:expected.binding,sql,sha256:createHash('sha256').update(sql).digest('hex'),requiresApproval:true});
}
