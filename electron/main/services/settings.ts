import { getDb } from '@database'

export function getAppSetting(key: string): string | null {
  const row = getDb()
    .prepare('SELECT value FROM app_settings WHERE key = ?')
    .get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setAppSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
    .run(key, value)
}

export function getBackupSettings(): {
  enabled: boolean
  directory: string | null
  lastDate: string | null
} {
  return {
    enabled: getAppSetting('auto_backup_enabled') === '1',
    directory: getAppSetting('auto_backup_dir'),
    lastDate: getAppSetting('auto_backup_last_date')
  }
}

export function setBackupEnabled(enabled: boolean): void {
  setAppSetting('auto_backup_enabled', enabled ? '1' : '0')
}

export function setBackupDirectory(directory: string): void {
  setAppSetting('auto_backup_dir', directory)
}

export function markBackupDone(date: string): void {
  setAppSetting('auto_backup_last_date', date)
}
