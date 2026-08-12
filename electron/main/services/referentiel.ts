import { getDb, logActivity } from '@database'
import { initializePersonnelAnnee } from './payroll'
import type {
  AnneeScolaire,
  Classe,
  Niveau,
  NouvelleAnneeFormData,
  NouvelleAnneeResult,
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

export function startNewAnnee(
  data: NouvelleAnneeFormData,
  userId?: number
): NouvelleAnneeResult {
  if (!data.libelle.trim()) throw new Error("Le libellé de l'année scolaire est requis")
  if (data.date_fin <= data.date_debut) {
    throw new Error('La date de fin doit être postérieure à la date de début')
  }

  const db = getDb()
  const previous = db
    .prepare('SELECT id FROM annees_scolaires WHERE active = 1 LIMIT 1')
    .get() as { id: number } | undefined
  let anneeId = 0
  let classesCopiees = 0

  const create = db.transaction(() => {
    db.prepare('UPDATE annees_scolaires SET active = 0').run()
    const result = db
      .prepare(
        `INSERT INTO annees_scolaires
          (libelle, date_debut, date_fin, active, nb_sequences, nb_trimestres)
         VALUES (?, ?, ?, 1, ?, ?)`
      )
      .run(
        data.libelle.trim(),
        data.date_debut,
        data.date_fin,
        data.nb_sequences ?? 6,
        data.nb_trimestres ?? 3
      )
    anneeId = Number(result.lastInsertRowid)

    const insertPeriod = db.prepare(
      `INSERT INTO periodes_evaluation
        (annee_scolaire_id, numero, type, libelle)
       VALUES (?, ?, ?, ?)`
    )
    for (let index = 1; index <= (data.nb_sequences ?? 6); index++) {
      insertPeriod.run(anneeId, index, 'sequence', `${index}ème Séquence`)
    }
    for (let index = 1; index <= (data.nb_trimestres ?? 3); index++) {
      insertPeriod.run(anneeId, index, 'trimestre', `${index}ème Trimestre`)
    }

    if (previous) {
      const classes = db
        .prepare(
          `SELECT niveau_id, section_id, nom, capacite_max
           FROM classes WHERE annee_scolaire_id = ?`
        )
        .all(previous.id) as {
        niveau_id: number
        section_id: number
        nom: string
        capacite_max: number
      }[]
      const insertClass = db.prepare(
        `INSERT INTO classes
          (annee_scolaire_id, niveau_id, section_id, nom, capacite_max)
         VALUES (?, ?, ?, ?, ?)`
      )
      for (const classe of classes) {
        insertClass.run(
          anneeId,
          classe.niveau_id,
          classe.section_id,
          classe.nom,
          classe.capacite_max
        )
      }
      classesCopiees = classes.length
    }

    logActivity(
      userId ?? null,
      'demarrage',
      'annee_scolaire',
      anneeId,
      `${data.libelle.trim()} — ${classesCopiees} classes copiées`
    )
  })
  create()
  initializePersonnelAnnee(anneeId, userId)

  const annee = db
    .prepare('SELECT * FROM annees_scolaires WHERE id = ?')
    .get(anneeId) as AnneeScolaire
  return { annee, classes_copiees: classesCopiees }
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
