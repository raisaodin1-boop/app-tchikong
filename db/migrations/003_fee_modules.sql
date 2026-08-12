CREATE TABLE IF NOT EXISTS frais_modeles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  type_frais TEXT NOT NULL CHECK (type_frais IN (
    'scolarite', 'inscription', 'uniforme', 'fournitures',
    'examen', 'activite', 'autre'
  )),
  libelle TEXT NOT NULL,
  mode_tarification TEXT NOT NULL CHECK (mode_tarification IN ('unique', 'par_classe')),
  obligatoire INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(annee_scolaire_id, libelle)
);

CREATE TABLE IF NOT EXISTS frais_montants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  frais_modele_id INTEGER NOT NULL REFERENCES frais_modeles(id) ON DELETE CASCADE,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  montant REAL NOT NULL CHECK (montant > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_frais_montants_classe
  ON frais_montants(frais_modele_id, COALESCE(classe_id, 0));

ALTER TABLE paiements ADD COLUMN frais_modele_id INTEGER REFERENCES frais_modeles(id);

INSERT OR IGNORE INTO frais_modeles
  (annee_scolaire_id, type_frais, libelle, mode_tarification)
SELECT DISTINCT annee_scolaire_id, type_frais, libelle, 'par_classe'
FROM grille_tarifaire;

INSERT OR IGNORE INTO frais_montants (frais_modele_id, classe_id, montant)
SELECT fm.id, c.id, g.montant
FROM grille_tarifaire g
JOIN frais_modeles fm
  ON fm.annee_scolaire_id = g.annee_scolaire_id
  AND fm.type_frais = g.type_frais
  AND fm.libelle = g.libelle
JOIN classes c
  ON c.annee_scolaire_id = g.annee_scolaire_id
  AND c.niveau_id = g.niveau_id
  AND c.section_id = g.section_id;

UPDATE paiements
SET frais_modele_id = (
  SELECT fm.id
  FROM frais_modeles fm
  WHERE fm.annee_scolaire_id = paiements.annee_scolaire_id
    AND fm.type_frais = paiements.type_frais
  ORDER BY fm.id
  LIMIT 1
)
WHERE frais_modele_id IS NULL;
