-- Production schema: never deletes or replaces existing data.
CREATE TABLE IF NOT EXISTS fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO fleet_store(id,payload,version) VALUES('environment','production',0);
