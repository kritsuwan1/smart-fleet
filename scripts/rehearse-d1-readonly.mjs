// Offline rehearsal only. No auth setup, environment credential reads or live flag.
import {readFile} from 'node:fs/promises';
import {createD1ReadonlyBroker} from './d1-readonly-broker.mjs';
const target=process.argv[2];
if(process.argv.length!==3||!['staging','recovery'].includes(target)){
 console.error('Usage: node scripts/rehearse-d1-readonly.mjs staging|recovery (MOCK ONLY)');process.exitCode=1;
}else{
 try{
  const file=target==='staging'?'staging-no-r2':'recovery-d1';
  const config=JSON.parse((await readFile(new URL('../config/'+file+'.example.jsonc',import.meta.url),'utf8')).replace(/^\s*\/\/.*$/gm,''));
  const broker=createD1ReadonlyBroker({target,config});
  const evidence=await broker.run(),saved=await broker.saveEvidence();
  console.log(JSON.stringify({mode:'mock',target,status:evidence.status,liveVerification:'NOT_VERIFIED',...saved}));
 }catch{console.error('Mock D1 rehearsal refused; no live verification performed.');process.exitCode=1;}
}
