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
export type ModeTarification = 'unique' | 'par_classe'

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
  titulaire_id?: number | null
  // Jointures
  niveau_nom?: string
  section_code?: SectionCode
  effectif?: number
  titulaire_nom?: string | null
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
  classe_titulaire_id?: number | null
  classe_titulaire_nom?: string | null
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
  niveau_nom?: string
  section_code?: SectionCode
}

export interface EcheancierPaiement {
  id: number
  annee_scolaire_id: number
  libelle: string
  date_limite: string
  pourcentage: number
  frais_modele_id: number | null
}

export type DecisionPassage = 'admission' | 'redoublement' | 'transfert' | 'diplome'

export interface CandidatPassage {
  eleve_id: number
  nom: string
  prenom: string
  matricule: string
  classe_source_id: number
  classe_source_nom: string
  niveau_id: number
  niveau_nom: string
  section_id: number
  section_code: SectionCode
  niveau_ordre: number
  decision_suggeree: DecisionPassage
  classe_cible_id: number | null
  classe_cible_nom: string | null
  deja_inscrit: boolean
}

export interface LignePassage {
  eleve_id: number
  decision: DecisionPassage
  classe_id?: number
}

export interface PassageResult {
  inscrits: number
  redoublants: number
  transferes: number
  diplomes: number
  erreurs: { eleve_id: number; message: string }[]
}

export interface EcheanceDetail {
  id: number
  libelle: string
  date_limite: string
  pourcentage: number
  montant_du: number
  montant_paye: number
  reste: number
  statut: 'a_venir' | 'due' | 'payee' | 'en_retard'
}

export interface BackupSettings {
  enabled: boolean
  directory: string | null
  lastDate: string | null
}

export interface EmploiDuTempsDetail extends EmploiDuTemps {
  matiere_nom: string
  enseignant_nom: string | null
}

