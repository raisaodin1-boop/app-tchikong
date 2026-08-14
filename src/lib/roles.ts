import type { RoleUtilisateur } from '@shared/types'

export type NavKey = 'dashboard' | 'eleves' | 'presence' | 'scolarite' | 'finances' | 'admin'

const ACCESS: Record<RoleUtilisateur, NavKey[]> = {
  directrice: ['dashboard', 'eleves', 'presence', 'scolarite', 'finances', 'admin'],
  secretariat: ['dashboard', 'eleves', 'presence', 'scolarite', 'admin'],
  comptable: ['dashboard', 'eleves', 'finances']
}

export function canAccess(role: RoleUtilisateur | undefined, key: NavKey): boolean {
  if (!role) return false
  return ACCESS[role].includes(key)
}

export const ROLE_LABELS: Record<RoleUtilisateur, string> = {
  directrice: 'Directrice',
  secretariat: 'Secrétariat',
  comptable: 'Comptable'
}
