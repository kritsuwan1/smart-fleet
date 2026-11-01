export function backupSQL(payload:string,environment:string,version:string,exportedAt=new Date().toISOString()){
 const q=(s:string)=>"'"+s.replaceAll("'","''")+"'";
 const id='restore-'+crypto.randomUUID();const restoreGuard=environment==='demo'?"(SELECT payload FROM fleet_store WHERE id='environment')='demo'":"COALESCE((SELECT payload FROM fleet_store WHERE id='environment'),'production')='production'";
 const lines=['-- Smart Fleet '+version+' backup '+exportedAt,'-- environment: '+environment,'-- PRIVATE: contains salted password hashes and session-signing material. Keep offline and private.','-- Restores all fleet data AND employee accounts. Existing main state is replaced only after valid JSON staging.','CREATE TABLE IF NOT EXISTS fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);',`INSERT OR REPLACE INTO fleet_store(id,payload,version) VALUES(${q(id)},'',0);`];
 for(let i=0;i<payload.length;i+=10000)lines.push(`UPDATE fleet_store SET payload=payload || ${q(payload.slice(i,i+10000))} WHERE id=${q(id)};`);
 lines.push(`INSERT INTO fleet_store(id,payload,version) SELECT 'main',json_set(payload,'$.sessionKey',lower(hex(randomblob(32)))),0 FROM fleet_store WHERE id=${q(id)} AND json_valid(payload) AND ${restoreGuard} ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=fleet_store.version+1;`,`DELETE FROM fleet_store WHERE id=${q(id)};`);
 return lines.join('\n');
}
