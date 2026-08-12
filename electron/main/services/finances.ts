import { getDb, logActivity } from '@database'
import type {
  Depense,
  FraisConfiguration,
  FraisConfigurationFormData,
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
  frais_modele_id: number
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
    frais_modele_id: number
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

export function listFraisConfigurations(anneeScolaireId: number): FraisConfiguration[] {
  const db = getDb()
  const models = db
    .prepare(
      `SELECT * FROM frais_modeles
       WHERE annee_scolaire_id = ?
       ORDER BY CASE type_frais
         WHEN 'inscription' THEN 1 WHEN 'scolarite' THEN 2 ELSE 3 END, libelle`
    )
    .all(anneeScolaireId) as {
    id: number
    annee_scolaire_id: number
    type_frais: TypeFrais
    libelle: string
    mode_tarification: 'unique' | 'par_classe'
    obligatoire: number
  }[]

  return models.map((model) => {
    const amounts = db
      .prepare(
        `SELECT fm.classe_id, c.nom as classe_nom, fm.montant
         FROM frais_montants fm
         LEFT JOIN classes c ON c.id = fm.classe_id
         WHERE fm.frais_modele_id = ?
         ORDER BY c.nom`
      )
      .all(model.id) as { classe_id: number | null; classe_nom: string | null; montant: number }[]
    const uniqueAmount = amounts.find((amount) => amount.classe_id === null)?.montant ?? null

    return {
      ...model,
      obligatoire: Boolean(model.obligatoire),
      montant_unique: uniqueAmount,
      montants_par_classe: amounts
        .filter((amount): amount is { classe_id: number; classe_nom: string; montant: number } =>
          amount.classe_id !== null
        )
        .map((amount) => ({
          classe_id: amount.classe_id,
          classe_nom: amount.classe_nom || '',
          montant: amount.montant
        }))
    }
  })
}

export function upsertFraisConfiguration(
  data: FraisConfigurationFormData,
  userId?: number
): FraisConfiguration {
  if (!data.libelle.trim()) throw new Error('Le nom du module de frais est requis')
  const db = getDb()
  const classes = db
    .prepare('SELECT id FROM classes WHERE annee_scolaire_id = ? ORDER BY id')
    .all(data.annee_scolaire_id) as { id: number }[]
  if (classes.length === 0) {
    throw new Error('Aucune classe configurée pour cette année scolaire')
  }

  if (data.mode_tarification === 'unique') {
    if (!data.montant_unique || data.montant_unique <= 0) {
      throw new Error('Le prix unique doit être supérieur à zéro')
    }
  } else {
    const amounts = new Map(
      (data.montants_par_classe ?? []).map((amount) => [amount.classe_id, amount.montant])
    )
    const missing = classes.some((classe) => !amounts.get(classe.id) || amounts.get(classe.id)! <= 0)
    if (missing) throw new Error('Un montant positif doit être défini pour chaque classe')
  }

  let modelId = data.id
  const save = db.transaction(() => {
    if (modelId) {
      const existing = db.prepare('SELECT id FROM frais_modeles WHERE id = ?').get(modelId)
      if (!existing) throw new Error('Module de frais introuvable')
      db.prepare(
        `UPDATE frais_modeles
         SET type_frais = ?, libelle = ?, mode_tarification = ?, obligatoire = ?
         WHERE id = ?`
      ).run(
        data.type_frais,
        data.libelle.trim(),
        data.mode_tarification,
        data.obligatoire === false ? 0 : 1,
        modelId
      )
    } else {
      const result = db
        .prepare(
          `INSERT INTO frais_modeles
            (annee_scolaire_id, type_frais, libelle, mode_tarification, obligatoire)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          data.annee_scolaire_id,
          data.type_frais,
          data.libelle.trim(),
          data.mode_tarification,
          data.obligatoire === false ? 0 : 1
        )
      modelId = Number(result.lastInsertRowid)
    }

    db.prepare('DELETE FROM frais_montants WHERE frais_modele_id = ?').run(modelId)
    const insertAmount = db.prepare(
      'INSERT INTO frais_montants (frais_modele_id, classe_id, montant) VALUES (?, ?, ?)'
    )
    if (data.mode_tarification === 'unique') {
      insertAmount.run(modelId, null, data.montant_unique)
    } else {
      for (const amount of data.montants_par_classe ?? []) {
        insertAmount.run(modelId, amount.classe_id, amount.montant)
      }
    }
    logActivity(userId ?? null, 'configuration', 'frais_modele', modelId!, data.libelle.trim())
  })
  save()

  return listFraisConfigurations(data.annee_scolaire_id).find(
    (configuration) => configuration.id === modelId
  )!
}

export function deleteFraisConfiguration(id: number, userId?: number): boolean {
  const db = getDb()
  const model = db.prepare('SELECT * FROM frais_modeles WHERE id = ?').get(id) as
    | { id: number; libelle: string }
    | undefined
  if (!model) throw new Error('Module de frais introuvable')
  if (db.prepare('SELECT 1 FROM paiements WHERE frais_modele_id = ? LIMIT 1').get(id)) {
    throw new Error('Ce module possède déjà des paiements et ne peut pas être supprimé')
  }
  db.prepare('DELETE FROM frais_modeles WHERE id = ?').run(id)
  logActivity(userId ?? null, 'suppression', 'frais_modele', id, model.libelle)
  return true
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
              i.niveau_id, i.section_id, i.classe_id
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
    classe_id: number
  } | undefined

  if (!eleve) return null

  const frais = db
    .prepare(
      `SELECT f.id as frais_modele_id, f.type_frais, f.libelle, m.montant
       FROM frais_modeles f
       JOIN frais_montants m ON m.frais_modele_id = f.id
       WHERE f.annee_scolaire_id = ?
         AND (
           (f.mode_tarification = 'unique' AND m.classe_id IS NULL)
           OR (f.mode_tarification = 'par_classe' AND m.classe_id = ?)
         )
       ORDER BY f.id`
    )
    .all(anneeScolaireId, eleve.classe_id) as {
    frais_modele_id: number
    type_frais: TypeFrais
    libelle: string
    montant: number
  }[]

  const paiements = db
    .prepare(
      `SELECT frais_modele_id, type_frais, COALESCE(SUM(montant), 0) as total
       FROM paiements WHERE eleve_id = ? AND annee_scolaire_id = ?
       GROUP BY frais_modele_id, type_frais`
    )
    .all(eleveId, anneeScolaireId) as {
    frais_modele_id: number | null
    type_frais: TypeFrais
    total: number
  }[]

  const paiementsParModele = new Map(
    paiements
      .filter((paiement) => paiement.frais_modele_id !== null)
      .map((paiement) => [paiement.frais_modele_id, paiement.total])
  )
  const paiementsLegacy = new Map(
    paiements
      .filter((paiement) => paiement.frais_modele_id === null)
      .map((paiement) => [paiement.type_frais, paiement.total])
  )

  const details = frais.map((item) => {
    const paye =
      (paiementsParModele.get(item.frais_modele_id) || 0) +
      (paiementsLegacy.get(item.type_frais) || 0)
    return {
      frais_modele_id: item.frais_modele_id,
      type_frais: item.type_frais,
      libelle: item.libelle,
      montant_du: item.montant,
      montant_paye: paye,
      reste: Math.max(0, item.montant - paye)
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
  const situation = getSituationFinanciere(data.eleve_id, data.annee_scolaire_id)
  const frais = situation?.details.find(
    (detail) => detail.frais_modele_id === data.frais_modele_id
  )
  if (!frais) throw new Error("Ce module de frais ne s'applique pas à la classe de l'élève")
  if (data.montant > frais.reste) {
    throw new Error(`Le montant dépasse le reste à payer (${frais.reste} FCFA)`)
  }
  const numeroRecu = generateNumeroRecu()

  const result = db
    .prepare(
      `INSERT INTO paiements
        (eleve_id, annee_scolaire_id, type_frais, frais_modele_id, montant,
         mode_paiement, numero_recu, date_paiement, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.eleve_id,
      data.annee_scolaire_id,
      frais.type_frais,
      data.frais_modele_id,
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
      `SELECT libelle FROM frais_modeles
       WHERE annee_scolaire_id = ?
         AND (id = ? OR (? IS NULL AND type_frais = ?))
       LIMIT 1`
    )
    .get(
      paiement.annee_scolaire_id,
      paiement.frais_modele_id,
      paiement.frais_modele_id,
      paiement.type_frais
    ) as { libelle: string } | undefined

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

  const totalAttendu = (
    db
      .prepare(
        `SELECT COALESCE(SUM(m.montant), 0) as t
         FROM inscriptions i
         JOIN frais_modeles f ON f.annee_scolaire_id = i.annee_scolaire_id
         JOIN frais_montants m ON m.frais_modele_id = f.id
           AND (
             (f.mode_tarification = 'unique' AND m.classe_id IS NULL)
             OR (f.mode_tarification = 'par_classe' AND m.classe_id = i.classe_id)
           )
         WHERE i.annee_scolaire_id = ? AND i.statut = 'actif'`
      )
      .get(anneeScolaireId) as { t: number }
  ).t

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
