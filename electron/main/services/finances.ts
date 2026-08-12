import { getDb, logActivity } from '../../../db/database'
import type {
  Depense,
  GrilleTarifaire,
  ModePaiement,
  Paiement,
  TypeDepense,
  TypeFrais
} from '../../../shared/types'

// --- Types internes ---

export interface PaiementFormData {
  eleve_id: number
  annee_scolaire_id: number
  type_frais: TypeFrais
  montant: number
  mode_paiement: ModePaiement
  date_paiement?: string
  notes?: string
}

export interface PaiementFiltres {
  annee_scolaire_id?: number
  eleve_id?: number
  type_frais?: TypeFrais
  date_debut?: string
  date_fin?: string
  recherche?: string
}

export interface SituationFinanciere {
  eleve_id: number
  nom: string
  prenom: string
  matricule: string
  classe_nom: string
  section_code: string
  total_du: number
  total_paye: number
  reste: number
  statut: 'a_jour' | 'partiel' | 'impaye'
  details: {
    type_frais: TypeFrais
    libelle: string
    montant_du: number
    montant_paye: number
    reste: number
  }[]
}

export interface ImpayeEleve {
  eleve_id: number
  nom: string
  prenom: string
  matricule: string
  classe_nom: string
  section_code: string
  telephone: string | null
  total_du: number
  total_paye: number
  reste: number
}

export interface FinancesDashboard {
  recettes_mois: number
  recettes_annee: number
  depenses_annee: number
  solde: number
  taux_recouvrement: number
  eleves_a_jour: number
  eleves_impayes: number
  montant_impayes: number
  paiements_recents: (Paiement & {
    nom: string
    prenom: string
    matricule: string
  })[]
  recettes_par_section: { section: string; montant: number }[]
}

export interface RecuData {
  paiement: Paiement
  eleve: { nom: string; prenom: string; matricule: string; classe_nom: string; section_code: string }
  annee_libelle: string
  situation: { total_du: number; total_paye: number; reste: number }
  libelle_frais: string
}

const TYPE_FRAIS_LABELS: Record<TypeFrais, string> = {
  scolarite: 'Frais de scolarité',
  inscription: 'Frais d\'inscription',
  uniforme: 'Uniforme',
  fournitures: 'Fournitures',
  examen: 'Frais d\'examen',
  activite: 'Activités',
  autre: 'Autre'
}

const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  especes: 'Espèces',
  cheque: 'Chèque',
  virement: 'Virement bancaire',
  mobile_money: 'Mobile Money'
}

export { TYPE_FRAIS_LABELS, MODE_PAIEMENT_LABELS }

function generateNumeroRecu(): string {
  const year = new Date().getFullYear()
  const count =
    (getDb().prepare('SELECT COUNT(*) as c FROM paiements').get() as { c: number }).c + 1
  return `REC-${year}-${String(count).padStart(5, '0')}`
}

export function listGrilleTarifaire(anneeScolaireId: number): GrilleTarifaire[] {
  return getDb()
    .prepare(
      `SELECT g.*, n.nom as niveau_nom, s.code as section_code
       FROM grille_tarifaire g
       JOIN niveaux n ON n.id = g.niveau_id
       JOIN sections s ON s.id = g.section_id
       WHERE g.annee_scolaire_id = ?
       ORDER BY s.code, n.ordre, g.type_frais`
    )
    .all(anneeScolaireId) as GrilleTarifaire[]
}

