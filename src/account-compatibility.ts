import type {Fleet} from './fleet';
export class AccountCompatibilityError extends Error {
 constructor(){super('ACCOUNT_FORMAT_UNSUPPORTED');}
}
const fail=():never=>{throw new AccountCompatibilityError();};
const object=(v:unknown):v is Record<string,any>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0;
const integer=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export const stateSecurityFields=['format','formatVersion','authorizationVersion','accountSchemaVersion','policyVersion','security'] as const;
export const accountSecurityFields=['format','formatVersion','accountFormatVersion','accountKind','authorizationVersion','accountSchemaVersion','policyVersion','status','approvalStatus','personId','personLink','identityVerification','personVerification','personProvisioning','accessRevision','origin','revision'] as const;
export const isSelfAccount=(a:any):boolean=>object(a)&&[3,4,5].includes(a.accountFormatVersion)&&a.accountKind==='self-user';
export const isLinkedAccount=(a:any):boolean=>isSelfAccount(a)&&[4,5].includes(a.accountFormatVersion);
export const isProvisionedAccount=(a:any):boolean=>isSelfAccount(a)&&a.accountFormatVersion===5;
const iso=(v:any)=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const provisioning=(v:any,idKey:string)=>object(v)&&Object.keys(v).sort().join(',')===[idKey,'method','createdAt'].sort().join(',')&&text(v[idKey])&&v.method==='self-registration'&&iso(v.createdAt);
const uuid=(v:any)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
export const accountEnabled=(a:any):boolean=>isSelfAccount(a)?a.status==='ACTIVE':a.active===true;
const selfForbidden=accountSecurityFields.filter(k=>!['accountFormatVersion','accountKind','status','personVerification','personProvisioning'].includes(k));
function assertSelfAccount(a:any):void{
 if(!isSelfAccount(a)||a.role!=='user'||a.active!==false||!['ACTIVE','DISABLED','REJECTED'].includes(a.status)||selfForbidden.some(k=>k in a))return fail();
 if(a.accountFormatVersion===3){if(a.driverId!==null||'personVerification' in a||'personProvisioning' in a)return fail();}
 else if(a.accountFormatVersion===5){if('personVerification' in a||!uuid(a.id)||!uuid(a.driverId)||a.id===a.driverId||!provisioning(a.personProvisioning,'personId')||a.personProvisioning.personId!==a.driverId||a.personProvisioning.createdAt!==a.createdAt)return fail();}
 else{const v=a.personVerification;if('personProvisioning' in a||!text(a.driverId)||!object(v)||Object.keys(v).sort().join(',')!=='personId,verifiedAt,verifiedBy'||v.personId!==a.driverId||!text(v.verifiedBy)||typeof v.verifiedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v.verifiedAt)||!Number.isFinite(Date.parse(v.verifiedAt))||new Date(v.verifiedAt).toISOString()!==v.verifiedAt)return fail();}
}
export function accountRole(a:any):'admin'|'employee'|'user'{if(isSelfAccount(a)){assertSelfAccount(a);return 'user';}return legacyAccountRole(a);}

// This is an explicit legacy adapter, not a default for unrecognized roles.
export function legacyAccountRole(account:unknown):'admin'|'employee'{
 if(!object(account)||accountSecurityFields.some(k=>k in account))return fail();
 if(account.role===undefined||account.role==='employee')return 'employee';
 if(account.role==='admin')return 'admin';
 return fail();
}

// Metadata-only future design. No credentials, login adapter, persistence or activation.
export type FutureAccountMetadata={accountFormatVersion:2;role:'admin'|'staff'|'user'|'legacy-employee';status:'PENDING'|'APPROVED'|'REJECTED'|'DISABLED';personId:string|null;accessRevision:number};
export function inspectFutureAccountMetadata(value:unknown):FutureAccountMetadata{
 const keys=['accountFormatVersion','role','status','personId','accessRevision'];
 if(!object(value)||Object.keys(value).sort().join(',')!==keys.sort().join(',')||value.accountFormatVersion!==2||
  !['admin','staff','user','legacy-employee'].includes(value.role)||!['PENDING','APPROVED','REJECTED','DISABLED'].includes(value.status)||
  !(value.personId===null||text(value.personId))||!integer(value.accessRevision)||value.status==='APPROVED'&&value.personId===null)return fail();
 return structuredClone(value) as FutureAccountMetadata;
}

