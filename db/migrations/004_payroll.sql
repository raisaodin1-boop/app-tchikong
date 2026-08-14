CREATE TABLE IF NOT EXISTS personnel_annees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  personnel_id INTEGER NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id) ON DELETE CASCADE,
  salaire_mensuel REAL NOT NULL DEFAULT 0 CHECK (salaire_mensuel >= 0),
  date_debut TEXT,
  date_fin TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(personnel_id, annee_scolaire_id)
);

CREATE TABLE IF NOT EXISTS salaires_mensuels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  personnel_annee_id INTEGER NOT NULL REFERENCES personnel_annees(id) ON DELETE CASCADE,
  mois TEXT NOT NULL,
  montant_du REAL NOT NULL CHECK (montant_du > 0),
  montant_paye REAL NOT NULL DEFAULT 0 CHECK (montant_paye >= 0),
  statut TEXT NOT NULL DEFAULT 'a_payer' CHECK (statut IN ('a_payer', 'paye')),
  date_paiement TEXT,
  mode_paiement TEXT CHECK (
    mode_paiement IS NULL OR mode_paiement IN ('especes', 'cheque', 'virement', 'mobile_money')
  ),
  reference TEXT,
  notes TEXT,
  validated_by INTEGER REFERENCES utilisateurs(id),
  depense_id INTEGER REFERENCES depenses(id),
  validated_at TEXT,
  UNIQUE(personnel_annee_id, mois)
);

CREATE INDEX IF NOT EXISTS idx_personnel_annees_annee
  ON personnel_annees(annee_scolaire_id);
CREATE INDEX IF NOT EXISTS idx_salaires_mois
  ON salaires_mensuels(mois, statut);

INSERT OR IGNORE INTO personnel_annees
  (personnel_id, annee_scolaire_id, salaire_mensuel, date_debut, actif)
SELECT e.id, a.id, 0, a.date_debut, e.actif
FROM enseignants e
JOIN annees_scolaires a ON a.active = 1;