export interface AffectationDetail extends AffectationEnseignant {
  enseignant_nom: string
  classe_nom: string
  matiere_nom: string
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
  frais_modele_id: number | null
  annule?: number
  annule_le?: string | null
  annule_par?: number | null
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

export interface NoteInput {
  eleve_id: number
  valeur: number
  note_sur?: number
  appreciation?: string
}

export interface NotesGrid {
  classe: {
    id: number
    nom: string
    section_id: number
    section_code: string
    annee_scolaire_id: number
  }
  periode: PeriodeEvaluation
  matieres: Matiere[]
  eleves: { eleve_id: number; nom: string; prenom: string; matricule: string }[]
  notes: Record<string, Note | null>
}

export interface EleveMoyenne {
  eleve_id: number
  nom: string
  prenom: string
  matricule: string
  moyenne: number
  rang: number
  mention: MentionBulletin
  details: {
    matiere_id: number
    matiere_nom: string
    coefficient: number
    valeur: number
    note_sur: number
    note_sur_20: number
    moyenne_matiere: number
    appreciation: string | null
  }[]
}

export interface BulletinData {
  eleve: { id: number; nom: string; prenom: string; matricule: string; date_naissance: string; sexe: string }
  classe: { nom: string; section_code: string; niveau_nom: string; titulaire_nom?: string | null }
  periode: PeriodeEvaluation
  annee_libelle: string
  moyenne: EleveMoyenne
  appreciation_maitre: string | null
  bulletin: Bulletin | null
  statistiques_classe: {
    moyenne_classe: number
    meilleure_moyenne: number
    plus_faible_moyenne: number
    effectif: number
  }
}

// --- Finances ---

export interface SituationFinanciere {
  eleve_id: number
  nom: string
  prenom: string
  matricule: string
  classe_nom: string
  section_code: string
  total_du: number
  total_paye: number
  reste: number
  statut: 'a_jour' | 'partiel' | 'impaye' | 'non_configure'
  details: {
    frais_modele_id: number
    type_frais: TypeFrais
    libelle: string
    montant_du: number
    montant_paye: number
    reste: number
    echeances?: EcheanceDetail[]
  }[]
}

export interface ImpayeEleve {
  eleve_id: number
  nom: string
  prenom: string
  matricule: string
  classe_nom: string
  section_code: string
  telephone: string | null
  total_du: number
  total_paye: number
  reste: number
}

export interface FinancesDashboard {
  recettes_mois: number
  recettes_annee: number
  depenses_annee: number
  solde: number
  taux_recouvrement: number
  eleves_a_jour: number
  eleves_impayes: number
  montant_impayes: number
  paiements_recents: (Paiement & { nom: string; prenom: string; matricule: string })[]
  recettes_par_section: { section: string; montant: number }[]
}

export interface PersonnelAnneeDetail {
  id: number
  personnel_id: number
  annee_scolaire_id: number
  salaire_mensuel: number
  date_debut: string | null
  date_fin: string | null
  actif: boolean
  matricule: string
  nom: string
  prenom: string
  poste: PostePersonnel
}

export interface PaieMensuelleRow extends PersonnelAnneeDetail {
  salaire_id: number | null
  mois: string
  montant_du: number
  montant_paye: number
  statut: 'non_configure' | 'a_payer' | 'paye'
  date_paiement: string | null
  mode_paiement: ModePaiement | null
  reference: string | null
}

export interface PaieMensuelle {
  mois: string
  rows: PaieMensuelleRow[]
  total_du: number
  total_paye: number
  total_restant: number
  payes: number
  a_payer: number
}

export interface SalairePersonnelFormData {
  personnel_id: number
  annee_scolaire_id: number
  salaire_mensuel: number
  actif?: boolean
}

export interface ValidationSalaireData {
  salaire_id: number
  date_paiement: string
  mode_paiement: ModePaiement
  reference?: string
  notes?: string
}

export interface BilanClasse {
  classe_id: number
  classe_nom: string
  section_code: string
  effectif: number
  montant_attendu: number
  montant_percu: number
  montant_non_percu: number
  taux_recouvrement: number
}

export interface BilanEleve {
  eleve_id: number
  matricule: string
  nom: string
  prenom: string
  classe_nom: string
  section_code: string
  montant_attendu: number
  montant_percu: number
  montant_non_percu: number
  statut: 'a_jour' | 'partiel' | 'impaye' | 'non_configure'
}

export interface BilanAnnuel {
  annee_id: number
  annee_libelle: string
  effectif_total: number
  montant_attendu: number
  montant_percu: number
  montant_non_percu: number
  taux_recouvrement: number
  depenses_hors_salaires: number
  salaires_attendus: number
  salaires_payes: number
  salaires_non_payes: number
  depenses_totales: number
  solde: number
  classes: BilanClasse[]
  eleves: BilanEleve[]
}

export interface PaiementFormData {
  eleve_id: number
  annee_scolaire_id: number
  type_frais: TypeFrais
  frais_modele_id: number
  montant: number
  mode_paiement: ModePaiement
  date_paiement?: string
  notes?: string
}

export interface PaiementFiltres {
  annee_scolaire_id?: number
  eleve_id?: number
  type_frais?: TypeFrais
  date_debut?: string
  date_fin?: string
  recherche?: string
}

export interface TarifFormData {
  annee_scolaire_id: number
  niveau_id: number
  section_id: number
  type_frais: TypeFrais
  libelle: string
  montant: number
}

export interface GrilleTarifaireDetail extends GrilleTarifaire {
  niveau_nom: string
  section_code: SectionCode
}

export interface FraisMontantClasse {
  classe_id: number
  classe_nom: string
  montant: number
}

export interface FraisConfiguration {
  id: number
  annee_scolaire_id: number
  type_frais: TypeFrais
  libelle: string
  mode_tarification: ModeTarification
  obligatoire: boolean
  montant_unique: number | null
  montants_par_classe: FraisMontantClasse[]
}

export interface FraisConfigurationFormData {
  id?: number
  annee_scolaire_id: number
  type_frais: TypeFrais
  libelle: string
  mode_tarification: ModeTarification
  obligatoire?: boolean
  montant_unique?: number
  montants_par_classe?: { classe_id: number; montant: number }[]
}

export interface NouvelleAnneeFormData {
  libelle: string
  date_debut: string
  date_fin: string
  nb_sequences?: number
  nb_trimestres?: number
}

export interface NouvelleAnneeResult {
  annee: AnneeScolaire
  classes_copiees: number
}

export interface DemoStatus {
  active: boolean
  eleves: number
}

export interface DemoResetResult {
  success: boolean
  deleted: {
    eleves: number
    paiements: number
    personnel: number
  }
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
    type: 'impaye' | 'absence' | 'surcharge' | 'configuration'
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

// --- Administratif ---

export interface PersonnelFormData {
  matricule?: string
  nom: string
  prenom: string
  sexe: Sexe
  telephone?: string
  email?: string
  poste: PostePersonnel
  date_embauche?: string
  actif?: boolean
  /** Classe dont l’enseignant est titulaire (maître de classe, bulletin). */
  classe_id?: number | null
}

export interface UtilisateurFormData {
  username: string
  nom: string
  prenom: string
  role: RoleUtilisateur
  password?: string
  actif?: boolean
}

export interface DocumentOfficielDetail extends DocumentOfficiel {
  eleve_nom: string
  eleve_prenom: string
  eleve_matricule: string
  generateur_nom: string | null
}

export interface JournalActiviteDetail extends JournalActivite {
  utilisateur_nom: string | null
}

export interface AdminDashboard {
  personnel_total: number
  personnel_actif: number
  utilisateurs_actifs: number
  classes_total: number
  classes_surchargees: number
  documents_generes: number
  activites_recentes: JournalActiviteDetail[]
}

export interface JournalFiltres {
  limit?: number
  action?: string
  entite?: string
}

export interface DocumentFiltres {
  type?: string
  recherche?: string
  limit?: number
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
  ANNEE_START: 'annee:start',

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
  ELEVE_CHANGE_STATUT: 'eleve:changeStatut',

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
  SEED_DEMO: 'seed:demo',

