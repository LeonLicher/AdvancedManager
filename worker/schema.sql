CREATE TABLE IF NOT EXISTS auth_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT    NOT NULL,
    user_id     TEXT    NOT NULL,
    user_name   TEXT    NOT NULL,
    action      TEXT    NOT NULL,
    success     INTEGER NOT NULL,
    error       TEXT,
    league_id   TEXT,
    device_info TEXT    NOT NULL
);

-- /api/logs reads newest-first; without this it is a full scan + sort.
CREATE INDEX IF NOT EXISTS idx_auth_logs_timestamp ON auth_logs (timestamp DESC);
