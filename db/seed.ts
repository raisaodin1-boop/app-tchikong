import bcrypt from 'bcryptjs'
import { getDb } from '@database'
import type { SectionCode } from '../shared/types'

export function seedReferenceData(): void {
  const db = getDb()

  const sectionCount = db.prepare('SELECT COUNT(*) as c FROM sections').get() as { c: number }
  if (sectionCount.c > 0) return

  // Sections
  const insertSection = db.prepare('INSERT INTO sections (code, nom) VALUES (?, ?)')
  insertSection.run('FR', 'Francophone')
  insertSection.run('ANG', 'Anglophone')
  insertSection.run('BIL', 'Bilingue')

  // Niveaux par section
  const insertNiveau = db.prepare(
    'INSERT INTO niveaux (section_id, code, nom, nom_anglais, ordre, cycle) VALUES (?, ?, ?, ?, ?, ?)'
  )

  const niveauxFR = [
    ['PS', 'Petite Section', 'Nursery 1', 1, 'maternelle'],
    ['MS', 'Moyenne Section', 'Nursery 2', 2, 'maternelle'],
    ['GS', 'Grande Section', 'Nursery 3', 3, 'maternelle'],
    ['SIL', 'SIL', 'Class 1', 4, 'primaire'],
    ['CP', 'CP', 'Class 2', 5, 'primaire'],
    ['CE1', 'CE1', 'Class 3', 6, 'primaire'],
    ['CE2', 'CE2', 'Class 4', 7, 'primaire'],
    ['CM1', 'CM1', 'Class 5', 8, 'primaire'],
    ['CM2', 'CM2', 'Class 6', 9, 'primaire']
  ] as const

  const niveauxANG = [
    ['PS', 'Nursery 1', 'Nursery 1', 1, 'maternelle'],
    ['MS', 'Nursery 2', 'Nursery 2', 2, 'maternelle'],
    ['GS', 'Nursery 3', 'Nursery 3', 3, 'maternelle'],
    ['CLASS1', 'Class 1', 'Class 1', 4, 'primaire'],
    ['CLASS2', 'Class 2', 'Class 2', 5, 'primaire'],
    ['CLASS3', 'Class 3', 'Class 3', 6, 'primaire'],
    ['CLASS4', 'Class 4', 'Class 4', 7, 'primaire'],
    ['CLASS5', 'Class 5', 'Class 5', 8, 'primaire'],
    ['CLASS6', 'Class 6', 'Class 6', 9, 'primaire']
  ] as const

  for (const n of niveauxFR) {
    insertNiveau.run(1, n[0], n[1], n[2], n[3], n[4])
  }
  for (const n of niveauxANG) {
    insertNiveau.run(2, n[0], n[1], n[2], n[3], n[4])
  }
  // Bilingue utilise les niveaux francophones
  for (const n of niveauxFR) {
    insertNiveau.run(3, n[0], n[1], n[2], n[3], n[4])
  }

  // Utilisateur par défaut
  const hash = bcrypt.hashSync('admin123', 10)
  db.prepare(
    `INSERT INTO utilisateurs (username, password_hash, nom, prenom, role)
     VALUES (?, ?, ?, ?, ?)`
  ).run('admin', hash, 'Kouekam', 'Raisa', 'directrice')

  db.prepare(
    `INSERT INTO utilisateurs (username, password_hash, nom, prenom, role)
     VALUES (?, ?, ?, ?, ?)`
  ).run('secretaire', bcrypt.hashSync('secret123', 10), 'Mballa', 'Marie', 'secretariat')

  db.prepare(
    `INSERT INTO utilisateurs (username, password_hash, nom, prenom, role)
     VALUES (?, ?, ?, ?, ?)`
  ).run('comptable', bcrypt.hashSync('compta123', 10), 'Ndjock', 'Paul', 'comptable')

  // Matières francophones
  const matieresFR = [
    ['FR', 'Français', 3], ['MATH', 'Mathématiques', 3], ['HIST-GEO', 'Histoire-Géographie', 2],
    ['SC', 'Sciences', 2], ['EPS', 'EPS', 1], ['ART', 'Arts Plastiques', 1],
    ['MUS', 'Musique', 1], ['ANG', 'Anglais', 2], ['ECM', 'ECM', 1]
  ]
  const insertMatiere = db.prepare(
    'INSERT INTO matieres (section_id, code, nom, coefficient, ordre) VALUES (?, ?, ?, ?, ?)'
  )
  matieresFR.forEach((m, i) => insertMatiere.run(1, m[0], m[1], m[2], i + 1))

  const matieresANG = [
    ['ENG', 'English Language', 3], ['MATH', 'Mathematics', 3], ['SCI', 'Science', 2],
    ['SOC', 'Social Studies', 2], ['PE', 'Physical Education', 1], ['ART', 'Art', 1],
    ['MUS', 'Music', 1], ['FR', 'French', 2], ['MOR', 'Moral Instruction', 1]
  ]
  matieresANG.forEach((m, i) => insertMatiere.run(2, m[0], m[1], m[2], i + 1))
  matieresFR.forEach((m, i) => insertMatiere.run(3, m[0], m[1], m[2], i + 1))
}

