// Interactive SYNTHETIC rehearsal only. No live entry point or actual bootstrap.
import {readFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {createSyntheticOperatorFixture,prepareOperatorOfflineVerifier,validateOfflineEnvironmentNames} from './d1-operator-offline.mjs';

async function main(){
 const args=process.argv.slice(2);
 if(args.length!==2||!['staging','recovery'].includes(args[0])||args[1]!=='--synthetic-rehearsal')throw Error('PREREQUISITES');
 // A piped answer, flag, agent callback or CI cannot substitute for an operator.
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw Error('INTERACTIVE_REQUIRED');
 validateOfflineEnvironmentNames(Object.keys(process.env)); // names only, no values
 const target=args[0],path=target==='staging'?'staging-no-r2':'recovery-d1';
 const config=JSON.parse((await readFile(new URL('../config/'+path+'.example.jsonc',import.meta.url),'utf8')).replace(/^\s*\/\/.*$/gm,''));
 const verifier=prepareOperatorOfflineVerifier({target,config,fixture:createSyntheticOperatorFixture()});
 const preview=verifier.presentation();
 console.log(preview.text);
 console.log('Operator/host/storage prerequisites are SIMULATED. No real authority is established.');
 const ui=createInterface({input:process.stdin,output:process.stdout});
 try{
  const answer=await ui.question('Type the exact confirmation displayed above, or cancel: ');
  const result=await verifier.run(answer);
  console.log(JSON.stringify({mode:'offline-synthetic',status:result.status,evidence:JSON.parse(result.content),receiptSha256:result.receiptSha256,liveReady:false}));
  if(result.status!=='PASS')process.exitCode=1;
 }finally{ui.close();}
}
main().catch(()=>{console.error('REFUSED: offline prerequisites/interactive confirmation not established; Live NOT_READY.');process.exitCode=1;});
