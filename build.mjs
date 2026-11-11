import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
let esbuild;
try {esbuild=require('esbuild');}catch {esbuild=require(process.env.FLEET_ESBUILD_PATH);}
const {build}=esbuild;
import fs from 'node:fs/promises';
for(const mode of ['demo','production','staging']){
 const define={'__FLEET_RECOVERY__':'false','process.env.NODE_ENV':'"production"','__FLEET_ENV__':JSON.stringify(mode)};
 await build({entryPoints:['src/client.tsx'],outfile:'src/client.bundle.txt',bundle:true,minify:true,format:'iife',target:'es2022',jsx:'automatic',define,nodePaths:[process.env.FLEET_NODE_MODULES||resolve('node_modules')]});
 const outfile=`output/worker-${mode}.js`;
 await build({entryPoints:['src/worker.ts'],outfile,bundle:true,minify:true,format:'esm',target:'es2022',define,loader:{'.txt':'text','.css':'text','.svg':'text'},legalComments:'eof'});
 if(mode==='production')await fs.copyFile(outfile,'output/worker.js');
 console.log(mode+': '+(await fs.stat(outfile)).size+' bytes');
}
