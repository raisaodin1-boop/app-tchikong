import { getDb, logActivity } from '@database'
import type {
  AffectationDetail,
  AffectationEnseignant,
  CalendrierScolaire,
  EmploiDuTempsDetail
} from '../../../shared/types'

export function listCalendrier(anneeScolaireId: number): CalendrierScolaire[] {
  return getDb()
    .prepare(
      `SELECT * FROM calendrier_scolaire
       WHERE annee_scolaire_id = ?
       ORDER BY date_debut, id`
    )
    .all(anneeScolaireId) as CalendrierScolaire[]
}

export function upsertCalendrier(
  data: {
    id?: number
    annee_scolaire_id: number
    type: CalendrierScolaire['type']
    libelle: string
    date_debut: string
    date_fin?: string | null
  },
  userId?: number
): CalendrierScolaire {
  if (!data.libelle.trim()) throw new Error('Le libellé est requis')
  if (!data.date_debut) throw new Error('La date de début est requise')
  if (data.date_fin && data.date_fin < data.date_debut) {
    throw new Error('La date de fin doit être postérieure ou égale au début')
  }
  const db = getDb()
  if (data.id) {
    db.prepare(
      `UPDATE calendrier_scolaire
       SET type = ?, libelle = ?, date_debut = ?, date_fin = ?
       WHERE id = ? AND annee_scolaire_id = ?`
    ).run(
      data.type,
      data.libelle.trim(),
      data.date_debut,
      data.date_fin || null,
      data.id,
      data.annee_scolaire_id
    )
    logActivity(userId ?? null, 'modification', 'calendrier', data.id, data.libelle)
  } else {
    const result = db
      .prepare(
        `INSERT INTO calendrier_scolaire
          (annee_scolaire_id, type, libelle, date_debut, date_fin)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        data.annee_scolaire_id,
        data.type,
        data.libelle.trim(),
        data.date_debut,
        data.date_fin || null
      )
    data.id = Number(result.lastInsertRowid)
    logActivity(userId ?? null, 'creation', 'calendrier', data.id, data.libelle)
  }
  return db.prepare('SELECT * FROM calendrier_scolaire WHERE id = ?').get(data.id) as CalendrierScolaire
}

export function deleteCalendrier(id: number, userId?: number): boolean {
  const db = getDb()
  const row = db.prepare('SELECT libelle FROM calendrier_scolaire WHERE id = ?').get(id) as
    | { libelle: string }
    | undefined
  if (!row) throw new Error('Événement introuvable')
  db.prepare('DELETE FROM calendrier_scolaire WHERE id = ?').run(id)
  logActivity(userId ?? null, 'suppression', 'calendrier', id, row.libelle)
  return true
}

export function listAffectations(anneeScolaireId: number): AffectationDetail[] {
  return getDb()
    .prepare(
      `SELECT a.*,
              e.nom || ' ' || e.prenom as enseignant_nom,
              c.nom as classe_nom,
              m.nom as matiere_nom
       FROM affectations_enseignants a
       JOIN enseignants e ON e.id = a.enseignant_id
       JOIN classes c ON c.id = a.classe_id
       JOIN matieres m ON m.id = a.matiere_id
       WHERE a.annee_scolaire_id = ?
       ORDER BY c.nom, m.ordre, e.nom`
    )
    .all(anneeScolaireId) as AffectationDetail[]
}

export function upsertAffectation(
  data: Omit<AffectationEnseignant, 'id'> & { id?: number },
  userId?: number
): AffectationDetail {
  const db = getDb()
  const existing = db
    .prepare(
      `SELECT id FROM affectations_enseignants
       WHERE enseignant_id = ? AND classe_id = ? AND matiere_id = ? AND annee_scolaire_id = ?`
    )
    .get(data.enseignant_id, data.classe_id, data.matiere_id, data.annee_scolaire_id) as
    | { id: number }
    | undefined
  if (existing && existing.id !== data.id) {
    throw new Error('Cette affectation existe déjà')
  }
  let id = data.id
  if (id) {
    db.prepare(
      `UPDATE affectations_enseignants
       SET enseignant_id = ?, classe_id = ?, matiere_id = ?
       WHERE id = ?`
    ).run(data.enseignant_id, data.classe_id, data.matiere_id, id)
  } else {
    const result = db
      .prepare(
        `INSERT INTO affectations_enseignants
          (enseignant_id, classe_id, matiere_id, annee_scolaire_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(data.enseignant_id, data.classe_id, data.matiere_id, data.annee_scolaire_id)
    id = Number(result.lastInsertRowid)
  }
  logActivity(userId ?? null, 'sauvegarde', 'affectation', id)
  return db
    .prepare(
      `SELECT a.*,
              e.nom || ' ' || e.prenom as enseignant_nom,
              c.nom as classe_nom,
              m.nom as matiere_nom
       FROM affectations_enseignants a
       JOIN enseignants e ON e.id = a.enseignant_id
       JOIN classes c ON c.id = a.classe_id
       JOIN matieres m ON m.id = a.matiere_id
       WHERE a.id = ?`
    )
    .get(id) as AffectationDetail
}

export function deleteAffectation(id: number, userId?: number): boolean {
  const db = getDb()
  db.prepare('DELETE FROM affectations_enseignants WHERE id = ?').run(id)
  logActivity(userId ?? null, 'suppression', 'affectation', id)
  return true
}

export function listEmploiDuTemps(classeId: number): EmploiDuTempsDetail[] {
  return getDb()
    .prepare(
      `SELECT e.*, m.nom as matiere_nom,
              CASE WHEN en.id IS NULL THEN NULL ELSE en.nom || ' ' || en.prenom END as enseignant_nom
       FROM emplois_du_temps e
       JOIN matieres m ON m.id = e.matiere_id
       LEFT JOIN enseignants en ON en.id = e.enseignant_id
       WHERE e.classe_id = ?
       ORDER BY e.jour, e.heure_debut`
    )
    .all(classeId) as EmploiDuTempsDetail[]
}

function slotsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function upsertEmploiDuTemps(
  data: {
    id?: number
    classe_id: number
    matiere_id: number
    enseignant_id?: number | null
    jour: number
    heure_debut: string
    heure_fin: string
  },
  userId?: number
): EmploiDuTempsDetail {
  if (data.jour < 1 || data.jour > 6) throw new Error('Jour invalide')
  if (!data.heure_debut || !data.heure_fin || data.heure_fin <= data.heure_debut) {
    throw new Error("L'heure de fin doit être postérieure à l'heure de début")
  }
  const db = getDb()
  const others = db
    .prepare(
      `SELECT id, heure_debut, heure_fin FROM emplois_du_temps
       WHERE classe_id = ? AND jour = ? AND id != ?`
    )
    .all(data.classe_id, data.jour, data.id ?? 0) as {
    id: number
    heure_debut: string
    heure_fin: string
  }[]
  if (others.some((slot) => slotsOverlap(data.heure_debut, data.heure_fin, slot.heure_debut, slot.heure_fin))) {
    throw new Error('Ce créneau chevauche un autre cours de la classe')
  }

  let id = data.id
  if (id) {
    db.prepare(
      `UPDATE emplois_du_temps
       SET matiere_id = ?, enseignant_id = ?, jour = ?, heure_debut = ?, heure_fin = ?
       WHERE id = ? AND classe_id = ?`
    ).run(
      data.matiere_id,
      data.enseignant_id ?? null,
      data.jour,
      data.heure_debut,
      data.heure_fin,
      id,
      data.classe_id
    )
  } else {
    const result = db
      .prepare(
        `INSERT INTO emplois_du_temps
          (classe_id, matiere_id, enseignant_id, jour, heure_debut, heure_fin)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.classe_id,
        data.matiere_id,
        data.enseignant_id ?? null,
        data.jour,
        data.heure_debut,
        data.heure_fin
      )
    id = Number(result.lastInsertRowid)
  }

  const classe = db
    .prepare('SELECT annee_scolaire_id FROM classes WHERE id = ?')
    .get(data.classe_id) as { annee_scolaire_id: number } | undefined
  if (classe && data.enseignant_id) {
    const exists = db
      .prepare(
        `SELECT id FROM affectations_enseignants
         WHERE enseignant_id = ? AND classe_id = ? AND matiere_id = ? AND annee_scolaire_id = ?`
      )
      .get(data.enseignant_id, data.classe_id, data.matiere_id, classe.annee_scolaire_id)
    if (!exists) {
      db.prepare(
        `INSERT INTO affectations_enseignants
          (enseignant_id, classe_id, matiere_id, annee_scolaire_id)
         VALUES (?, ?, ?, ?)`
      ).run(data.enseignant_id, data.classe_id, data.matiere_id, classe.annee_scolaire_id)
    }
  }

  logActivity(userId ?? null, 'sauvegarde', 'emploi_du_temps', id)
  return listEmploiDuTemps(data.classe_id).find((row) => row.id === id)!
}

export function deleteEmploiDuTemps(id: number, userId?: number): boolean {
  const db = getDb()
  db.prepare('DELETE FROM emplois_du_temps WHERE id = ?').run(id)
  logActivity(userId ?? null, 'suppression', 'emploi_du_temps', id)
  return true
}

