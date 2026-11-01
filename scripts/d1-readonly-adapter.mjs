// No default transport, credential discovery, CLI, initialization or deployment.
import {prepareD1Initialization,validateInitializationTarget,SCHEMA_QUERY,COUNT_QUERY} from './d1-initialization-safety.mjs';
const refuse=code=>{throw new Error('D1_PREFLIGHT_'+code);};
const origin='https://api.cloudflare.com/client/v4';

export async function createD1ReadonlyAdapter({target,config,expectedAccountId,transport}){
 const snapshot=structuredClone(config);
 const expected=validateInitializationTarget(target,snapshot);
 if(typeof expectedAccountId!=='string'||!/^[a-f0-9]{32}$/.test(expectedAccountId))refuse('ACCOUNT');
 if(typeof transport!=='function')refuse('TRANSPORT_REQUIRED');
 const accountPath=`/accounts/${expectedAccountId}`;
 const databasePath=accountPath+`/d1/database/${expected.id}`;
 let failed=false;
 async function call(path,sql){
  if(failed)refuse('CLOSED');
  // URLs/methods are constructed internally; never accept arbitrary paths or SQL.
  if(sql!==undefined&&sql!==SCHEMA_QUERY&&sql!==COUNT_QUERY)refuse('SQL');
  if(path!==accountPath&&path!==databasePath&&path!==databasePath+'/query')refuse('PATH');
  let response,body;
  try{
   response=await transport(origin+path,{method:sql===undefined?'GET':'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},...(sql===undefined?{}:{body:JSON.stringify({sql,params:[]})})});
   if(response?.status===401||response?.status===403){failed=true;refuse('PERMISSION');}
   if(!response?.ok||response.redirected){failed=true;refuse('HTTP');}
   body=await response.json();
  }catch(error){failed=true;if(error?.message==='D1_PREFLIGHT_PERMISSION'||error?.message==='D1_PREFLIGHT_HTTP')throw new Error(error.message);refuse('REQUEST');}
  if(body?.success!==true||body.errors?.length||body.result==null){failed=true;refuse('RESPONSE');}
  return body.result;
 }
 const account=await call(accountPath);
 if(account.id!==expectedAccountId)refuse('IDENTITY');
 const database=await call(databasePath);
 if(database.uuid!==expected.id||database.name!==expected.name)refuse('IDENTITY');
 const metadata=Object.freeze({account_id:account.id,database_id:database.uuid,database_name:database.name});
 let schemaAccepted=false;
 const query=async sql=>{
  if(sql!==SCHEMA_QUERY&&sql!==COUNT_QUERY)refuse('SQL');
  if(sql===COUNT_QUERY&&!schemaAccepted)refuse('ORDER');
  const result=await call(databasePath+'/query',sql);
  if(!Array.isArray(result)||result.length!==1||result[0]?.success!==true||!Array.isArray(result[0].results)){failed=true;refuse('QUERY_RESPONSE');}
  if(result[0].meta?.changed_db===true||result[0].meta?.rows_written>0){failed=true;refuse('UNEXPECTED_WRITE_METADATA');}
  const rows=result[0].results;
  if(rows.length>2000){failed=true;refuse('QUERY_RESPONSE');}
  if(sql===SCHEMA_QUERY){
   schemaAccepted=false;
   if(rows.some(row=>!row||typeof row.type!=='string'||typeof row.name!=='string'||typeof row.tbl_name!=='string'||typeof row.sql!=='string')){failed=true;refuse('QUERY_RESPONSE');}
   // Count permission is granted only after the existing planner validates this exact schema.
  }else if(rows.length!==1||!Number.isSafeInteger(rows[0]?.row_count)||rows[0].row_count<0){failed=true;refuse('QUERY_RESPONSE');}
  return structuredClone(rows);
 };
 // Expose only the integrated review, never an arbitrary query or request method.
 return Object.freeze({
  async review(){
   schemaAccepted=false;
   const guardedQuery=async sql=>{
    // Planner only asks for COUNT after accepting the schema returned by SCHEMA_QUERY.
    if(sql===COUNT_QUERY)schemaAccepted=true;
    return query(sql);
   };
   const plan=await prepareD1Initialization({target,config:snapshot,metadata,expectedAccountId,query:guardedQuery});
   return Object.freeze({target,metadata,preflight:'PASS',requiresInitializationApproval:true,sqlSha256:plan.sha256,dashboardSchema:'NOT_VERIFIED'});
  }
 });
}
