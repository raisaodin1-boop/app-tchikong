import { getDb } from '../../../db/database'
import type { DashboardStats, RechercheResultat } from '../../../shared/types'

export function getDashboardStats(anneeScolaireId?: number): DashboardStats {
  const db = getDb()

  let anneeId = anneeScolaireId
  if (!anneeId) {
    const active = db.prepare('SELECT id FROM annees_scolaires WHERE active = 1').get() as
      | { id: number }
      | undefined
    anneeId = active?.id
  }

  const effectifTotal = anneeId
    ? (db
        .prepare(
          `SELECT COUNT(*) as c FROM inscriptions WHERE annee_scolaire_id = ? AND statut = 'actif'`
        )
        .get(anneeId) as { c: number }).c
    : 0

  const parSection = anneeId
    ? (db
        .prepare(
          `SELECT s.nom as section, COUNT(*) as count
           FROM inscriptions i JOIN sections s ON s.id = i.section_id
           WHERE i.annee_scolaire_id = ? AND i.statut = 'actif'
           GROUP BY s.id`
        )
        .all(anneeId) as { section: string; count: number }[])
    : []

  const parNiveau = anneeId
    ? (db
        .prepare(
          `SELECT n.nom as niveau, COUNT(*) as count
           FROM inscriptions i JOIN niveaux n ON n.id = i.niveau_id
           WHERE i.annee_scolaire_id = ? AND i.statut = 'actif'
           GROUP BY n.id ORDER BY n.ordre`
        )
        .all(anneeId) as { niveau: string; count: number }[])
    : []

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const recettesMois = anneeId
    ? (db
        .prepare(
          `SELECT COALESCE(SUM(montant), 0) as total FROM paiements
           WHERE annee_scolaire_id = ? AND date_paiement >= ?`
        )
        .get(anneeId, monthStart) as { total: number }).total
    : 0

  const recettesAnnee = anneeId
    ? (db
        .prepare(
          `SELECT COALESCE(SUM(montant), 0) as total FROM paiements WHERE annee_scolaire_id = ?`
        )
        .get(anneeId) as { total: number }).total
    : 0

  const alertes: DashboardStats['alertes'] = []

  if (anneeId) {
    const classesSurchargees = db
      .prepare(
        `SELECT c.nom, c.capacite_max,
          (SELECT COUNT(*) FROM inscriptions i WHERE i.classe_id = c.id AND i.statut = 'actif') as effectif
         FROM classes c WHERE c.annee_scolaire_id = ?`
      )
      .all(anneeId) as { nom: string; capacite_max: number; effectif: number }[]

    const surchargees = classesSurchargees.filter((c) => c.effectif > c.capacite_max)
    if (surchargees.length > 0) {
      alertes.push({
        type: 'surcharge',
        message: `${surchargees.length} classe(s) en surcharge`,
        count: surchargees.length
      })
    }
  }

  return {
    effectifs: {
      total: effectifTotal,
      par_section: parSection,
      par_niveau: parNiveau
    },
    finances: {
      recettes_mois: recettesMois,
      recettes_annee: recettesAnnee,
      taux_recouvrement: 0,
      impayes_count: 0,
      montant_impayes: 0
    },
    alertes
  }
}

export function rechercheGlobale(term: string, anneeScolaireId?: number): RechercheResultat[] {
  if (!term || term.length < 2) return []

  const db = getDb()
  const results: RechercheResultat[] = []
  const like = `%${term}%`

  const eleves = db
    .prepare(
      `SELECT e.id, e.matricule, e.nom, e.prenom, c.nom as classe
       FROM eleves e
       LEFT JOIN inscriptions i ON i.eleve_id = e.id ${anneeScolaireId ? 'AND i.annee_scolaire_id = ?' : ''}
       LEFT JOIN classes c ON c.id = i.classe_id
       WHERE e.nom LIKE ? OR e.prenom LIKE ? OR e.matricule LIKE ?
       LIMIT 10`
    )
    .all(...(anneeScolaireId ? [anneeScolaireId, like, like, like] : [like, like, like])) as {
    id: number
    matricule: string
    nom: string
    prenom: string
    classe: string | null
  }[]

  for (const e of eleves) {
    results.push({
      type: 'eleve',
      id: e.id,
      label: `${e.nom} ${e.prenom}`,
      sous_label: `${e.matricule}${e.classe ? ` — ${e.classe}` : ''}`
    })
  }

  const enseignants = db
    .prepare(
      `SELECT id, nom, prenom, poste FROM enseignants
       WHERE actif = 1 AND (nom LIKE ? OR prenom LIKE ? OR matricule LIKE ?)
       LIMIT 5`
    )
    .all(like, like, like) as { id: number; nom: string; prenom: string; poste: string }[]

  for (const ens of enseignants) {
    results.push({
      type: 'enseignant',
      id: ens.id,
      label: `${ens.nom} ${ens.prenom}`,
      sous_label: ens.poste
    })
  }

  return results
}
