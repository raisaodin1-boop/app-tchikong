import { app, dialog } from 'electron'
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs'
import { join } from 'path'
import { backupDatabase } from '@database'
import {
  getBackupSettings,
  markBackupDone,
  setBackupDirectory,
  setBackupEnabled
} from './settings'

const KEEP_DAYS = 30

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultDirectory(): string {
  return join(app.getPath('desktop'), 'TCHIKONG-sauvegardes')
}

export function chooseBackupDirectory(): string | null {
  const result = dialog.showOpenDialogSync({
    title: 'Dossier des sauvegardes automatiques',
    properties: ['openDirectory', 'createDirectory']
  })
  if (!result?.[0]) return null
  setBackupDirectory(result[0])
  return result[0]
}

function pruneOldBackups(dir: string): void {
  if (!existsSync(dir)) return
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000
  for (const name of readdirSync(dir)) {
    if (!/^tchikong-\d{4}-\d{2}-\d{2}\.db$/.test(name)) continue
    const full = join(dir, name)
    try {
      if (statSync(full).mtimeMs < cutoff) unlinkSync(full)
    } catch {
      /* ignore */
    }
  }
}

export function runScheduledBackup(force = false): {
  ran: boolean
  path?: string
  error?: string
} {
  const settings = getBackupSettings()
  if (!force && !settings.enabled) return { ran: false }
  const date = today()
  if (!force && settings.lastDate === date) return { ran: false }

  const dir = settings.directory || defaultDirectory()
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const dest = join(dir, `tchikong-${date}.db`)
    backupDatabase(dest)
    markBackupDone(date)
    if (!settings.directory) setBackupDirectory(dir)
    pruneOldBackups(dir)
    return { ran: true, path: dest }
  } catch (error) {
    return {
      ran: false,
      error: error instanceof Error ? error.message : 'Sauvegarde automatique impossible'
    }
  }
}

export function updateBackupSettings(data: { enabled?: boolean; directory?: string }): {
  enabled: boolean
  directory: string | null
  lastDate: string | null
} {
  if (typeof data.enabled === 'boolean') setBackupEnabled(data.enabled)
  if (data.directory) setBackupDirectory(data.directory)
  return getBackupSettings()
}
