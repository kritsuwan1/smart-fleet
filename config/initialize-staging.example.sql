-- REVIEW ONLY. Run only after verifying the existing STAGING D1 identity.
-- Existing schema structure, not a migration. Never run against Production.
CREATE TABLE IF NOT EXISTS fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);
-- Both rows are inserted by one statement only if the table is completely empty.
-- Re-running or using any occupied/marked database inserts zero rows.
INSERT INTO fleet_store(id,payload,version)
SELECT id,payload,0 FROM (
 SELECT 'environment' AS id,'demo' AS payload
 UNION ALL
 SELECT 'main',json_set('{"cars":[{"id":"staging-car-1","plate":"SYNTHETIC-001","province":"ทดสอบ","model":"Synthetic test vehicle","initialOdo":100,"active":true}],"people":[{"id":"p1","name":"พนักงานทดสอบ 1","active":true}],"projects":["Synthetic staging project"],"trips":[],"audit":[],"accounts":[],"imported":false}','$.sessionKey',lower(hex(randomblob(32))))
) WHERE NOT EXISTS(SELECT 1 FROM fleet_store);
