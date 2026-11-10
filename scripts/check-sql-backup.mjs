// Rehearse restoration entirely in a new in-memory SQLite database.
// Usage from source/: node --experimental-sqlite scripts/check-sql-backup.mjs /path/to/backup.sql
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const path=process.argv[2];
if(!path){console.error('ระบุไฟล์ SQL สำรองของ Smart Fleet ที่ต้องการทดสอบ');process.exit(1);}
const db=new DatabaseSync(':memory:');
try{
 const text=await readFile(path,'utf8');
 // Accept only the SQL statement shapes emitted by this app; no arbitrary SQL or attachments.
 const matches=text.replace(/^--[^\n]*$/gm,'').match(/'(?:(?:'')|[^'])*'|[^';]+|;/g)||[];
 let statement='';const statements=[];
 for(const part of matches){if(part.startsWith('--'))continue;if(part===';'){if(statement.trim())statements.push(statement.trim());statement='';}else statement+=part;}
 if(statement.trim())throw Error('ไฟล์ SQL ไม่ครบ');
 const built=await build({stdin:{contents:`export {createBackup,inspectBackup} from './src/backup';export {operationalAccountsSql} from './src/account-compatibility';`,resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,write:false,format:'esm',platform:'node'});
 const {createBackup,inspectBackup,operationalAccountsSql}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 const guard=`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fleet_store WHERE id='main' AND NOT (${operationalAccountsSql('payload')})) THEN 1 ELSE json('ACCOUNT_FORMAT_UNSUPPORTED') END`;
 // Exact generated v1 statement from cdd610e; permits legacy backup rehearsal without broad SELECT acceptance.
 const selfUserGuardSha='1f2825a98600bbb3f1aa6a3c75f652d3419e16d7bff282e2042b104f870baffd';
 const legacyGuardSha='8ec22b69bbe7891d2642d79c4336102b887e7f1712cce4e43800082b10ad0229';
 const allowed=[/^CREATE TABLE IF NOT EXISTS fleet_store\(/i,/^INSERT OR REPLACE INTO fleet_store\(id,payload,version\) VALUES\(/i,/^UPDATE fleet_store SET payload=payload \|\| '/i,/^INSERT INTO fleet_store\(id,payload,version\) SELECT 'main',json_set\(payload,/i,/^DELETE FROM fleet_store WHERE id=/i];
 // Also reject extra SQL tokens hidden after an otherwise-valid prefix.
 for(const line of statements){
  const withoutStrings=line.replace(/'(?:(?:'')|[^'])*'/g,"''");
  // Frozen guards contain only inter-token line breaks. Canonicalize CRLF for
  // Windows checkouts; keep exact pins, current policy and payload SQL unchanged.
  const frozenHash=createHash('sha256').update(line.replace(/\r\n/g,'\n')).digest('hex');
  if(!(line===guard||frozenHash===legacyGuardSha||frozenHash===selfUserGuardSha||allowed.some(pattern=>pattern.test(line)))||/\b(ATTACH|DETACH|PRAGMA|DROP|ALTER|load_extension|readfile|writefile)\b/i.test(withoutStrings))throw Error('รองรับเฉพาะ SQL สำรองที่สร้างจาก Smart Fleet');
 }
 const environment=/^-- environment: demo$/m.test(text)?'demo':'production';
 if(environment==='demo'){db.exec("CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0); INSERT INTO fleet_store VALUES('environment','demo',0)");}
 db.exec(text);
 const row=db.prepare("SELECT payload FROM fleet_store WHERE id='main'").get();if(!row)throw Error('ไม่มีข้อมูลหลักในไฟล์ SQL');
 const summary=await inspectBackup(JSON.stringify(await createBackup(JSON.parse(row.payload),'SQL restore test',environment)));
 console.log('ทดสอบกู้คืน SQL ในฐานข้อมูลจำลองสำเร็จ ไม่ได้เชื่อมต่อหรือแก้ไข Production');
 console.log(`รถ ${summary.cars} คัน · พนักงาน ${summary.people} คน · การเดินทาง ${summary.trips} รายการ · ยังไม่คืน ${summary.open} · บัญชี ${summary.accounts} · ประวัติแก้ไข ${summary.audit}`);
}catch(e){console.error('ทดสอบไม่ผ่าน:',e.message);process.exitCode=1;}finally{db.close();}
