import { getDb, logActivity } from '@database'
import type {
  Eleve,
  EleveFiltres,
  EleveFormData,
  HistoriqueEleve,
  Inscription,
  ParentTuteur,
  PresenceEleve,
  PresenceJourData,
  DocumentEleve,
  TypeDocument,
  CandidatPassage,
  DecisionPassage,
  LignePassage,
  PassageResult
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

function validateEnrollmentClass(anneeId: number, classeId: number): {
  id: number
  section_id: number
  niveau_id: number
} {
  const db = getDb()
  const classe = db
    .prepare(
      `SELECT id, section_id, niveau_id FROM classes
       WHERE id = ? AND annee_scolaire_id = ?`
    )
    .get(classeId, anneeId) as
    | { id: number; section_id: number; niveau_id: number }
    | undefined
  if (!classe) throw new Error("La classe ne correspond pas à l'année scolaire sélectionnée")

  const requiredFees = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM frais_modeles
         WHERE annee_scolaire_id = ? AND obligatoire = 1`
      )
      .get(anneeId) as { count: number }
  ).count
  if (requiredFees === 0) {
    throw new Error(
      "Configurez d'abord les frais scolaires obligatoires de cette année avant d'inscrire des élèves"
    )
  }
  const applicableFees = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT f.id) as count
         FROM frais_modeles f
         JOIN frais_montants m ON m.frais_modele_id = f.id
         WHERE f.annee_scolaire_id = ? AND f.obligatoire = 1
           AND (
             (f.mode_tarification = 'unique' AND m.classe_id IS NULL)
             OR (f.mode_tarification = 'par_classe' AND m.classe_id = ?)
           )`
      )
      .get(anneeId, classeId) as { count: number }
  ).count
  if (applicableFees !== requiredFees) {
    throw new Error(
      'Les montants de tous les frais obligatoires doivent être définis pour cette classe'
    )
  }
  return classe
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
  documents: DocumentEleve[]
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

  const documents = listDocumentsEleve(id)

  return { eleve, inscription, parents, historique, documents }
}

