-- ============================================================
-- Migration 007: Maître titulaire de classe
-- ============================================================

ALTER TABLE classes ADD COLUMN titulaire_id INTEGER REFERENCES enseignants(id);

CREATE INDEX IF NOT EXISTS idx_classes_titulaire ON classes(titulaire_id);

-- Un enseignant ne peut être titulaire que d’une classe par année scolaire
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_titulaire_annee
  ON classes(titulaire_id, annee_scolaire_id)
  WHERE titulaire_id IS NOT NULL;
