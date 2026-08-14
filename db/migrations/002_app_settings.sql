CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_settings (key, value)
SELECT 'demo_mode', '1'
WHERE (
  SELECT COUNT(*)
  FROM eleves
  WHERE matricule LIKE 'TCH-2025-%'
    AND adresse LIKE 'Quartier %, Douala'
) >= 50;

INSERT OR IGNORE INTO app_settings (key, value) VALUES ('demo_mode', '0');
