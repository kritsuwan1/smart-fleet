import {readFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=dirname(fileURLToPath(import.meta.url));
try{
 const m=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
 if(m.format!=='smartfleet-recovery-candidate-v1'||!(m.sourceCommit===null||/^[a-f0-9]{40}$/.test(m.sourceCommit))||!/^[a-f0-9]{64}$/.test(m.sourceTreeSHA256))throw Error();
 const allowed=new Set(['worker.mjs','wrangler.recovery.jsonc','acceptance.json','RUNBOOK.md','CHECKLIST.md','verify.mjs','pins/package-lock.json']);
 if(m.payloads.length!==allowed.size||new Set(m.payloads.map(x=>x.name)).size!==allowed.size)throw Error();
 for(const f of m.payloads){if(!allowed.has(f.name))throw Error();const b=await readFile(resolve(root,f.name));if(b.length!==f.bytes||createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error();}
 const walk=async(dir,prefix='')=>{let names=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.isSymbolicLink())throw Error();const p=prefix+e.name;if(e.isDirectory())names.push(...await walk(resolve(dir,e.name),p+'/'));else if(e.isFile())names.push(p);else throw Error()}return names};
 const actual=await walk(root);if(actual.length!==allowed.size+1||actual.some(f=>f!=='manifest.json'&&!allowed.has(f)))throw Error();
 const c=JSON.parse(await readFile(resolve(root,'wrangler.recovery.jsonc'),'utf8'));if(c.name!=='smart-fleet'||c.main!=='worker.mjs'||Object.keys(c.vars||{}).length)throw Error();
 if(JSON.stringify(c.d1_databases)!==JSON.stringify([{binding:'DB',database_name:'smart-fleet-production',database_id:'ebbca318-17d1-4486-b925-d6c787472ba5'},{binding:'BACKUP_DB',database_name:'smart-fleet-production-backups',database_id:'7f598b1a-b263-4305-8f43-409d0dcf08f3'}]))throw Error();
 const a=JSON.parse(await readFile(resolve(root,'acceptance.json'),'utf8'));if(a.all!=='PASS'||a.cases<34||a.externalCalls!==0||a.sourceTreeSHA256!==m.sourceTreeSHA256||a.workerSHA256!==m.payloads.find(f=>f.name==='worker.mjs').sha256)throw Error();
 if(m.payloads.find(f=>f.name==='pins/package-lock.json').sha256!==m.lockfileSHA256)throw Error();
 console.log('PASS: candidate file allowlist, SHA-256, configuration and offline evidence. Independent acceptance/exact-commit CI still required; NOT_READY.');
}catch{console.error('FAIL: recovery candidate verification; no deployment performed.');process.exitCode=1;}
