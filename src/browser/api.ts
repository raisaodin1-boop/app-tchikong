import * as authService from '../../electron/main/services/auth'
import * as referentielService from '../../electron/main/services/referentiel'
import * as elevesService from '../../electron/main/services/eleves'
import * as dashboardService from '../../electron/main/services/dashboard'
import * as scolariteService from '../../electron/main/services/scolarite'
import * as documentsService from '../../electron/main/services/documents'
import * as financesService from '../../electron/main/services/finances'
import * as adminService from '../../electron/main/services/admin'
import * as payrollService from '../../electron/main/services/payroll'
import * as pedagogieService from '../../electron/main/services/pedagogie'
import {
  getBackupSettings,
  markBackupDone,
  setBackupDirectory,
  setBackupEnabled
} from '../../electron/main/services/settings'
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
const BROWSER_SESSION_PREFIX = 'tchikong_browser_session_'

function userId(token: string): number | undefined {
  return authService.getCurrentUserId(token) ?? undefined
}

function requireDirector(token: string): void {
  const session = authService.getSession(token)
  if (!session || session.utilisateur.role !== 'directrice') {
    throw new Error('Accès réservé à la directrice')
  }
}

function requireFinanceAccess(token: string): void {
  const session = authService.getSession(token)
  if (!session || !['directrice', 'comptable'].includes(session.utilisateur.role)) {
    throw new Error('Accès réservé à la direction et à la comptabilité')
  }
}

function requirePaymentAccess(token: string): void {
  const session = authService.getSession(token)
  if (!session || !['directrice', 'comptable', 'secretariat'].includes(session.utilisateur.role)) {
    throw new Error(
      'Accès aux paiements réservé à la direction, à la comptabilité et au secrétariat.'
    )
  }
}

function requireAcademicAccess(token: string): void {
  const session = authService.getSession(token)
  if (!session || !['directrice', 'secretariat'].includes(session.utilisateur.role)) {
    throw new Error('Accès réservé à la direction et au secrétariat')
  }
}

