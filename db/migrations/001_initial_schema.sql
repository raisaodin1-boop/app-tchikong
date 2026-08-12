-- ============================================================
-- TCHIKONG - Schéma SQLite complet
-- Migration 001: Schéma initial
-- ============================================================

-- Table de suivi des migrations
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- RÉFÉRENTIELS
-- ============================================================

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE CHECK (code IN ('FR', 'ANG', 'BIL')),
  nom TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS niveaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  code TEXT NOT NULL,
  nom TEXT NOT NULL,
  nom_anglais TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  cycle TEXT NOT NULL CHECK (cycle IN ('maternelle', 'primaire')),
  UNIQUE(section_id, code)
);

CREATE TABLE IF NOT EXISTS annees_scolaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle TEXT NOT NULL UNIQUE,
  date_debut TEXT NOT NULL,
  date_fin TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  nb_sequences INTEGER NOT NULL DEFAULT 6,
  nb_trimestres INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  niveau_id INTEGER NOT NULL REFERENCES niveaux(id),
  section_id INTEGER NOT NULL REFERENCES sections(id),
  nom TEXT NOT NULL,
  capacite_max INTEGER NOT NULL DEFAULT 40,
  UNIQUE(annee_scolaire_id, nom)
);

-- ============================================================
-- UTILISATEURS & SÉCURITÉ
-- ============================================================

CREATE TABLE IF NOT EXISTS utilisateurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('directrice', 'secretariat', 'comptable')),
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_activite (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utilisateur_id INTEGER REFERENCES utilisateurs(id),
  action TEXT NOT NULL,
  entite TEXT NOT NULL,
  entite_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ÉLÈVES
-- ============================================================

CREATE TABLE IF NOT EXISTS eleves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricule TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  date_naissance TEXT NOT NULL,
  sexe TEXT NOT NULL CHECK (sexe IN ('M', 'F')),
  photo_path TEXT,
  adresse TEXT,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'transfere', 'exclu', 'diplome')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id),
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  classe_id INTEGER NOT NULL REFERENCES classes(id),
  section_id INTEGER NOT NULL REFERENCES sections(id),
  niveau_id INTEGER NOT NULL REFERENCES niveaux(id),
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'transfere', 'exclu', 'diplome')),
  redoublement INTEGER NOT NULL DEFAULT 0,
  date_inscription TEXT NOT NULL DEFAULT (date('now')),
  notes TEXT,
  UNIQUE(eleve_id, annee_scolaire_id)
);

CREATE TABLE IF NOT EXISTS parents_tuteurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT,
  telephone TEXT NOT NULL,
  telephone_secondaire TEXT,
  profession TEXT,
  lien_parente TEXT NOT NULL CHECK (lien_parente IN ('pere', 'mere', 'tuteur', 'autre')),
  contact_urgence INTEGER NOT NULL DEFAULT 0,
  email TEXT
);

CREATE TABLE IF NOT EXISTS historique_eleves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  annee_scolaire_id INTEGER REFERENCES annees_scolaires(id),
  type TEXT NOT NULL CHECK (type IN (
    'redoublement', 'transfert_entrant', 'transfert_sortant',
    'changement_section', 'changement_classe', 'evolution_comportement'
  )),
  description TEXT NOT NULL,
  date_evenement TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents_eleves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('acte_naissance', 'certificat_transfert', 'photo_identite', 'autre')),
  nom_fichier TEXT NOT NULL,
  chemin TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS presences_eleves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id),
  classe_id INTEGER NOT NULL REFERENCES classes(id),
  date TEXT NOT NULL,
  present INTEGER NOT NULL DEFAULT 1,
  motif_absence TEXT CHECK (motif_absence IN ('maladie', 'raison_familiale', 'autorisation', 'sans_motif', 'autre')),
  notes TEXT,
  UNIQUE(eleve_id, date)
);

-- ============================================================
-- SCOLARITÉ (PÉDAGOGIQUE)
-- ============================================================

CREATE TABLE IF NOT EXISTS matieres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  code TEXT NOT NULL,
  nom TEXT NOT NULL,
  coefficient REAL NOT NULL DEFAULT 1,
  ordre INTEGER NOT NULL DEFAULT 0,
  UNIQUE(section_id, code)
);

CREATE TABLE IF NOT EXISTS periodes_evaluation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  numero INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sequence', 'trimestre')),
  libelle TEXT NOT NULL,
  date_debut TEXT,
  date_fin TEXT,
  UNIQUE(annee_scolaire_id, type, numero)
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id),
  matiere_id INTEGER NOT NULL REFERENCES matieres(id),
  periode_id INTEGER NOT NULL REFERENCES periodes_evaluation(id),
  valeur REAL NOT NULL,
  note_sur REAL NOT NULL DEFAULT 20,
  coefficient REAL NOT NULL DEFAULT 1,
  appreciation TEXT,
  UNIQUE(eleve_id, matiere_id, periode_id)
);

CREATE TABLE IF NOT EXISTS bulletins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id),
  periode_id INTEGER NOT NULL REFERENCES periodes_evaluation(id),
  moyenne_generale REAL NOT NULL,
  rang INTEGER NOT NULL,
  effectif_classe INTEGER NOT NULL,
  appreciation_maitre TEXT,
  mention TEXT CHECK (mention IN ('felicitations', 'encouragements', 'avertissement', 'blame', 'aucune')),
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(eleve_id, periode_id)
);

