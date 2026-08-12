import { getDb } from '@database'
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

export function listAnnees(): AnneeScolaire[] {
  return getDb()
    .prepare('SELECT * FROM annees_scolaires ORDER BY date_debut DESC')
    .all() as AnneeScolaire[]
}

export function getActiveAnnee(): AnneeScolaire | null {
  const row = getDb()
    .prepare('SELECT * FROM annees_scolaires WHERE active = 1 LIMIT 1')
    .get()
  return (row as AnneeScolaire) || null
}

export function createAnnee(data: {
  libelle: string
  date_debut: string
  date_fin: string
  nb_sequences?: number
  nb_trimestres?: number
}): AnneeScolaire {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO annees_scolaires (libelle, date_debut, date_fin, active, nb_sequences, nb_trimestres)
       VALUES (?, ?, ?, 0, ?, ?)`
    )
    .run(
      data.libelle,
      data.date_debut,
      data.date_fin,
      data.nb_sequences ?? 6,
      data.nb_trimestres ?? 3
    )

  return db
    .prepare('SELECT * FROM annees_scolaires WHERE id = ?')
    .get(result.lastInsertRowid) as AnneeScolaire
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

  return db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid) as Classe
}