async function mutate<T>(operation: () => T): Promise<T> {
  const result = operation()
  await flushDatabase()
  return result
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function toPdfBlob(bytes: Uint8Array): Blob {
  return new Blob([toArrayBuffer(bytes)], { type: 'application/pdf' })
}

function downloadBytes(bytes: Uint8Array, filename: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([toArrayBuffer(bytes)], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function openPrintPreview(): Window | null {
  const preview = window.open('about:blank', '_blank', 'width=920,height=740')
  if (preview) {
    preview.document.write(
      '<!DOCTYPE html><title>Préparation du document…</title><p style="font-family:sans-serif;padding:2rem">Préparation du document…</p>'
    )
    preview.document.close()
  }
  return preview
}

async function printPdf(bytes: Uint8Array, preview: Window | null, filename: string): Promise<boolean> {
  const url = URL.createObjectURL(toPdfBlob(bytes))
  const revoke = () => setTimeout(() => URL.revokeObjectURL(url), 60_000)

  if (preview && !preview.closed) {
    preview.location.replace(url)
    const triggerPrint = () => {
      try {
        preview.focus()
        preview.print()
      } catch {
        /* le visualiseur PDF reste ouvert pour imprimer manuellement */
      }
    }
    preview.addEventListener('load', triggerPrint)
    setTimeout(triggerPrint, 600)
    revoke()
    return true
  }

  const iframe = document.createElement('iframe')
  iframe.title = 'Impression'
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  iframe.src = url
  document.body.appendChild(iframe)

  return new Promise((resolve) => {
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        resolve(ok)
      } catch {
        downloadBytes(bytes, filename, 'application/pdf')
        resolve(false)
      }
      setTimeout(() => {
        iframe.remove()
        URL.revokeObjectURL(url)
      }, 60_000)
    }
    iframe.onload = () => finish(true)
    setTimeout(() => finish(true), 800)
  })
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

async function handlePdf(
  payload: PdfPayload,
  action: 'save' | 'print' = 'save',
  identifier: string
): Promise<PdfResult> {
  const preview = action === 'print' ? openPrintPreview() : null
  try {
    const bytes = await generatePdf(payload)
    const filename = getDefaultFilename(payload.type as DocumentType, identifier)
    if (action === 'print') {
      const printed = await printPdf(bytes, preview, filename)
      return {
        success: printed,
        printed,
        error: printed ? undefined : 'Impression bloquée : le PDF a été téléchargé'
      }
    }
    preview?.close()
    downloadBytes(bytes, filename, 'application/pdf')
    return { success: true, path: filename }
  } catch (error) {
    if (preview && !preview.closed) preview.close()
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de génération PDF'
    }
  }
}

const browserApi = {
  login: async (request: { username: string; password: string }) => {
    const session = await mutate(() => authService.login(request))
    if (session) {
      localStorage.setItem(
        `${BROWSER_SESSION_PREFIX}${session.token}`,
        JSON.stringify({
          utilisateurId: session.utilisateur.id,
          expiresAt: Date.now() + 8 * 60 * 60 * 1000
        })
      )
    }
    return session
  },
  logout: async (token: string) => {
    authService.logout(token)
    localStorage.removeItem(`${BROWSER_SESSION_PREFIX}${token}`)
    await flushDatabase()
    return true
  },
  getSession: async (token: string) => {
    const active = authService.getSession(token)
    if (active) return active
    const stored = localStorage.getItem(`${BROWSER_SESSION_PREFIX}${token}`)
    if (!stored) return null
    try {
      const session = JSON.parse(stored) as { utilisateurId: number; expiresAt: number }
      const restored = authService.restoreSession(token, session.utilisateurId, session.expiresAt)
      if (!restored) localStorage.removeItem(`${BROWSER_SESSION_PREFIX}${token}`)
      return restored
    } catch {
      localStorage.removeItem(`${BROWSER_SESSION_PREFIX}${token}`)
      return null
    }
  },

  backupDb: async () => {
    const filename = `tchikong-backup-${new Date().toISOString().slice(0, 10)}.db`
    downloadBytes(await exportDatabase(), filename, 'application/x-sqlite3')
    return { success: true, path: filename }
  },
  restoreDb: async (token: string) => {
    requireDirector(token)
    const bytes = await chooseDatabaseFile()
    if (!bytes) return { success: false }
    await importDatabase(bytes)
    authService.clearSessions()
    localStorage.removeItem(`${BROWSER_SESSION_PREFIX}${token}`)
    localStorage.removeItem('tchikong_token')
    return { success: true }
  },
  getDbPath: async () => 'Stockage local sécurisé du navigateur (IndexedDB)',

  listSections: async () => referentielService.listSections(),
  listNiveaux: async (sectionId?: number) => referentielService.listNiveaux(sectionId),
  listAnnees: async () => referentielService.listAnnees(),
  getActiveAnnee: async () => referentielService.getActiveAnnee(),
  createAnnee: async (data: Parameters<typeof referentielService.createAnnee>[0], token: string) => {
    requireDirector(token)
    return mutate(() => referentielService.createAnnee(data))
  },
  setActiveAnnee: async (id: number, token: string) => {
    requireDirector(token)
    return mutate(() => referentielService.setActiveAnnee(id))
  },
  startNewAnnee: async (
    data: import('../../shared/types').NouvelleAnneeFormData,
    token: string
  ) => {
    requireDirector(token)
    return mutate(() => referentielService.startNewAnnee(data, userId(token)))
  },
  listClasses: async (anneeId?: number) => referentielService.listClasses(anneeId),
  createClasse: async (
    data: Parameters<typeof referentielService.createClasse>[0],
    token: string
  ) => {
    requireDirector(token)
    return mutate(() => referentielService.createClasse(data))
  },

  listEleves: async (filters?: EleveFiltres) => elevesService.listEleves(filters),
  getEleve: async (id: number, anneeId?: number) => elevesService.getEleve(id, anneeId),
  createEleve: async (data: EleveFormData, token: string) =>
    mutate(() => elevesService.createEleve(data, userId(token))),
  updateEleve: async (id: number, data: Partial<EleveFormData>, token: string) =>
    mutate(() => elevesService.updateEleve(id, data, userId(token))),
  searchEleves: async (term: string, anneeId?: number) =>
    elevesService.searchEleves(term, anneeId),
  changeStatutEleve: async (
    id: number,
    statut: import('../../shared/types').StatutEleve,
    anneeId: number | undefined,
    description: string | undefined,
    token: string
  ) => mutate(() => elevesService.changeStatutEleve(id, statut, anneeId, description, userId(token))),
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
  seedDemo: async (token: string) => {
    requireDirector(token)
    return mutate(() => seedDemoData())
  },

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
    requireAcademicAccess(token)
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
  ) => {
    requireAcademicAccess(token)
    return mutate(() =>
      scolariteService.genererBulletinsClasse(
        classeId,
        periodeId,
        appreciations,
        userId(token)
      )
    )
  },
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
    if (!data.bulletin) {
      return { success: false, error: 'Générez le bulletin avant de l’imprimer' }
    }
    if (
      Math.abs(data.bulletin.moyenne_generale - data.moyenne.moyenne) > 0.001 ||
      data.bulletin.rang !== data.moyenne.rang
    ) {
      return {
        success: false,
        error: 'Les notes ont changé. Régénérez le bulletin avant impression.'
      }
    }
    return handlePdf({ type: 'bulletin', data }, action, data.eleve.matricule)
  },
  exportBulletinsClassePdf: async (
    classeId: number,
    periodeId: number,
    action: 'save' | 'print' = 'save'
  ) => {
    const { items, skipped } = scolariteService.collectBulletinsClassePdfData(classeId, periodeId)
    if (items.length === 0) {
      return {
        success: false,
        error:
          skipped > 0
            ? 'Les notes ont changé. Régénérez les bulletins avant impression.'
            : 'Aucun bulletin à imprimer. Générez d’abord les bulletins.'
      }
    }
    const result = await handlePdf(
      { type: 'bulletins_classe', data: { items } },
      action,
      items[0]?.classe.nom || 'classe'
    )
    if (result.success && skipped > 0) {
      return {
        ...result,
        error: `${skipped} bulletin(s) ignoré(s) (notes à jour non régénérées).`
      }
    }
    return result
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
    type:
      | 'attestation_scolarite'
      | 'certificat_frequentation'
      | 'attestation_reussite'
      | 'certificat_radiation',
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
          type === 'certificat_radiation' ? 'autre' : type,
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
  exportAnnuaireClassePdf: async (classeId: number, action: 'save' | 'print' = 'save') => {
    const data = documentsService.getAnnuaireClasseData(classeId)
    if (!data) return { success: false, error: 'Classe introuvable' }
    return handlePdf({ type: 'annuaire_classe', data }, action, data.classe_nom)
  },

  getFinancesDashboard: async (anneeId: number) =>
    financesService.getFinancesDashboard(anneeId),
  getSituationFinanciere: async (eleveId: number, anneeId: number) =>
    financesService.getSituationFinanciere(eleveId, anneeId),
  listFraisConfigurations: async (anneeId: number) =>
    financesService.listFraisConfigurations(anneeId),
  upsertFraisConfiguration: async (
    data: import('../../shared/types').FraisConfigurationFormData,
    token: string
  ) => {
    requireDirector(token)
    return mutate(() => financesService.upsertFraisConfiguration(data, userId(token)))
  },
  deleteFraisConfiguration: async (id: number, token: string) => {
    requireDirector(token)
    return mutate(() => financesService.deleteFraisConfiguration(id, userId(token)))
  },
  createPaiement: async (data: PaiementFormData, token: string) => {
    requirePaymentAccess(token)
    return mutate(() => financesService.createPaiement(data, userId(token)))
  },
  annulerPaiement: async (id: number, token: string) => {
    requirePaymentAccess(token)
    return mutate(() => financesService.annulerPaiement(id, userId(token)))
  },
  listPaiements: async (filters?: PaiementFiltres) => financesService.listPaiements(filters),
  listImpayes: async (anneeId: number, classeId?: number) =>
    financesService.listImpayes(anneeId, classeId),
  listDepenses: async (anneeId: number) => financesService.listDepenses(anneeId),
  createDepense: async (data: object, token: string) => {
    requireFinanceAccess(token)
    return mutate(() =>
      financesService.createDepense(
        data as Parameters<typeof financesService.createDepense>[0],
        userId(token)
      )
    )
  },
  getBilanAnnuel: async (anneeId: number, token: string) => {
    requireFinanceAccess(token)
    return financesService.getBilanAnnuel(anneeId)
  },
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

  listPersonnelAnnee: async (anneeId: number, token: string) => {
    requireDirector(token)
    return payrollService.listPersonnelAnnee(anneeId)
  },
  initializePersonnelAnnee: async (anneeId: number, token: string) => {
    requireDirector(token)
    return mutate(() => payrollService.initializePersonnelAnnee(anneeId, userId(token)))
  },
  configureSalaire: async (
    data: import('../../shared/types').SalairePersonnelFormData,
    token: string
  ) => {
    requireDirector(token)
    return mutate(() => payrollService.configureSalaire(data, userId(token)))
  },
  getPaieMensuelle: async (anneeId: number, month: string, token: string) => {
    requireDirector(token)
    return mutate(() => payrollService.getPaieMensuelle(anneeId, month))
  },
  validateSalairePayment: async (
    data: import('../../shared/types').ValidationSalaireData,
    token: string
  ) => {
    requireDirector(token)
    return mutate(() => payrollService.validateSalairePayment(data, userId(token)))
  },

  getAdminDashboard: async (anneeId?: number) => adminService.getAdminDashboard(anneeId),
  listPersonnel: async (actifOnly?: boolean, anneeScolaireId?: number) =>
    adminService.listPersonnel(actifOnly, anneeScolaireId),
  createPersonnel: async (data: PersonnelFormData, token: string) => {
    requireDirector(token)
    return mutate(() => adminService.createPersonnel(data, userId(token)))
  },
  updatePersonnel: async (id: number, data: Partial<PersonnelFormData>, token: string) => {
    requireDirector(token)
    return mutate(() => adminService.updatePersonnel(id, data, userId(token)))
  },
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
    data: { nom?: string; capacite_max?: number; titulaire_id?: number | null },
    token: string
  ) => {
    requireDirector(token)
    return mutate(() => adminService.updateClasse(id, data, userId(token)))
  },
  getDemoStatus: async (token: string) => {
    requireDirector(token)
    return adminService.getDemoStatus()
  },
  exitDemoMode: async (confirmation: string, token: string) => {
    requireDirector(token)
    if (confirmation !== 'QUITTER DEMO') throw new Error('Confirmation incorrecte')
    return mutate(() => adminService.exitDemoMode(userId(token)))
  },

  listDocumentsEleve: async (eleveId: number) => elevesService.listDocumentsEleve(eleveId),
  addDocumentEleve: async (
    eleveId: number,
    data: { type: import('../../shared/types').TypeDocument; nom_fichier: string; contenu: string },
    token: string
  ) => mutate(() => elevesService.addDocumentEleve(eleveId, data, userId(token))),
  deleteDocumentEleve: async (id: number, token: string) =>
    mutate(() => elevesService.deleteDocumentEleve(id, userId(token))),
  setElevePhoto: async (eleveId: number, contenu: string | null, token: string) =>
    mutate(() => elevesService.setElevePhoto(eleveId, contenu, userId(token))),
  listCandidatsPassage: async (anneeSourceId: number, anneeCibleId: number) =>
    elevesService.listCandidatsPassage(anneeSourceId, anneeCibleId),
  inscrirePassage: async (
    anneeSourceId: number,
    anneeCibleId: number,
    lignes: import('../../shared/types').LignePassage[],
    token: string
  ) => {
    requireAcademicAccess(token)
    return mutate(() =>
      elevesService.inscrirePassage(anneeSourceId, anneeCibleId, lignes, userId(token))
    )
  },

  listCalendrier: async (anneeId: number) => pedagogieService.listCalendrier(anneeId),
  upsertCalendrier: async (data: Parameters<typeof pedagogieService.upsertCalendrier>[0], token: string) => {
    requireAcademicAccess(token)
    return mutate(() => pedagogieService.upsertCalendrier(data, userId(token)))
  },
  deleteCalendrier: async (id: number, token: string) => {
    requireAcademicAccess(token)
    return mutate(() => pedagogieService.deleteCalendrier(id, userId(token)))
  },

  listAffectations: async (anneeId: number) => pedagogieService.listAffectations(anneeId),
  upsertAffectation: async (
    data: Parameters<typeof pedagogieService.upsertAffectation>[0],
    token: string
  ) => {
    requireAcademicAccess(token)
    return mutate(() => pedagogieService.upsertAffectation(data, userId(token)))
  },
  deleteAffectation: async (id: number, token: string) => {
    requireAcademicAccess(token)
    return mutate(() => pedagogieService.deleteAffectation(id, userId(token)))
  },
  listEmploiDuTemps: async (classeId: number) => pedagogieService.listEmploiDuTemps(classeId),
  upsertEmploiDuTemps: async (
    data: Parameters<typeof pedagogieService.upsertEmploiDuTemps>[0],
    token: string
  ) => {
    requireAcademicAccess(token)
    return mutate(() => pedagogieService.upsertEmploiDuTemps(data, userId(token)))
  },
  deleteEmploiDuTemps: async (id: number, token: string) => {
    requireAcademicAccess(token)
    return mutate(() => pedagogieService.deleteEmploiDuTemps(id, userId(token)))
  },

  listEcheancier: async (anneeId: number, fraisId?: number) =>
    financesService.listEcheancier(anneeId, fraisId),
  upsertEcheance: async (data: Parameters<typeof financesService.upsertEcheance>[0], token: string) => {
    requireFinanceAccess(token)
    return mutate(() => financesService.upsertEcheance(data, userId(token)))
  },
  deleteEcheance: async (id: number, token: string) => {
    requireFinanceAccess(token)
    return mutate(() => financesService.deleteEcheance(id, userId(token)))
  },

  getBackupSettings: async (token: string) => {
    requireDirector(token)
    return getBackupSettings()
  },
  setBackupSettings: async (data: { enabled?: boolean; directory?: string }, token: string) => {
    requireDirector(token)
    if (typeof data.enabled === 'boolean') setBackupEnabled(data.enabled)
    if (data.directory) setBackupDirectory(data.directory)
    await flushDatabase()
    return getBackupSettings()
  },
  chooseBackupDirectory: async (token: string) => {
    requireDirector(token)
    return 'Téléchargements du navigateur'
  },
  runAutoBackup: async (force: boolean, token: string) => {
    requireDirector(token)
    const settings = getBackupSettings()
    const today = new Date().toISOString().slice(0, 10)
    if (!force && !settings.enabled) return { ran: false }
    if (!force && settings.lastDate === today) return { ran: false }
    const filename = `tchikong-${today}.db`
    downloadBytes(await exportDatabase(), filename, 'application/x-sqlite3')
    markBackupDone(today)
    await flushDatabase()
    return { ran: true, path: filename }
  }
}

export async function installBrowserApi(): Promise<void> {
  await initBrowserDatabase()
  seedReferenceData()
  await flushDatabase()
  window.api = browserApi
  const settings = getBackupSettings()
  const today = new Date().toISOString().slice(0, 10)
  if (settings.enabled && settings.lastDate !== today) {
    const filename = `tchikong-${today}.db`
    downloadBytes(await exportDatabase(), filename, 'application/x-sqlite3')
    markBackupDone(today)
    await flushDatabase()
  }
}
