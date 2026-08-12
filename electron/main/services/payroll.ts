import { getDb, logActivity } from '@database'
import type {
  PaieMensuelle,
  PaieMensuelleRow,
  PersonnelAnneeDetail,
  SalairePersonnelFormData,
  ValidationSalaireData
} from '../../../shared/types'

export function initializePersonnelAnnee(anneeId: number, userId?: number): number {
  const db = getDb()
  const personnel = db
    .prepare('SELECT id, date_embauche, actif FROM enseignants WHERE actif = 1')
    .all() as { id: number; date_embauche: string | null; actif: number }[]
  const previousSalary = db.prepare(
    `SELECT salaire_mensuel FROM personnel_annees
     WHERE personnel_id = ? AND annee_scolaire_id != ?
     ORDER BY annee_scolaire_id DESC LIMIT 1`
  )
  const insert = db.prepare(
    `INSERT OR IGNORE INTO personnel_annees
      (personnel_id, annee_scolaire_id, salaire_mensuel, date_debut, actif)
     VALUES (?, ?, ?, ?, 1)`
  )

  let created = 0
  const transaction = db.transaction(() => {
    for (const member of personnel) {
      const previous = previousSalary.get(member.id, anneeId) as
        | { salaire_mensuel: number }
        | undefined
      const result = insert.run(
        member.id,
        anneeId,
        previous?.salaire_mensuel ?? 0,
        member.date_embauche
      )
      created += result.changes
    }
    logActivity(
      userId ?? null,
      'initialisation',
      'paie_annuelle',
      anneeId,
      `${created} personnels inscrits`
    )
  })
  transaction()
  return created
}

export function listPersonnelAnnee(anneeId: number): PersonnelAnneeDetail[] {
  const rows = getDb()
    .prepare(
      `SELECT pa.*, e.matricule, e.nom, e.prenom, e.poste
       FROM personnel_annees pa
       JOIN enseignants e ON e.id = pa.personnel_id
       WHERE pa.annee_scolaire_id = ?
       ORDER BY e.poste, e.nom, e.prenom`
    )
    .all(anneeId) as Record<string, unknown>[]
  return rows.map((row) => ({ ...row, actif: Boolean(row.actif) })) as PersonnelAnneeDetail[]
}

export function configureSalaire(
  data: SalairePersonnelFormData,
  userId?: number
): PersonnelAnneeDetail {
  if (!Number.isFinite(data.salaire_mensuel) || data.salaire_mensuel <= 0) {
    throw new Error('Le salaire mensuel doit être supérieur à zéro')
  }
  const db = getDb()
  const member = db.prepare('SELECT id FROM enseignants WHERE id = ?').get(data.personnel_id)
  if (!member) throw new Error('Personnel introuvable')

  db.prepare(
    `INSERT INTO personnel_annees
      (personnel_id, annee_scolaire_id, salaire_mensuel, actif)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(personnel_id, annee_scolaire_id)
     DO UPDATE SET salaire_mensuel = excluded.salaire_mensuel, actif = excluded.actif`
  ).run(
    data.personnel_id,
    data.annee_scolaire_id,
    data.salaire_mensuel,
    data.actif === false ? 0 : 1
  )
  logActivity(
    userId ?? null,
    'configuration',
    'salaire',
    data.personnel_id,
    `${data.salaire_mensuel} FCFA`
  )
  return listPersonnelAnnee(data.annee_scolaire_id).find(
    (item) => item.personnel_id === data.personnel_id
  )!
}

function validateMonth(anneeId: number, month: string): void {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Mois invalide')
  const year = getDb()
    .prepare('SELECT date_debut, date_fin FROM annees_scolaires WHERE id = ?')
    .get(anneeId) as { date_debut: string; date_fin: string } | undefined
  if (!year) throw new Error('Année scolaire introuvable')
  const firstDay = `${month}-01`
  if (firstDay < year.date_debut.slice(0, 7) + '-01' || firstDay > year.date_fin) {
    throw new Error("Ce mois n'appartient pas à l'année scolaire")
  }
}

