import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import * as authService from '../services/auth'
import * as referentielService from '../services/referentiel'
import * as elevesService from '../services/eleves'
import * as dashboardService from '../services/dashboard'
import * as scolariteService from '../services/scolarite'
import * as documentsService from '../services/documents'
import * as financesService from '../services/finances'
import * as adminService from '../services/admin'
import * as payrollService from '../services/payroll'
import * as pedagogieService from '../services/pedagogie'
import * as backupService from '../services/backup'
import { getBackupSettings } from '../services/settings'
import { handlePdfAction, handlePdfPrint } from '../services/pdf-handler'
import { backupDatabase, restoreDatabase, getDbPath } from '../../../db/database'
import { seedDemoData, seedReferenceData } from '../../../db/seed'
import { dialog } from 'electron'
import { todayIso } from '../services/pdf/utils'
import type { AuthSession } from '../../../shared/types'

function requireSession(token?: string): AuthSession {
  if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.')
  const session = authService.getSession(token)
  if (!session) throw new Error('Session expirée. Veuillez vous reconnecter.')
  return session
}

function requireDirector(token?: string): AuthSession {
  const session = requireSession(token)
  if (session.utilisateur.role !== 'directrice') {
    throw new Error('Accès réservé à la directrice')
  }
  return session
}

function requirePaymentAccess(token?: string): AuthSession {
  const session = requireSession(token)
  if (!['directrice', 'comptable', 'secretariat'].includes(session.utilisateur.role)) {
    throw new Error(
      'Accès aux paiements réservé à la direction, à la comptabilité et au secrétariat.'
    )
  }
  return session
}

