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
-- REVIEW ONLY. Verify existing RECOVERY D1 identity; never bind it to the app.
CREATE TABLE IF NOT EXISTS fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);
-- Repeated or occupied targets are rejected, never reset or overwritten.
SELECT json(CASE WHEN EXISTS(SELECT 1 FROM fleet_store)
 THEN 'INITIALIZATION_REFUSED_OCCUPIED' ELSE 'null' END);
INSERT INTO fleet_store(id,payload,version)
SELECT 'environment','demo',0 WHERE NOT EXISTS(SELECT 1 FROM fleet_store);
-- No main row: the recovery helper requires an empty target.
