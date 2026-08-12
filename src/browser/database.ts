import initSqlJs, { type BindParams, type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import migrationSql from '../../db/migrations/001_initial_schema.sql?raw'
import settingsMigrationSql from '../../db/migrations/002_app_settings.sql?raw'
import feeModulesMigrationSql from '../../db/migrations/003_fee_modules.sql?raw'
import payrollMigrationSql from '../../db/migrations/004_payroll.sql?raw'

const STORAGE_DB = 'tchikong-offline-storage'
const STORAGE_VERSION = 1
const STORAGE_STORE = 'database'
const STORAGE_KEY = 'tchikong.db'

let SQL: SqlJsStatic
let database: Database | null = null
let dirty = false
let persistQueue: Promise<void> = Promise.resolve()

function openStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_DB, STORAGE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORAGE_STORE)) {
        request.result.createObjectStore(STORAGE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readStoredDatabase(): Promise<Uint8Array | null> {
  const storage = await openStorage()
  return new Promise((resolve, reject) => {
    const transaction = storage.transaction(STORAGE_STORE, 'readonly')
    const request = transaction.objectStore(STORAGE_STORE).get(STORAGE_KEY)
    request.onsuccess = () => {
      const value = request.result
      resolve(value instanceof Uint8Array ? value : value ? new Uint8Array(value) : null)
    }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => storage.close()
  })
}

async function writeStoredDatabase(bytes: Uint8Array): Promise<void> {
  const storage = await openStorage()
  return new Promise((resolve, reject) => {
    const transaction = storage.transaction(STORAGE_STORE, 'readwrite')
    transaction.objectStore(STORAGE_STORE).put(bytes, STORAGE_KEY)
    transaction.oncomplete = () => {
      storage.close()
      resolve()
    }
    transaction.onerror = () => {
      storage.close()
      reject(transaction.error)
    }
    transaction.onabort = () => {
      storage.close()
      reject(transaction.error)
    }
  })
}

function normalizeParams(params: unknown[]): BindParams {
  return params.map((value) => {
    if (value === undefined) return null
    if (typeof value === 'boolean') return value ? 1 : 0
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      value instanceof Uint8Array
    ) {
      return value
    }
    return String(value)
  })
}

class BrowserStatement {
  constructor(private readonly sql: string) {}

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const db = requireDatabase()
    db.run(this.sql, normalizeParams(params))
    dirty = true
    const idResult = db.exec('SELECT last_insert_rowid() AS id')
    const lastInsertRowid = Number(idResult[0]?.values[0]?.[0] ?? 0)
    return { changes: db.getRowsModified(), lastInsertRowid }
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    const statement = requireDatabase().prepare(this.sql)
    try {
      statement.bind(normalizeParams(params))
      return statement.step() ? statement.getAsObject() : undefined
    } finally {
      statement.free()
    }
  }

  all(...params: unknown[]): Record<string, unknown>[] {
    const statement = requireDatabase().prepare(this.sql)
    const rows: Record<string, unknown>[] = []
    try {
      statement.bind(normalizeParams(params))
      while (statement.step()) rows.push(statement.getAsObject())
      return rows
    } finally {
      statement.free()
    }
  }
}

export interface BrowserDatabase {
  prepare: (sql: string) => BrowserStatement
  exec: (sql: string) => void
  transaction: <T>(callback: () => T) => () => T
}

const adapter: BrowserDatabase = {
  prepare: (sql) => new BrowserStatement(sql),
  exec: (sql) => {
    requireDatabase().exec(sql)
    dirty = true
  },
  transaction: <T>(callback: () => T) => () => {
    const db = requireDatabase()
    db.exec('BEGIN IMMEDIATE')
    try {
      const result = callback()
      db.exec('COMMIT')
      dirty = true
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
}

function requireDatabase(): Database {
  if (!database) throw new Error('Base de données hors ligne non initialisée')
  return database
}

function runBrowserMigrations(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  const migrations = [
    { version: 1, name: 'initial_schema', sql: migrationSql },
    { version: 2, name: 'app_settings', sql: settingsMigrationSql },
    { version: 3, name: 'fee_modules', sql: feeModulesMigrationSql },
    { version: 4, name: 'payroll', sql: payrollMigrationSql }
  ]

  for (const migration of migrations) {
    const statement = db.prepare('SELECT 1 FROM migrations WHERE version = ?')
    statement.bind([migration.version])
    const applied = statement.step()
    statement.free()
    if (applied) continue

    db.exec('BEGIN')
    try {
      db.exec(migration.sql)
      db.run('INSERT INTO migrations (version, name) VALUES (?, ?)', [
        migration.version,
        migration.name
      ])
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
}

export async function initBrowserDatabase(): Promise<void> {
  SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const stored = await readStoredDatabase()
  database = stored ? new SQL.Database(stored) : new SQL.Database()
  database.run('PRAGMA foreign_keys = ON')
  runBrowserMigrations(database)
  dirty = !stored

  if (navigator.storage?.persist) {
    await navigator.storage.persist()
  }
}

export function getDb(): BrowserDatabase {
  requireDatabase()
  return adapter
}

export async function flushDatabase(): Promise<void> {
  if (!dirty) return persistQueue
  dirty = false
  const bytes = requireDatabase().export()
  persistQueue = persistQueue.then(() => writeStoredDatabase(bytes))
  return persistQueue
}

export async function exportDatabase(): Promise<Uint8Array> {
  await flushDatabase()
  return requireDatabase().export()
}

export async function importDatabase(bytes: Uint8Array): Promise<void> {
  if (!SQL) throw new Error('Moteur SQLite non initialisé')
  const replacement = new SQL.Database(bytes)
  replacement.run('PRAGMA foreign_keys = ON')
  const integrity = replacement.exec('PRAGMA integrity_check')
  if (integrity[0]?.values[0]?.[0] !== 'ok') {
    replacement.close()
    throw new Error('La sauvegarde SQLite est endommagée')
  }
  runBrowserMigrations(replacement)
  database?.close()
  database = replacement
  dirty = true
  await flushDatabase()
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
