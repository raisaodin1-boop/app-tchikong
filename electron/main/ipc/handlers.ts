import { ipcMain, dialog } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import * as authService from '../services/auth'
import * as referentielService from '../services/referentiel'
import * as elevesService from '../services/eleves'
import * as dashboardService from '../services/dashboard'
import * as scolariteService from '../services/scolarite'
import { generateBulletinPdf, generatePalmaresPdf } from '../services/pdf-bulletin'
import { backupDatabase, restoreDatabase, getDbPath } from '../../../db/database'
import { seedDemoData, seedReferenceData } from '../../../db/seed'

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
  ipcMain.handle(IPC_CHANNELS.CLASSE_LIST, (_, anneeId) =>
    referentielService.listClasses(anneeId)
  )
  ipcMain.handle(IPC_CHANNELS.CLASSE_CREATE, (_, data) => referentielService.createClasse(data))

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
  ipcMain.handle(IPC_CHANNELS.BULLETIN_PDF, async (_, eleveId, periodeId) => {
    const data = scolariteService.getBulletinData(eleveId, periodeId)
    if (!data) return { success: false, error: 'Bulletin introuvable' }

    const pdfBytes = await generateBulletinPdf(data)
    const result = await dialog.showSaveDialog({
      title: 'Enregistrer le bulletin',
      defaultPath: `bulletin-${data.eleve.matricule}-${data.periode.libelle.replace(/\s/g, '-')}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (!result.canceled && result.filePath) {
      writeFileSync(result.filePath, pdfBytes)
      return { success: true, path: result.filePath }
    }
    return { success: false }
  })
  ipcMain.handle(
    IPC_CHANNELS.PALMARES_PDF,
    async (_, classeId, periodeId, classeNom, anneeLibelle) => {
      const grid = scolariteService.getNotesGrid(classeId, periodeId)
      if (!grid) return { success: false, error: 'Classe introuvable' }

      const palmares = scolariteService.getPalmares(classeId, periodeId)
      const pdfBytes = await generatePalmaresPdf(
        classeNom || grid.classe.nom,
        grid.periode,
        anneeLibelle || '',
        palmares
      )
      const result = await dialog.showSaveDialog({
        title: 'Enregistrer le palmarès',
        defaultPath: `palmares-${grid.classe.nom}-${grid.periode.libelle.replace(/\s/g, '-')}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      })
      if (!result.canceled && result.filePath) {
        writeFileSync(result.filePath, pdfBytes)
        return { success: true, path: result.filePath }
      }
      return { success: false }
    }
  )
}