export function getSituationFinanciere(
  eleveId: number,
  anneeScolaireId: number
): SituationFinanciere | null {
  const db = getDb()

  const eleve = db
    .prepare(
      `SELECT e.id as eleve_id, e.nom, e.prenom, e.matricule,
              c.nom as classe_nom, s.code as section_code,
              i.niveau_id, i.section_id
       FROM eleves e
       JOIN inscriptions i ON i.eleve_id = e.id AND i.annee_scolaire_id = ?
       JOIN classes c ON c.id = i.classe_id
       JOIN sections s ON s.id = i.section_id
       WHERE e.id = ? AND i.statut = 'actif'`
    )
    .get(anneeScolaireId, eleveId) as {
    eleve_id: number
    nom: string
    prenom: string
    matricule: string
    classe_nom: string
    section_code: string
    niveau_id: number
    section_id: number
  } | undefined

  if (!eleve) return null

  const tarifs = db
    .prepare(
      `SELECT type_frais, libelle, montant FROM grille_tarifaire
       WHERE annee_scolaire_id = ? AND niveau_id = ? AND section_id = ?`
    )
    .all(anneeScolaireId, eleve.niveau_id, eleve.section_id) as {
    type_frais: TypeFrais
    libelle: string
    montant: number
  }[]

  const paiements = db
    .prepare(
      `SELECT type_frais, COALESCE(SUM(montant), 0) as total
       FROM paiements WHERE eleve_id = ? AND annee_scolaire_id = ?
       GROUP BY type_frais`
    )
    .all(eleveId, anneeScolaireId) as { type_frais: TypeFrais; total: number }[]

  const paiementsMap = new Map(paiements.map((p) => [p.type_frais, p.total]))

  const details = tarifs.map((t) => {
    const paye = paiementsMap.get(t.type_frais) || 0
    return {
      type_frais: t.type_frais,
      libelle: t.libelle,
      montant_du: t.montant,
      montant_paye: paye,
      reste: Math.max(0, t.montant - paye)
    }
  })

  const total_du = details.reduce((s, d) => s + d.montant_du, 0)
  const total_paye = details.reduce((s, d) => s + d.montant_paye, 0)
  const reste = Math.max(0, total_du - total_paye)

  let statut: SituationFinanciere['statut'] = 'a_jour'
  if (reste > 0 && total_paye > 0) statut = 'partiel'
  if (reste > 0 && total_paye === 0) statut = 'impaye'

  return {
    eleve_id: eleve.eleve_id,
    nom: eleve.nom,
    prenom: eleve.prenom,
    matricule: eleve.matricule,
    classe_nom: eleve.classe_nom,
    section_code: eleve.section_code,
    total_du,
    total_paye,
    reste,
    statut,
    details
  }
}

