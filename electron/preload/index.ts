import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type {
  AnneeScolaire,
  AuthSession,
  Classe,
  DashboardStats,
  Eleve,
  EleveFiltres,
  EleveFormData,
  HistoriqueEleve,
  Inscription,
  LoginRequest,
  Niveau,
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
    ipcRenderer.invoke(IPC_CHANNELS.SEED_DEMO)
}

contextBridge.exposeInMainWorld('api', api)

export type TchikongApi = typeof api
