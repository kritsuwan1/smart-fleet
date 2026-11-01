-- Separate backup database only. Deployment supplies and checks its environment marker.
CREATE TABLE IF NOT EXISTS backup_control(id TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 1,last_attempt TEXT NOT NULL DEFAULT '',last_error TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS backup_snapshots(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,source_version INTEGER NOT NULL,payload TEXT NOT NULL,bytes INTEGER NOT NULL);
