/// <reference types="vite/client" />

interface TchikongApi {
  login: (req: { username: string; password: string }) => Promise<unknown>
  logout: (token: string) => Promise<boolean>
  getSession: (token: string) => Promise<unknown>
  backupDb: () => Promise<{ success: boolean; path?: string }>
  restoreDb: () => Promise<{ success: boolean }>
  getDbPath: () => Promise<string>
  listSections: () => Promise<unknown[]>
  listNiveaux: (sectionId?: number) => Promise<unknown[]>
  listAnnees: () => Promise<unknown[]>
  getActiveAnnee: () => Promise<unknown>
  listClasses: (anneeId?: number) => Promise<unknown[]>
  listEleves: (filtres?: unknown) => Promise<unknown[]>
  getEleve: (id: number, anneeId?: number) => Promise<unknown>
  createEleve: (data: unknown, token: string) => Promise<unknown>
  updateEleve: (id: number, data: unknown, token: string) => Promise<unknown>
  searchEleves: (term: string, anneeId?: number) => Promise<unknown[]>
  getPresences: (classeId: number, date: string) => Promise<unknown[]>
  savePresences: (data: unknown, token: string) => Promise<boolean>
  listHistorique: (eleveId: number) => Promise<unknown[]>
  addHistorique: (eleveId: number, data: object, token: string) => Promise<unknown>
  getDashboardStats: (anneeId?: number) => Promise<unknown>
  rechercheGlobale: (term: string, anneeId?: number) => Promise<unknown[]>
  seedDemo: () => Promise<{ message: string; count: number }>
  listMatieres: (sectionId: number) => Promise<unknown[]>
  listPeriodes: (anneeId: number, type?: string) => Promise<unknown[]>
  getNotesGrid: (classeId: number, periodeId: number) => Promise<unknown>
  saveNotes: (classeId: number, periodeId: number, matiereId: number, notes: unknown[], token: string) => Promise<boolean>
  getMoyennesClasse: (classeId: number, periodeId: number) => Promise<unknown[]>
  getPalmares: (classeId: number, periodeId: number) => Promise<unknown[]>
  genererBulletins: (classeId: number, periodeId: number, appreciations: Record<number, string> | undefined, token: string) => Promise<unknown[]>
  getBulletinData: (eleveId: number, periodeId: number) => Promise<unknown>
  listBulletinsClasse: (classeId: number, periodeId: number) => Promise<unknown[]>
  exportBulletinPdf: (eleveId: number, periodeId: number, action?: string) => Promise<{ success: boolean; path?: string; error?: string }>
  exportPalmaresPdf: (classeId: number, periodeId: number, classeNom?: string, anneeLibelle?: string, action?: string) => Promise<{ success: boolean; path?: string; error?: string }>
  genererDocument: (type: string, eleveId: number, anneeId: number | undefined, action: string, token: string) => Promise<{ success: boolean; path?: string; error?: string }>
  exportListeClassePdf: (classeId: number, action?: string) => Promise<{ success: boolean; path?: string; error?: string }>
}

declare global {
  interface Window {
    api: TchikongApi
  }
}

export {}
