// ============================================================
// TCHIKONG - Types partagés (main process + renderer)
// ============================================================

// --- Énumérations ---

export type SectionCode = 'FR' | 'ANG' | 'BIL'

export type NiveauCode =
  | 'PS' | 'MS' | 'GS'           // Maternelle
  | 'SIL' | 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2'  // Primaire FR
  | 'CLASS1' | 'CLASS2' | 'CLASS3' | 'CLASS4' | 'CLASS5' | 'CLASS6'  // Primaire ANG

export type StatutEleve = 'actif' | 'transfere' | 'exclu' | 'diplome'

export type RoleUtilisateur = 'directrice' | 'secretariat' | 'comptable'

export type Sexe = 'M' | 'F'

export type LienParente = 'pere' | 'mere' | 'tuteur' | 'autre'

export type TypeDocument =
  | 'acte_naissance'
  | 'certificat_transfert'
  | 'photo_identite'
  | 'autre'

export type TypeHistorique =
  | 'redoublement'
  | 'transfert_entrant'
  | 'transfert_sortant'
  | 'changement_section'
  | 'changement_classe'
  | 'evolution_comportement'

export type MotifAbsence =
  | 'maladie'
  | 'raison_familiale'
  | 'autorisation'
  | 'sans_motif'
  | 'autre'

export type MentionBulletin =
  | 'felicitations'
  | 'encouragements'
  | 'avertissement'
  | 'blame'
  | 'aucune'

export type TypeFrais =
  | 'scolarite'
  | 'inscription'
  | 'uniforme'
  | 'fournitures'
  | 'examen'
  | 'activite'
  | 'autre'

export type ModePaiement = 'especes' | 'cheque' | 'virement' | 'mobile_money'

export type TypeDepense =
  | 'salaire'
  | 'charge'
  | 'fourniture'
  | 'maintenance'
  | 'autre'

export type PostePersonnel =
  | 'enseignant'
  | 'directrice'
  | 'secretaire'
  | 'comptable'
  | 'surveillant'
  | 'autre'

export type TypeDocumentOfficiel =
  | 'attestation_scolarite'
  | 'certificat_frequentation'
  | 'attestation_reussite'
  | 'autre'

// --- Entités principales ---

export interface Section {
  id: number
  code: SectionCode
  nom: string
}

export interface Niveau {
  id: number
  section_id: number
  code: NiveauCode
  nom: string
  nom_anglais: string | null
  ordre: number
  cycle: 'maternelle' | 'primaire'
}

export interface AnneeScolaire {
  id: number
  libelle: string
  date_debut: string
  date_fin: string
  active: boolean
  nb_sequences: number
  nb_trimestres: number
  created_at: string
}

export interface Classe {
  id: number
  annee_scolaire_id: number
  niveau_id: number
  section_id: number
  nom: string
  capacite_max: number
  // Jointures
  niveau_nom?: string
  section_code?: SectionCode
  effectif?: number
}

export interface Utilisateur {
  id: number
  username: string
  nom: string
  prenom: string
  role: RoleUtilisateur
  actif: boolean
  created_at: string
}

export interface Eleve {
  id: number
  matricule: string
  nom: string
  prenom: string
  date_naissance: string
  sexe: Sexe
  photo_path: string | null
  adresse: string | null
  statut: StatutEleve
  created_at: string
  updated_at: string
}

export interface ParentTuteur {
  id: number
  eleve_id: number
  nom: string
  prenom: string | null
  telephone: string
  telephone_secondaire: string | null
  profession: string | null
  lien_parente: LienParente
  contact_urgence: boolean
  email: string | null
}

export interface Inscription {
  id: number
  eleve_id: number
  annee_scolaire_id: number
  classe_id: number
  section_id: number
  niveau_id: number
  statut: StatutEleve
  redoublement: boolean
  date_inscription: string
  notes: string | null
  // Jointures
  eleve?: Eleve
  classe_nom?: string
  section_code?: SectionCode
  niveau_nom?: string
  annee_libelle?: string
  // Champs joints depuis eleves (liste)
  matricule?: string
  nom?: string
  prenom?: string
  date_naissance?: string
  sexe?: Sexe
  photo_path?: string | null
  adresse?: string | null
}

export interface HistoriqueEleve {
  id: number
  eleve_id: number
  annee_scolaire_id: number | null
  type: TypeHistorique
  description: string
  date_evenement: string
  created_at: string
}

export interface DocumentEleve {
  id: number
  eleve_id: number
  type: TypeDocument
  nom_fichier: string
  chemin: string
  uploaded_at: string
}

export interface PresenceEleve {
  id: number
  eleve_id: number
  classe_id: number
  date: string
  present: boolean
  motif_absence: MotifAbsence | null
  notes: string | null
}

export interface Matiere {
  id: number
  section_id: number
  code: string
  nom: string
  coefficient: number
  ordre: number
}

export interface EmploiDuTemps {
  id: number
  classe_id: number
  matiere_id: number
  enseignant_id: number | null
  jour: number // 1=lundi ... 6=samedi
  heure_debut: string
  heure_fin: string
}

export interface PeriodeEvaluation {
  id: number
  annee_scolaire_id: number
  numero: number
  type: 'sequence' | 'trimestre'
  libelle: string
  date_debut: string | null
  date_fin: string | null
}

export interface Note {
  id: number
  eleve_id: number
  matiere_id: number
  periode_id: number
  valeur: number
  note_sur: number
  coefficient: number
  appreciation: string | null
}

