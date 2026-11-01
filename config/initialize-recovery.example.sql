-- Fail closed BEFORE DDL if any unexpected user schema object exists.
-- Invalid JSON deliberately aborts execution; operators must stop on the first error.
SELECT json(CASE WHEN EXISTS (
 SELECT 1 FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*'
 AND NOT (type='table' AND name='fleet_store' AND tbl_name='fleet_store'
 AND lower(replace(replace(replace(replace(sql,' ',''),char(9),''),char(10),''),char(13),''))=
 'createtablefleet_store(idtextprimarykeynotnull,payloadtextnotnull,versionintegernotnulldefault0)')
) THEN 'INITIALIZATION_REFUSED_UNEXPECTED_SCHEMA' ELSE 'null' END);
-- REVIEW ONLY. Verify existing RECOVERY D1 identity; never bind it to the app.
CREATE TABLE IF NOT EXISTS fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);
-- Repeated or occupied targets are rejected, never reset or overwritten.
SELECT json(CASE WHEN EXISTS(SELECT 1 FROM fleet_store)
 THEN 'INITIALIZATION_REFUSED_OCCUPIED' ELSE 'null' END);
INSERT INTO fleet_store(id,payload,version)
SELECT 'environment','demo',0 WHERE NOT EXISTS(SELECT 1 FROM fleet_store);
-- No main row: the recovery helper requires an empty target.
