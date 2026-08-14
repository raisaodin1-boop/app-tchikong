import { getDb, logActivity } from '../../../db/database'
import type {
  Bulletin,
  Matiere,
  MentionBulletin,
  Note,
  PeriodeEvaluation
} from '../../../shared/types'

export interface NoteInput {
  eleve_id: number
  valeur: number
  note_sur?: number
  appreciation?: string
}

export interface NotesGrid {
  classe: { id: number; nom: string; section_id: number; section_code: string }
  periode: PeriodeEvaluation
  matieres: Matiere[]
  eleves: { eleve_id: number; nom: string; prenom: string; matricule: string }[]
  notes: Record<string, Note | null> // key: `${eleve_id}-${matiere_id}`
}

export interface EleveMoyenne {
  eleve_id: number
  nom: string
  prenom: string
  matricule: string
  moyenne: number
  rang: number
  mention: MentionBulletin
  details: {
    matiere_id: number
    matiere_nom: string
    coefficient: number
    valeur: number
    note_sur: number
    note_sur_20: number
    moyenne_matiere: number
  }[]
}

export interface BulletinData {
  eleve: { id: number; nom: string; prenom: string; matricule: string; date_naissance: string; sexe: string }
  classe: { nom: string; section_code: string; niveau_nom: string }
  periode: PeriodeEvaluation
  annee_libelle: string
  moyenne: EleveMoyenne
  appreciation_maitre: string | null
  bulletin: Bulletin | null
}

export function listMatieres(sectionId: number): Matiere[] {
  return getDb()
    .prepare('SELECT * FROM matieres WHERE section_id = ? ORDER BY ordre')
    .all(sectionId) as Matiere[]
}

export function listPeriodes(
  anneeScolaireId: number,
  type?: 'sequence' | 'trimestre'
): PeriodeEvaluation[] {
  if (type) {
    return getDb()
      .prepare(
        'SELECT * FROM periodes_evaluation WHERE annee_scolaire_id = ? AND type = ? ORDER BY numero'
      )
      .all(anneeScolaireId, type) as PeriodeEvaluation[]
  }
  return getDb()
    .prepare('SELECT * FROM periodes_evaluation WHERE annee_scolaire_id = ? ORDER BY type, numero')
    .all(anneeScolaireId) as PeriodeEvaluation[]
}

export function getNotesGrid(classeId: number, periodeId: number): NotesGrid | null {
  const db = getDb()

  const classe = db
    .prepare(
      `SELECT c.id, c.nom, c.section_id, s.code as section_code
       FROM classes c JOIN sections s ON s.id = c.section_id WHERE c.id = ?`
    )
    .get(classeId) as NotesGrid['classe'] | undefined

  if (!classe) return null

  const periode = db
    .prepare('SELECT * FROM periodes_evaluation WHERE id = ?')
    .get(periodeId) as PeriodeEvaluation | undefined

  if (!periode) return null

  const matieres = listMatieres(classe.section_id)

  const eleves = db
    .prepare(
      `SELECT i.eleve_id, e.nom, e.prenom, e.matricule
       FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id
       WHERE i.classe_id = ? AND i.statut = 'actif'
       ORDER BY e.nom, e.prenom`
    )
    .all(classeId) as NotesGrid['eleves']

  const existingNotes = db
    .prepare(
      `SELECT n.* FROM notes n
       JOIN inscriptions i ON i.eleve_id = n.eleve_id AND i.classe_id = ?
       WHERE n.periode_id = ?`
    )
    .all(classeId, periodeId) as Note[]

  const notes: Record<string, Note | null> = {}
  for (const e of eleves) {
    for (const m of matieres) {
      const key = `${e.eleve_id}-${m.id}`
      notes[key] = existingNotes.find((n) => n.eleve_id === e.eleve_id && n.matiere_id === m.id) ?? null
    }
  }

  return { classe, periode, matieres, eleves, notes }
}

