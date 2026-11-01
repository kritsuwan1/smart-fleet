-- REVIEW ONLY. Verify existing RECOVERY D1 identity; never bind it to the app.
CREATE TABLE IF NOT EXISTS fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);
INSERT INTO fleet_store(id,payload,version)
SELECT 'environment','demo',0 WHERE NOT EXISTS(SELECT 1 FROM fleet_store);
-- No main row: the recovery helper requires an empty target.
