import { getDb, logActivity } from '../../../db/database'
import type {
  Eleve,
  EleveFiltres,
  EleveFormData,
  HistoriqueEleve,
  Inscription,
  ParentTuteur,
  PresenceEleve,
  PresenceJourData
} from '../../../shared/types'

function generateMatricule(): string {
  const year = new Date().getFullYear()
  const prefix = `TCH-${year}-`
  const row = getDb()
    .prepare(
      `SELECT MAX(CAST(substr(matricule, length(?) + 1) AS INTEGER)) as n
       FROM eleves WHERE matricule LIKE ?`
    )
    .get(prefix, `${prefix}%`) as { n: number | null }
  const next = (row.n || 0) + 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

export function listEleves(filtres: EleveFiltres = {}): Inscription[] {
  let sql = `
    SELECT i.*, e.matricule, e.nom, e.prenom, e.date_naissance, e.sexe, e.photo_path, e.adresse,
           c.nom as classe_nom, s.code as section_code, n.nom as niveau_nom, a.libelle as annee_libelle
    FROM inscriptions i
    JOIN eleves e ON e.id = i.eleve_id
    JOIN classes c ON c.id = i.classe_id
    JOIN sections s ON s.id = i.section_id
    JOIN niveaux n ON n.id = i.niveau_id
    JOIN annees_scolaires a ON a.id = i.annee_scolaire_id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (filtres.annee_scolaire_id) {
    sql += ' AND i.annee_scolaire_id = ?'
    params.push(filtres.annee_scolaire_id)
  }
  if (filtres.classe_id) {
    sql += ' AND i.classe_id = ?'
    params.push(filtres.classe_id)
  }
  if (filtres.section_id) {
    sql += ' AND i.section_id = ?'
    params.push(filtres.section_id)
  }
  if (filtres.statut) {
    sql += ' AND i.statut = ?'
    params.push(filtres.statut)
  }
  if (filtres.recherche) {
    sql += ' AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.matricule LIKE ?)'
    const term = `%${filtres.recherche}%`
    params.push(term, term, term)
  }

  sql += ' ORDER BY e.nom, e.prenom'
  return getDb().prepare(sql).all(...params) as Inscription[]
}

export function getEleve(id: number, anneeScolaireId?: number): {
  eleve: Eleve
  inscription: Inscription | null
  parents: ParentTuteur[]
  historique: HistoriqueEleve[]
} | null {
  const eleve = getDb().prepare('SELECT * FROM eleves WHERE id = ?').get(id) as Eleve | undefined
  if (!eleve) return null

  let inscription: Inscription | null = null
  if (anneeScolaireId) {
    inscription = getDb()
      .prepare(
        `SELECT i.*, c.nom as classe_nom, s.code as section_code, n.nom as niveau_nom
         FROM inscriptions i
         JOIN classes c ON c.id = i.classe_id
         JOIN sections s ON s.id = i.section_id
         JOIN niveaux n ON n.id = i.niveau_id
         WHERE i.eleve_id = ? AND i.annee_scolaire_id = ?`
      )
      .get(id, anneeScolaireId) as Inscription | undefined ?? null
  } else {
    inscription = getDb()
      .prepare(
        `SELECT i.*, c.nom as classe_nom, s.code as section_code, n.nom as niveau_nom
         FROM inscriptions i
         JOIN classes c ON c.id = i.classe_id
         JOIN sections s ON s.id = i.section_id
         JOIN niveaux n ON n.id = i.niveau_id
         WHERE i.eleve_id = ?
         ORDER BY i.date_inscription DESC LIMIT 1`
      )
      .get(id) as Inscription | undefined ?? null
  }

  const parents = getDb()
    .prepare('SELECT * FROM parents_tuteurs WHERE eleve_id = ?')
    .all(id) as ParentTuteur[]

  const historique = getDb()
    .prepare('SELECT * FROM historique_eleves WHERE eleve_id = ? ORDER BY date_evenement DESC')
    .all(id) as HistoriqueEleve[]

  return { eleve, inscription, parents, historique }
}

export function createEleve(data: EleveFormData, userId?: number): Eleve {
  const db = getDb()
  const matricule = data.matricule || generateMatricule()

  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO eleves (matricule, nom, prenom, date_naissance, sexe, adresse, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        matricule,
        data.nom,
        data.prenom,
        data.date_naissance,
        data.sexe,
        data.adresse ?? null,
        data.statut ?? 'actif'
      )

    const eleveId = result.lastInsertRowid as number

    db.prepare(
      `INSERT INTO inscriptions (eleve_id, annee_scolaire_id, classe_id, section_id, niveau_id, redoublement)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      eleveId,
      data.annee_scolaire_id,
      data.classe_id,
      data.section_id,
      data.niveau_id,
      data.redoublement ? 1 : 0
    )

    if (data.parents) {
      const insertParent = db.prepare(
        `INSERT INTO parents_tuteurs (eleve_id, nom, prenom, telephone, telephone_secondaire, profession, lien_parente, contact_urgence, email)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      for (const p of data.parents) {
        insertParent.run(
          eleveId,
          p.nom,
          p.prenom ?? null,
          p.telephone,
          p.telephone_secondaire ?? null,
          p.profession ?? null,
          p.lien_parente,
          p.contact_urgence ? 1 : 0,
          p.email ?? null
        )
      }
    }

    logActivity(userId ?? null, 'creation', 'eleve', eleveId, `${data.nom} ${data.prenom}`)
    return db.prepare('SELECT * FROM eleves WHERE id = ?').get(eleveId) as Eleve
  })

  return transaction()
}

export function updateEleve(
  id: number,
  data: Partial<EleveFormData>,
  userId?: number
): Eleve {
  const db = getDb()

  const transaction = db.transaction(() => {
    if (data.nom || data.prenom || data.date_naissance || data.sexe || data.adresse || data.statut) {
      const current = db.prepare('SELECT * FROM eleves WHERE id = ?').get(id) as Eleve
      db.prepare(
        `UPDATE eleves SET nom = ?, prenom = ?, date_naissance = ?, sexe = ?, adresse = ?, statut = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        data.nom ?? current.nom,
        data.prenom ?? current.prenom,
        data.date_naissance ?? current.date_naissance,
        data.sexe ?? current.sexe,
        data.adresse ?? current.adresse,
        data.statut ?? current.statut,
        id
      )
    }

    if (data.classe_id && data.annee_scolaire_id) {
      const existing = db
        .prepare('SELECT id FROM inscriptions WHERE eleve_id = ? AND annee_scolaire_id = ?')
        .get(id, data.annee_scolaire_id) as { id: number } | undefined

      if (existing) {
        db.prepare(
          `UPDATE inscriptions SET classe_id = ?, section_id = ?, niveau_id = ?, redoublement = ?, statut = ?
           WHERE eleve_id = ? AND annee_scolaire_id = ?`
        ).run(
          data.classe_id,
          data.section_id,
          data.niveau_id,
          data.redoublement ? 1 : 0,
          data.statut ?? 'actif',
          id,
          data.annee_scolaire_id
        )
      } else {
        db.prepare(
          `INSERT INTO inscriptions (eleve_id, annee_scolaire_id, classe_id, section_id, niveau_id, redoublement, statut)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          data.annee_scolaire_id,
          data.classe_id,
          data.section_id,
          data.niveau_id,
          data.redoublement ? 1 : 0,
          data.statut ?? 'actif'
        )
      }
    }

    if (data.parents) {
      db.prepare('DELETE FROM parents_tuteurs WHERE eleve_id = ?').run(id)
      const insertParent = db.prepare(
        `INSERT INTO parents_tuteurs (eleve_id, nom, prenom, telephone, telephone_secondaire, profession, lien_parente, contact_urgence, email)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      for (const p of data.parents) {
        insertParent.run(
          id,
          p.nom,
          p.prenom ?? null,
          p.telephone,
          p.telephone_secondaire ?? null,
          p.profession ?? null,
          p.lien_parente,
          p.contact_urgence ? 1 : 0,
          p.email ?? null
        )
      }
    }

    logActivity(userId ?? null, 'modification', 'eleve', id)
    return db.prepare('SELECT * FROM eleves WHERE id = ?').get(id) as Eleve
  })

  return transaction()
}