export function saveNotes(
  classeId: number,
  periodeId: number,
  matiereId: number,
  notes: NoteInput[],
  userId?: number
): void {
  const db = getDb()
  const matiere = db.prepare('SELECT coefficient FROM matieres WHERE id = ?').get(matiereId) as
    | { coefficient: number }
    | undefined

  const upsert = db.prepare(
    `INSERT INTO notes (eleve_id, matiere_id, periode_id, valeur, note_sur, coefficient, appreciation)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(eleve_id, matiere_id, periode_id) DO UPDATE SET
       valeur = excluded.valeur,
       note_sur = excluded.note_sur,
       coefficient = excluded.coefficient,
       appreciation = excluded.appreciation`
  )

  const transaction = db.transaction(() => {
    for (const n of notes) {
      const noteSur = n.note_sur ?? 20
      if (n.valeur === null || n.valeur === undefined || Number.isNaN(n.valeur)) {
        db.prepare(
          'DELETE FROM notes WHERE eleve_id = ? AND matiere_id = ? AND periode_id = ?'
        ).run(n.eleve_id, matiereId, periodeId)
        continue
      }
      if (n.valeur < 0 || n.valeur > noteSur) {
        throw new Error(`Note invalide pour l'élève ${n.eleve_id} : ${n.valeur}/${noteSur}`)
      }
      upsert.run(
        n.eleve_id,
        matiereId,
        periodeId,
        n.valeur,
        noteSur,
        matiere?.coefficient ?? 1,
        n.appreciation ?? null
      )
    }
    logActivity(userId ?? null, 'sauvegarde', 'notes', classeId, `matiere=${matiereId} periode=${periodeId}`)
  })

  transaction()
}

function normaliseNote(valeur: number, noteSur: number): number {
  if (noteSur <= 0) return 0
  return (valeur / noteSur) * 20
}

export function calculerMention(moyenne: number): MentionBulletin {
  if (moyenne >= 16) return 'felicitations'
  if (moyenne >= 12) return 'encouragements'
  if (moyenne >= 10) return 'aucune'
  if (moyenne >= 8) return 'avertissement'
  return 'blame'
}

export function calculerMoyennesClasse(classeId: number, periodeId: number): EleveMoyenne[] {
  const grid = getNotesGrid(classeId, periodeId)
  if (!grid) return []

  const resultats: EleveMoyenne[] = []

  for (const eleve of grid.eleves) {
    let sommePonderee = 0
    let sommeCoef = 0
    const details: EleveMoyenne['details'] = []

    for (const matiere of grid.matieres) {
      const note = grid.notes[`${eleve.eleve_id}-${matiere.id}`]
      if (!note) continue

      const noteSur20 = normaliseNote(note.valeur, note.note_sur)
      const coef = note.coefficient || matiere.coefficient
      sommePonderee += noteSur20 * coef
      sommeCoef += coef

      details.push({
        matiere_id: matiere.id,
        matiere_nom: matiere.nom,
        coefficient: coef,
        valeur: note.valeur,
        note_sur: note.note_sur,
        note_sur_20: Math.round(noteSur20 * 100) / 100,
        moyenne_matiere: Math.round(noteSur20 * 100) / 100
      })
    }

    const moyenne = sommeCoef > 0 ? Math.round((sommePonderee / sommeCoef) * 100) / 100 : 0

    resultats.push({
      eleve_id: eleve.eleve_id,
      nom: eleve.nom,
      prenom: eleve.prenom,
      matricule: eleve.matricule,
      moyenne,
      rang: 0,
      mention: calculerMention(moyenne),
      details
    })
  }

  // Calcul des rangs (ex æquo : même rang)
  resultats.sort((a, b) => b.moyenne - a.moyenne)
  let rang = 1
  for (let i = 0; i < resultats.length; i++) {
    if (i > 0 && resultats[i].moyenne < resultats[i - 1].moyenne) {
      rang = i + 1
    }
    resultats[i].rang = rang
  }

  return resultats
}

export function getPalmares(classeId: number, periodeId: number): EleveMoyenne[] {
  return calculerMoyennesClasse(classeId, periodeId).filter((e) => e.details.length > 0)
}

