import * as authService from '../../electron/main/services/auth'
import * as referentielService from '../../electron/main/services/referentiel'
import * as elevesService from '../../electron/main/services/eleves'
import * as dashboardService from '../../electron/main/services/dashboard'
import * as scolariteService from '../../electron/main/services/scolarite'
import * as documentsService from '../../electron/main/services/documents'
import * as financesService from '../../electron/main/services/finances'
import * as adminService from '../../electron/main/services/admin'
import { generatePdf, getDefaultFilename, type PdfPayload } from '../../electron/main/services/pdf'
import type { DocumentType } from '../../electron/main/services/pdf/config'
import { seedDemoData, seedReferenceData } from '../../db/seed'
import type {
  DocumentFiltres,
  EleveFiltres,
  EleveFormData,
  JournalFiltres,
  NoteInput,
  PaiementFiltres,
  PaiementFormData,
  PersonnelFormData,
  PresenceJourData,
  UtilisateurFormData
} from '../../shared/types'
import {
  exportDatabase,
  flushDatabase,
  importDatabase,
  initBrowserDatabase
} from './database'

type PdfResult = { success: boolean; path?: string; error?: string; printed?: boolean }

function userId(token: string): number | undefined {
  return authService.getCurrentUserId(token) ?? undefined
}

function requireDirector(token: string): void {
  const session = authService.getSession(token)
  if (!session || session.utilisateur.role !== 'directrice') {
    throw new Error('Accès réservé à la directrice')
  }
}

async function mutate<T>(operation: () => T): Promise<T> {
  const result = operation()
  await flushDatabase()
  return result
}

function downloadBytes(bytes: Uint8Array, filename: string, mimeType: string): void {
  const copy = new Uint8Array(bytes)
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function chooseDatabaseFile(): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.db,application/x-sqlite3'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      try {
        resolve(new Uint8Array(await file.arrayBuffer()))
      } catch (error) {
        reject(error)
      }
    }
    input.click()
  })
}

async function printPdf(bytes: Uint8Array): Promise<boolean> {
  const copy = new Uint8Array(bytes)
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: 'application/pdf' }))
  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.width = '1px'
  frame.style.height = '1px'
  frame.style.opacity = '0'
  frame.src = url
  document.body.appendChild(frame)

  return new Promise((resolve) => {
    frame.onload = () => {
      try {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        resolve(true)
      } catch {
        resolve(false)
      } finally {
        setTimeout(() => {
          frame.remove()
          URL.revokeObjectURL(url)
        }, 60_000)
      }
    }
  })
}

async function handlePdf(
  payload: PdfPayload,
  action: 'save' | 'print' = 'save',
  identifier: string
): Promise<PdfResult> {
  try {
    const bytes = await generatePdf(payload)
    const filename = getDefaultFilename(payload.type as DocumentType, identifier)
    if (action === 'print') {
      const printed = await printPdf(bytes)
      return { success: printed, printed, error: printed ? undefined : 'Impression impossible' }
    }
    downloadBytes(bytes, filename, 'application/pdf')
    return { success: true, path: filename }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de génération PDF'
    }
  }
}