export function createPaiement(data: PaiementFormData, userId?: number): Paiement {
  const db = getDb()
  const numeroRecu = generateNumeroRecu()

  const result = db
    .prepare(
      `INSERT INTO paiements (eleve_id, annee_scolaire_id, type_frais, montant, mode_paiement, numero_recu, date_paiement, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.eleve_id,
      data.annee_scolaire_id,
      data.type_frais,
      data.montant,
      data.mode_paiement,
      numeroRecu,
      data.date_paiement || new Date().toISOString().slice(0, 10),
      data.notes ?? null,
      userId ?? null
    )

  logActivity(userId ?? null, 'creation', 'paiement', result.lastInsertRowid as number, numeroRecu)

  return db
    .prepare('SELECT * FROM paiements WHERE id = ?')
    .get(result.lastInsertRowid) as Paiement
}

export function listPaiements(filtres: PaiementFiltres = {}): (Paiement & {
  nom: string
  prenom: string
  matricule: string
  classe_nom: string
})[] {
  let sql = `
    SELECT p.*, e.nom, e.prenom, e.matricule, c.nom as classe_nom
    FROM paiements p
    JOIN eleves e ON e.id = p.eleve_id
    LEFT JOIN inscriptions i ON i.eleve_id = p.eleve_id AND i.annee_scolaire_id = p.annee_scolaire_id
    LEFT JOIN classes c ON c.id = i.classe_id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (filtres.annee_scolaire_id) {
    sql += ' AND p.annee_scolaire_id = ?'
    params.push(filtres.annee_scolaire_id)
  }
  if (filtres.eleve_id) {
    sql += ' AND p.eleve_id = ?'
    params.push(filtres.eleve_id)
  }
  if (filtres.type_frais) {
    sql += ' AND p.type_frais = ?'
    params.push(filtres.type_frais)
  }
  if (filtres.date_debut) {
    sql += ' AND p.date_paiement >= ?'
    params.push(filtres.date_debut)
  }
  if (filtres.date_fin) {
    sql += ' AND p.date_paiement <= ?'
    params.push(filtres.date_fin)
  }
  if (filtres.recherche) {
    sql += ' AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.matricule LIKE ? OR p.numero_recu LIKE ?)'
    const term = `%${filtres.recherche}%`
    params.push(term, term, term, term)
  }

  sql += ' ORDER BY p.date_paiement DESC, p.id DESC'
  return getDb().prepare(sql).all(...params) as (Paiement & {
    nom: string
    prenom: string
    matricule: string
    classe_nom: string
  })[]
}

export function getRecuData(paiementId: number): RecuData | null {
  const db = getDb()

  const paiement = db.prepare('SELECT * FROM paiements WHERE id = ?').get(paiementId) as
    | Paiement
    | undefined
  if (!paiement) return null

  const eleve = db
    .prepare(
      `SELECT e.nom, e.prenom, e.matricule, c.nom as classe_nom, s.code as section_code, a.libelle as annee_libelle
       FROM eleves e
       JOIN inscriptions i ON i.eleve_id = e.id AND i.annee_scolaire_id = ?
       JOIN classes c ON c.id = i.classe_id
       JOIN sections s ON s.id = i.section_id
       JOIN annees_scolaires a ON a.id = i.annee_scolaire_id
       WHERE e.id = ?`
    )
    .get(paiement.annee_scolaire_id, paiement.eleve_id) as {
    nom: string
    prenom: string
    matricule: string
    classe_nom: string
    section_code: string
    annee_libelle: string
  } | undefined

  if (!eleve) return null

  const situation = getSituationFinanciere(paiement.eleve_id, paiement.annee_scolaire_id)
  const tarif = db
    .prepare(
      `SELECT libelle FROM grille_tarifaire
       WHERE annee_scolaire_id = ? AND type_frais = ?
       LIMIT 1`
    )
    .get(paiement.annee_scolaire_id, paiement.type_frais) as { libelle: string } | undefined

  return {
    paiement,
    eleve: {
      nom: eleve.nom,
      prenom: eleve.prenom,
      matricule: eleve.matricule,
      classe_nom: eleve.classe_nom,
      section_code: eleve.section_code
    },
    annee_libelle: eleve.annee_libelle,
    situation: {
      total_du: situation?.total_du || 0,
      total_paye: situation?.total_paye || 0,
      reste: situation?.reste || 0
    },
    libelle_frais: tarif?.libelle || TYPE_FRAIS_LABELS[paiement.type_frais]
  }
}

export function listImpayes(anneeScolaireId: number, classeId?: number): ImpayeEleve[] {
  const db = getDb()

  let sql = `
    SELECT e.id as eleve_id, e.nom, e.prenom, e.matricule,
           c.nom as classe_nom, s.code as section_code,
           i.niveau_id, i.section_id, i.classe_id,
           pt.telephone
    FROM inscriptions i
    JOIN eleves e ON e.id = i.eleve_id
    JOIN classes c ON c.id = i.classe_id
    JOIN sections s ON s.id = i.section_id
    LEFT JOIN parents_tuteurs pt ON pt.eleve_id = e.id AND pt.contact_urgence = 1
    WHERE i.annee_scolaire_id = ? AND i.statut = 'actif'
  `
  const params: unknown[] = [anneeScolaireId]

  if (classeId) {
    sql += ' AND i.classe_id = ?'
    params.push(classeId)
  }

  sql += ' GROUP BY e.id ORDER BY e.nom, e.prenom'

  const eleves = db.prepare(sql).all(...params) as {
    eleve_id: number
    nom: string
    prenom: string
    matricule: string
    classe_nom: string
    section_code: string
    niveau_id: number
    section_id: number
    telephone: string | null
  }[]

  const impayes: ImpayeEleve[] = []

  for (const el of eleves) {
    const situation = getSituationFinanciere(el.eleve_id, anneeScolaireId)
    if (situation && situation.reste > 0) {
      impayes.push({
        eleve_id: el.eleve_id,
        nom: el.nom,
        prenom: el.prenom,
        matricule: el.matricule,
        classe_nom: el.classe_nom,
        section_code: el.section_code,
        telephone: el.telephone,
        total_du: situation.total_du,
        total_paye: situation.total_paye,
        reste: situation.reste
      })
    }
  }

  return impayes.sort((a, b) => b.reste - a.reste)
}

export function getFinancesDashboard(anneeScolaireId: number): FinancesDashboard {
  const db = getDb()
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const recettes_mois = (
    db
      .prepare(
        `SELECT COALESCE(SUM(montant), 0) as t FROM paiements
         WHERE annee_scolaire_id = ? AND date_paiement >= ?`
      )
      .get(anneeScolaireId, monthStart) as { t: number }
  ).t

  const recettes_annee = (
    db
      .prepare(
        `SELECT COALESCE(SUM(montant), 0) as t FROM paiements WHERE annee_scolaire_id = ?`
      )
      .get(anneeScolaireId) as { t: number }
  ).t

  const depenses_annee = (
    db
      .prepare(
        `SELECT COALESCE(SUM(montant), 0) as t FROM depenses WHERE annee_scolaire_id = ?`
      )
      .get(anneeScolaireId) as { t: number }
  ).t

  const impayes = listImpayes(anneeScolaireId)
  const montant_impayes = impayes.reduce((s, i) => s + i.reste, 0)

  const totalEleves = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM inscriptions WHERE annee_scolaire_id = ? AND statut = 'actif'`
      )
      .get(anneeScolaireId) as { c: number }
  ).c

  const eleves_impayes = impayes.length
  const eleves_a_jour = totalEleves - eleves_impayes

  // Total attendu = sum of all tarifs for all active students
  let totalAttendu = 0
  const inscriptions = db
    .prepare(
      `SELECT eleve_id, niveau_id, section_id FROM inscriptions
       WHERE annee_scolaire_id = ? AND statut = 'actif'`
    )
    .all(anneeScolaireId) as { eleve_id: number; niveau_id: number; section_id: number }[]

  for (const ins of inscriptions) {
    const tarif = db
      .prepare(
        `SELECT COALESCE(SUM(montant), 0) as t FROM grille_tarifaire
         WHERE annee_scolaire_id = ? AND niveau_id = ? AND section_id = ?`
      )
      .get(anneeScolaireId, ins.niveau_id, ins.section_id) as { t: number }
    totalAttendu += tarif.t
  }

  const taux_recouvrement =
    totalAttendu > 0 ? Math.round((recettes_annee / totalAttendu) * 10000) / 100 : 0

  const paiements_recents = listPaiements({ annee_scolaire_id: anneeScolaireId }).slice(0, 8)

  const recettes_par_section = db
    .prepare(
      `SELECT s.nom as section, COALESCE(SUM(p.montant), 0) as montant
       FROM paiements p
       JOIN inscriptions i ON i.eleve_id = p.eleve_id AND i.annee_scolaire_id = p.annee_scolaire_id
       JOIN sections s ON s.id = i.section_id
       WHERE p.annee_scolaire_id = ?
       GROUP BY s.id`
    )
    .all(anneeScolaireId) as { section: string; montant: number }[]

  return {
    recettes_mois,
    recettes_annee,
    depenses_annee,
    solde: recettes_annee - depenses_annee,
    taux_recouvrement,
    eleves_a_jour,
    eleves_impayes,
    montant_impayes,
    paiements_recents,
    recettes_par_section
  }
}

export function listDepenses(anneeScolaireId: number): Depense[] {
  return getDb()
    .prepare('SELECT * FROM depenses WHERE annee_scolaire_id = ? ORDER BY date_depense DESC')
    .all(anneeScolaireId) as Depense[]
}

export function createDepense(
  data: {
    annee_scolaire_id: number
    type: TypeDepense
    libelle: string
    montant: number
    date_depense?: string
    beneficiaire?: string
    notes?: string
  },
  userId?: number
): Depense {
  const result = getDb()
    .prepare(
      `INSERT INTO depenses (annee_scolaire_id, type, libelle, montant, date_depense, beneficiaire, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.annee_scolaire_id,
      data.type,
      data.libelle,
      data.montant,
      data.date_depense || new Date().toISOString().slice(0, 10),
      data.beneficiaire ?? null,
      data.notes ?? null,
      userId ?? null
    )

  logActivity(userId ?? null, 'creation', 'depense', result.lastInsertRowid as number)
  return getDb()
    .prepare('SELECT * FROM depenses WHERE id = ?')
    .get(result.lastInsertRowid) as Depense
}
