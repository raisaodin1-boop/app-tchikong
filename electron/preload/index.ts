import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type {
  AnneeScolaire,
  AuthSession,
  Bulletin,
  BulletinData,
  Classe,
  DashboardStats,
  Eleve,
  EleveFiltres,
  EleveFormData,
  EleveMoyenne,
  HistoriqueEleve,
  Inscription,
  LoginRequest,
  Matiere,
  NoteInput,
  NotesGrid,
  Niveau,
  PeriodeEvaluation,
  PresenceEleve,
  PresenceJourData,
  RechercheResultat,
  Section
} from '../../shared/types'

const api = {
  // Auth
  login: (req: LoginRequest): Promise<AuthSession | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, req),
  logout: (token: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT, token),
  getSession: (token: string): Promise<AuthSession | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_SESSION, token),

  // DB
  backupDb: (): Promise<{ success: boolean; path?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_BACKUP),
  restoreDb: (token: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_RESTORE, token),
  getDbPath: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_PATH),

  // Référentiel
  listSections: (): Promise<Section[]> => ipcRenderer.invoke(IPC_CHANNELS.SECTION_LIST),
  listNiveaux: (sectionId?: number): Promise<Niveau[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.NIVEAU_LIST, sectionId),
  listAnnees: (): Promise<AnneeScolaire[]> => ipcRenderer.invoke(IPC_CHANNELS.ANNEE_LIST),
  getActiveAnnee: (): Promise<AnneeScolaire | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.ANNEE_GET_ACTIVE),
  createAnnee: (data: {
    libelle: string
    date_debut: string
    date_fin: string
    nb_sequences?: number
    nb_trimestres?: number
    activer?: boolean
  }): Promise<AnneeScolaire> => ipcRenderer.invoke(IPC_CHANNELS.ANNEE_CREATE, data),
  setActiveAnnee: (id: number): Promise<AnneeScolaire> =>
    ipcRenderer.invoke(IPC_CHANNELS.ANNEE_SET_ACTIVE, id),
  startNewAnnee: (
    data: import('../../shared/types').NouvelleAnneeFormData,
    token: string
  ): Promise<import('../../shared/types').NouvelleAnneeResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.ANNEE_START, data, token),
  listClasses: (anneeId?: number): Promise<Classe[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLASSE_LIST, anneeId),
  createClasse: (
    data: {
      annee_scolaire_id: number
      niveau_id: number
      section_id: number
      nom: string
      capacite_max?: number
    },
    token: string
  ): Promise<Classe> => ipcRenderer.invoke(IPC_CHANNELS.CLASSE_CREATE, data, token),

  // Élèves
  listEleves: (filtres?: EleveFiltres): Promise<Inscription[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVE_LIST, filtres),
  getEleve: (id: number, anneeId?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVE_GET, id, anneeId),
  createEleve: (data: EleveFormData, token: string): Promise<Eleve> =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVE_CREATE, data, token),
  updateEleve: (id: number, data: Partial<EleveFormData>, token: string): Promise<Eleve> =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVE_UPDATE, id, data, token),
  searchEleves: (term: string, anneeId?: number): Promise<Inscription[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVE_SEARCH, term, anneeId),
  changeStatutEleve: (
    id: number,
    statut: import('../../shared/types').StatutEleve,
    anneeId: number | undefined,
    description: string | undefined,
    token: string
  ) => ipcRenderer.invoke(IPC_CHANNELS.ELEVE_CHANGE_STATUT, id, statut, anneeId, description, token),

  // Présence
  getPresences: (classeId: number, date: string): Promise<PresenceEleve[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PRESENCE_GET, classeId, date),
  savePresences: (data: PresenceJourData, token: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PRESENCE_SAVE, data, token),

  // Historique
  listHistorique: (eleveId: number): Promise<HistoriqueEleve[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORIQUE_LIST, eleveId),
  addHistorique: (eleveId: number, data: object, token: string): Promise<HistoriqueEleve> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORIQUE_ADD, eleveId, data, token),

  // Dashboard
  getDashboardStats: (anneeId?: number): Promise<DashboardStats> =>
    ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_STATS, anneeId),
  rechercheGlobale: (term: string, anneeId?: number): Promise<RechercheResultat[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.RECHERCHE_GLOBALE, term, anneeId),

  // Seed
  seedDemo: (token: string): Promise<{ message: string; count: number }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEED_DEMO, token),

  // Scolarité
  listMatieres: (sectionId: number): Promise<Matiere[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.MATIERE_LIST, sectionId),
  listPeriodes: (anneeId: number, type?: 'sequence' | 'trimestre'): Promise<PeriodeEvaluation[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PERIODE_LIST, anneeId, type),
  getNotesGrid: (classeId: number, periodeId: number): Promise<NotesGrid | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTES_GRID, classeId, periodeId),
  saveNotes: (
    classeId: number,
    periodeId: number,
    matiereId: number,
    notes: NoteInput[],
    token: string
  ): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTES_SAVE, classeId, periodeId, matiereId, notes, token),
  getMoyennesClasse: (classeId: number, periodeId: number): Promise<EleveMoyenne[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOYENNES_CLASSE, classeId, periodeId),
  getPalmares: (classeId: number, periodeId: number): Promise<EleveMoyenne[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PALMARES, classeId, periodeId),
  genererBulletins: (
    classeId: number,
    periodeId: number,
    appreciations: Record<number, string> | undefined,
    token: string
  ): Promise<Bulletin[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.BULLETIN_GENERER, classeId, periodeId, appreciations, token),
  getBulletinData: (eleveId: number, periodeId: number): Promise<BulletinData | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.BULLETIN_DATA, eleveId, periodeId),
  listBulletinsClasse: (classeId: number, periodeId: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.BULLETIN_LIST, classeId, periodeId),
  exportBulletinPdf: (
    eleveId: number,
    periodeId: number,
    action?: 'save' | 'print'
  ): Promise<{ success: boolean; path?: string; error?: string; printed?: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.BULLETIN_PDF, eleveId, periodeId, action ?? 'save'),
  exportPalmaresPdf: (
    classeId: number,
    periodeId: number,
    classeNom?: string,
    anneeLibelle?: string,
    action?: 'save' | 'print'
  ): Promise<{ success: boolean; path?: string; error?: string; printed?: boolean }> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.PALMARES_PDF,
      classeId,
      periodeId,
      classeNom,
      anneeLibelle,
      action ?? 'save'
    ),

  // Documents officiels
  genererDocument: (
    type: 'attestation_scolarite' | 'certificat_frequentation' | 'attestation_reussite',
    eleveId: number,
    anneeId: number | undefined,
    action: 'save' | 'print',
    token: string
  ): Promise<{ success: boolean; path?: string; error?: string; printed?: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_GENERER, type, eleveId, anneeId, action, token),
  exportListeClassePdf: (
    classeId: number,
    action?: 'save' | 'print'
  ): Promise<{ success: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.LISTE_CLASSE_PDF, classeId, action ?? 'save'),

  // Finances
  getFinancesDashboard: (anneeId: number): Promise<import('../../shared/types').FinancesDashboard> =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_DASHBOARD, anneeId),
  getSituationFinanciere: (eleveId: number, anneeId: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_SITUATION, eleveId, anneeId),
  listFraisConfigurations: (anneeId: number): Promise<import('../../shared/types').FraisConfiguration[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_GRILLE, anneeId),
  upsertFraisConfiguration: (
    data: import('../../shared/types').FraisConfigurationFormData,
    token: string
  ) =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_GRILLE_UPSERT, data, token),
  deleteFraisConfiguration: (id: number, token: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_GRILLE_DELETE, id, token),
  createPaiement: (data: import('../../shared/types').PaiementFormData, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_PAIEMENT_CREATE, data, token),
  listPaiements: (filtres?: import('../../shared/types').PaiementFiltres) =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_PAIEMENT_LIST, filtres),
  listImpayes: (anneeId: number, classeId?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_IMPAYES, anneeId, classeId),
  listDepenses: (anneeId: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_DEPENSE_LIST, anneeId),
  createDepense: (data: object, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_DEPENSE_CREATE, data, token),
  getBilanAnnuel: (
    anneeId: number,
    token: string
  ): Promise<import('../../shared/types').BilanAnnuel> =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_BILAN_ANNUEL, anneeId, token),
  exportRecuPdf: (paiementId: number, action?: 'save' | 'print') =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_RECU_PDF, paiementId, action ?? 'save'),
  exportImpayesPdf: (anneeId: number, anneeLibelle: string, action?: 'save' | 'print') =>
    ipcRenderer.invoke(IPC_CHANNELS.FINANCES_IMPAYES_PDF, anneeId, anneeLibelle, action ?? 'save'),

  // Paie du personnel
  listPersonnelAnnee: (
    anneeId: number,
    token: string
  ): Promise<import('../../shared/types').PersonnelAnneeDetail[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PAIE_PERSONNEL_ANNEE, anneeId, token),
  initializePersonnelAnnee: (anneeId: number, token: string): Promise<number> =>
    ipcRenderer.invoke(IPC_CHANNELS.PAIE_PERSONNEL_INITIALISER, anneeId, token),
  configureSalaire: (
    data: import('../../shared/types').SalairePersonnelFormData,
    token: string
  ): Promise<import('../../shared/types').PersonnelAnneeDetail> =>
    ipcRenderer.invoke(IPC_CHANNELS.PAIE_SALAIRE_CONFIGURER, data, token),
  getPaieMensuelle: (
    anneeId: number,
    month: string,
    token: string
  ): Promise<import('../../shared/types').PaieMensuelle> =>
    ipcRenderer.invoke(IPC_CHANNELS.PAIE_MENSUELLE, anneeId, month, token),
  validateSalairePayment: (
    data: import('../../shared/types').ValidationSalaireData,
    token: string
  ): Promise<import('../../shared/types').PaieMensuelleRow> =>
    ipcRenderer.invoke(IPC_CHANNELS.PAIE_VALIDER, data, token),

  // Administratif
  getAdminDashboard: (anneeId?: number): Promise<import('../../shared/types').AdminDashboard> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_DASHBOARD, anneeId),
  listPersonnel: (actifOnly?: boolean, anneeScolaireId?: number): Promise<import('../../shared/types').Enseignant[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_PERSONNEL_LIST, actifOnly, anneeScolaireId),
  createPersonnel: (data: import('../../shared/types').PersonnelFormData, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_PERSONNEL_CREATE, data, token),
  updatePersonnel: (id: number, data: Partial<import('../../shared/types').PersonnelFormData>, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_PERSONNEL_UPDATE, id, data, token),
  listUtilisateurs: (token: string): Promise<import('../../shared/types').Utilisateur[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_UTILISATEUR_LIST, token),
  createUtilisateur: (data: import('../../shared/types').UtilisateurFormData, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_UTILISATEUR_CREATE, data, token),
  updateUtilisateur: (id: number, data: Partial<import('../../shared/types').UtilisateurFormData>, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_UTILISATEUR_UPDATE, id, data, token),
  resetUtilisateurPassword: (id: number, newPassword: string, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_UTILISATEUR_RESET_PASSWORD, id, newPassword, token),
  listDocumentsOfficiels: (filtres?: import('../../shared/types').DocumentFiltres) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_DOCUMENT_LIST, filtres),
  listJournal: (filtres?: import('../../shared/types').JournalFiltres) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_JOURNAL_LIST, filtres),
  updateClasse: (id: number, data: { nom?: string; capacite_max?: number; titulaire_id?: number | null }, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLASSE_UPDATE, id, data, token),
  getDemoStatus: (token: string): Promise<import('../../shared/types').DemoStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_DEMO_STATUS, token),
  exitDemoMode: (
    confirmation: string,
    token: string
  ): Promise<import('../../shared/types').DemoResetResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADMIN_DEMO_EXIT, confirmation, token),

  listDocumentsEleve: (eleveId: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVE_DOCUMENTS_LIST, eleveId),
  addDocumentEleve: (
    eleveId: number,
    data: { type: import('../../shared/types').TypeDocument; nom_fichier: string; contenu: string },
    token: string
  ) => ipcRenderer.invoke(IPC_CHANNELS.ELEVE_DOCUMENT_ADD, eleveId, data, token),
  deleteDocumentEleve: (id: number, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVE_DOCUMENT_DELETE, id, token),
  setElevePhoto: (eleveId: number, contenu: string | null, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVE_PHOTO_SET, eleveId, contenu, token),
  listCandidatsPassage: (
    anneeSourceId: number,
    anneeCibleId: number
  ): Promise<import('../../shared/types').CandidatPassage[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PASSAGE_CANDIDATS, anneeSourceId, anneeCibleId),
  inscrirePassage: (
    anneeSourceId: number,
    anneeCibleId: number,
    lignes: import('../../shared/types').LignePassage[],
    token: string
  ) => ipcRenderer.invoke(IPC_CHANNELS.PASSAGE_INSCRIRE, anneeSourceId, anneeCibleId, lignes, token),

  listCalendrier: (anneeId: number) => ipcRenderer.invoke(IPC_CHANNELS.CALENDRIER_LIST, anneeId),
  upsertCalendrier: (data: object, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CALENDRIER_UPSERT, data, token),
  deleteCalendrier: (id: number, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CALENDRIER_DELETE, id, token),

  listAffectations: (anneeId: number) => ipcRenderer.invoke(IPC_CHANNELS.AFFECTATION_LIST, anneeId),
  upsertAffectation: (data: object, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AFFECTATION_UPSERT, data, token),
  deleteAffectation: (id: number, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AFFECTATION_DELETE, id, token),
  listEmploiDuTemps: (classeId: number) => ipcRenderer.invoke(IPC_CHANNELS.EMPLOI_LIST, classeId),
  upsertEmploiDuTemps: (data: object, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EMPLOI_UPSERT, data, token),
  deleteEmploiDuTemps: (id: number, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EMPLOI_DELETE, id, token),

  listEcheancier: (anneeId: number, fraisId?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.ECHEANCIER_LIST, anneeId, fraisId),
  upsertEcheance: (data: object, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ECHEANCIER_UPSERT, data, token),
  deleteEcheance: (id: number, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ECHEANCIER_DELETE, id, token),

  getBackupSettings: (token: string) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_SETTINGS_GET, token),
  setBackupSettings: (data: { enabled?: boolean; directory?: string }, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.BACKUP_SETTINGS_SET, data, token),
  chooseBackupDirectory: (token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CHOOSE_DIR, token),
  runAutoBackup: (force: boolean, token: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RUN_AUTO, force, token)
}

contextBridge.exposeInMainWorld('api', api)

export type TchikongApi = typeof api