const browserApi = {
  login: async (request: { username: string; password: string }) =>
    mutate(() => authService.login(request)),
  logout: async (token: string) => {
    authService.logout(token)
    await flushDatabase()
    return true
  },
  getSession: async (token: string) => authService.getSession(token),

  backupDb: async () => {
    const filename = `tchikong-backup-${new Date().toISOString().slice(0, 10)}.db`
    downloadBytes(await exportDatabase(), filename, 'application/x-sqlite3')
    return { success: true, path: filename }
  },
  restoreDb: async () => {
    const bytes = await chooseDatabaseFile()
    if (!bytes) return { success: false }
    await importDatabase(bytes)
    return { success: true }
  },
  getDbPath: async () => 'Stockage local sécurisé du navigateur (IndexedDB)',

  listSections: async () => referentielService.listSections(),
  listNiveaux: async (sectionId?: number) => referentielService.listNiveaux(sectionId),
  listAnnees: async () => referentielService.listAnnees(),
  getActiveAnnee: async () => referentielService.getActiveAnnee(),
  listClasses: async (anneeId?: number) => referentielService.listClasses(anneeId),

  listEleves: async (filters?: EleveFiltres) => elevesService.listEleves(filters),
  getEleve: async (id: number, anneeId?: number) => elevesService.getEleve(id, anneeId),
  createEleve: async (data: EleveFormData, token: string) =>
    mutate(() => elevesService.createEleve(data, userId(token))),
  updateEleve: async (id: number, data: Partial<EleveFormData>, token: string) =>
    mutate(() => elevesService.updateEleve(id, data, userId(token))),
  searchEleves: async (term: string, anneeId?: number) =>
    elevesService.searchEleves(term, anneeId),
  getPresences: async (classeId: number, date: string) =>
    elevesService.getPresences(classeId, date),
  savePresences: async (data: PresenceJourData, token: string) => {
    await mutate(() => elevesService.savePresences(data, userId(token)))
    return true
  },
  listHistorique: async (eleveId: number) =>
    elevesService.getEleve(eleveId)?.historique ?? [],
  addHistorique: async (eleveId: number, data: object, token: string) =>
    mutate(() =>
      elevesService.addHistorique(
        eleveId,
        data as Parameters<typeof elevesService.addHistorique>[1],
        userId(token)
      )
    ),

  getDashboardStats: async (anneeId?: number) => dashboardService.getDashboardStats(anneeId),
  rechercheGlobale: async (term: string, anneeId?: number) =>
    dashboardService.rechercheGlobale(term, anneeId),
  seedDemo: async () => mutate(() => seedDemoData()),

  listMatieres: async (sectionId: number) => scolariteService.listMatieres(sectionId),
  listPeriodes: async (anneeId: number, type?: 'sequence' | 'trimestre') =>
    scolariteService.listPeriodes(anneeId, type),
  getNotesGrid: async (classeId: number, periodeId: number) =>
    scolariteService.getNotesGrid(classeId, periodeId),
  saveNotes: async (
    classeId: number,
    periodeId: number,
    matiereId: number,
    notes: NoteInput[],
    token: string
  ) => {
    await mutate(() =>
      scolariteService.saveNotes(classeId, periodeId, matiereId, notes, userId(token))
    )
    return true
  },
  getMoyennesClasse: async (classeId: number, periodeId: number) =>
    scolariteService.calculerMoyennesClasse(classeId, periodeId),
  getPalmares: async (classeId: number, periodeId: number) =>
    scolariteService.getPalmares(classeId, periodeId),
  genererBulletins: async (
    classeId: number,
    periodeId: number,
    appreciations: Record<number, string> | undefined,
    token: string
  ) =>
    mutate(() =>
      scolariteService.genererBulletinsClasse(
        classeId,
        periodeId,
        appreciations,
        userId(token)
      )
    ),
  getBulletinData: async (eleveId: number, periodeId: number) =>
    scolariteService.getBulletinData(eleveId, periodeId),
  listBulletinsClasse: async (classeId: number, periodeId: number) =>
    scolariteService.listBulletinsClasse(classeId, periodeId),
  exportBulletinPdf: async (
    eleveId: number,
    periodeId: number,
    action: 'save' | 'print' = 'save'
  ) => {
    const data = scolariteService.getBulletinData(eleveId, periodeId)
    if (!data) return { success: false, error: 'Bulletin introuvable — saisissez les notes d’abord' }
    return handlePdf({ type: 'bulletin', data }, action, data.eleve.matricule)
  },
  exportPalmaresPdf: async (
    classeId: number,
    periodeId: number,
    classeNom?: string,
    anneeLibelle?: string,
    action: 'save' | 'print' = 'save'
  ) => {
    const grid = scolariteService.getNotesGrid(classeId, periodeId)
    if (!grid) return { success: false, error: 'Classe introuvable' }
    return handlePdf(
      {
        type: 'palmares',
        data: {
          classeNom: classeNom || grid.classe.nom,
          periode: grid.periode,
          anneeLibelle: anneeLibelle || '',
          palmares: scolariteService.getPalmares(classeId, periodeId)
        }
      },
      action,
      grid.classe.nom
    )
  },
  genererDocument: async (
    type: 'attestation_scolarite' | 'certificat_frequentation' | 'attestation_reussite',
    eleveId: number,
    anneeId: number | undefined,
    action: 'save' | 'print',
    token: string
  ) => {
    const data = documentsService.getAttestationData(eleveId, anneeId)
    if (!data) return { success: false, error: 'Données élève introuvables' }
    const result = await handlePdf({ type, data }, action, data.eleve.matricule)
    if (result.success) {
      await mutate(() =>
        documentsService.enregistrerDocumentOfficiel(
          eleveId,
          type,
          `${type}-${eleveId}-${Date.now()}`,
          JSON.stringify(data),
          userId(token)
        )
      )
    }
    return result
  },
  exportListeClassePdf: async (classeId: number, action: 'save' | 'print' = 'save') => {
    const data = documentsService.getListeClasseData(classeId)
    if (!data) return { success: false, error: 'Classe introuvable' }
    return handlePdf({ type: 'liste_classe', data }, action, data.classe_nom)
  },

  getFinancesDashboard: async (anneeId: number) =>
    financesService.getFinancesDashboard(anneeId),
  getSituationFinanciere: async (eleveId: number, anneeId: number) =>
    financesService.getSituationFinanciere(eleveId, anneeId),
  listGrilleTarifaire: async (anneeId: number) =>
    financesService.listGrilleTarifaire(anneeId),
  upsertTarif: async (data: import('../../shared/types').TarifFormData, token: string) => {
    requireDirector(token)
    return mutate(() => financesService.upsertTarif(data, userId(token)))
  },
  deleteTarif: async (id: number, token: string) => {
    requireDirector(token)
    return mutate(() => financesService.deleteTarif(id, userId(token)))
  },
  createPaiement: async (data: PaiementFormData, token: string) =>
    mutate(() => financesService.createPaiement(data, userId(token))),
  listPaiements: async (filters?: PaiementFiltres) => financesService.listPaiements(filters),
  listImpayes: async (anneeId: number, classeId?: number) =>
    financesService.listImpayes(anneeId, classeId),
  listDepenses: async (anneeId: number) => financesService.listDepenses(anneeId),
  createDepense: async (data: object, token: string) =>
    mutate(() =>
      financesService.createDepense(
        data as Parameters<typeof financesService.createDepense>[0],
        userId(token)
      )
    ),
  exportRecuPdf: async (paiementId: number, action: 'save' | 'print' = 'save') => {
    const data = financesService.getRecuData(paiementId)
    if (!data) return { success: false, error: 'Paiement introuvable' }
    return handlePdf({ type: 'recu_paiement', data }, action, data.paiement.numero_recu)
  },
  exportImpayesPdf: async (
    anneeId: number,
    anneeLibelle: string,
    action: 'save' | 'print' = 'save'
  ) =>
    handlePdf(
      {
        type: 'liste_impayes',
        data: { anneeLibelle, impayes: financesService.listImpayes(anneeId) }
      },
      action,
      anneeLibelle || 'impayes'
    ),

  getAdminDashboard: async (anneeId?: number) => adminService.getAdminDashboard(anneeId),
  listPersonnel: async (actifOnly?: boolean) => adminService.listPersonnel(actifOnly),
  createPersonnel: async (data: PersonnelFormData, token: string) =>
    mutate(() => adminService.createPersonnel(data, userId(token))),
  updatePersonnel: async (id: number, data: Partial<PersonnelFormData>, token: string) =>
    mutate(() => adminService.updatePersonnel(id, data, userId(token))),
  listUtilisateurs: async (token: string) => {
    requireDirector(token)
    return adminService.listUtilisateurs()
  },
  createUtilisateur: async (data: UtilisateurFormData, token: string) => {
    requireDirector(token)
    return mutate(() => adminService.createUtilisateur(data, userId(token)))
  },
  updateUtilisateur: async (
    id: number,
    data: Partial<UtilisateurFormData>,
    token: string
  ) => {
    requireDirector(token)
    return mutate(() => adminService.updateUtilisateur(id, data, userId(token)))
  },
  resetUtilisateurPassword: async (id: number, password: string, token: string) => {
    requireDirector(token)
    return mutate(() => adminService.resetUtilisateurPassword(id, password, userId(token)))
  },
  listDocumentsOfficiels: async (filters?: DocumentFiltres) =>
    adminService.listDocumentsOfficiels(filters),
  listJournal: async (filters?: JournalFiltres) => adminService.listJournal(filters),
  updateClasse: async (
    id: number,
    data: { nom?: string; capacite_max?: number },
    token: string
  ) => mutate(() => adminService.updateClasse(id, data, userId(token))),
  getDemoStatus: async (token: string) => {
    requireDirector(token)
    return adminService.getDemoStatus()
  },
  exitDemoMode: async (confirmation: string, token: string) => {
    requireDirector(token)
    if (confirmation !== 'QUITTER DEMO') throw new Error('Confirmation incorrecte')
    return mutate(() => adminService.exitDemoMode(userId(token)))
  }
}

export async function installBrowserApi(): Promise<void> {
  await initBrowserDatabase()
  seedReferenceData()
  await flushDatabase()
  window.api = browserApi
}
