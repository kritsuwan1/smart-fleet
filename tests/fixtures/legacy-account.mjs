// Synthetic historical accounts only. Never called by the application or a registration route.
import {build} from 'esbuild';
const built=await build({stdin:{contents:"export {hashPassword} from './src/auth';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {hashPassword}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
export async function seedLegacyAccount(sql,{name,username,password,role='employee'}){
 if(sql.prepare('PRAGMA database_list').all().some(d=>d.file))throw Error('IN_MEMORY_FIXTURE_REQUIRED');
 const row=sql.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").get();
 const s=JSON.parse(row.payload),id=crypto.randomUUID(),driverId='legacy-person-'+id,salt=crypto.randomUUID();
 const a={id,name,username,role,driverId,active:true,salt,passwordHash:await hashPassword(password,salt),passwordVersion:0,createdAt:'2026-11-01T00:00:00Z'};
 s.people.push({id:driverId,name,active:true});s.accounts??=[];s.accounts.push(a);
 s.audit.unshift({id:crypto.randomUUID(),time:'2026-11-01T00:00:00Z',actor:name,action:'สมัครบัญชีพนักงาน',before:null,after:{id,username,name,driverId}});
 const result=sql.prepare("UPDATE fleet_store SET payload=?,version=version+1 WHERE id='main' AND version=?").run(JSON.stringify(s),row.version);
 if(result.changes!==1)throw Error('SYNTHETIC_FIXTURE_CONFLICT');return a;
}

// Historical v1.1 unlinked snapshots, not a registration API or runtime adapter.
export async function seedUnlinkedAccount(sql,{name,username,password}){
 if(sql.prepare('PRAGMA database_list').all().some(d=>d.file))throw Error('IN_MEMORY_FIXTURE_REQUIRED');
 const row=sql.prepare("SELECT payload,version FROM fleet_store WHERE id='main'").get(),s=JSON.parse(row.payload),salt=crypto.randomUUID();
 const a={id:crypto.randomUUID(),name,username,driverId:null,role:'user',active:false,status:'ACTIVE',accountFormatVersion:3,accountKind:'self-user',passwordVersion:0,salt,passwordHash:await hashPassword(password,salt),createdAt:'2026-11-10T00:00:00.000Z'};
 s.accounts??=[];s.accounts.push(a);if(![4,5].includes(s.accountFormatVersion))s.accountFormatVersion=3;
 s.audit.unshift({id:crypto.randomUUID(),time:a.createdAt,actor:name,action:'Synthetic historical unlinked User',before:null,after:{id:a.id,role:'user',personLinked:false}});
 const result=sql.prepare("UPDATE fleet_store SET payload=?,version=version+1 WHERE id='main' AND version=?").run(JSON.stringify(s),row.version);
 if(result.changes!==1)throw Error('SYNTHETIC_FIXTURE_CONFLICT');return a;
}
