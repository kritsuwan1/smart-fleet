-- Raw template is strict. Only the verified provider planner enables the reserved branch.
-- Read schema metadata only; never query or modify reserved-table contents.
SELECT json(CASE WHEN
 EXISTS(SELECT 1 FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' GROUP BY name HAVING COUNT(*)>1)
 OR EXISTS (
 SELECT 1 FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*'
 AND NOT COALESCE((type='table' AND name='fleet_store' AND tbl_name='fleet_store'
 AND lower(replace(replace(replace(replace(sql,' ',''),char(9),''),char(10),''),char(13),''))=
 'createtablefleet_store(idtextprimarykeynotnull,payloadtextnotnull,versionintegernotnulldefault0)')
 OR (/* VERIFIED_D1_RESERVED_CONTEXT */ 0=1
 AND type='table' COLLATE BINARY AND name='_cf_KV' COLLATE BINARY AND tbl_name='_cf_KV' COLLATE BINARY
 AND sql='CREATE TABLE _cf_KV ( key TEXT PRIMARY KEY, value BLOB ) WITHOUT ROWID' COLLATE BINARY),0)
) THEN 'INITIALIZATION_REFUSED_UNEXPECTED_SCHEMA' ELSE 'null' END);
-- REVIEW ONLY. Run only after verifying the existing STAGING D1 identity.
-- Existing schema structure, not a migration. Never run against Production.
CREATE TABLE IF NOT EXISTS fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);
-- Repeated or occupied targets are rejected, never reset or overwritten.
SELECT json(CASE WHEN EXISTS(SELECT 1 FROM fleet_store)
 THEN 'INITIALIZATION_REFUSED_OCCUPIED' ELSE 'null' END);
-- Both rows are inserted by one statement only if the table is completely empty.
-- Re-running or using any occupied/marked database fails before insertion.
INSERT INTO fleet_store(id,payload,version)
SELECT id,payload,0 FROM (
 SELECT 'environment' AS id,'demo' AS payload
 UNION ALL
 SELECT 'main',json_set('{"cars":[{"id":"staging-car-1","plate":"SYNTHETIC-001","province":"ทดสอบ","model":"Synthetic test vehicle","initialOdo":100,"active":true}],"people":[{"id":"p1","name":"พนักงานทดสอบ 1","active":true}],"projects":["Synthetic staging project"],"trips":[],"audit":[],"accounts":[],"imported":false}','$.sessionKey',lower(hex(randomblob(32))))
) WHERE NOT EXISTS(SELECT 1 FROM fleet_store);
