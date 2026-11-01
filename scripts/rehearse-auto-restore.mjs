// Offline only: never connects to Cloudflare. Input is a PRIVATE automatic-backup JSON.
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
if(!process.argv[2]){console.error('Usage: node --experimental-sqlite scripts/rehearse-auto-restore.mjs PRIVATE_BACKUP.json');process.exit(1);}
const db=new DatabaseSync(':memory:');
try{
 db.exec(await readFile(new URL('../schema.sql',import.meta.url),'utf8'));
 db.prepare('INSERT INTO fleet_store VALUES (?,?,0)').run('environment','demo');
 const adapter={prepare(q){const stmt=db.prepare(q);let args=[];return{bind(...a){args=a;return this;},async first(){return stmt.get(...args)||null;},async run(){return{meta:{changes:Number(stmt.run(...args).changes)}};}};}};
 const module=await build({entryPoints:['src/automatic-backup.ts'],bundle:true,write:false,platform:'node',format:'esm',define:{__FLEET_ENV__:'"demo"'}});
 const {restoreAutomaticBackupToStaging}=await import('data:text/javascript;base64,'+Buffer.from(module.outputFiles[0].text).toString('base64'));
 const result=await restoreAutomaticBackupToStaging(adapter,await readFile(process.argv[2],'utf8'),'staging');
 console.log('PASS offline staging restore rehearsal:',JSON.stringify(result));
}catch{console.error('FAIL offline restore rehearsal: backup invalid or staging target rejected');process.exitCode=1;}finally{db.close();}
