import bcrypt from 'bcryptjs'
import { getDb, logActivity } from '@database'
import type {
  Classe,
  DocumentOfficiel,
  Enseignant,
  JournalActivite,
  PostePersonnel,
  RoleUtilisateur,
  Sexe,
  Utilisateur
} from '../../../shared/types'

// --- Types ---

export interface PersonnelFormData {
  matricule?: string
  nom: string
  prenom: string
  sexe: Sexe
  telephone?: string
  email?: string
  poste: PostePersonnel
  date_embauche?: string
  actif?: boolean
}

export interface UtilisateurFormData {
  username: string
  nom: string
  prenom: string
  role: RoleUtilisateur
  password?: string
  actif?: boolean
}

export interface DocumentOfficielDetail extends DocumentOfficiel {
  eleve_nom: string
  eleve_prenom: string
  eleve_matricule: string
  generateur_nom: string | null
}

export interface JournalActiviteDetail extends JournalActivite {
  utilisateur_nom: string | null
}

export interface AdminDashboard {
  personnel_total: number
  personnel_actif: number
  utilisateurs_actifs: number
  classes_total: number
  classes_surchargees: number
  documents_generes: number
  activites_recentes: JournalActiviteDetail[]
}

export interface JournalFiltres {
  limit?: number
  action?: string
  entite?: string
}

export interface DocumentFiltres {
  type?: string
  recherche?: string
  limit?: number
}

function mapEnseignant(row: Record<string, unknown>): Enseignant {
  return {
    id: row.id as number,
    matricule: row.matricule as string,
    nom: row.nom as string,
    prenom: row.prenom as string,
    sexe: row.sexe as Sexe,
    telephone: (row.telephone as string) || null,
    email: (row.email as string) || null,
    poste: row.poste as PostePersonnel,
    date_embauche: (row.date_embauche as string) || null,
    actif: Boolean(row.actif)
  }
}

function generateMatriculePersonnel(): string {
  const year = new Date().getFullYear()
  const count =
    (getDb().prepare('SELECT COUNT(*) as c FROM enseignants').get() as { c: number }).c + 1
  return `PER-${year}-${String(count).padStart(4, '0')}`
}

// --- Dashboard ---

export function getAdminDashboard(anneeScolaireId?: number): AdminDashboard {
  const db = getDb()

  const personnel = db
    .prepare('SELECT COUNT(*) as total, SUM(actif) as actif FROM enseignants')
    .get() as { total: number; actif: number }

  const utilisateurs = db
    .prepare('SELECT COUNT(*) as c FROM utilisateurs WHERE actif = 1')
    .get() as { c: number }

  let classesSql = `
    SELECT c.id, c.capacite_max,
      (SELECT COUNT(*) FROM inscriptions i WHERE i.classe_id = c.id AND i.statut = 'actif') as effectif
    FROM classes c
  `
  const params: unknown[] = []
  if (anneeScolaireId) {
    classesSql += ' WHERE c.annee_scolaire_id = ?'
    params.push(anneeScolaireId)
  }

  const classes = db.prepare(classesSql).all(...params) as {
    id: number
    capacite_max: number
    effectif: number
  }[]

  const documents = db
    .prepare('SELECT COUNT(*) as c FROM documents_officiels')
    .get() as { c: number }

  const activites = listJournal({ limit: 8 })

  return {
    personnel_total: personnel.total,
    personnel_actif: personnel.actif || 0,
    utilisateurs_actifs: utilisateurs.c,
    classes_total: classes.length,
    classes_surchargees: classes.filter((c) => c.effectif > c.capacite_max).length,
    documents_generes: documents.c,
    activites_recentes: activites
  }
}

// --- Personnel ---

export function listPersonnel(actifOnly = false): Enseignant[] {
  let sql = 'SELECT * FROM enseignants'
  if (actifOnly) sql += ' WHERE actif = 1'
  sql += ' ORDER BY nom, prenom'

  const rows = getDb().prepare(sql).all() as Record<string, unknown>[]
  return rows.map(mapEnseignant)
}

