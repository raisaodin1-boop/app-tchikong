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
import { handlePdfAction, handlePdfPrint } from '../services/pdf-handler'
import { backupDatabase, restoreDatabase, getDbPath } from '../../../db/database'
import { seedDemoData, seedReferenceData } from '../../../db/seed'
import { dialog } from 'electron'

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
  ipcMain.handle(IPC_CHANNELS.DB_BACKUP, async () => {
    const result = await dialog.showSaveDialog({
      title: 'Sauvegarder la base de données',
      defaultPath: `tchikong-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite', extensions: ['db'] }]
    })
    if (!result.canceled && result.filePath) {
      backupDatabase(result.filePath)
      return { success: true, path: result.filePath }
    }
    return { success: false }
  })
  ipcMain.handle(IPC_CHANNELS.DB_RESTORE, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Restaurer une sauvegarde',
      filters: [{ name: 'SQLite', extensions: ['db'] }],
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths[0]) {
      restoreDatabase(result.filePaths[0])
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
  ipcMain.handle(IPC_CHANNELS.ANNEE_CREATE, (_, data) => referentielService.createAnnee(data))
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
  ipcMain.handle(IPC_CHANNELS.CLASSE_CREATE, (_, data) => referentielService.createClasse(data))
  ipcMain.handle(IPC_CHANNELS.CLASSE_UPDATE, (_, id, data, token) => {
    const userId = authService.getCurrentUserId(token)
    return adminService.updateClasse(id, data, userId ?? undefined)
  })

  // Élèves
  ipcMain.handle(IPC_CHANNELS.ELEVE_LIST, (_, filtres) => elevesService.listEleves(filtres))
  ipcMain.handle(IPC_CHANNELS.ELEVE_GET, (_, id, anneeId) => elevesService.getEleve(id, anneeId))
  ipcMain.handle(IPC_CHANNELS.ELEVE_CREATE, (_, data, token) => {
    const userId = authService.getCurrentUserId(token)
    return elevesService.createEleve(data, userId ?? undefined)
  })
  ipcMain.handle(IPC_CHANNELS.ELEVE_UPDATE, (_, id, data, token) => {
    const userId = authService.getCurrentUserId(token)
    return elevesService.updateEleve(id, data, userId ?? undefined)
  })
  ipcMain.handle(IPC_CHANNELS.ELEVE_SEARCH, (_, term, anneeId) =>
    elevesService.searchEleves(term, anneeId)
  )

  // Présence
  ipcMain.handle(IPC_CHANNELS.PRESENCE_GET, (_, classeId, date) =>
    elevesService.getPresences(classeId, date)
  )
  ipcMain.handle(IPC_CHANNELS.PRESENCE_SAVE, (_, data, token) => {
    const userId = authService.getCurrentUserId(token)
    elevesService.savePresences(data, userId ?? undefined)
    return true
  })

  // Historique
  ipcMain.handle(IPC_CHANNELS.HISTORIQUE_LIST, (_, eleveId) => {
    const result = elevesService.getEleve(eleveId)
    return result?.historique ?? []
  })
  ipcMain.handle(IPC_CHANNELS.HISTORIQUE_ADD, (_, eleveId, data, token) => {
    const userId = authService.getCurrentUserId(token)
    return elevesService.addHistorique(eleveId, data, userId ?? undefined)
  })

  // Dashboard & Recherche
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_STATS, (_, anneeId) =>
    dashboardService.getDashboardStats(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.RECHERCHE_GLOBALE, (_, term, anneeId) =>
    dashboardService.rechercheGlobale(term, anneeId)
  )

  // Seed
  ipcMain.handle(IPC_CHANNELS.SEED_DEMO, () => {
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
    const userId = authService.getCurrentUserId(token)
    scolariteService.saveNotes(classeId, periodeId, matiereId, notes, userId ?? undefined)
    return true
  })
  ipcMain.handle(IPC_CHANNELS.MOYENNES_CLASSE, (_, classeId, periodeId) =>
    scolariteService.calculerMoyennesClasse(classeId, periodeId)
  )
  ipcMain.handle(IPC_CHANNELS.PALMARES, (_, classeId, periodeId) =>
    scolariteService.getPalmares(classeId, periodeId)
  )
  ipcMain.handle(IPC_CHANNELS.BULLETIN_GENERER, (_, classeId, periodeId, appreciations, token) => {
    const userId = authService.getCurrentUserId(token)
    return scolariteService.genererBulletinsClasse(
      classeId,
      periodeId,
      appreciations,
      userId ?? undefined
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
      const data = documentsService.getAttestationData(eleveId, anneeId)
      if (!data) return { success: false, error: 'Données élève introuvables' }

      const validTypes = [
        'attestation_scolarite',
        'certificat_frequentation',
        'attestation_reussite'
      ] as const

      if (!validTypes.includes(type)) {
        return { success: false, error: 'Type de document invalide' }
      }

      const userId = authService.getCurrentUserId(token)
      const result = await handlePdfAction(
        { type, data },
        action as 'save' | 'print',
        data.eleve.matricule,
        type.replace(/_/g, ' ')
      )

      if (result.success && result.path) {
        documentsService.enregistrerDocumentOfficiel(
          eleveId,
          type,
          result.path.split('/').pop() || type,
          JSON.stringify(data),
          userId ?? undefined
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
    const userId = authService.getCurrentUserId(token)
    return financesService.createPaiement(data, userId ?? undefined)
  })
  ipcMain.handle(IPC_CHANNELS.FINANCES_PAIEMENT_LIST, (_, filtres) =>
    financesService.listPaiements(filtres)
  )
  ipcMain.handle(IPC_CHANNELS.FINANCES_IMPAYES, (_, anneeId, classeId) =>
    financesService.listImpayes(anneeId, classeId)
  )
  ipcMain.handle(IPC_CHANNELS.FINANCES_DEPENSE_LIST, (_, anneeId) =>
    financesService.listDepenses(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.FINANCES_DEPENSE_CREATE, (_, data, token) => {
    const userId = authService.getCurrentUserId(token)
    return financesService.createDepense(data, userId ?? undefined)
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

  // --- Administratif ---
  ipcMain.handle(IPC_CHANNELS.ADMIN_DASHBOARD, (_, anneeId) =>
    adminService.getAdminDashboard(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.ADMIN_PERSONNEL_LIST, (_, actifOnly) =>
    adminService.listPersonnel(actifOnly)
  )
  ipcMain.handle(IPC_CHANNELS.ADMIN_PERSONNEL_CREATE, (_, data, token) => {
    const userId = authService.getCurrentUserId(token)
    return adminService.createPersonnel(data, userId ?? undefined)
  })
  ipcMain.handle(IPC_CHANNELS.ADMIN_PERSONNEL_UPDATE, (_, id, data, token) => {
    const userId = authService.getCurrentUserId(token)
    return adminService.updatePersonnel(id, data, userId ?? undefined)
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
}