export function createEleve(data: EleveFormData, userId?: number): Eleve {
  const db = getDb()
  const matricule = data.matricule || generateMatricule()
  const classe = validateEnrollmentClass(data.annee_scolaire_id, data.classe_id)

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
      classe.section_id,
      classe.niveau_id,
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
      const classe = validateEnrollmentClass(data.annee_scolaire_id, data.classe_id)
      const existing = db
        .prepare('SELECT id FROM inscriptions WHERE eleve_id = ? AND annee_scolaire_id = ?')
        .get(id, data.annee_scolaire_id) as { id: number } | undefined

      if (existing) {
        db.prepare(
          `UPDATE inscriptions SET classe_id = ?, section_id = ?, niveau_id = ?, redoublement = ?, statut = ?
           WHERE eleve_id = ? AND annee_scolaire_id = ?`
        ).run(
          data.classe_id,
          classe.section_id,
          classe.niveau_id,
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
          classe.section_id,
          classe.niveau_id,
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
       classe_id = excluded.classe_id,
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

const MAX_FILE_CHARS = 8_000_000

function assertDataUrl(contenu: string, kind: 'photo' | 'document'): void {
  if (!contenu.startsWith('data:')) throw new Error('Fichier invalide')
  if (contenu.length > MAX_FILE_CHARS) {
    throw new Error('Fichier trop volumineux (maximum 6 Mo environ)')
  }
  if (kind === 'photo' && !/^data:image\/(jpeg|jpg|png|webp|gif)/i.test(contenu)) {
    throw new Error('La photo doit être une image (JPG, PNG ou WebP)')
  }
}

export function listDocumentsEleve(eleveId: number): DocumentEleve[] {
  return getDb()
    .prepare('SELECT * FROM documents_eleves WHERE eleve_id = ? ORDER BY uploaded_at DESC')
    .all(eleveId) as DocumentEleve[]
}

export function addDocumentEleve(
  eleveId: number,
  data: { type: TypeDocument; nom_fichier: string; contenu: string },
  userId?: number
): DocumentEleve {
  const db = getDb()
  if (!db.prepare('SELECT id FROM eleves WHERE id = ?').get(eleveId)) {
    throw new Error('Élève introuvable')
  }
  assertDataUrl(data.contenu, 'document')
  const result = db
    .prepare(
      `INSERT INTO documents_eleves (eleve_id, type, nom_fichier, chemin)
       VALUES (?, ?, ?, ?)`
    )
    .run(eleveId, data.type, data.nom_fichier.trim() || 'document', data.contenu)
  logActivity(userId ?? null, 'ajout', 'document_eleve', eleveId, data.nom_fichier)
  return db
    .prepare('SELECT * FROM documents_eleves WHERE id = ?')
    .get(result.lastInsertRowid) as DocumentEleve
}

export function deleteDocumentEleve(id: number, userId?: number): boolean {
  const db = getDb()
  const row = db.prepare('SELECT eleve_id, nom_fichier FROM documents_eleves WHERE id = ?').get(id) as
    | { eleve_id: number; nom_fichier: string }
    | undefined
  if (!row) throw new Error('Document introuvable')
  db.prepare('DELETE FROM documents_eleves WHERE id = ?').run(id)
  logActivity(userId ?? null, 'suppression', 'document_eleve', row.eleve_id, row.nom_fichier)
  return true
}

export function setElevePhoto(eleveId: number, contenu: string | null, userId?: number): Eleve {
  const db = getDb()
  const eleve = db.prepare('SELECT * FROM eleves WHERE id = ?').get(eleveId) as Eleve | undefined
  if (!eleve) throw new Error('Élève introuvable')
  if (contenu) assertDataUrl(contenu, 'photo')
  db.prepare(
    `UPDATE eleves SET photo_path = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(contenu, eleveId)
  logActivity(userId ?? null, 'modification', 'eleve', eleveId, contenu ? 'photo' : 'photo_supprimee')
  return db.prepare('SELECT * FROM eleves WHERE id = ?').get(eleveId) as Eleve
}

function findCibleClass(
  source: {
    niveau_id: number
    section_id: number
    nom: string
    ordre: number
  },
  targetAnneeId: number,
  decision: DecisionPassage
): { id: number; nom: string } | null {
  const db = getDb()
  const niveaux = db
    .prepare('SELECT id, ordre FROM niveaux WHERE section_id = ? ORDER BY ordre')
    .all(source.section_id) as { id: number; ordre: number }[]
  let targetNiveauId = source.niveau_id
  if (decision === 'admission') {
    const next = niveaux.find((n) => n.ordre === source.ordre + 1)
    if (!next) return null
    targetNiveauId = next.id
  }
  const classes = db
    .prepare(
      `SELECT id, nom FROM classes
       WHERE annee_scolaire_id = ? AND section_id = ? AND niveau_id = ?
       ORDER BY nom`
    )
    .all(targetAnneeId, source.section_id, targetNiveauId) as { id: number; nom: string }[]
  if (classes.length === 0) return null
  return classes.find((c) => c.nom === source.nom) ?? classes[0]
}

export function listCandidatsPassage(
  anneeSourceId: number,
  anneeCibleId: number
): CandidatPassage[] {
  if (anneeSourceId === anneeCibleId) {
    throw new Error("Choisissez l'année précédente et la nouvelle année")
  }
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT i.eleve_id, e.nom, e.prenom, e.matricule,
              i.classe_id as classe_source_id, c.nom as classe_source_nom,
              i.niveau_id, n.nom as niveau_nom, n.ordre as niveau_ordre,
              i.section_id, s.code as section_code,
              (SELECT ic.id FROM inscriptions ic
                WHERE ic.eleve_id = i.eleve_id AND ic.annee_scolaire_id = ?) as inscription_cible
       FROM inscriptions i
       JOIN eleves e ON e.id = i.eleve_id
       JOIN classes c ON c.id = i.classe_id
       JOIN niveaux n ON n.id = i.niveau_id
       JOIN sections s ON s.id = i.section_id
       WHERE i.annee_scolaire_id = ? AND i.statut = 'actif' AND e.statut = 'actif'
       ORDER BY s.code, n.ordre, c.nom, e.nom, e.prenom`
    )
    .all(anneeCibleId, anneeSourceId) as {
    eleve_id: number
    nom: string
    prenom: string
    matricule: string
    classe_source_id: number
    classe_source_nom: string
    niveau_id: number
    niveau_nom: string
    niveau_ordre: number
    section_id: number
    section_code: CandidatPassage['section_code']
    inscription_cible: number | null
  }[]

  return rows.map((row) => {
    const lastOfCycle = !findCibleClass(
      {
        niveau_id: row.niveau_id,
        section_id: row.section_id,
        nom: row.classe_source_nom,
        ordre: row.niveau_ordre
      },
      anneeCibleId,
      'admission'
    )
    const decision: DecisionPassage = lastOfCycle ? 'diplome' : 'admission'
    const cible =
      decision === 'admission'
        ? findCibleClass(
            {
              niveau_id: row.niveau_id,
              section_id: row.section_id,
              nom: row.classe_source_nom,
              ordre: row.niveau_ordre
            },
            anneeCibleId,
            'admission'
          )
        : null
    return {
      eleve_id: row.eleve_id,
      nom: row.nom,
      prenom: row.prenom,
      matricule: row.matricule,
      classe_source_id: row.classe_source_id,
      classe_source_nom: row.classe_source_nom,
      niveau_id: row.niveau_id,
      niveau_nom: row.niveau_nom,
      niveau_ordre: row.niveau_ordre,
      section_id: row.section_id,
      section_code: row.section_code,
      decision_suggeree: decision,
      classe_cible_id: cible?.id ?? null,
      classe_cible_nom: cible?.nom ?? null,
      deja_inscrit: Boolean(row.inscription_cible)
    }
  })
}

export function inscrirePassage(
  anneeSourceId: number,
  anneeCibleId: number,
  lignes: LignePassage[],
  userId?: number
): PassageResult {
  const result: PassageResult = {
    inscrits: 0,
    redoublants: 0,
    transferes: 0,
    diplomes: 0,
    erreurs: []
  }
  const db = getDb()
  const run = db.transaction(() => {
    for (const ligne of lignes) {
      try {
        const source = db
          .prepare(
            `SELECT i.*, n.ordre as niveau_ordre, c.nom as classe_nom, e.matricule
             FROM inscriptions i
             JOIN niveaux n ON n.id = i.niveau_id
             JOIN classes c ON c.id = i.classe_id
             JOIN eleves e ON e.id = i.eleve_id
             WHERE i.eleve_id = ? AND i.annee_scolaire_id = ?`
          )
          .get(ligne.eleve_id, anneeSourceId) as
          | {
              eleve_id: number
              classe_id: number
              section_id: number
              niveau_id: number
              niveau_ordre: number
              classe_nom: string
              matricule: string
            }
          | undefined
        if (!source) throw new Error("Inscription d'origine introuvable")

        if (ligne.decision === 'transfert' || ligne.decision === 'diplome') {
          const statut = ligne.decision === 'transfert' ? 'transfere' : 'diplome'
          db.prepare(
            `UPDATE eleves SET statut = ?, updated_at = datetime('now') WHERE id = ?`
          ).run(statut, ligne.eleve_id)
          db.prepare(
            `UPDATE inscriptions SET statut = ? WHERE eleve_id = ? AND annee_scolaire_id = ?`
          ).run(statut, ligne.eleve_id, anneeSourceId)
          db.prepare(
            `INSERT INTO historique_eleves (eleve_id, annee_scolaire_id, type, description, date_evenement)
             VALUES (?, ?, ?, ?, date('now'))`
          ).run(
            ligne.eleve_id,
            anneeSourceId,
            ligne.decision === 'transfert' ? 'transfert_sortant' : 'changement_classe',
            ligne.decision === 'transfert' ? 'Transfert sortant' : 'Fin de cycle / diplômé'
          )
          if (ligne.decision === 'transfert') result.transferes += 1
          else result.diplomes += 1
          continue
        }

        const existing = db
          .prepare(
            'SELECT id FROM inscriptions WHERE eleve_id = ? AND annee_scolaire_id = ?'
          )
          .get(ligne.eleve_id, anneeCibleId)
        if (existing) throw new Error('Déjà inscrit dans la nouvelle année')

        let classeId = ligne.classe_id
        if (!classeId) {
          const cible = findCibleClass(
            {
              niveau_id: source.niveau_id,
              section_id: source.section_id,
              nom: source.classe_nom,
              ordre: source.niveau_ordre
            },
            anneeCibleId,
            ligne.decision
          )
          classeId = cible?.id
        }
        if (!classeId) throw new Error('Aucune classe cible disponible')
        const classe = validateEnrollmentClass(anneeCibleId, classeId)
        const destOrdre = (
          db.prepare('SELECT ordre FROM niveaux WHERE id = ?').get(classe.niveau_id) as
            | { ordre: number }
            | undefined
        )?.ordre
        if (destOrdre == null) throw new Error('Niveau de la classe cible introuvable')
        if (ligne.decision === 'admission' && destOrdre <= source.niveau_ordre) {
          throw new Error(
            `${source.matricule}: un élève admis doit aller dans un niveau supérieur`
          )
        }
        if (ligne.decision === 'redoublement' && destOrdre !== source.niveau_ordre) {
          throw new Error(`${source.matricule}: un redoublement doit rester au même niveau`)
        }
        db.prepare(
          `INSERT INTO inscriptions
            (eleve_id, annee_scolaire_id, classe_id, section_id, niveau_id, redoublement, statut)
           VALUES (?, ?, ?, ?, ?, ?, 'actif')`
        ).run(
          ligne.eleve_id,
          anneeCibleId,
          classeId,
          classe.section_id,
          classe.niveau_id,
          ligne.decision === 'redoublement' ? 1 : 0
        )
        db.prepare(
          `INSERT INTO historique_eleves (eleve_id, annee_scolaire_id, type, description, date_evenement)
           VALUES (?, ?, ?, ?, date('now'))`
        ).run(
          ligne.eleve_id,
          anneeCibleId,
          ligne.decision === 'redoublement' ? 'redoublement' : 'changement_classe',
          ligne.decision === 'redoublement' ? 'Redoublement' : 'Admission dans la classe supérieure'
        )
        if (ligne.decision === 'redoublement') result.redoublants += 1
        else result.inscrits += 1
      } catch (error) {
        result.erreurs.push({
          eleve_id: ligne.eleve_id,
          message: error instanceof Error ? error.message : 'Erreur'
        })
      }
    }
    logActivity(
      userId ?? null,
      'passage_annee',
      'annee_scolaire',
      anneeCibleId,
      `${result.inscrits} admissions, ${result.redoublants} redoublements`
    )
  })
  run()
  return result
}