export function getPresences(classeId: number, date: string): PresenceEleve[] {
  return getDb()
    .prepare('SELECT * FROM presences_eleves WHERE classe_id = ? AND date = ?')
    .all(classeId, date) as PresenceEleve[]
}

export function savePresences(data: PresenceJourData, userId?: number): void {
  const db = getDb()
  const upsert = db.prepare(
    `INSERT INTO presences_eleves (eleve_id, classe_id, date, present, motif_absence, notes)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(eleve_id, date) DO UPDATE SET
       present = excluded.present,
       motif_absence = excluded.motif_absence,
       notes = excluded.notes`
  )

  const transaction = db.transaction(() => {
    for (const p of data.presences) {
      upsert.run(
        p.eleve_id,
        data.classe_id,
        data.date,
        p.present ? 1 : 0,
        p.motif_absence ?? null,
        p.notes ?? null
      )
    }
    logActivity(userId ?? null, 'sauvegarde', 'presence', data.classe_id, data.date)
  })

  transaction()
}

export function addHistorique(
  eleveId: number,
  data: { type: HistoriqueEleve['type']; description: string; date_evenement: string; annee_scolaire_id?: number },
  userId?: number
): HistoriqueEleve {
  const result = getDb()
    .prepare(
      `INSERT INTO historique_eleves (eleve_id, annee_scolaire_id, type, description, date_evenement)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(eleveId, data.annee_scolaire_id ?? null, data.type, data.description, data.date_evenement)

  logActivity(userId ?? null, 'ajout', 'historique', eleveId, data.type)
  return getDb()
    .prepare('SELECT * FROM historique_eleves WHERE id = ?')
    .get(result.lastInsertRowid) as HistoriqueEleve
}

export function changeStatutEleve(
  id: number,
  statut: Eleve['statut'],
  anneeScolaireId: number | undefined,
  description: string | undefined,
  userId?: number
): Eleve {
  const db = getDb()
  const current = db.prepare('SELECT * FROM eleves WHERE id = ?').get(id) as Eleve | undefined
  if (!current) throw new Error('Élève introuvable')

  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE eleves SET statut = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(statut, id)

    if (anneeScolaireId) {
      db.prepare(
        `UPDATE inscriptions SET statut = ? WHERE eleve_id = ? AND annee_scolaire_id = ?`
      ).run(statut, id, anneeScolaireId)
    } else {
      db.prepare(`UPDATE inscriptions SET statut = ? WHERE eleve_id = ?`).run(statut, id)
    }

    const typeMap: Record<string, HistoriqueEleve['type']> = {
      transfere: 'transfert_sortant',
      exclu: 'evolution_comportement',
      diplome: 'changement_classe',
      actif: 'changement_classe'
    }

    db.prepare(
      `INSERT INTO historique_eleves (eleve_id, annee_scolaire_id, type, description, date_evenement)
       VALUES (?, ?, ?, ?, date('now'))`
    ).run(
      id,
      anneeScolaireId ?? null,
      typeMap[statut] ?? 'evolution_comportement',
      description || `Statut modifié : ${current.statut} → ${statut}`
    )

    logActivity(userId ?? null, 'modification', 'eleve', id, `statut=${statut}`)
    return db.prepare('SELECT * FROM eleves WHERE id = ?').get(id) as Eleve
  })

  return transaction()
}

export function searchEleves(term: string, anneeScolaireId?: number): Inscription[] {
  return listEleves({ recherche: term, annee_scolaire_id: anneeScolaireId })
}
