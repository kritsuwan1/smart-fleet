// Read-only planning API. No network client, credentials, SQL executor or CLI.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {INITIALIZATION_TARGETS as targets,RESERVED_DDL,hasVerifiedReservedIdentity} from './d1-provider-identity.mjs';
export const fleetSchema='CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)';
const normalize=sql=>typeof sql==='string'?sql.replace(/\s/g,'').toLowerCase():'';
const refuse=code=>{throw new Error('INITIALIZATION_REFUSED_'+code);};

// query must return an array of rows from an independently verified target.
// Metadata must come from trusted provider inspection, never from config alone.
export function validateInitializationTarget(target,config){
 const expected=Object.hasOwn(targets,target)?targets[target]:null;
 if(!expected)refuse('TARGET');
 const bindings=config?.d1_databases;
 if(!Array.isArray(bindings)||bindings.length!==1)refuse('BINDING');
 const binding=bindings[0];
 if(binding?.binding!==expected.binding||binding.database_name!==expected.name||binding.database_id!==expected.id)refuse('BINDING');
 if(target==='staging'&&(config.name!=='smart-fleet-staging'||config.main!=='../output/worker-staging.js'))refuse('CONFIG');
 if(target==='recovery'&&(config.main!==undefined||config.name!==undefined))refuse('CONFIG');
 return expected;
}
export const SCHEMA_QUERY="SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name";
export const COUNT_QUERY='SELECT COUNT(*) AS row_count FROM fleet_store';
// Pure schema policy, shared with the offline broker. This issues no identity proof.
export function validateInitializationSchema(objects,reservedAllowed=false){
 if(!Array.isArray(objects))refuse('SCHEMA');
 const reserved=objects.filter(o=>o?.name==='_cf_KV');
 if(reserved.length>1||reserved.some(o=>!reservedAllowed||o.type!=='table'||o.tbl_name!=='_cf_KV'||o.sql!==RESERVED_DDL))refuse('SCHEMA');
 const application=objects.filter(o=>o?.name!=='_cf_KV');
 if(application.length>1||application.some(o=>!o||o.type!=='table'||o.name!=='fleet_store'||o.tbl_name!=='fleet_store'||normalize(o.sql)!==normalize(fleetSchema)))refuse('SCHEMA');
 return application.length===1;
}
export async function prepareD1Initialization({target,config,metadata,expectedAccountId,query}){
 const expected=validateInitializationTarget(target,config);
 if(typeof expectedAccountId!=='string'||!expectedAccountId.trim()||metadata?.account_id!==expectedAccountId||metadata?.database_id!==expected.id||metadata?.database_name!==expected.name)refuse('IDENTITY');
 if(typeof query!=='function')refuse('QUERY');
 let objects;
 try{objects=await query(SCHEMA_QUERY);}catch{refuse('SCHEMA_QUERY');}
 if(!Array.isArray(objects))refuse('SCHEMA_QUERY');
 const reservedAllowed=hasVerifiedReservedIdentity(metadata,target);
 const hasFleetStore=validateInitializationSchema(objects,reservedAllowed);
 if(hasFleetStore){
  let rows;
  try{rows=await query(COUNT_QUERY);}catch{refuse('COUNT_QUERY');}
  if(!Array.isArray(rows)||rows.length!==1||rows[0].row_count!==0)refuse('OCCUPIED');
 }
 // The raw SQL template stays strict. Only a fresh provider-verified plan can
 // activate its exact reserved-object branch; SQL cannot verify remote identity.
 let sql=await readFile(new URL('../config/initialize-'+target+'.example.sql',import.meta.url),'utf8');
 if(reservedAllowed){
  if(!hasVerifiedReservedIdentity(metadata,target))refuse('IDENTITY_EXPIRED');
  sql=sql.replace('/* VERIFIED_D1_RESERVED_CONTEXT */ 0','/* VERIFIED_D1_RESERVED_CONTEXT */ 1');
 }
 // A plan is a point-in-time review artifact, not permission or a remote executor.
 return Object.freeze({target,databaseId:expected.id,binding:expected.binding,sql,sha256:createHash('sha256').update(sql).digest('hex'),requiresApproval:true});
}
