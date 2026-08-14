-- ============================================================
-- Migration 006: Échéancier lié aux modules de frais
-- ============================================================

ALTER TABLE echeancier_paiements ADD COLUMN frais_modele_id INTEGER REFERENCES frais_modeles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_echeancier_annee ON echeancier_paiements(annee_scolaire_id);
CREATE INDEX IF NOT EXISTS idx_echeancier_frais ON echeancier_paiements(frais_modele_id);
CREATE INDEX IF NOT EXISTS idx_documents_eleves ON documents_eleves(eleve_id);
CREATE INDEX IF NOT EXISTS idx_calendrier_annee ON calendrier_scolaire(annee_scolaire_id);
CREATE INDEX IF NOT EXISTS idx_emploi_classe ON emplois_du_temps(classe_id);
CREATE INDEX IF NOT EXISTS idx_affectations_annee ON affectations_enseignants(annee_scolaire_id);
