-- ============================================================
-- Migration 005: Sessions persistantes + index finances
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
