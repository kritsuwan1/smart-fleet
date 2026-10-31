import {readFile,writeFile} from 'node:fs/promises';

const target=process.env.FLEET_DEPLOY_TARGET;
if(!['demo','production'].includes(target))throw Error('Select demo or production.');
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw Error('Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in GitHub repository secrets.');
if(!/^[a-f0-9]{32}$/i.test(account))throw Error('Cloudflare Account ID must be 32 hexadecimal characters.');
const config=JSON.parse(await readFile(`wrangler.${target}.jsonc`,'utf8'));
const production=JSON.parse(await readFile('wrangler.production.jsonc','utf8'));
if(target==='demo')config.d1_databases[0].database_id=process.env.FLEET_DEMO_DATABASE_ID||'';
const id=config.d1_databases[0].database_id;
if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw Error('Set repository variable DEMO_DATABASE_ID to the actual existing Demo D1 database ID.');
if(target==='demo'&&id===production.d1_databases[0].database_id)throw Error('Demo database must differ from Production.');

// Read metadata only: never initialize, restore or modify a database.
const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${config.name}/settings`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error(`Cannot read existing Worker ${config.name} (HTTP ${response.status}). Check account, token permissions and Worker name.`);
const data=await response.json();
if(data.success!==true)throw Error('Cloudflare rejected the Worker settings request.');
const binding=data.result?.bindings?.find(b=>b.type==='d1'&&b.name===config.d1_databases[0].binding);
if(!binding||binding.id!==id)throw Error('Existing D1 binding does not match this deployment. Check the selected environment and DEMO_DATABASE_ID before continuing.');
config.account_id=account;
await writeFile('.deploy.config.json',JSON.stringify(config,null,2)+'\n',{mode:0o600});
console.log(`Ready to update existing Worker: ${config.name} (${target}). Database binding verified.`);
