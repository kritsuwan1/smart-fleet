// Identity evidence is issued only after metadata responses from a trusted transport.
// A mock transport is test evidence only; no credential discovery or default network.
export const DASHBOARD_ACCOUNT_ID='8853419a19293131998afe07ee651e62';
export const RESERVED_DDL='CREATE TABLE _cf_KV ( key TEXT PRIMARY KEY, value BLOB ) WITHOUT ROWID';
export const INITIALIZATION_TARGETS=Object.freeze({
 staging:Object.freeze({binding:'DEMO_DB',name:'smart-fleet-staging-db',id:'f71ba325-027c-4b3f-abb2-71492493a8cf'}),
 recovery:Object.freeze({binding:'RECOVERY_DB',name:'smart-fleet-recovery-db',id:'5ec99f9c-4919-41f4-9bc4-c8c564a60296'})
});
const verified=new WeakMap();
export async function verifyCloudflareD1Identity({target,expectedAccountId,read}){
 const expected=Object.hasOwn(INITIALIZATION_TARGETS,target)?INITIALIZATION_TARGETS[target]:null;
 if(!expected||expectedAccountId!==DASHBOARD_ACCOUNT_ID||typeof read!=='function')throw Error('D1_PREFLIGHT_IDENTITY');
 const path='/accounts/'+expectedAccountId;
 const account=await read(path);
 if(account?.id!==expectedAccountId)throw Error('D1_PREFLIGHT_IDENTITY');
 const database=await read(path+'/d1/database/'+expected.id);
 if(database?.uuid!==expected.id||database?.name!==expected.name)throw Error('D1_PREFLIGHT_IDENTITY');
 const metadata=Object.freeze({account_id:account.id,database_id:database.uuid,database_name:database.name});
 if(account.id===DASHBOARD_ACCOUNT_ID)verified.set(metadata,{target,time:Date.now()});
 return metadata;
}
export function hasVerifiedReservedIdentity(metadata,target){
 const proof=metadata&&typeof metadata==='object'?verified.get(metadata):null;
 return !!proof&&proof.target===target&&Date.now()>=proof.time&&Date.now()-proof.time<=60000;
}
