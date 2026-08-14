import { getDb } from '../../../db/database'
import type {
  AnneeScolaire,
  Classe,
  Niveau,
  Section
} from '../../../shared/types'

export function listSections(): Section[] {
  return getDb().prepare('SELECT * FROM sections ORDER BY id').all() as Section[]
}

export function listNiveaux(sectionId?: number): Niveau[] {
  if (sectionId) {
    return getDb()
      .prepare('SELECT * FROM niveaux WHERE section_id = ? ORDER BY ordre')
      .all(sectionId) as Niveau[]
  }
  return getDb().prepare('SELECT * FROM niveaux ORDER BY section_id, ordre').all() as Niveau[]
}

function mapAnnee(row: Record<string, unknown>): AnneeScolaire {
  return {
    id: row.id as number,
    libelle: row.libelle as string,
    date_debut: row.date_debut as string,
    date_fin: row.date_fin as string,
    active: Boolean(row.active),
    nb_sequences: row.nb_sequences as number,
    nb_trimestres: row.nb_trimestres as number,
    created_at: row.created_at as string
  }
}

export function listAnnees(): AnneeScolaire[] {
  const rows = getDb()
    .prepare('SELECT * FROM annees_scolaires ORDER BY date_debut DESC')
    .all() as Record<string, unknown>[]
  return rows.map(mapAnnee)
}

export function getActiveAnnee(): AnneeScolaire | null {
  const row = getDb()
    .prepare('SELECT * FROM annees_scolaires WHERE active = 1 LIMIT 1')
    .get() as Record<string, unknown> | undefined
  return row ? mapAnnee(row) : null
}

function createPeriodes(anneeId: number, nbSequences: number, nbTrimestres: number): void {
  const db = getDb()
  const insert = db.prepare(
    `INSERT INTO periodes_evaluation (annee_scolaire_id, numero, type, libelle) VALUES (?, ?, ?, ?)`
  )
  for (let i = 1; i <= nbSequences; i++) {
    insert.run(anneeId, i, 'sequence', `${i}ème Séquence`)
  }
  for (let i = 1; i <= nbTrimestres; i++) {
    insert.run(anneeId, i, 'trimestre', `${i}ème Trimestre`)
  }
}

export function createAnnee(data: {
  libelle: string
  date_debut: string
  date_fin: string
  nb_sequences?: number
  nb_trimestres?: number
  activer?: boolean
}): AnneeScolaire {
  const db = getDb()
  const nbSequences = data.nb_sequences ?? 6
  const nbTrimestres = data.nb_trimestres ?? 3

  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO annees_scolaires (libelle, date_debut, date_fin, active, nb_sequences, nb_trimestres)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.libelle,
        data.date_debut,
        data.date_fin,
        data.activer ? 1 : 0,
        nbSequences,
        nbTrimestres
      )

    const id = Number(result.lastInsertRowid)
    if (data.activer) {
      db.prepare('UPDATE annees_scolaires SET active = 0 WHERE id != ?').run(id)
    }
    createPeriodes(id, nbSequences, nbTrimestres)
    return mapAnnee(db.prepare('SELECT * FROM annees_scolaires WHERE id = ?').get(id) as Record<string, unknown>)
  })

  return transaction()
}

export function setActiveAnnee(id: number): AnneeScolaire {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM annees_scolaires WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!existing) throw new Error('Année scolaire introuvable')

  db.transaction(() => {
    db.prepare('UPDATE annees_scolaires SET active = 0').run()
    db.prepare('UPDATE annees_scolaires SET active = 1 WHERE id = ?').run(id)
  })()

  return mapAnnee(db.prepare('SELECT * FROM annees_scolaires WHERE id = ?').get(id) as Record<string, unknown>)
}

export function listClasses(anneeScolaireId?: number): Classe[] {
  const sql = `
    SELECT c.*, n.nom as niveau_nom, s.code as section_code,
      (SELECT COUNT(*) FROM inscriptions i WHERE i.classe_id = c.id AND i.statut = 'actif') as effectif
    FROM classes c
    JOIN niveaux n ON n.id = c.niveau_id
    JOIN sections s ON s.id = c.section_id
    ${anneeScolaireId ? 'WHERE c.annee_scolaire_id = ?' : ''}
    ORDER BY s.code, n.ordre, c.nom
  `
  if (anneeScolaireId) {
    return getDb().prepare(sql).all(anneeScolaireId) as Classe[]
  }
  return getDb().prepare(sql).all() as Classe[]
}

export function createClasse(data: {
  annee_scolaire_id: number
  niveau_id: number
  section_id: number
  nom: string
  capacite_max?: number
}): Classe {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO classes (annee_scolaire_id, niveau_id, section_id, nom, capacite_max)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      data.annee_scolaire_id,
      data.niveau_id,
      data.section_id,
      data.nom,
      data.capacite_max ?? 40
    )

  const row = db
    .prepare(
      `SELECT c.*, n.nom as niveau_nom, s.code as section_code,
        (SELECT COUNT(*) FROM inscriptions i WHERE i.classe_id = c.id AND i.statut = 'actif') as effectif
       FROM classes c
       JOIN niveaux n ON n.id = c.niveau_id
       JOIN sections s ON s.id = c.section_id
       WHERE c.id = ?`
    )
    .get(result.lastInsertRowid) as Classe
  return row
}
