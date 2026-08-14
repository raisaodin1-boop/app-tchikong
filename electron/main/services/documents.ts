import { basename } from 'path'
import { getDb, logActivity } from '../../../db/database'
import type { TypeDocumentOfficiel } from '../../../shared/types'

export interface AttestationData {
  eleve: {
    id: number
    nom: string
    prenom: string
    matricule: string
    date_naissance: string
    sexe: string
  }
  classe: {
    nom: string
    section_nom: string
    section_code: string
    niveau_nom: string
  }
  annee_libelle: string
  annee_debut: string
  date_debut?: string
  date_fin?: string
}

export function getAttestationData(
  eleveId: number,
  anneeScolaireId?: number
): AttestationData | null {
  const db = getDb()

  const eleve = db
    .prepare('SELECT id, nom, prenom, matricule, date_naissance, sexe FROM eleves WHERE id = ?')
    .get(eleveId) as AttestationData['eleve'] | undefined

  if (!eleve) return null

  let sql = `
    SELECT c.nom as classe_nom, s.nom as section_nom, s.code as section_code,
           n.nom as niveau_nom, a.libelle as annee_libelle, a.date_debut as annee_debut,
           i.annee_scolaire_id
    FROM inscriptions i
    JOIN classes c ON c.id = i.classe_id
    JOIN sections s ON s.id = i.section_id
    JOIN niveaux n ON n.id = i.niveau_id
    JOIN annees_scolaires a ON a.id = i.annee_scolaire_id
    WHERE i.eleve_id = ?
  `
  const params: unknown[] = [eleveId]

  if (anneeScolaireId) {
    sql += ' AND i.annee_scolaire_id = ?'
    params.push(anneeScolaireId)
  } else {
    sql += ' ORDER BY i.date_inscription DESC LIMIT 1'
  }

  const inscription = db.prepare(sql).get(...params) as {
    classe_nom: string
    section_nom: string
    section_code: string
    niveau_nom: string
    annee_libelle: string
    annee_debut: string
    annee_scolaire_id: number
  } | undefined

  if (!inscription) return null

  return {
    eleve,
    classe: {
      nom: inscription.classe_nom,
      section_nom: inscription.section_nom,
      section_code: inscription.section_code,
      niveau_nom: inscription.niveau_nom
    },
    annee_libelle: inscription.annee_libelle,
    annee_debut: inscription.annee_debut
  }
}

export function getListeClasseData(classeId: number): {
  classe_nom: string
  section_code: string
  annee_libelle: string
  effectif: number
  eleves: {
    numero: number
    matricule: string
    nom: string
    prenom: string
    sexe: string
    date_naissance: string
  }[]
} | null {
  const db = getDb()

  const classe = db
    .prepare(
      `SELECT c.nom as classe_nom, s.code as section_code, a.libelle as annee_libelle
       FROM classes c
       JOIN sections s ON s.id = c.section_id
       JOIN annees_scolaires a ON a.id = c.annee_scolaire_id
       WHERE c.id = ?`
    )
    .get(classeId) as { classe_nom: string; section_code: string; annee_libelle: string } | undefined

  if (!classe) return null

  const eleves = db
    .prepare(
      `SELECT e.matricule, e.nom, e.prenom, e.sexe, e.date_naissance
       FROM inscriptions i
       JOIN eleves e ON e.id = i.eleve_id
       WHERE i.classe_id = ? AND i.statut = 'actif'
       ORDER BY e.nom, e.prenom`
    )
    .all(classeId) as {
    matricule: string
    nom: string
    prenom: string
    sexe: string
    date_naissance: string
  }[]

  return {
    classe_nom: classe.classe_nom,
    section_code: classe.section_code,
    annee_libelle: classe.annee_libelle,
    effectif: eleves.length,
    eleves: eleves.map((e, i) => ({ numero: i + 1, ...e }))
  }
}

export function enregistrerDocumentOfficiel(
  eleveId: number,
  type: TypeDocumentOfficiel,
  numeroOuChemin: string,
  contenuJson: string,
  userId?: number
): void {
  const year = new Date().getFullYear()
  const prefix = `DOC-${year}-`
  const row = getDb()
    .prepare(
      `SELECT MAX(CAST(substr(numero, length(?) + 1) AS INTEGER)) as n
       FROM documents_officiels WHERE numero LIKE ?`
    )
    .get(prefix, `${prefix}%`) as { n: number | null }
  const numero = `${prefix}${String((row.n || 0) + 1).padStart(5, '0')}`
  const fichier = basename(numeroOuChemin || '') || numero

  getDb()
    .prepare(
      `INSERT INTO documents_officiels (eleve_id, type, contenu_json, numero, generated_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(eleveId, type, contenuJson, numero, userId ?? null)

  logActivity(userId ?? null, 'generation', 'document_officiel', eleveId, `${type} ${fichier}`)
}