  // Scolarité
  MATIERE_LIST: 'scolarite:matieres',
  PERIODE_LIST: 'scolarite:periodes',
  NOTES_GRID: 'scolarite:notesGrid',
  NOTES_SAVE: 'scolarite:notesSave',
  MOYENNES_CLASSE: 'scolarite:moyennes',
  PALMARES: 'scolarite:palmares',
  BULLETIN_GENERER: 'scolarite:bulletinGenerer',
  BULLETIN_DATA: 'scolarite:bulletinData',
  BULLETIN_LIST: 'scolarite:bulletinList',
  BULLETIN_PDF: 'scolarite:bulletinPdf',
  BULLETINS_CLASSE_PDF: 'scolarite:bulletinsClassePdf',
  PALMARES_PDF: 'scolarite:palmaresPdf',

  // Documents PDF
  DOCUMENT_GENERER: 'document:generer',
  LISTE_CLASSE_PDF: 'document:listeClasse',
  ANNUAIRE_CLASSE_PDF: 'document:annuaireClasse',
  PDF_PRINT: 'pdf:print',

  // Finances
  FINANCES_DASHBOARD: 'finances:dashboard',
  FINANCES_SITUATION: 'finances:situation',
  FINANCES_GRILLE: 'finances:grille',
  FINANCES_GRILLE_UPSERT: 'finances:grilleUpsert',
  FINANCES_GRILLE_DELETE: 'finances:grilleDelete',
  FINANCES_PAIEMENT_CREATE: 'finances:paiementCreate',
  FINANCES_PAIEMENT_ANNULER: 'finances:paiementAnnuler',
  FINANCES_PAIEMENT_LIST: 'finances:paiementList',
  FINANCES_IMPAYES: 'finances:impayes',
  FINANCES_RECU_PDF: 'finances:recuPdf',
  FINANCES_IMPAYES_PDF: 'finances:impayesPdf',
  FINANCES_DEPENSE_LIST: 'finances:depenseList',
  FINANCES_DEPENSE_CREATE: 'finances:depenseCreate',
  FINANCES_BILAN_ANNUEL: 'finances:bilanAnnuel',

  // Paie du personnel
  PAIE_PERSONNEL_ANNEE: 'paie:personnelAnnee',
  PAIE_PERSONNEL_INITIALISER: 'paie:personnelInitialiser',
  PAIE_SALAIRE_CONFIGURER: 'paie:salaireConfigurer',
  PAIE_MENSUELLE: 'paie:mensuelle',
  PAIE_VALIDER: 'paie:valider',

  // Administratif
  ADMIN_DASHBOARD: 'admin:dashboard',
  ADMIN_PERSONNEL_LIST: 'admin:personnelList',
  ADMIN_PERSONNEL_CREATE: 'admin:personnelCreate',
  ADMIN_PERSONNEL_UPDATE: 'admin:personnelUpdate',
  ADMIN_UTILISATEUR_LIST: 'admin:utilisateurList',
  ADMIN_UTILISATEUR_CREATE: 'admin:utilisateurCreate',
  ADMIN_UTILISATEUR_UPDATE: 'admin:utilisateurUpdate',
  ADMIN_UTILISATEUR_RESET_PASSWORD: 'admin:utilisateurResetPassword',
  ADMIN_DOCUMENT_LIST: 'admin:documentList',
  ADMIN_JOURNAL_LIST: 'admin:journalList',
  ADMIN_DEMO_STATUS: 'admin:demoStatus',
  ADMIN_DEMO_EXIT: 'admin:demoExit',

  ELEVE_DOCUMENTS_LIST: 'eleve:documentsList',
  ELEVE_DOCUMENT_ADD: 'eleve:documentAdd',
  ELEVE_DOCUMENT_DELETE: 'eleve:documentDelete',
  ELEVE_PHOTO_SET: 'eleve:photoSet',
  PASSAGE_CANDIDATS: 'passage:candidats',
  PASSAGE_INSCRIRE: 'passage:inscrire',
  CALENDRIER_LIST: 'calendrier:list',
  CALENDRIER_UPSERT: 'calendrier:upsert',
  CALENDRIER_DELETE: 'calendrier:delete',
  AFFECTATION_LIST: 'affectation:list',
  AFFECTATION_UPSERT: 'affectation:upsert',
  AFFECTATION_DELETE: 'affectation:delete',
  EMPLOI_LIST: 'emploi:list',
  EMPLOI_UPSERT: 'emploi:upsert',
  EMPLOI_DELETE: 'emploi:delete',
  ECHEANCIER_LIST: 'echeancier:list',
  ECHEANCIER_UPSERT: 'echeancier:upsert',
  ECHEANCIER_DELETE: 'echeancier:delete',
  BACKUP_SETTINGS_GET: 'backup:settingsGet',
  BACKUP_SETTINGS_SET: 'backup:settingsSet',
  BACKUP_CHOOSE_DIR: 'backup:chooseDir',
  BACKUP_RUN_AUTO: 'backup:runAuto'
} as const