// Read-only: never repairs/normalizes/converts accounts, Fleet or historical records.
export function assertOperationalAccounts(value:unknown):void{
 if(!object(value)||stateSecurityFields.some(k=>k in value)||
  'accountFormatVersion' in value&&![1,3,4,5].includes(value.accountFormatVersion)||
  !['cars','people','trips','audit','projects'].every(k=>Array.isArray(value[k]))||typeof value.imported!=='boolean')return fail();
 if('sessionKey' in value&&!text(value.sessionKey))return fail();
 if(value.accounts!==undefined&&!Array.isArray(value.accounts))return fail();
 const people=new Set<string>();
 for(const p of value.people){if(!object(p)||!text(p.id))return fail();people.add(p.id);if('accountProvisioning' in p){const v=p.accountProvisioning;if(value.accountFormatVersion!==5||!provisioning(v,'accountId')||typeof p.active!=='boolean'||!text(p.name)||!(value.accounts||[]).some((a:any)=>isProvisionedAccount(a)&&a.id===v.accountId&&a.driverId===p.id&&a.personProvisioning?.createdAt===v.createdAt))return fail();}}
 const ids=new Set<string>(),names=new Set<string>();
 for(const a of value.accounts||[]){
  const self=isSelfAccount(a);if(self){assertSelfAccount(a);if(![3,4,5].includes(value.accountFormatVersion)||isLinkedAccount(a)&&![4,5].includes(value.accountFormatVersion)||isProvisionedAccount(a)&&value.accountFormatVersion!==5)return fail();}else legacyAccountRole(a);
  if(isLinkedAccount(a)&&(value.people.filter((p:any)=>p.id===a.driverId).length!==1||value.accounts.some((other:any)=>other.id!==a.id&&other.driverId===a.driverId)||a.accountFormatVersion===4&&a.personVerification.verifiedBy!=='admin'&&!value.accounts.some((r:any)=>r.id===a.personVerification.verifiedBy)))return fail();
  if(isProvisionedAccount(a)){const p=value.people.find((p:any)=>p.id===a.driverId);if(!p||value.people.some((p:any)=>p.id===a.id)||value.accounts.some((other:any)=>other.id===a.driverId)||!provisioning(p.accountProvisioning,'accountId')||p.accountProvisioning.accountId!==a.id||p.accountProvisioning.createdAt!==a.personProvisioning.createdAt)return fail();}
  if(!text(a.id)||a.id==='admin'||ids.has(a.id)||!text(a.username)||a.username==='admin'||names.has(a.username)||
   !text(a.name)||typeof a.active!=='boolean'||!integer(a.passwordVersion)||!text(a.salt)||!text(a.passwordHash)||
   !self&&(!text(a.driverId)||!people.has(a.driverId)))return fail();
  ids.add(a.id);names.add(a.username);
 }
}

export function parseOperationalState(payload:string):Fleet{
 let value:unknown;try{value=JSON.parse(payload);}catch{return fail();}
 assertOperationalAccounts(value);return value as Fleet;
}