export function getPaieMensuelle(anneeId: number, month: string): PaieMensuelle {
  validateMonth(anneeId, month)
  const db = getDb()
  const annual = listPersonnelAnnee(anneeId)
  const insert = db.prepare(
    `INSERT OR IGNORE INTO salaires_mensuels
      (personnel_annee_id, mois, montant_du)
     VALUES (?, ?, ?)`
  )
  for (const member of annual) {
    const started = !member.date_debut || member.date_debut.slice(0, 7) <= month
    const notEnded = !member.date_fin || member.date_fin.slice(0, 7) >= month
    if (member.actif && member.salaire_mensuel > 0 && started && notEnded) {
      insert.run(member.id, month, member.salaire_mensuel)
    }
  }

  const salaryRows = db
    .prepare(
      `SELECT pa.*, e.matricule, e.nom, e.prenom, e.poste,
              sm.id as salaire_id, ? as mois,
              COALESCE(sm.montant_du, pa.salaire_mensuel) as montant_du,
              COALESCE(sm.montant_paye, 0) as montant_paye,
              CASE
                WHEN pa.salaire_mensuel <= 0 THEN 'non_configure'
                ELSE COALESCE(sm.statut, 'a_payer')
              END as statut,
              sm.date_paiement, sm.mode_paiement, sm.reference
       FROM personnel_annees pa
       JOIN enseignants e ON e.id = pa.personnel_id
       LEFT JOIN salaires_mensuels sm
         ON sm.personnel_annee_id = pa.id AND sm.mois = ?
       WHERE pa.annee_scolaire_id = ? AND pa.actif = 1
         AND (pa.date_debut IS NULL OR substr(pa.date_debut, 1, 7) <= ?)
         AND (pa.date_fin IS NULL OR substr(pa.date_fin, 1, 7) >= ?)
       ORDER BY e.poste, e.nom, e.prenom`
    )
    .all(month, month, anneeId, month, month) as Record<string, unknown>[]
  const salaries = salaryRows.map((row) => ({
    ...row,
    actif: Boolean(row.actif)
  })) as unknown as PaieMensuelleRow[]

  const configured = salaries.filter((row) => row.statut !== 'non_configure')
  const totalDue = configured.reduce((sum, row) => sum + row.montant_du, 0)
  const totalPaid = configured.reduce((sum, row) => sum + row.montant_paye, 0)
  return {
    mois: month,
    rows: salaries,
    total_du: totalDue,
    total_paye: totalPaid,
    total_restant: Math.max(0, totalDue - totalPaid),
    payes: configured.filter((row) => row.statut === 'paye').length,
    a_payer: configured.filter((row) => row.statut === 'a_payer').length
  }
}

export function validateSalairePayment(
  data: ValidationSalaireData,
  userId?: number
): PaieMensuelleRow {
  const db = getDb()
  const salary = db
    .prepare(
      `SELECT sm.*, pa.annee_scolaire_id, pa.personnel_id,
              e.nom, e.prenom
       FROM salaires_mensuels sm
       JOIN personnel_annees pa ON pa.id = sm.personnel_annee_id
       JOIN enseignants e ON e.id = pa.personnel_id
       WHERE sm.id = ?`
    )
    .get(data.salaire_id) as
    | {
        id: number
        mois: string
        montant_du: number
        statut: string
        annee_scolaire_id: number
        personnel_id: number
        nom: string
        prenom: string
      }
    | undefined
  if (!salary) throw new Error('Échéance salariale introuvable')
  if (salary.statut === 'paye') throw new Error('Ce salaire est déjà marqué comme payé')

  const transaction = db.transaction(() => {
    const expense = db
      .prepare(
        `INSERT INTO depenses
          (annee_scolaire_id, type, libelle, montant, date_depense,
           beneficiaire, notes, created_by)
         VALUES (?, 'salaire', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        salary.annee_scolaire_id,
        `Salaire ${salary.mois} — ${salary.prenom} ${salary.nom}`,
        salary.montant_du,
        data.date_paiement,
        `${salary.prenom} ${salary.nom}`,
        data.notes ?? null,
        userId ?? null
      )
    db.prepare(
      `UPDATE salaires_mensuels SET
         montant_paye = montant_du, statut = 'paye', date_paiement = ?,
         mode_paiement = ?, reference = ?, notes = ?, validated_by = ?,
         depense_id = ?, validated_at = datetime('now')
       WHERE id = ?`
    ).run(
      data.date_paiement,
      data.mode_paiement,
      data.reference ?? null,
      data.notes ?? null,
      userId ?? null,
      expense.lastInsertRowid,
      salary.id
    )
    logActivity(
      userId ?? null,
      'validation',
      'salaire',
      salary.id,
      `${salary.mois} — ${salary.prenom} ${salary.nom}`
    )
  })
  transaction()

  return getPaieMensuelle(salary.annee_scolaire_id, salary.mois).rows.find(
    (row) => row.salaire_id === salary.id
  )!
}