export function genererBulletinsClasse(
  classeId: number,
  periodeId: number,
  appreciationParEleve?: Record<number, string>,
  userId?: number
): Bulletin[] {
  const db = getDb()
  const moyennes = calculerMoyennesClasse(classeId, periodeId)
  const effectif = moyennes.filter((m) => m.details.length > 0).length

  const upsert = db.prepare(
    `INSERT INTO bulletins (eleve_id, periode_id, moyenne_generale, rang, effectif_classe, appreciation_maitre, mention)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(eleve_id, periode_id) DO UPDATE SET
       moyenne_generale = excluded.moyenne_generale,
       rang = excluded.rang,
       effectif_classe = excluded.effectif_classe,
       appreciation_maitre = excluded.appreciation_maitre,
       mention = excluded.mention,
       generated_at = datetime('now')`
  )

  const bulletins: Bulletin[] = []

  const transaction = db.transaction(() => {
    for (const m of moyennes) {
      if (m.details.length === 0) continue

      const appreciation = appreciationParEleve?.[m.eleve_id] ?? null
      upsert.run(
        m.eleve_id,
        periodeId,
        m.moyenne,
        m.rang,
        effectif,
        appreciation,
        m.mention
      )

      const bulletin = db
        .prepare('SELECT * FROM bulletins WHERE eleve_id = ? AND periode_id = ?')
        .get(m.eleve_id, periodeId) as Bulletin

      bulletins.push({
        ...bulletin,
        moyenne_generale: m.moyenne,
        rang: m.rang,
        effectif_classe: effectif,
        mention: m.mention,
        appreciation_maitre: appreciation
      })
    }
    logActivity(userId ?? null, 'generation', 'bulletins', classeId, `periode=${periodeId}`)
  })

  transaction()
  return bulletins
}

export function getBulletinData(eleveId: number, periodeId: number): BulletinData | null {
  const db = getDb()

  const eleve = db
    .prepare('SELECT id, nom, prenom, matricule, date_naissance, sexe FROM eleves WHERE id = ?')
    .get(eleveId) as BulletinData['eleve'] | undefined

  if (!eleve) return null

  const periode = db
    .prepare('SELECT * FROM periodes_evaluation WHERE id = ?')
    .get(periodeId) as PeriodeEvaluation | undefined

  if (!periode) return null

  const inscription = db
    .prepare(
      `SELECT c.nom as classe_nom, s.code as section_code, n.nom as niveau_nom, i.classe_id, a.libelle as annee_libelle
       FROM inscriptions i
       JOIN classes c ON c.id = i.classe_id
       JOIN sections s ON s.id = i.section_id
       JOIN niveaux n ON n.id = i.niveau_id
       JOIN annees_scolaires a ON a.id = i.annee_scolaire_id
       WHERE i.eleve_id = ? AND i.annee_scolaire_id = ?
       LIMIT 1`
    )
    .get(eleveId, periode.annee_scolaire_id) as {
    classe_nom: string
    section_code: string
    niveau_nom: string
    classe_id: number
    annee_libelle: string
  } | undefined

  if (!inscription) return null

  const moyennes = calculerMoyennesClasse(inscription.classe_id, periodeId)
  const moyenne = moyennes.find((m) => m.eleve_id === eleveId)

  if (!moyenne || moyenne.details.length === 0) return null

  const bulletin = db
    .prepare('SELECT * FROM bulletins WHERE eleve_id = ? AND periode_id = ?')
    .get(eleveId, periodeId) as Bulletin | undefined

  return {
    eleve,
    classe: {
      nom: inscription.classe_nom,
      section_code: inscription.section_code,
      niveau_nom: inscription.niveau_nom
    },
    periode,
    annee_libelle: inscription.annee_libelle,
    moyenne,
    appreciation_maitre: bulletin?.appreciation_maitre ?? null,
    bulletin: bulletin ?? null
  }
}

export function listBulletinsClasse(classeId: number, periodeId: number): (Bulletin & {
  nom: string
  prenom: string
  matricule: string
})[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT b.*, e.nom, e.prenom, e.matricule
       FROM bulletins b
       JOIN eleves e ON e.id = b.eleve_id
       JOIN inscriptions i ON i.eleve_id = b.eleve_id AND i.classe_id = ?
       WHERE b.periode_id = ?
       ORDER BY b.rang, e.nom`
    )
    .all(classeId, periodeId) as (Bulletin & { nom: string; prenom: string; matricule: string })[]
}
