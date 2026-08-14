import Database from 'better-sqlite3'
import { readFileSync, existsSync, copyFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

function findMigrationFile(filename: string): string | null {
  const candidates = [
    join(__dirname, '../../db/migrations', filename),
    join(process.cwd(), 'db/migrations', filename),
    join(app.getAppPath(), 'db/migrations', filename)
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'tchikong.db')
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Base de données non initialisée')
  }
  return db
}

export function initDatabase(): Database.Database {
  const dbPath = getDbPath()
  const dbDir = dirname(dbPath)
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  return db
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const applied = new Set(
    database
      .prepare('SELECT version FROM migrations ORDER BY version')
      .all()
      .map((r) => (r as { version: number }).version)
  )

  const migrationFiles = [
    { version: 1, file: '001_initial_schema.sql', name: 'initial_schema' },
    { version: 2, file: '002_app_settings.sql', name: 'app_settings' },
    { version: 3, file: '003_fee_modules.sql', name: 'fee_modules' },
    { version: 4, file: '004_payroll.sql', name: 'payroll' },
    { version: 5, file: '005_sessions.sql', name: 'sessions_persistantes' },
    { version: 6, file: '006_annee_pedagogie.sql', name: 'annee_pedagogie' },
    { version: 7, file: '007_titulaire_classe.sql', name: 'titulaire_classe' },
    { version: 8, file: '008_paiements_annules.sql', name: 'paiements_annules' }
  ]

  for (const migration of migrationFiles) {
    if (applied.has(migration.version)) continue

    const sqlPath = findMigrationFile(migration.file)
    if (!sqlPath) {
      throw new Error(`Migration introuvable: ${migration.file}`)
    }
    const sql = readFileSync(sqlPath, 'utf-8')
    const apply = database.transaction(() => {
      database.exec(sql)
      database
        .prepare('INSERT INTO migrations (version, name) VALUES (?, ?)')
        .run(migration.version, migration.name)
    })
    apply()
  }
}

export function backupDatabase(destPath: string): void {
  const database = getDb()
  database.backup(destPath)
}

export function restoreDatabase(sourcePath: string): void {
  if (!existsSync(sourcePath)) {
    throw new Error('Fichier de sauvegarde introuvable')
  }
  if (db) {
    db.close()
    db = null
  }
  copyFileSync(sourcePath, getDbPath())
  initDatabase()
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function logActivity(
  utilisateurId: number | null,
  action: string,
  entite: string,
  entiteId: number | null,
  details?: string
): void {
  getDb()
    .prepare(
      `INSERT INTO journal_activite (utilisateur_id, action, entite, entite_id, details)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(utilisateurId, action, entite, entiteId, details ?? null)
}