export function getPersonnel(id: number): Enseignant | null {
  const row = getDb().prepare('SELECT * FROM enseignants WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  return row ? mapEnseignant(row) : null
}

export function createPersonnel(data: PersonnelFormData, userId?: number): Enseignant {
  const db = getDb()
  const matricule = data.matricule || generateMatriculePersonnel()

  const result = db
    .prepare(
      `INSERT INTO enseignants (matricule, nom, prenom, sexe, telephone, email, poste, date_embauche, actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      matricule,
      data.nom,
      data.prenom,
      data.sexe,
      data.telephone ?? null,
      data.email ?? null,
      data.poste,
      data.date_embauche ?? null,
      data.actif !== false ? 1 : 0
    )

  const id = Number(result.lastInsertRowid)
  logActivity(userId ?? null, 'creation', 'enseignant', id, `${data.prenom} ${data.nom}`)
  return getPersonnel(id)!
}

export function updatePersonnel(
  id: number,
  data: Partial<PersonnelFormData>,
  userId?: number
): Enseignant {
  const db = getDb()
  const current = getPersonnel(id)
  if (!current) throw new Error('Personnel introuvable')

  db.prepare(
    `UPDATE enseignants SET
      nom = ?, prenom = ?, sexe = ?, telephone = ?, email = ?,
      poste = ?, date_embauche = ?, actif = ?
     WHERE id = ?`
  ).run(
    data.nom ?? current.nom,
    data.prenom ?? current.prenom,
    data.sexe ?? current.sexe,
    data.telephone !== undefined ? data.telephone || null : current.telephone,
    data.email !== undefined ? data.email || null : current.email,
    data.poste ?? current.poste,
    data.date_embauche !== undefined ? data.date_embauche || null : current.date_embauche,
    data.actif !== undefined ? (data.actif ? 1 : 0) : current.actif ? 1 : 0,
    id
  )

  logActivity(userId ?? null, 'modification', 'enseignant', id)
  return getPersonnel(id)!
}

// --- Utilisateurs ---

function mapUtilisateur(row: Record<string, unknown>): Utilisateur {
  return {
    id: row.id as number,
    username: row.username as string,
    nom: row.nom as string,
    prenom: row.prenom as string,
    role: row.role as RoleUtilisateur,
    actif: Boolean(row.actif),
    created_at: row.created_at as string
  }
}

export function listUtilisateurs(): Utilisateur[] {
  const rows = getDb()
    .prepare('SELECT id, username, nom, prenom, role, actif, created_at FROM utilisateurs ORDER BY nom')
    .all() as Record<string, unknown>[]
  return rows.map(mapUtilisateur)
}

export function createUtilisateur(data: UtilisateurFormData, userId?: number): Utilisateur {
  const db = getDb()
  if (!data.password) throw new Error('Mot de passe requis')

  const hash = bcrypt.hashSync(data.password, 10)
  const result = db
    .prepare(
      `INSERT INTO utilisateurs (username, password_hash, nom, prenom, role, actif)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(data.username, hash, data.nom, data.prenom, data.role, data.actif !== false ? 1 : 0)

  const id = Number(result.lastInsertRowid)
  logActivity(userId ?? null, 'creation', 'utilisateur', id, data.username)
  return mapUtilisateur(
    db
      .prepare('SELECT id, username, nom, prenom, role, actif, created_at FROM utilisateurs WHERE id = ?')
      .get(id) as Record<string, unknown>
  )
}

export function updateUtilisateur(
  id: number,
  data: Partial<Omit<UtilisateurFormData, 'password'>>,
  userId?: number
): Utilisateur {
  const db = getDb()
  const current = db
    .prepare('SELECT id, username, nom, prenom, role, actif, created_at FROM utilisateurs WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined

  if (!current) throw new Error('Utilisateur introuvable')

  db.prepare(
    `UPDATE utilisateurs SET username = ?, nom = ?, prenom = ?, role = ?, actif = ? WHERE id = ?`
  ).run(
    data.username ?? current.username,
    data.nom ?? current.nom,
    data.prenom ?? current.prenom,
    data.role ?? current.role,
    data.actif !== undefined ? (data.actif ? 1 : 0) : current.actif,
    id
  )

  logActivity(userId ?? null, 'modification', 'utilisateur', id)
  return mapUtilisateur(
    db
      .prepare('SELECT id, username, nom, prenom, role, actif, created_at FROM utilisateurs WHERE id = ?')
      .get(id) as Record<string, unknown>
  )
}

export function resetUtilisateurPassword(id: number, newPassword: string, userId?: number): boolean {
  const db = getDb()
  const exists = db.prepare('SELECT id FROM utilisateurs WHERE id = ?').get(id)
  if (!exists) throw new Error('Utilisateur introuvable')

  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE utilisateurs SET password_hash = ? WHERE id = ?').run(hash, id)
  logActivity(userId ?? null, 'reset_password', 'utilisateur', id)
  return true
}

// --- Documents officiels ---

export function listDocumentsOfficiels(filtres: DocumentFiltres = {}): DocumentOfficielDetail[] {
  let sql = `
    SELECT d.*, e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule as eleve_matricule,
      CASE WHEN u.id IS NOT NULL THEN u.prenom || ' ' || u.nom ELSE NULL END as generateur_nom
    FROM documents_officiels d
    JOIN eleves e ON e.id = d.eleve_id
    LEFT JOIN utilisateurs u ON u.id = d.generated_by
    WHERE 1=1
  `
  const params: unknown[] = []

  if (filtres.type) {
    sql += ' AND d.type = ?'
    params.push(filtres.type)
  }
  if (filtres.recherche) {
    sql += ' AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.matricule LIKE ? OR d.numero LIKE ?)'
    const term = `%${filtres.recherche}%`
    params.push(term, term, term, term)
  }

  sql += ' ORDER BY d.generated_at DESC'
  if (filtres.limit) {
    sql += ' LIMIT ?'
    params.push(filtres.limit)
  }

  return getDb().prepare(sql).all(...params) as DocumentOfficielDetail[]
}

// --- Journal d'activité ---

export function listJournal(filtres: JournalFiltres = {}): JournalActiviteDetail[] {
  let sql = `
    SELECT j.*, CASE WHEN u.id IS NOT NULL THEN u.prenom || ' ' || u.nom ELSE NULL END as utilisateur_nom
    FROM journal_activite j
    LEFT JOIN utilisateurs u ON u.id = j.utilisateur_id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (filtres.action) {
    sql += ' AND j.action = ?'
    params.push(filtres.action)
  }
  if (filtres.entite) {
    sql += ' AND j.entite = ?'
    params.push(filtres.entite)
  }

  sql += ' ORDER BY j.created_at DESC'
  sql += ` LIMIT ?`
  params.push(filtres.limit ?? 100)

  return getDb().prepare(sql).all(...params) as JournalActiviteDetail[]
}

// --- Classes (mise à jour capacité) ---

export function updateClasse(
  id: number,
  data: { nom?: string; capacite_max?: number },
  userId?: number
): Classe {
  const db = getDb()
  const current = db.prepare('SELECT * FROM classes WHERE id = ?').get(id) as Classe | undefined
  if (!current) throw new Error('Classe introuvable')

  db.prepare('UPDATE classes SET nom = ?, capacite_max = ? WHERE id = ?').run(
    data.nom ?? current.nom,
    data.capacite_max ?? current.capacite_max,
    id
  )

  logActivity(userId ?? null, 'modification', 'classe', id)
  const row = db
    .prepare(
      `SELECT c.*, n.nom as niveau_nom, s.code as section_code,
        (SELECT COUNT(*) FROM inscriptions i WHERE i.classe_id = c.id AND i.statut = 'actif') as effectif
       FROM classes c
       JOIN niveaux n ON n.id = c.niveau_id
       JOIN sections s ON s.id = c.section_id
       WHERE c.id = ?`
    )
    .get(id) as Classe

  return row
}