-- ============================================================
-- PERSONNEL
-- ============================================================

CREATE TABLE IF NOT EXISTS enseignants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricule TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  sexe TEXT NOT NULL CHECK (sexe IN ('M', 'F')),
  telephone TEXT,
  email TEXT,
  poste TEXT NOT NULL CHECK (poste IN ('enseignant', 'directrice', 'secretaire', 'comptable', 'surveillant', 'autre')),
  date_embauche TEXT,
  actif INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS affectations_enseignants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enseignant_id INTEGER NOT NULL REFERENCES enseignants(id),
  classe_id INTEGER NOT NULL REFERENCES classes(id),
  matiere_id INTEGER NOT NULL REFERENCES matieres(id),
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  UNIQUE(enseignant_id, classe_id, matiere_id, annee_scolaire_id)
);

CREATE TABLE IF NOT EXISTS emplois_du_temps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  classe_id INTEGER NOT NULL REFERENCES classes(id),
  matiere_id INTEGER NOT NULL REFERENCES matieres(id),
  enseignant_id INTEGER REFERENCES enseignants(id),
  jour INTEGER NOT NULL CHECK (jour BETWEEN 1 AND 6),
  heure_debut TEXT NOT NULL,
  heure_fin TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS presences_personnel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  personnel_id INTEGER NOT NULL REFERENCES enseignants(id),
  date TEXT NOT NULL,
  present INTEGER NOT NULL DEFAULT 1,
  motif_absence TEXT,
  UNIQUE(personnel_id, date)
);

CREATE TABLE IF NOT EXISTS calendrier_scolaire (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  type TEXT NOT NULL CHECK (type IN ('rentree', 'vacances', 'composition', 'ferie', 'autre')),
  libelle TEXT NOT NULL,
  date_debut TEXT NOT NULL,
  date_fin TEXT
);

-- ============================================================
-- FINANCES
-- ============================================================

CREATE TABLE IF NOT EXISTS grille_tarifaire (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  niveau_id INTEGER NOT NULL REFERENCES niveaux(id),
  section_id INTEGER NOT NULL REFERENCES sections(id),
  type_frais TEXT NOT NULL CHECK (type_frais IN ('scolarite', 'inscription', 'uniforme', 'fournitures', 'examen', 'activite', 'autre')),
  libelle TEXT NOT NULL,
  montant REAL NOT NULL,
  UNIQUE(annee_scolaire_id, niveau_id, section_id, type_frais)
);

CREATE TABLE IF NOT EXISTS echeancier_paiements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  libelle TEXT NOT NULL,
  date_limite TEXT NOT NULL,
  pourcentage REAL NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS paiements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id),
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  type_frais TEXT NOT NULL CHECK (type_frais IN ('scolarite', 'inscription', 'uniforme', 'fournitures', 'examen', 'activite', 'autre')),
  montant REAL NOT NULL,
  mode_paiement TEXT NOT NULL CHECK (mode_paiement IN ('especes', 'cheque', 'virement', 'mobile_money')),
  numero_recu TEXT NOT NULL UNIQUE,
  date_paiement TEXT NOT NULL DEFAULT (date('now')),
  notes TEXT,
  created_by INTEGER REFERENCES utilisateurs(id)
);

CREATE TABLE IF NOT EXISTS depenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  type TEXT NOT NULL CHECK (type IN ('salaire', 'charge', 'fourniture', 'maintenance', 'autre')),
  libelle TEXT NOT NULL,
  montant REAL NOT NULL,
  date_depense TEXT NOT NULL DEFAULT (date('now')),
  beneficiaire TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES utilisateurs(id)
);

-- ============================================================
-- DOCUMENTS OFFICIELS
-- ============================================================

CREATE TABLE IF NOT EXISTS documents_officiels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id),
  type TEXT NOT NULL CHECK (type IN ('attestation_scolarite', 'certificat_frequentation', 'attestation_reussite', 'autre')),
  contenu_json TEXT NOT NULL,
  numero TEXT NOT NULL UNIQUE,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  generated_by INTEGER REFERENCES utilisateurs(id)
);

-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_eleves_nom ON eleves(nom, prenom);
CREATE INDEX IF NOT EXISTS idx_eleves_matricule ON eleves(matricule);
CREATE INDEX IF NOT EXISTS idx_eleves_statut ON eleves(statut);
CREATE INDEX IF NOT EXISTS idx_inscriptions_annee ON inscriptions(annee_scolaire_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_classe ON inscriptions(classe_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_eleve ON inscriptions(eleve_id);
CREATE INDEX IF NOT EXISTS idx_presences_date ON presences_eleves(date);
CREATE INDEX IF NOT EXISTS idx_presences_classe ON presences_eleves(classe_id, date);
CREATE INDEX IF NOT EXISTS idx_notes_eleve ON notes(eleve_id);
CREATE INDEX IF NOT EXISTS idx_notes_periode ON notes(periode_id);
CREATE INDEX IF NOT EXISTS idx_paiements_eleve ON paiements(eleve_id);
CREATE INDEX IF NOT EXISTS idx_paiements_annee ON paiements(annee_scolaire_id);
CREATE INDEX IF NOT EXISTS idx_paiements_date ON paiements(date_paiement);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_activite(created_at);
