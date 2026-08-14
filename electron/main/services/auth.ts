import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getDb, logActivity } from '../../../db/database'
import type { AuthSession, LoginRequest, RoleUtilisateur, Utilisateur } from '../../../shared/types'

const SESSION_TTL_MS = 12 * 60 * 60 * 1000

function mapUtilisateur(row: {
  id: number
  username: string
  nom: string
  prenom: string
  role: RoleUtilisateur
  actif: number | boolean
  created_at: string
}): Utilisateur {
  return {
    id: row.id,
    username: row.username,
    nom: row.nom,
    prenom: row.prenom,
    role: row.role,
    actif: Boolean(row.actif),
    created_at: row.created_at
  }
}

function purgeExpiredSessions(): void {
  getDb().prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
}

export function login(req: LoginRequest): AuthSession | null {
  const db = getDb()
  const user = db
    .prepare('SELECT * FROM utilisateurs WHERE username = ? AND actif = 1')
    .get(req.username) as
    | {
        id: number
        username: string
        nom: string
        prenom: string
        role: RoleUtilisateur
        actif: number
        created_at: string
        password_hash: string
      }
    | undefined

  if (!user || !bcrypt.compareSync(req.password, user.password_hash)) {
    return null
  }

  purgeExpiredSessions()

  const token = uuidv4()
  const expiresAt = Date.now() + SESSION_TTL_MS
  db.prepare('INSERT INTO sessions (token, utilisateur_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    user.id,
    expiresAt
  )

  logActivity(user.id, 'connexion', 'utilisateur', user.id)

  const { password_hash: _, ...rest } = user
  return { utilisateur: mapUtilisateur(rest), token }
}

export function getSession(token: string): AuthSession | null {
  if (!token) return null
  const db = getDb()
  const session = db
    .prepare('SELECT utilisateur_id as utilisateurId, expires_at as expiresAt FROM sessions WHERE token = ?')
    .get(token) as { utilisateurId: number; expiresAt: number } | undefined

  if (!session || session.expiresAt < Date.now()) {
    if (session) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }

  const user = db
    .prepare('SELECT id, username, nom, prenom, role, actif, created_at FROM utilisateurs WHERE id = ?')
    .get(session.utilisateurId) as
    | {
        id: number
        username: string
        nom: string
        prenom: string
        role: RoleUtilisateur
        actif: number
        created_at: string
      }
    | undefined

  if (!user || !user.actif) return null
  return { utilisateur: mapUtilisateur(user), token }
}

export function logout(token: string): void {
  const db = getDb()
  const session = db
    .prepare('SELECT utilisateur_id as utilisateurId FROM sessions WHERE token = ?')
    .get(token) as { utilisateurId: number } | undefined
  if (session) {
    logActivity(session.utilisateurId, 'deconnexion', 'utilisateur', session.utilisateurId)
  }
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function getCurrentUserId(token: string): number | null {
  if (!token) return null
  const session = getDb()
    .prepare('SELECT utilisateur_id as utilisateurId, expires_at as expiresAt FROM sessions WHERE token = ?')
    .get(token) as { utilisateurId: number; expiresAt: number } | undefined
  if (!session || session.expiresAt < Date.now()) return null
  return session.utilisateurId
}
