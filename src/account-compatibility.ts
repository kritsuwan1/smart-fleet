import type {Fleet} from './fleet';
export class AccountCompatibilityError extends Error {
 constructor(){super('ACCOUNT_FORMAT_UNSUPPORTED');}
}
const fail=():never=>{throw new AccountCompatibilityError();};
const object=(v:unknown):v is Record<string,any>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0;
const integer=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export const stateSecurityFields=['format','formatVersion','authorizationVersion','accountSchemaVersion','policyVersion','security'] as const;
export const accountSecurityFields=['format','formatVersion','accountFormatVersion','authorizationVersion','accountSchemaVersion','policyVersion','status','approvalStatus','personId','accessRevision','origin','revision'] as const;

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
  'accountFormatVersion' in value&&value.accountFormatVersion!==1||
  !['cars','people','trips','audit','projects'].every(k=>Array.isArray(value[k]))||typeof value.imported!=='boolean')return fail();
 if('sessionKey' in value&&!text(value.sessionKey))return fail();
 if(value.accounts!==undefined&&!Array.isArray(value.accounts))return fail();
 const people=new Set<string>();
 for(const p of value.people){if(!object(p)||!text(p.id))return fail();people.add(p.id);}
 const ids=new Set<string>(),names=new Set<string>();
 for(const a of value.accounts||[]){
  legacyAccountRole(a);
  if(!text(a.id)||a.id==='admin'||ids.has(a.id)||!text(a.username)||a.username==='admin'||names.has(a.username)||
   !text(a.name)||typeof a.active!=='boolean'||!integer(a.passwordVersion)||!text(a.salt)||!text(a.passwordHash)||
   !text(a.driverId)||!people.has(a.driverId))return fail();
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
 AND (${type('accountFormatVersion')} IS NULL OR (${type('accountFormatVersion')} IN ('integer','real') AND ${field('accountFormatVersion')}=1))
 AND ${['cars','people','trips','audit','projects'].map(k=>`${type(k)}='array'`).join(' AND ')}
 AND ${type('imported')} IN ('true','false') AND (${type('accounts')} IS NULL OR ${type('accounts')}='array')
 AND (${type('sessionKey')} IS NULL OR (${type('sessionKey')}='text' AND length(${field('sessionKey')})>0))
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.people') p WHERE p.type<>'object' OR COALESCE(json_type(p.value,'$.id'),'missing')<>'text' OR length(json_extract(p.value,'$.id'))=0)
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') a WHERE a.type<>'object' OR NOT COALESCE((
 ${absent(accountSecurityFields,'a.value')}
 AND (json_type(a.value,'$.role') IS NULL OR (json_type(a.value,'$.role')='text' AND json_extract(a.value,'$.role') IN ('admin','employee')))
 AND ${['id','username','name','salt','passwordHash','driverId'].map(nonempty).join(' AND ')}
 AND json_extract(a.value,'$.id')<>'admin' AND json_extract(a.value,'$.username')<>'admin'
 AND json_type(a.value,'$.active') IN ('true','false')
 AND json_type(a.value,'$.passwordVersion') IN ('integer','real') AND json_extract(a.value,'$.passwordVersion') BETWEEN 0 AND 9007199254740991
 AND CAST(json_extract(a.value,'$.passwordVersion') AS INTEGER)=json_extract(a.value,'$.passwordVersion')
 AND EXISTS(SELECT 1 FROM json_each(${payload},'$.people') p WHERE json_extract(p.value,'$.id')=json_extract(a.value,'$.driverId'))
 ),0))
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') a GROUP BY json_extract(a.value,'$.id') HAVING COUNT(*)>1)
 AND NOT EXISTS(SELECT 1 FROM json_each(${payload},'$.accounts') a GROUP BY json_extract(a.value,'$.username') HAVING COUNT(*)>1)`;
 return `CASE WHEN json_valid(${payload}) THEN COALESCE((${allowed}),0) ELSE 0 END`;
}