export function registerIpcHandlers(): void {
  // Auth
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, (_, req) => authService.login(req))
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, (_, token) => {
    authService.logout(token)
    return true
  })
  ipcMain.handle(IPC_CHANNELS.AUTH_GET_SESSION, (_, token) => authService.getSession(token))

  // DB
  ipcMain.handle(IPC_CHANNELS.DB_GET_PATH, () => getDbPath())
  ipcMain.handle(IPC_CHANNELS.DB_BACKUP, async (_, token) => {
    requireSession(token)
    const result = await dialog.showSaveDialog({
      title: 'Sauvegarder la base de données',
      defaultPath: `tchikong-backup-${todayIso()}.db`,
      filters: [{ name: 'SQLite', extensions: ['db'] }]
    })
    if (!result.canceled && result.filePath) {
      backupDatabase(result.filePath)
      return { success: true, path: result.filePath }
    }
    return { success: false }
  })
  ipcMain.handle(IPC_CHANNELS.DB_RESTORE, async (_, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    const result = await dialog.showOpenDialog({
      title: 'Restaurer une sauvegarde',
      filters: [{ name: 'SQLite', extensions: ['db'] }],
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths[0]) {
      restoreDatabase(result.filePaths[0])
      authService.clearSessions()
      return { success: true }
    }
    return { success: false }
  })

  // Référentiel
  ipcMain.handle(IPC_CHANNELS.SECTION_LIST, () => referentielService.listSections())
  ipcMain.handle(IPC_CHANNELS.NIVEAU_LIST, (_, sectionId) =>
    referentielService.listNiveaux(sectionId)
  )
  ipcMain.handle(IPC_CHANNELS.ANNEE_LIST, () => referentielService.listAnnees())
  ipcMain.handle(IPC_CHANNELS.ANNEE_GET_ACTIVE, () => referentielService.getActiveAnnee())
  ipcMain.handle(IPC_CHANNELS.ANNEE_CREATE, (_, data, token) => {
    requireDirector(token)
    return referentielService.createAnnee(data)
  })
  ipcMain.handle(IPC_CHANNELS.ANNEE_SET_ACTIVE, (_, id, token) => {
    requireDirector(token)
    return referentielService.setActiveAnnee(id)
  })
  ipcMain.handle(IPC_CHANNELS.ANNEE_START, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return referentielService.startNewAnnee(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.CLASSE_LIST, (_, anneeId) =>
    referentielService.listClasses(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.CLASSE_CREATE, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return referentielService.createClasse(data)
  })
  ipcMain.handle(IPC_CHANNELS.CLASSE_UPDATE, (_, id, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return adminService.updateClasse(id, data, session.utilisateur.id)
  })

  // Élèves
  ipcMain.handle(IPC_CHANNELS.ELEVE_LIST, (_, filtres) => elevesService.listEleves(filtres))
  ipcMain.handle(IPC_CHANNELS.ELEVE_GET, (_, id, anneeId) => elevesService.getEleve(id, anneeId))
  ipcMain.handle(IPC_CHANNELS.ELEVE_CREATE, (_, data, token) => {
    const session = requireSession(token)
    return elevesService.createEleve(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.ELEVE_UPDATE, (_, id, data, token) => {
    const session = requireSession(token)
    return elevesService.updateEleve(id, data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.ELEVE_SEARCH, (_, term, anneeId) =>
    elevesService.searchEleves(term, anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.ELEVE_CHANGE_STATUT, (_, id, statut, anneeId, description, token) => {
    const session = requireSession(token)
    return elevesService.changeStatutEleve(id, statut, anneeId, description, session.utilisateur.id)
  })

  // Présence
  ipcMain.handle(IPC_CHANNELS.PRESENCE_GET, (_, classeId, date) =>
    elevesService.getPresences(classeId, date)
  )
  ipcMain.handle(IPC_CHANNELS.PRESENCE_SAVE, (_, data, token) => {
    const session = requireSession(token)
    elevesService.savePresences(data, session.utilisateur.id)
    return true
  })

  // Historique
  ipcMain.handle(IPC_CHANNELS.HISTORIQUE_LIST, (_, eleveId) => {
    const result = elevesService.getEleve(eleveId)
    return result?.historique ?? []
  })
  ipcMain.handle(IPC_CHANNELS.HISTORIQUE_ADD, (_, eleveId, data, token) => {
    const session = requireSession(token)
    return elevesService.addHistorique(eleveId, data, session.utilisateur.id)
  })

  // Dashboard & Recherche
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_STATS, (_, anneeId) =>
    dashboardService.getDashboardStats(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.RECHERCHE_GLOBALE, (_, term, anneeId) =>
    dashboardService.rechercheGlobale(term, anneeId)
  )

  // Seed
  ipcMain.handle(IPC_CHANNELS.SEED_DEMO, (_, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    seedReferenceData()
    return seedDemoData()
  })

  // Scolarité
  ipcMain.handle(IPC_CHANNELS.MATIERE_LIST, (_, sectionId) =>
    scolariteService.listMatieres(sectionId)
  )
  ipcMain.handle(IPC_CHANNELS.PERIODE_LIST, (_, anneeId, type) =>
    scolariteService.listPeriodes(anneeId, type)
  )
  ipcMain.handle(IPC_CHANNELS.NOTES_GRID, (_, classeId, periodeId) =>
    scolariteService.getNotesGrid(classeId, periodeId)
  )
  ipcMain.handle(IPC_CHANNELS.NOTES_SAVE, (_, classeId, periodeId, matiereId, notes, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'secretariat'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et au secrétariat')
    }
    scolariteService.saveNotes(classeId, periodeId, matiereId, notes, session.utilisateur.id)
    return true
  })
  ipcMain.handle(IPC_CHANNELS.MOYENNES_CLASSE, (_, classeId, periodeId) =>
    scolariteService.calculerMoyennesClasse(classeId, periodeId)
  )
  ipcMain.handle(IPC_CHANNELS.PALMARES, (_, classeId, periodeId) =>
    scolariteService.getPalmares(classeId, periodeId)
  )
  ipcMain.handle(IPC_CHANNELS.BULLETIN_GENERER, (_, classeId, periodeId, appreciations, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'secretariat'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et au secrétariat')
    }
    return scolariteService.genererBulletinsClasse(
      classeId,
      periodeId,
      appreciations,
      session.utilisateur.id
    )
  })
  ipcMain.handle(IPC_CHANNELS.BULLETIN_DATA, (_, eleveId, periodeId) =>
    scolariteService.getBulletinData(eleveId, periodeId)
  )
  ipcMain.handle(IPC_CHANNELS.BULLETIN_LIST, (_, classeId, periodeId) =>
    scolariteService.listBulletinsClasse(classeId, periodeId)
  )

  // --- PDF : bulletins & palmarès ---
  ipcMain.handle(IPC_CHANNELS.BULLETIN_PDF, async (_, eleveId, periodeId, action = 'save') => {
    const data = scolariteService.getBulletinData(eleveId, periodeId)
    if (!data) return { success: false, error: 'Bulletin introuvable — saisissez les notes d\'abord' }
    if (!data.bulletin) {
      return { success: false, error: 'Générez le bulletin avant de l’imprimer' }
    }
    if (
      Math.abs(data.bulletin.moyenne_generale - data.moyenne.moyenne) > 0.001 ||
      data.bulletin.rang !== data.moyenne.rang
    ) {
      return { success: false, error: 'Les notes ont changé. Régénérez le bulletin avant impression.' }
    }
    return handlePdfAction(
      { type: 'bulletin', data },
      action as 'save' | 'print',
      data.eleve.matricule,
      'Bulletin de notes'
    )
  })

  ipcMain.handle(
    IPC_CHANNELS.PALMARES_PDF,
    async (_, classeId, periodeId, classeNom, anneeLibelle, action = 'save') => {
      const grid = scolariteService.getNotesGrid(classeId, periodeId)
      if (!grid) return { success: false, error: 'Classe introuvable' }

      const palmares = scolariteService.getPalmares(classeId, periodeId)
      return handlePdfAction(
        {
          type: 'palmares',
          data: {
            classeNom: classeNom || grid.classe.nom,
            periode: grid.periode,
            anneeLibelle: anneeLibelle || '',
            palmares
          }
        },
        action as 'save' | 'print',
        grid.classe.nom,
        'Palmarès de classe'
      )
    }
  )

  // --- PDF : attestations & documents officiels ---
  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_GENERER,
    async (_, type, eleveId, anneeId, action = 'save', token) => {
      const session = requireSession(token)
      const data = documentsService.getAttestationData(eleveId, anneeId)
      if (!data) return { success: false, error: 'Données élève introuvables' }

      const validTypes = [
        'attestation_scolarite',
        'certificat_frequentation',
        'attestation_reussite',
        'certificat_radiation'
      ] as const

      if (!validTypes.includes(type)) {
        return { success: false, error: 'Type de document invalide' }
      }

      const result = await handlePdfAction(
        { type, data },
        action as 'save' | 'print',
        data.eleve.matricule,
        type.replace(/_/g, ' ')
      )

      if (result.success) {
        documentsService.enregistrerDocumentOfficiel(
          eleveId,
          type === 'certificat_radiation' ? 'autre' : type,
          result.path || `${type}-${eleveId}-${Date.now()}`,
          JSON.stringify(data),
          session.utilisateur.id
        )
      }

      return result
    }
  )

  ipcMain.handle(IPC_CHANNELS.LISTE_CLASSE_PDF, async (_, classeId, action = 'save') => {
    const data = documentsService.getListeClasseData(classeId)
    if (!data) return { success: false, error: 'Classe introuvable' }

    return handlePdfAction(
      { type: 'liste_classe', data },
      action as 'save' | 'print',
      data.classe_nom,
      'Liste de classe'
    )
  })

  ipcMain.handle(IPC_CHANNELS.ANNUAIRE_CLASSE_PDF, async (_, classeId, action = 'save') => {
    const data = documentsService.getAnnuaireClasseData(classeId)
    if (!data) return { success: false, error: 'Classe introuvable' }

    return handlePdfAction(
      { type: 'annuaire_classe', data },
      action as 'save' | 'print',
      data.classe_nom,
      'Annuaire des parents'
    )
  })

  ipcMain.handle(
    IPC_CHANNELS.BULLETINS_CLASSE_PDF,
    async (_, classeId, periodeId, action = 'save') => {
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
      const classeNom = items[0]?.classe.nom || 'classe'
      const result = await handlePdfAction(
        { type: 'bulletins_classe', data: { items } },
        action as 'save' | 'print',
        classeNom,
        'Bulletins de classe'
      )
      if (result.success && skipped > 0) {
        return {
          ...result,
          error: `${skipped} bulletin(s) ignoré(s) (notes à jour non régénérées).`
        }
      }
      return result
    }
  )

  // Impression rapide (sans dialogue sauf print dialog système)
  ipcMain.handle(IPC_CHANNELS.PDF_PRINT, async (_, payload) => {
    return handlePdfPrint(payload)
  })

  // --- Finances ---
  ipcMain.handle(IPC_CHANNELS.FINANCES_DASHBOARD, (_, anneeId) =>
    financesService.getFinancesDashboard(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.FINANCES_SITUATION, (_, eleveId, anneeId) =>
    financesService.getSituationFinanciere(eleveId, anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.FINANCES_GRILLE, (_, anneeId) =>
    financesService.listFraisConfigurations(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.FINANCES_GRILLE_UPSERT, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return financesService.upsertFraisConfiguration(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.FINANCES_GRILLE_DELETE, (_, id, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return financesService.deleteFraisConfiguration(id, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.FINANCES_PAIEMENT_CREATE, (_, data, token) => {
    const session = requirePaymentAccess(token)
    return financesService.createPaiement(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.FINANCES_PAIEMENT_ANNULER, (_, id, token) => {
    const session = requirePaymentAccess(token)
    return financesService.annulerPaiement(id, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.FINANCES_PAIEMENT_LIST, (_, filtres) =>
    financesService.listPaiements(filtres)
  )
  ipcMain.handle(IPC_CHANNELS.FINANCES_CAISSE, (_, anneeId, date) =>
    financesService.getCaisseJournaliere(anneeId, date)
  )
  ipcMain.handle(IPC_CHANNELS.FINANCES_CAISSE_PDF, async (_, anneeId, date, action = 'save') => {
    const data = financesService.getCaisseJournaliere(anneeId, date)
    return handlePdfAction(
      { type: 'caisse_journaliere', data },
      action as 'save' | 'print',
      date,
      'Caisse journalière'
    )
  })
  ipcMain.handle(IPC_CHANNELS.FINANCES_IMPAYES, (_, anneeId, classeId) =>
    financesService.listImpayes(anneeId, classeId)
  )
  ipcMain.handle(IPC_CHANNELS.FINANCES_DEPENSE_LIST, (_, anneeId) =>
    financesService.listDepenses(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.FINANCES_DEPENSE_CREATE, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'comptable'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et à la comptabilité')
    }
    return financesService.createDepense(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.FINANCES_BILAN_ANNUEL, (_, anneeId, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'comptable'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et à la comptabilité')
    }
    return financesService.getBilanAnnuel(anneeId)
  })
  ipcMain.handle(IPC_CHANNELS.FINANCES_RECU_PDF, async (_, paiementId, action = 'save') => {
    const data = financesService.getRecuData(paiementId)
    if (!data) return { success: false, error: 'Paiement introuvable' }
    return handlePdfAction(
      { type: 'recu_paiement', data },
      action as 'save' | 'print',
      data.paiement.numero_recu,
      'Reçu de paiement'
    )
  })
  ipcMain.handle(IPC_CHANNELS.FINANCES_IMPAYES_PDF, async (_, anneeId, anneeLibelle, action = 'save') => {
    const impayes = financesService.listImpayes(anneeId)
    return handlePdfAction(
      { type: 'liste_impayes', data: { anneeLibelle: anneeLibelle || '', impayes } },
      action as 'save' | 'print',
      anneeLibelle || 'impayes',
      'Liste des impayés'
    )
  })

  // --- Paie du personnel ---
  ipcMain.handle(IPC_CHANNELS.PAIE_PERSONNEL_ANNEE, (_, anneeId, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return payrollService.listPersonnelAnnee(anneeId)
  })
  ipcMain.handle(IPC_CHANNELS.PAIE_PERSONNEL_INITIALISER, (_, anneeId, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return payrollService.initializePersonnelAnnee(anneeId, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.PAIE_SALAIRE_CONFIGURER, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return payrollService.configureSalaire(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.PAIE_MENSUELLE, (_, anneeId, month, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return payrollService.getPaieMensuelle(anneeId, month)
  })
  ipcMain.handle(IPC_CHANNELS.PAIE_VALIDER, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return payrollService.validateSalairePayment(data, session.utilisateur.id)
  })

  // --- Administratif ---
  ipcMain.handle(IPC_CHANNELS.ADMIN_DASHBOARD, (_, anneeId) =>
    adminService.getAdminDashboard(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.ADMIN_PERSONNEL_LIST, (_, actifOnly, anneeId) =>
    adminService.listPersonnel(actifOnly, anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.ADMIN_PERSONNEL_CREATE, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return adminService.createPersonnel(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.ADMIN_PERSONNEL_UPDATE, (_, id, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return adminService.updatePersonnel(id, data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.ADMIN_UTILISATEUR_LIST, (_, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return adminService.listUtilisateurs()
  })
  ipcMain.handle(IPC_CHANNELS.ADMIN_UTILISATEUR_CREATE, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    const userId = authService.getCurrentUserId(token)
    return adminService.createUtilisateur(data, userId ?? undefined)
  })
  ipcMain.handle(IPC_CHANNELS.ADMIN_UTILISATEUR_UPDATE, (_, id, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    const userId = authService.getCurrentUserId(token)
    return adminService.updateUtilisateur(id, data, userId ?? undefined)
  })
  ipcMain.handle(IPC_CHANNELS.ADMIN_UTILISATEUR_RESET_PASSWORD, (_, id, newPassword, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    const userId = authService.getCurrentUserId(token)
    return adminService.resetUtilisateurPassword(id, newPassword, userId ?? undefined)
  })
  ipcMain.handle(IPC_CHANNELS.ADMIN_DOCUMENT_LIST, (_, filtres) =>
    adminService.listDocumentsOfficiels(filtres)
  )
  ipcMain.handle(IPC_CHANNELS.ADMIN_JOURNAL_LIST, (_, filtres) =>
    adminService.listJournal(filtres)
  )
  ipcMain.handle(IPC_CHANNELS.ADMIN_DEMO_STATUS, (_, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return adminService.getDemoStatus()
  })
  ipcMain.handle(IPC_CHANNELS.ADMIN_DEMO_EXIT, (_, confirmation, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    if (confirmation !== 'QUITTER DEMO') {
      throw new Error('Confirmation incorrecte')
    }
    return adminService.exitDemoMode(session.utilisateur.id)
  })

  ipcMain.handle(IPC_CHANNELS.ELEVE_DOCUMENTS_LIST, (_, eleveId) =>
    elevesService.listDocumentsEleve(eleveId)
  )
  ipcMain.handle(IPC_CHANNELS.ELEVE_DOCUMENT_ADD, (_, eleveId, data, token) => {
    const session = requireSession(token)
    return elevesService.addDocumentEleve(eleveId, data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.ELEVE_DOCUMENT_DELETE, (_, id, token) => {
    const session = requireSession(token)
    return elevesService.deleteDocumentEleve(id, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.ELEVE_PHOTO_SET, (_, eleveId, contenu, token) => {
    const session = requireSession(token)
    return elevesService.setElevePhoto(eleveId, contenu, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.PASSAGE_CANDIDATS, (_, anneeSourceId, anneeCibleId) =>
    elevesService.listCandidatsPassage(anneeSourceId, anneeCibleId)
  )
  ipcMain.handle(IPC_CHANNELS.PASSAGE_INSCRIRE, (_, anneeSourceId, anneeCibleId, lignes, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'secretariat'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et au secrétariat')
    }
    return elevesService.inscrirePassage(
      anneeSourceId,
      anneeCibleId,
      lignes,
      session.utilisateur.id
    )
  })

  ipcMain.handle(IPC_CHANNELS.CALENDRIER_LIST, (_, anneeId) =>
    pedagogieService.listCalendrier(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.CALENDRIER_UPSERT, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'secretariat'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et au secrétariat')
    }
    return pedagogieService.upsertCalendrier(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.CALENDRIER_DELETE, (_, id, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'secretariat'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et au secrétariat')
    }
    return pedagogieService.deleteCalendrier(id, session.utilisateur.id)
  })

  ipcMain.handle(IPC_CHANNELS.AFFECTATION_LIST, (_, anneeId) =>
    pedagogieService.listAffectations(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.AFFECTATION_UPSERT, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'secretariat'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et au secrétariat')
    }
    return pedagogieService.upsertAffectation(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.AFFECTATION_DELETE, (_, id, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'secretariat'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et au secrétariat')
    }
    return pedagogieService.deleteAffectation(id, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.EMPLOI_LIST, (_, classeId) =>
    pedagogieService.listEmploiDuTemps(classeId)
  )
  ipcMain.handle(IPC_CHANNELS.EMPLOI_UPSERT, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'secretariat'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et au secrétariat')
    }
    return pedagogieService.upsertEmploiDuTemps(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.EMPLOI_DELETE, (_, id, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'secretariat'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et au secrétariat')
    }
    return pedagogieService.deleteEmploiDuTemps(id, session.utilisateur.id)
  })

  ipcMain.handle(IPC_CHANNELS.ECHEANCIER_LIST, (_, anneeId, fraisId) =>
    financesService.listEcheancier(anneeId, fraisId)
  )
  ipcMain.handle(IPC_CHANNELS.ECHEANCIER_UPSERT, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'comptable'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et à la comptabilité')
    }
    return financesService.upsertEcheance(data, session.utilisateur.id)
  })
  ipcMain.handle(IPC_CHANNELS.ECHEANCIER_DELETE, (_, id, token) => {
    const session = authService.getSession(token)
    if (!session || !['directrice', 'comptable'].includes(session.utilisateur.role)) {
      throw new Error('Accès réservé à la direction et à la comptabilité')
    }
    return financesService.deleteEcheance(id, session.utilisateur.id)
  })

  ipcMain.handle(IPC_CHANNELS.BACKUP_SETTINGS_GET, (_, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return getBackupSettings()
  })
  ipcMain.handle(IPC_CHANNELS.BACKUP_SETTINGS_SET, (_, data, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return backupService.updateBackupSettings(data)
  })
  ipcMain.handle(IPC_CHANNELS.BACKUP_CHOOSE_DIR, (_, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return backupService.chooseBackupDirectory()
  })
  ipcMain.handle(IPC_CHANNELS.BACKUP_RUN_AUTO, (_, force, token) => {
    const session = authService.getSession(token)
    if (!session || session.utilisateur.role !== 'directrice') {
      throw new Error('Accès réservé à la directrice')
    }
    return backupService.runScheduledBackup(Boolean(force))
  })
}
