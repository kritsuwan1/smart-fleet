import type {Fleet} from './fleet';
export class AccountCompatibilityError extends Error {
 constructor(){super('ACCOUNT_FORMAT_UNSUPPORTED');}
}
const fail=():never=>{throw new AccountCompatibilityError();};
const object=(v:unknown):v is Record<string,any>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0;
const integer=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export const stateSecurityFields=['format','formatVersion','authorizationVersion','accountSchemaVersion','policyVersion','security'] as const;
export const accountSecurityFields=['format','formatVersion','accountFormatVersion','accountKind','authorizationVersion','accountSchemaVersion','policyVersion','status','approvalStatus','personId','personLink','identityVerification','personVerification','accessRevision','origin','revision'] as const;
export const isSelfAccount=(a:any):boolean=>object(a)&&[3,4].includes(a.accountFormatVersion)&&a.accountKind==='self-user';
export const isLinkedAccount=(a:any):boolean=>isSelfAccount(a)&&a.accountFormatVersion===4;
export const accountEnabled=(a:any):boolean=>isSelfAccount(a)?a.status==='ACTIVE':a.active===true;
const selfForbidden=accountSecurityFields.filter(k=>!['accountFormatVersion','accountKind','status','personVerification'].includes(k));
function assertSelfAccount(a:any):void{
 if(!isSelfAccount(a)||a.role!=='user'||a.active!==false||!['ACTIVE','DISABLED','REJECTED'].includes(a.status)||selfForbidden.some(k=>k in a))return fail();
 if(a.accountFormatVersion===3){if(a.driverId!==null||'personVerification' in a)return fail();}
 else{const v=a.personVerification;if(!text(a.driverId)||!object(v)||Object.keys(v).sort().join(',')!=='personId,verifiedAt,verifiedBy'||v.personId!==a.driverId||!text(v.verifiedBy)||typeof v.verifiedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v.verifiedAt)||!Number.isFinite(Date.parse(v.verifiedAt))||new Date(v.verifiedAt).toISOString()!==v.verifiedAt)return fail();}
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
  'accountFormatVersion' in value&&![1,3,4].includes(value.accountFormatVersion)||
  !['cars','people','trips','audit','projects'].every(k=>Array.isArray(value[k]))||typeof value.imported!=='boolean')return fail();
 if('sessionKey' in value&&!text(value.sessionKey))return fail();
 if(value.accounts!==undefined&&!Array.isArray(value.accounts))return fail();
 const people=new Set<string>();
 for(const p of value.people){if(!object(p)||!text(p.id))return fail();people.add(p.id);}
 const ids=new Set<string>(),names=new Set<string>();
 for(const a of value.accounts||[]){
  const self=isSelfAccount(a);if(self){assertSelfAccount(a);if(![3,4].includes(value.accountFormatVersion)||isLinkedAccount(a)&&value.accountFormatVersion!==4)return fail();}else legacyAccountRole(a);
  if(isLinkedAccount(a)&&(value.people.filter((p:any)=>p.id===a.driverId).length!==1||value.accounts.some((other:any)=>other.id!==a.id&&other.driverId===a.driverId)||a.personVerification.verifiedBy!=='admin'&&!value.accounts.some((r:any)=>r.id===a.personVerification.verifiedBy)))return fail();
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
 const allowed=`json_valid(${payload}) AND json_type(${payload})='object' AND ${absent(stateSecurityFields,payload)}
 AND (${type('accountFormatVersion')} IS NULL OR (${type('accountFormatVersion')} IN ('integer','real') AND ${field('accountFormatVersion')} IN (1,3,4)))
 AND ${['cars','people','trips','audit','projects'].map(k=>`${type(k)}='array'`).join(' AND ')}
 AND ${type('imported')} IN ('true','false') AND (${type('accounts')} IS NULL OR ${type('accounts')}='array')
 AND (${type('sessionKey')} IS NULL OR (${type('sessionKey')}='text' AND length(${field('sessionKey')})>0))
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.people') p WHERE p.type<>'object' OR COALESCE(json_type(p.value,'$.id'),'missing')<>'text' OR length(json_extract(p.value,'$.id'))=0)
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') a WHERE a.type<>'object' OR NOT COALESCE((
 ${['id','username','name','salt','passwordHash'].map(nonempty).join(' AND ')}
 AND json_extract(a.value,'$.id')<>'admin' AND json_extract(a.value,'$.username')<>'admin'
 AND json_type(a.value,'$.active') IN ('true','false')
 AND json_type(a.value,'$.passwordVersion') IN ('integer','real') AND json_extract(a.value,'$.passwordVersion') BETWEEN 0 AND 9007199254740991
 AND CAST(json_extract(a.value,'$.passwordVersion') AS INTEGER)=json_extract(a.value,'$.passwordVersion')
 AND (( ${absent(accountSecurityFields,'a.value')}
 AND (json_type(a.value,'$.role') IS NULL OR (json_type(a.value,'$.role')='text' AND json_extract(a.value,'$.role') IN ('admin','employee')))
 AND ${nonempty('driverId')} AND EXISTS(SELECT 1 FROM json_each(${payload},'$.people') p WHERE json_extract(p.value,'$.id')=json_extract(a.value,'$.driverId')))
 OR (${field('accountFormatVersion')} IN (3,4) AND json_type(a.value,'$.accountFormatVersion') IN ('integer','real') AND json_extract(a.value,'$.accountFormatVersion') IN (3,4)
 AND json_type(a.value,'$.accountKind')='text' AND json_extract(a.value,'$.accountKind')='self-user'
 AND json_type(a.value,'$.role')='text' AND json_extract(a.value,'$.role')='user' AND json_type(a.value,'$.active')='false'
 AND json_type(a.value,'$.status')='text' AND json_extract(a.value,'$.status') IN ('ACTIVE','DISABLED','REJECTED')
 AND ((json_extract(a.value,'$.accountFormatVersion')=3 AND json_type(a.value,'$.driverId')='null' AND json_type(a.value,'$.personVerification') IS NULL)
 OR (${field('accountFormatVersion')}=4 AND json_extract(a.value,'$.accountFormatVersion')=4 AND ${nonempty('driverId')}
 AND json_type(a.value,'$.personVerification')='object' AND (SELECT COUNT(*) FROM json_each(a.value,'$.personVerification'))=3
 AND json_type(a.value,'$.personVerification.personId')='text' AND json_extract(a.value,'$.personVerification.personId')=json_extract(a.value,'$.driverId')
 AND json_type(a.value,'$.personVerification.verifiedBy')='text' AND length(json_extract(a.value,'$.personVerification.verifiedBy'))>0
 AND json_type(a.value,'$.personVerification.verifiedAt')='text' AND strftime('%Y-%m-%dT%H:%M:%fZ',json_extract(a.value,'$.personVerification.verifiedAt'))=json_extract(a.value,'$.personVerification.verifiedAt')
 AND (SELECT COUNT(*) FROM json_each(${payload},'$.people') p WHERE json_extract(p.value,'$.id')=json_extract(a.value,'$.driverId'))=1
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') other WHERE other.key<>a.key AND json_extract(other.value,'$.driverId')=json_extract(a.value,'$.driverId'))
 AND (json_extract(a.value,'$.personVerification.verifiedBy')='admin' OR EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') reviewer WHERE json_extract(reviewer.value,'$.id')=json_extract(a.value,'$.personVerification.verifiedBy')))))
 AND ${absent(selfForbidden,'a.value')}))
 ),0))
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') a GROUP BY json_extract(a.value,'$.id') HAVING COUNT(*)>1)
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') a GROUP BY json_extract(a.value,'$.username') HAVING COUNT(*)>1)`;
 return `CASE WHEN json_valid(${payload}) THEN COALESCE((${allowed}),0) ELSE 0 END`;
}
