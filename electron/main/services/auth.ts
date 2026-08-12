import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getDb, logActivity } from '@database'
import type { AuthSession, LoginRequest, Utilisateur } from '../../../shared/types'

const sessions = new Map<string, { utilisateurId: number; expiresAt: number }>()

export function login(req: LoginRequest): AuthSession | null {
  const db = getDb()
  const user = db
    .prepare('SELECT * FROM utilisateurs WHERE username = ? AND actif = 1')
    .get(req.username) as (Utilisateur & { password_hash: string }) | undefined

  if (!user || !bcrypt.compareSync(req.password, user.password_hash)) {
    return null
  }

  const token = uuidv4()
  sessions.set(token, {
    utilisateurId: user.id,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000
  })

  logActivity(user.id, 'connexion', 'utilisateur', user.id)

  const { password_hash: _, ...utilisateur } = user
  return { utilisateur, token }
}

export function getSession(token: string): AuthSession | null {
  const session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token)
    return null
  }

  const user = getDb()
    .prepare('SELECT id, username, nom, prenom, role, actif, created_at FROM utilisateurs WHERE id = ?')
    .get(session.utilisateurId) as Utilisateur | undefined

  if (!user || !user.actif) return null
  return { utilisateur: user, token }
}

export function logout(token: string): void {
  const session = sessions.get(token)
  if (session) {
    logActivity(session.utilisateurId, 'deconnexion', 'utilisateur', session.utilisateurId)
  }
  sessions.delete(token)
}

export function getCurrentUserId(token: string): number | null {
  const session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) return null
  return session.utilisateurId
}