// SQL equivalent used only by the generated trusted SQL backup, never user-supplied SQL.
export function operationalAccountsSql(payload:string):string{
 const type=(key:string)=>`json_type(${payload},'$.${key}')`;
 const field=(key:string)=>`json_extract(${payload},'$.${key}')`;
 const absent=(keys:readonly string[],source:string)=>keys.map(k=>`json_type(${source},'$.${k}') IS NULL`).join(' AND ');
 const nonempty=(key:string)=>`json_type(a.value,'$.${key}')='text' AND length(json_extract(a.value,'$.${key}'))>0`;
 const uuidSql=(key:string)=>{const v=`json_extract(a.value,'$.${key}')`;return `${nonempty(key)} AND length(${v})=36 AND ${v} NOT GLOB '*[^0-9a-f-]*' AND length(replace(${v},'-',''))=32 AND substr(${v},9,1)='-' AND substr(${v},14,1)='-' AND substr(${v},19,1)='-' AND substr(${v},24,1)='-' AND substr(${v},15,1)='4' AND substr(${v},20,1) IN ('8','9','a','b')`;};
 const prov=(source:string,path:string,idKey:string)=>`json_type(${source},'$.${path}')='object' AND (SELECT COUNT(*) FROM json_each(${source},'$.${path}'))=3 AND json_type(${source},'$.${path}.${idKey}')='text' AND length(json_extract(${source},'$.${path}.${idKey}'))>0 AND json_type(${source},'$.${path}.method')='text' AND json_extract(${source},'$.${path}.method')='self-registration' AND json_type(${source},'$.${path}.createdAt')='text' AND strftime('%Y-%m-%dT%H:%M:%fZ',json_extract(${source},'$.${path}.createdAt'))=json_extract(${source},'$.${path}.createdAt')`;
 const systemAccount=`${field('accountFormatVersion')}=5 AND json_type(a.value,'$.accountFormatVersion') IN ('integer','real') AND json_extract(a.value,'$.accountFormatVersion')=5 AND json_type(a.value,'$.accountKind')='text' AND json_extract(a.value,'$.accountKind')='self-user' AND json_type(a.value,'$.role')='text' AND json_extract(a.value,'$.role')='user' AND json_type(a.value,'$.active')='false' AND json_type(a.value,'$.status')='text' AND json_extract(a.value,'$.status') IN ('ACTIVE','DISABLED','REJECTED') AND ${nonempty('driverId')} AND json_type(a.value,'$.personVerification') IS NULL AND ${absent(selfForbidden,'a.value')} AND ${prov('a.value','personProvisioning','personId')}
 AND ${uuidSql('id')} AND ${uuidSql('driverId')} AND json_extract(a.value,'$.id')<>json_extract(a.value,'$.driverId') AND json_extract(a.value,'$.personProvisioning.personId')=json_extract(a.value,'$.driverId') AND json_extract(a.value,'$.personProvisioning.createdAt')=json_extract(a.value,'$.createdAt')
 AND (SELECT COUNT(*) FROM json_each(${payload},'$.people') p WHERE json_extract(p.value,'$.id')=json_extract(a.value,'$.driverId'))=1
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.people') p WHERE json_extract(p.value,'$.id')=json_extract(a.value,'$.id'))
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') other WHERE json_extract(other.value,'$.id')=json_extract(a.value,'$.driverId'))
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') other WHERE other.key<>a.key AND json_extract(other.value,'$.driverId')=json_extract(a.value,'$.driverId'))
 AND EXISTS(SELECT 1 FROM json_each(${payload},'$.people') p WHERE json_extract(p.value,'$.id')=json_extract(a.value,'$.driverId') AND ${prov('p.value','accountProvisioning','accountId')} AND json_extract(p.value,'$.accountProvisioning.accountId')=json_extract(a.value,'$.id') AND json_extract(p.value,'$.accountProvisioning.createdAt')=json_extract(a.value,'$.personProvisioning.createdAt'))`;
 const allowed=`json_valid(${payload}) AND json_type(${payload})='object' AND ${absent(stateSecurityFields,payload)}
 AND (${type('accountFormatVersion')} IS NULL OR (${type('accountFormatVersion')} IN ('integer','real') AND ${field('accountFormatVersion')} IN (1,3,4,5)))
 AND ${['cars','people','trips','audit','projects'].map(k=>`${type(k)}='array'`).join(' AND ')}
 AND ${type('imported')} IN ('true','false') AND (${type('accounts')} IS NULL OR ${type('accounts')}='array')
 AND (${type('sessionKey')} IS NULL OR (${type('sessionKey')}='text' AND length(${field('sessionKey')})>0))
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.people') p WHERE p.type<>'object' OR COALESCE(json_type(p.value,'$.id'),'missing')<>'text' OR length(json_extract(p.value,'$.id'))=0)
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.people') p WHERE json_type(p.value,'$.accountProvisioning') IS NOT NULL AND NOT COALESCE((
 ${field('accountFormatVersion')}=5 AND ${prov('p.value','accountProvisioning','accountId')} AND json_type(p.value,'$.name')='text' AND length(json_extract(p.value,'$.name'))>0 AND json_type(p.value,'$.active') IN ('true','false')
 AND EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') a WHERE json_extract(a.value,'$.accountFormatVersion')=5 AND json_extract(a.value,'$.accountKind')='self-user' AND json_extract(a.value,'$.id')=json_extract(p.value,'$.accountProvisioning.accountId') AND json_extract(a.value,'$.driverId')=json_extract(p.value,'$.id') AND json_extract(a.value,'$.personProvisioning.createdAt')=json_extract(p.value,'$.accountProvisioning.createdAt'))
 ),0))
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') a WHERE a.type<>'object' OR NOT COALESCE((
 ${['id','username','name','salt','passwordHash'].map(nonempty).join(' AND ')}
 AND json_extract(a.value,'$.id')<>'admin' AND json_extract(a.value,'$.username')<>'admin'
 AND json_type(a.value,'$.active') IN ('true','false')
 AND json_type(a.value,'$.passwordVersion') IN ('integer','real') AND json_extract(a.value,'$.passwordVersion') BETWEEN 0 AND 9007199254740991
 AND CAST(json_extract(a.value,'$.passwordVersion') AS INTEGER)=json_extract(a.value,'$.passwordVersion')
 AND (( ${absent(accountSecurityFields,'a.value')}
 AND (json_type(a.value,'$.role') IS NULL OR (json_type(a.value,'$.role')='text' AND json_extract(a.value,'$.role') IN ('admin','employee')))
 AND ${nonempty('driverId')} AND EXISTS(SELECT 1 FROM json_each(${payload},'$.people') p WHERE json_extract(p.value,'$.id')=json_extract(a.value,'$.driverId')))
 OR (${field('accountFormatVersion')} IN (3,4,5) AND json_type(a.value,'$.accountFormatVersion') IN ('integer','real') AND json_extract(a.value,'$.accountFormatVersion') IN (3,4)
 AND json_type(a.value,'$.accountKind')='text' AND json_extract(a.value,'$.accountKind')='self-user'
 AND json_type(a.value,'$.role')='text' AND json_extract(a.value,'$.role')='user' AND json_type(a.value,'$.active')='false'
 AND json_type(a.value,'$.status')='text' AND json_extract(a.value,'$.status') IN ('ACTIVE','DISABLED','REJECTED') AND json_type(a.value,'$.personProvisioning') IS NULL
 AND ((json_extract(a.value,'$.accountFormatVersion')=3 AND json_type(a.value,'$.driverId')='null' AND json_type(a.value,'$.personVerification') IS NULL)
 OR (${field('accountFormatVersion')} IN (4,5) AND json_extract(a.value,'$.accountFormatVersion')=4 AND ${nonempty('driverId')}
 AND json_type(a.value,'$.personVerification')='object' AND (SELECT COUNT(*) FROM json_each(a.value,'$.personVerification'))=3
 AND json_type(a.value,'$.personVerification.personId')='text' AND json_extract(a.value,'$.personVerification.personId')=json_extract(a.value,'$.driverId')
 AND json_type(a.value,'$.personVerification.verifiedBy')='text' AND length(json_extract(a.value,'$.personVerification.verifiedBy'))>0
 AND json_type(a.value,'$.personVerification.verifiedAt')='text' AND strftime('%Y-%m-%dT%H:%M:%fZ',json_extract(a.value,'$.personVerification.verifiedAt'))=json_extract(a.value,'$.personVerification.verifiedAt')
 AND (SELECT COUNT(*) FROM json_each(${payload},'$.people') p WHERE json_extract(p.value,'$.id')=json_extract(a.value,'$.driverId'))=1
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') other WHERE other.key<>a.key AND json_extract(other.value,'$.driverId')=json_extract(a.value,'$.driverId'))
 AND (json_extract(a.value,'$.personVerification.verifiedBy')='admin' OR EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') reviewer WHERE json_extract(reviewer.value,'$.id')=json_extract(a.value,'$.personVerification.verifiedBy')))))
 AND ${absent(selfForbidden,'a.value')}) OR (${systemAccount}))
 ),0))
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') a GROUP BY json_extract(a.value,'$.id') HAVING COUNT(*)>1)
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') a GROUP BY json_extract(a.value,'$.username') HAVING COUNT(*)>1)`;
 return `CASE WHEN json_valid(${payload}) THEN COALESCE((${allowed}),0) ELSE 0 END`;
}
