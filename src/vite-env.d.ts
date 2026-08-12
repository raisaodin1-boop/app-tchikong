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
}

declare global {
  interface Window {
    api: TchikongApi
  }
}

export {}
