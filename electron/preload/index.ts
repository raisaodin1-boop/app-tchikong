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
  restoreDb: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_RESTORE),
  getDbPath: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_PATH),

  // Référentiel
  listSections: (): Promise<Section[]> => ipcRenderer.invoke(IPC_CHANNELS.SECTION_LIST),
  listNiveaux: (sectionId?: number): Promise<Niveau[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.NIVEAU_LIST, sectionId),
  listAnnees: (): Promise<AnneeScolaire[]> => ipcRenderer.invoke(IPC_CHANNELS.ANNEE_LIST),
  getActiveAnnee: (): Promise<AnneeScolaire | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.ANNEE_GET_ACTIVE),
  listClasses: (anneeId?: number): Promise<Classe[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLASSE_LIST, anneeId),

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
  seedDemo: (): Promise<{ message: string; count: number }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEED_DEMO),

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
    ipcRenderer.invoke(IPC_CHANNELS.LISTE_CLASSE_PDF, classeId, action ?? 'save')
}

contextBridge.exposeInMainWorld('api', api)

export type TchikongApi = typeof api
