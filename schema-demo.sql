-- Run ONLY on the new empty smart-fleet-demo database.
CREATE TABLE IF NOT EXISTS fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO fleet_store(id,payload,version) SELECT 'environment','demo',0 WHERE NOT EXISTS(SELECT 1 FROM fleet_store WHERE id='main');
