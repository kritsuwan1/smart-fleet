"""Offline deterministic ZIP_STORED package; never deploys or accesses credentials."""
from pathlib import Path
import argparse,hashlib,json,zipfile,subprocess
p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args()
root=Path(__file__).resolve().parent.parent;out=Path(args.output)
assert out.is_absolute() and out.suffix=='.zip' and not out.exists(), 'NEW_ABSOLUTE_ZIP_REQUIRED'
assert not out.resolve().is_relative_to(root.resolve()), 'ARCHIVE_MUST_BE_OUTSIDE_REPOSITORY'
base=root/'output'/'recovery';m=json.loads((base/'manifest.json').read_text(encoding='utf-8'));a=json.loads((base/'acceptance.json').read_text(encoding='utf-8'))
assert a['all']=='PASS' and a['cases']>=34 and a['externalCalls']==0
assert a['sourceTreeSHA256']==m['sourceTreeSHA256'] and a['workerSHA256']==next(f['sha256'] for f in m['payloads'] if f['name']=='worker.mjs'), 'STALE_ACCEPTANCE_EVIDENCE'
payload={name:(base/name).read_bytes() for name in ('worker.mjs','wrangler.recovery.jsonc','acceptance.json')}
payload['verify.mjs']=(root/'scripts/verify-recovery.mjs').read_bytes();payload['pins/package-lock.json']=(root/'package-lock.json').read_bytes()
payload['RUNBOOK.md']=(root/'docs/RECOVERY_BUILD.md').read_bytes();payload['CHECKLIST.md']=(root/'docs/RECOVERY_ACCEPTANCE.md').read_bytes()
assert all(hashlib.sha256(payload[f['name']]).hexdigest()==f['sha256'] for f in m['payloads'])
m['payloads']=[{'name':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for name,b in sorted(payload.items())]
m['acceptance']={'offline':'PASS','cases':a['cases'],'independentOperator':'PENDING','newSourceCommit':m['sourceCommit'] or 'UNCOMMITTED_LOCAL_SOURCE','exactNewCommitLinuxCI':'NOT_VERIFIED'}
payload['manifest.json']=(json.dumps(m,ensure_ascii=False,indent=2)+'\n').encode()
content=out.parent/(out.stem+'-content');content.mkdir(parents=False,exist_ok=False)
for name,b in payload.items():
 target=content/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b)
subprocess.run(['node',str(content/'verify.mjs')],check=True,cwd=content)
def archive(path):
 with zipfile.ZipFile(path,'x',compression=zipfile.ZIP_STORED) as z:
  for name,b in sorted(payload.items()):
   info=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0));info.create_system=3;info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_STORED;z.writestr(info,b)
archive(out);repeat=out.with_suffix('.repro-check.zip');archive(repeat)
assert out.read_bytes()==repeat.read_bytes(),'ARCHIVE_NONDETERMINISTIC'
print(json.dumps({'artifact':str(out),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'archiveReproducibility':'PASS','operatorAcceptance':'PENDING','overall':'NOT_READY'}))