export function seedDemoData(): { message: string; count: number } {
  const db = getDb()
  seedReferenceData()

  const existing = db.prepare('SELECT COUNT(*) as c FROM eleves').get() as { c: number }
  if (existing.c >= 50) {
    const notesResult = seedNotesDemo()
    const paymentsResult = seedPaymentsDemo()
    const personnelResult = seedPersonnelDemo()
    setDemoMode(true)
    return {
      message: `Données déjà présentes (${existing.c} élèves). ${notesResult.message}. ${paymentsResult.message}. ${personnelResult.message}`,
      count: existing.c
    }
  }

  // Année scolaire
  let anneeId: number
  const annee = db.prepare('SELECT id FROM annees_scolaires WHERE libelle = ?').get('2025-2026') as
    | { id: number }
    | undefined
  if (annee) {
    anneeId = annee.id
  } else {
    const result = db
      .prepare(
        `INSERT INTO annees_scolaires (libelle, date_debut, date_fin, active, nb_sequences, nb_trimestres)
         VALUES (?, ?, ?, 1, 6, 3)`
      )
      .run('2025-2026', '2025-09-01', '2026-06-30')
    anneeId = result.lastInsertRowid as number
    db.prepare('UPDATE annees_scolaires SET active = 0 WHERE id != ?').run(anneeId)

    // Périodes d'évaluation
    const insertPeriode = db.prepare(
      `INSERT INTO periodes_evaluation (annee_scolaire_id, numero, type, libelle) VALUES (?, ?, ?, ?)`
    )
    for (let i = 1; i <= 6; i++) {
      insertPeriode.run(anneeId, i, 'sequence', `${i}ème Séquence`)
    }
    for (let i = 1; i <= 3; i++) {
      insertPeriode.run(anneeId, i, 'trimestre', `${i}ème Trimestre`)
    }
  }

  // Classes
  const classesConfig = [
    { section: 1 as SectionCode extends never ? number : number, niveau: 4, nom: 'SIL A' },
    { section: 1, niveau: 5, nom: 'CP A' },
    { section: 1, niveau: 6, nom: 'CE1 A' },
    { section: 1, niveau: 7, nom: 'CE2 A' },
    { section: 1, niveau: 8, nom: 'CM1 A' },
    { section: 1, niveau: 9, nom: 'CM2 A' },
    { section: 2, niveau: 13, nom: 'Class 1 A' },
    { section: 2, niveau: 14, nom: 'Class 2 A' },
    { section: 2, niveau: 15, nom: 'Class 3 A' },
    { section: 3, niveau: 24, nom: 'CE1 Bilingue' },
    { section: 3, niveau: 25, nom: 'CE2 Bilingue' },
    { section: 1, niveau: 1, nom: 'Petite Section' },
    { section: 1, niveau: 2, nom: 'Moyenne Section' },
    { section: 1, niveau: 3, nom: 'Grande Section' }
  ]

  const insertClasse = db.prepare(
    `INSERT OR IGNORE INTO classes (annee_scolaire_id, niveau_id, section_id, nom, capacite_max)
     VALUES (?, ?, ?, ?, 40)`
  )
  const classeIds: number[] = []
  for (const c of classesConfig) {
    insertClasse.run(anneeId, c.niveau, c.section, c.nom)
    const row = db
      .prepare('SELECT id FROM classes WHERE annee_scolaire_id = ? AND nom = ?')
      .get(anneeId, c.nom) as { id: number }
    classeIds.push(row.id)
  }

  // Élèves fictifs
  const prenomsM = [
    'Jean', 'Pierre', 'Paul', 'André', 'Michel', 'David', 'Samuel', 'Kevin', 'Boris', 'Frank',
    'Christian', 'Emmanuel', 'Patrick', 'Joseph', 'Daniel', 'Eric', 'Alain', 'Marc', 'Olivier', 'Hervé'
  ]
  const prenomsF = [
    'Marie', 'Anne', 'Claire', 'Sophie', 'Julie', 'Céline', 'Grace', 'Esther', 'Ruth', 'Sarah',
    'Patricia', 'Nadine', 'Brigitte', 'Sylvie', 'Véronique', 'Chantal', 'Françoise', 'Hélène', 'Isabelle', 'Martine'
  ]
  const noms = [
    'Mbarga', 'Nkomo', 'Fouda', 'Essomba', 'Biya', 'Owona', 'Meka', 'Tchoumi', 'Nguema', 'Abena',
    'Kamga', 'Tchakounte', 'Mballa', 'Ndjock', 'Etoa', 'Mvondo', 'Bekono', 'Ngono', 'Tchinda', 'Fotsing',
    'Nana', 'Atangana', 'Bella', 'Manga', 'Olinga', 'Soppo', 'Tchouakeu', 'Wamba', 'Zoa', 'Ekani'
  ]

  const insertEleve = db.prepare(
    `INSERT INTO eleves (matricule, nom, prenom, date_naissance, sexe, adresse, statut)
     VALUES (?, ?, ?, ?, ?, ?, 'actif')`
  )
  const insertInscription = db.prepare(
    `INSERT INTO inscriptions (eleve_id, annee_scolaire_id, classe_id, section_id, niveau_id, redoublement)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  const insertParent = db.prepare(
    `INSERT INTO parents_tuteurs (eleve_id, nom, prenom, telephone, profession, lien_parente, contact_urgence)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  let count = 0
  const year = 2015
  for (let i = 0; i < 55; i++) {
    const sexe = i % 3 === 0 ? 'F' : 'M'
    const prenom = sexe === 'M' ? prenomsM[i % prenomsM.length] : prenomsF[i % prenomsF.length]
    const nom = noms[i % noms.length]
    const matricule = `TCH-2025-${String(i + 1).padStart(4, '0')}`
    const birthYear = year + (i % 10)
    const birthMonth = String((i % 12) + 1).padStart(2, '0')
    const birthDay = String((i % 28) + 1).padStart(2, '0')

    const classeIdx = i % classeIds.length
    const classe = db.prepare('SELECT * FROM classes WHERE id = ?').get(classeIds[classeIdx]) as {
      id: number
      section_id: number
      niveau_id: number
    }

    try {
      const result = insertEleve.run(
        matricule,
        nom,
        prenom,
        `${birthYear}-${birthMonth}-${birthDay}`,
        sexe,
        `Quartier ${['Nkomo', 'Bonamoussadi', 'Logpom', 'Makepe', 'Kotto'][i % 5]}, Douala`
      )
      const eleveId = result.lastInsertRowid as number

      insertInscription.run(
        eleveId,
        anneeId,
        classe.id,
        classe.section_id,
        classe.niveau_id,
        i % 7 === 0 ? 1 : 0
      )

      insertParent.run(
        eleveId,
        nom,
        sexe === 'M' ? 'Marie' : 'Jean',
        `6${String(70000000 + i * 111111).slice(0, 8)}`,
        ['Commerçant', 'Fonctionnaire', 'Médecin', 'Enseignant', 'Chauffeur'][i % 5],
        i % 2 === 0 ? 'pere' : 'mere',
        1
      )
      count++
    } catch {
      // Skip duplicates
    }
  }

  // Grille tarifaire
  const insertTarif = db.prepare(
    `INSERT OR IGNORE INTO grille_tarifaire (annee_scolaire_id, niveau_id, section_id, type_frais, libelle, montant)
     VALUES (?, ?, ?, 'scolarite', 'Frais de scolarité', ?)`
  )
  const niveaux = db.prepare('SELECT id, cycle, section_id FROM niveaux').all() as {
    id: number
    cycle: string
    section_id: number
  }[]
  for (const n of niveaux) {
    const montant = n.cycle === 'maternelle' ? 75000 : n.section_id === 2 ? 95000 : 85000
    insertTarif.run(anneeId, n.id, n.section_id, montant)
    db.prepare(
      `INSERT OR IGNORE INTO grille_tarifaire (annee_scolaire_id, niveau_id, section_id, type_frais, libelle, montant)
       VALUES (?, ?, ?, 'inscription', 'Frais d''inscription', ?)`
    ).run(anneeId, n.id, n.section_id, n.cycle === 'maternelle' ? 15000 : 20000)
  }

  seedNotesDemo(anneeId)
  seedPaymentsDemo(anneeId)
  seedPersonnelDemo()
  setDemoMode(true)

  return { message: `${count} élèves de démonstration créés`, count }
}

function setDemoMode(active: boolean): void {
  getDb()
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('demo_mode', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(active ? '1' : '0')
}

export function seedNotesDemo(anneeId?: number): { message: string; notesCount: number } {
  const db = getDb()

  const existingNotes = (db.prepare('SELECT COUNT(*) as c FROM notes').get() as { c: number }).c
  if (existingNotes > 0) {
    return { message: 'Notes de démonstration déjà présentes', notesCount: existingNotes }
  }

  let yearId = anneeId
  if (!yearId) {
    const annee = db.prepare('SELECT id FROM annees_scolaires WHERE active = 1').get() as
      | { id: number }
      | undefined
    yearId = annee?.id
  }
  if (!yearId) return { message: 'Aucune année scolaire active', notesCount: 0 }

  const periode = db
    .prepare(
      `SELECT id FROM periodes_evaluation WHERE annee_scolaire_id = ? AND type = 'sequence' AND numero = 1`
    )
    .get(yearId) as { id: number } | undefined

  if (!periode) return { message: 'Période introuvable', notesCount: 0 }

  const classe = db
    .prepare(`SELECT id, section_id FROM classes WHERE annee_scolaire_id = ? AND nom = 'CE1 A'`)
    .get(yearId) as { id: number; section_id: number } | undefined

  if (!classe) return { message: 'Classe CE1 A introuvable', notesCount: 0 }

  const matieres = db
    .prepare('SELECT id, coefficient FROM matieres WHERE section_id = ?')
    .all(classe.section_id) as { id: number; coefficient: number }[]

  const eleves = db
    .prepare(
      `SELECT eleve_id FROM inscriptions WHERE classe_id = ? AND statut = 'actif' LIMIT 20`
    )
    .all(classe.id) as { eleve_id: number }[]

  const insertNote = db.prepare(
    `INSERT OR IGNORE INTO notes (eleve_id, matiere_id, periode_id, valeur, note_sur, coefficient)
     VALUES (?, ?, ?, ?, 20, ?)`
  )

  let notesCount = 0
  for (const eleve of eleves) {
    for (const matiere of matieres) {
      const base = 8 + ((eleve.eleve_id + matiere.id) % 10)
      const valeur = Math.min(20, base + Math.random() * 4)
      insertNote.run(
        eleve.eleve_id,
        matiere.id,
        periode.id,
        Math.round(valeur * 2) / 2,
        matiere.coefficient
      )
      notesCount++
    }
  }

  return { message: `${notesCount} notes de démonstration créées`, notesCount }
}

export function seedPaymentsDemo(anneeId?: number): { message: string; count: number } {
  const db = getDb()

  const existing = (db.prepare('SELECT COUNT(*) as c FROM paiements').get() as { c: number }).c
  if (existing > 0) {
    return { message: 'Paiements de démonstration déjà présents', count: existing }
  }

  let yearId = anneeId
  if (!yearId) {
    const annee = db.prepare('SELECT id FROM annees_scolaires WHERE active = 1').get() as
      | { id: number }
      | undefined
    yearId = annee?.id
  }
  if (!yearId) return { message: 'Aucune année scolaire active', count: 0 }

  const eleves = db
    .prepare(
      `SELECT i.eleve_id FROM inscriptions i WHERE i.annee_scolaire_id = ? AND i.statut = 'actif'`
    )
    .all(yearId) as { eleve_id: number }[]

  const insertPaiement = db.prepare(
    `INSERT INTO paiements (eleve_id, annee_scolaire_id, type_frais, montant, mode_paiement, numero_recu, date_paiement)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  const modes = ['especes', 'mobile_money', 'cheque', 'virement'] as const
  let count = 0
  let recuNum = 1

  for (const el of eleves) {
    // ~60% ont payé au moins l'inscription, ~40% ont payé la scolarité partiellement ou totalement
    const rand = Math.random()
    const year = 2025

    if (rand > 0.15) {
      // Inscription payée
      insertPaiement.run(
        el.eleve_id, yearId, 'inscription', 20000,
        modes[recuNum % 4], `REC-${year}-${String(recuNum++).padStart(5, '0')}`,
        '2025-09-15'
      )
      count++
    }

    if (rand > 0.4) {
      // Scolarité partielle ou totale
      const montant = rand > 0.7 ? 85000 : rand > 0.55 ? 50000 : 30000
      insertPaiement.run(
        el.eleve_id, yearId, 'scolarite', montant,
        modes[recuNum % 4], `REC-${year}-${String(recuNum++).padStart(5, '0')}`,
        rand > 0.6 ? '2025-10-01' : '2025-11-15'
      )
      count++
    }
  }

  // Quelques dépenses
  const depenses = [
    { type: 'salaire', libelle: 'Salaires enseignants - Octobre', montant: 450000, beneficiaire: 'Personnel' },
    { type: 'fourniture', libelle: 'Achat de craies et marqueurs', montant: 35000, beneficiaire: 'Papeterie Douala' },
    { type: 'charge', libelle: 'Facture électricité', montant: 28000, beneficiaire: 'ENEO' }
  ]
  const insertDepense = db.prepare(
    `INSERT INTO depenses (annee_scolaire_id, type, libelle, montant, date_depense, beneficiaire)
     VALUES (?, ?, ?, ?, date('now', '-' || ? || ' days'), ?)`
  )
  depenses.forEach((d, i) => {
    insertDepense.run(yearId, d.type, d.libelle, d.montant, i * 15, d.beneficiaire)
  })

  return { message: `${count} paiements de démonstration créés`, count }
}

export function seedPersonnelDemo(): { message: string; count: number } {
  const db = getDb()

  const existing = (db.prepare('SELECT COUNT(*) as c FROM enseignants').get() as { c: number }).c
  if (existing > 0) {
    return { message: 'Personnel de démonstration déjà présent', count: existing }
  }

  const personnel = [
    ['PER-2025-0001', 'Ngono', 'Jean', 'M', '677123456', null, 'enseignant', '2020-09-01'],
    ['PER-2025-0002', 'Mballa', 'Marie-Claire', 'F', '699234567', 'marie.mballa@tchikong.cm', 'enseignant', '2019-09-01'],
    ['PER-2025-0003', 'Fouda', 'Patrick', 'M', '655345678', null, 'enseignant', '2021-09-01'],
    ['PER-2025-0004', 'Essomba', 'Grace', 'F', '677456789', null, 'enseignant', '2022-09-01'],
    ['PER-2025-0005', 'Ndjock', 'Paul', 'M', '699567890', 'p.ndjock@tchikong.cm', 'comptable', '2018-09-01'],
    ['PER-2025-0006', 'Kouekam', 'Raisa', 'F', '677678901', 'directrice@tchikong.cm', 'directrice', '2015-09-01'],
    ['PER-2025-0007', 'Tchinda', 'Emmanuel', 'M', '655789012', null, 'surveillant', '2023-09-01'],
    ['PER-2025-0008', 'Abena', 'Sophie', 'F', '699890123', null, 'secretaire', '2020-09-01'],
    ['PER-2025-0009', 'Mvondo', 'Alain', 'M', '677901234', null, 'enseignant', '2017-09-01'],
    ['PER-2025-0010', 'Bekono', 'Céline', 'F', '655012345', null, 'enseignant', '2024-09-01']
  ] as const

  const insert = db.prepare(
    `INSERT INTO enseignants (matricule, nom, prenom, sexe, telephone, email, poste, date_embauche, actif)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
  )

  for (const p of personnel) {
    insert.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7])
  }

  return { message: `${personnel.length} membres du personnel créés`, count: personnel.length }
}
