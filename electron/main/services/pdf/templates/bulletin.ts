import { COLORS, MENTION_COLORS, MENTION_LABELS } from '../config'
import { PdfBuilder } from '../engine'
import { formatDate, generateDocumentNumber, ordinalFr } from '../utils'
import type { BulletinData } from '../../scolarite'

export async function templateBulletin(data: BulletinData): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('bulletin')
  const effectif = data.statistiques_classe.effectif

  const builder = await PdfBuilder.create()
  builder.setMeta('Bulletin de notes', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle(
    'BULLETIN SCOLAIRE',
    `${data.periode.libelle}  •  ${data.annee_libelle}  •  Édition certifiée`
  )

  builder.drawInfoGrid([
    { label: 'Nom', value: data.eleve.nom.toUpperCase() },
    { label: 'Prénom', value: data.eleve.prenom },
    { label: 'Matricule', value: data.eleve.matricule },
    { label: 'Classe', value: `${data.classe.nom} (${data.classe.section_code})` },
    { label: 'Niveau', value: data.classe.niveau_nom },
    { label: 'Date de naissance', value: formatDate(data.eleve.date_naissance) }
  ])

  builder.drawSectionTitle('Résultats académiques')
  builder.drawTable(
    [
      { header: 'Matière', width: 175, align: 'left' },
      { header: 'Coef.', width: 45, align: 'center' },
      { header: 'Note', width: 60, align: 'center' },
      { header: 'Note /20', width: 60, align: 'center' },
      { header: 'Appréciation', width: 155, align: 'left' }
    ],
    data.moyenne.details.map((d) => ({
      cells: [
        d.matiere_nom,
        String(d.coefficient),
        `${d.valeur}/${d.note_sur}`,
        d.note_sur_20.toFixed(2),
        d.appreciation || appreciationFor(d.note_sur_20)
      ]
    }))
  )

  const mentionColor = MENTION_COLORS[data.moyenne.mention] || COLORS.text
  builder.drawResultRow([
    { label: 'MOYENNE GÉNÉRALE', value: `${data.moyenne.moyenne.toFixed(2)} / 20` },
    { label: 'RANG', value: `${ordinalFr(data.moyenne.rang)} / ${effectif}` },
    {
      label: 'MENTION',
      value: MENTION_LABELS[data.moyenne.mention] || data.moyenne.mention,
      color: mentionColor
    }
  ])
  builder.drawResultRow([
    {
      label: 'MOYENNE DE CLASSE',
      value: `${data.statistiques_classe.moyenne_classe.toFixed(2)} / 20`
    },
    {
      label: 'MEILLEURE MOYENNE',
      value: `${data.statistiques_classe.meilleure_moyenne.toFixed(2)} / 20`,
      color: COLORS.success
    },
    {
      label: 'PLUS FAIBLE MOYENNE',
      value: `${data.statistiques_classe.plus_faible_moyenne.toFixed(2)} / 20`
    }
  ])
  builder.drawPerformanceBar(data.moyenne.moyenne)

  if (data.appreciation_maitre) {
    builder.drawParagraph('APPRÉCIATION GÉNÉRALE DU MAÎTRE DE CLASSE', data.appreciation_maitre)
  } else {
    builder.drawParagraph(
      'APPRÉCIATION GÉNÉRALE',
      automaticGeneralAppreciation(data.moyenne.moyenne)
    )
  }

  const verificationPayload = [
    'TCHIKONG',
    docNum,
    data.eleve.matricule,
    data.periode.id,
    data.moyenne.moyenne.toFixed(2),
    data.moyenne.rang,
    effectif
  ].join('|')
  await builder.drawVerificationQr(verificationPayload, docNum)

  builder.drawSignatureBlocks(
    [
      { title: 'Le Maître de classe', subtitle: 'Nom et signature' },
      { title: 'La Directrice', subtitle: 'Cachet et signature' }
    ],
    `Fait à Douala, le ${formatDate(new Date().toISOString())}`
  )

  return builder.build()
}

function appreciationFor(note: number): string {
  if (note >= 16) return 'Excellent niveau'
  if (note >= 14) return 'Très bon travail'
  if (note >= 12) return 'Bon ensemble'
  if (note >= 10) return 'Résultats satisfaisants'
  if (note >= 8) return 'Efforts à renforcer'
  return 'Accompagnement nécessaire'
}

function automaticGeneralAppreciation(average: number): string {
  if (average >= 16) return 'Performance remarquable. Félicitations pour l’excellence et la régularité du travail.'
  if (average >= 14) return 'Très bon trimestre. Les acquis sont solides et les efforts doivent être maintenus.'
  if (average >= 12) return 'Bon travail dans l’ensemble. Une progression régulière est observée.'
  if (average >= 10) return 'Résultats satisfaisants. Davantage de régularité permettra de progresser.'
  if (average >= 8) return 'Des efforts sont visibles, mais les apprentissages fondamentaux doivent être renforcés.'
  return 'Résultats insuffisants. Un accompagnement rapproché et un travail régulier sont nécessaires.'
}