export interface Bulletin {
  id: number
  eleve_id: number
  periode_id: number
  moyenne_generale: number
  rang: number
  effectif_classe: number
  appreciation_maitre: string | null
  mention: MentionBulletin
  generated_at: string
}

export interface Enseignant {
  id: number
  matricule: string
  nom: string
  prenom: string
  sexe: Sexe
  telephone: string | null
  email: string | null
  poste: PostePersonnel
  date_embauche: string | null
  actif: boolean
}

export interface AffectationEnseignant {
  id: number
  enseignant_id: number
  classe_id: number
  matiere_id: number
  annee_scolaire_id: number
}

export interface PresencePersonnel {
  id: number
  personnel_id: number
  date: string
  present: boolean
  motif_absence: string | null
}

export interface CalendrierScolaire {
  id: number
  annee_scolaire_id: number
  type: 'rentree' | 'vacances' | 'composition' | 'ferie' | 'autre'
  libelle: string
  date_debut: string
  date_fin: string | null
}

export interface GrilleTarifaire {
  id: number
  annee_scolaire_id: number
  niveau_id: number
  section_id: number
  type_frais: TypeFrais
  libelle: string
  montant: number
}

export interface EcheancierPaiement {
  id: number
  annee_scolaire_id: number
  libelle: string
  date_limite: string
  pourcentage: number
}

export interface Paiement {
  id: number
  eleve_id: number
  annee_scolaire_id: number
  type_frais: TypeFrais
  montant: number
  mode_paiement: ModePaiement
  numero_recu: string
  date_paiement: string
  notes: string | null
  created_by: number | null
}

export interface Depense {
  id: number
  annee_scolaire_id: number
  type: TypeDepense
  libelle: string
  montant: number
  date_depense: string
  beneficiaire: string | null
  notes: string | null
  created_by: number | null
}

export interface DocumentOfficiel {
  id: number
  eleve_id: number
  type: TypeDocumentOfficiel
  contenu_json: string
  numero: string
  generated_at: string
  generated_by: number | null
}

export interface JournalActivite {
  id: number
  utilisateur_id: number | null
  action: string
  entite: string
  entite_id: number | null
  details: string | null
  created_at: string
}

// --- DTOs pour formulaires ---

export interface EleveFormData {
  matricule?: string
  nom: string
  prenom: string
  date_naissance: string
  sexe: Sexe
  adresse?: string
  statut?: StatutEleve
  annee_scolaire_id: number
  classe_id: number
  section_id: number
  niveau_id: number
  redoublement?: boolean
  parents?: Omit<ParentTuteur, 'id' | 'eleve_id'>[]
}

export interface EleveFiltres {
  recherche?: string
  classe_id?: number
  section_id?: number
  statut?: StatutEleve
  annee_scolaire_id?: number
}

export interface PresenceJourData {
  classe_id: number
  date: string
  presences: {
    eleve_id: number
    present: boolean
    motif_absence?: MotifAbsence
    notes?: string
  }[]
}

// --- Dashboard ---

export interface DashboardStats {
  effectifs: {
    total: number
    par_section: { section: string; count: number }[]
    par_niveau: { niveau: string; count: number }[]
  }
  finances: {
    recettes_mois: number
    recettes_annee: number
    taux_recouvrement: number
    impayes_count: number
    montant_impayes: number
  }
  alertes: {
    type: 'impaye' | 'absence' | 'surcharge'
    message: string
    count?: number
  }[]
}

export interface RechercheResultat {
  type: 'eleve' | 'enseignant' | 'paiement'
  id: number
  label: string
  sous_label?: string
}

// --- Auth ---

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthSession {
  utilisateur: Utilisateur
  token: string
}

// --- IPC Channel names ---

export const IPC_CHANNELS = {
  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_SESSION: 'auth:getSession',

  // DB
  DB_BACKUP: 'db:backup',
  DB_RESTORE: 'db:restore',
  DB_GET_PATH: 'db:getPath',

  // Année scolaire
  ANNEE_LIST: 'annee:list',
  ANNEE_GET_ACTIVE: 'annee:getActive',
  ANNEE_CREATE: 'annee:create',
  ANNEE_SET_ACTIVE: 'annee:setActive',

  // Sections / Niveaux / Classes
  SECTION_LIST: 'section:list',
  NIVEAU_LIST: 'niveau:list',
  CLASSE_LIST: 'classe:list',
  CLASSE_CREATE: 'classe:create',
  CLASSE_UPDATE: 'classe:update',

  // Élèves
  ELEVE_LIST: 'eleve:list',
  ELEVE_GET: 'eleve:get',
  ELEVE_CREATE: 'eleve:create',
  ELEVE_UPDATE: 'eleve:update',
  ELEVE_DELETE: 'eleve:delete',
  ELEVE_SEARCH: 'eleve:search',

  // Parents
  PARENT_LIST: 'parent:list',
  PARENT_SAVE: 'parent:save',

  // Présence
  PRESENCE_GET: 'presence:get',
  PRESENCE_SAVE: 'presence:save',

  // Historique
  HISTORIQUE_LIST: 'historique:list',
  HISTORIQUE_ADD: 'historique:add',

  // Documents
  DOCUMENT_UPLOAD: 'document:upload',
  DOCUMENT_LIST: 'document:list',

  // Recherche globale
  RECHERCHE_GLOBALE: 'recherche:globale',

  // Dashboard
  DASHBOARD_STATS: 'dashboard:stats',

  // Seed
  SEED_DEMO: 'seed:demo'
} as const
