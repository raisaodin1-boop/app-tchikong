import { COLORS, MENTION_COLORS, MENTION_LABELS } from '../config'
import { PdfBuilder } from '../engine'
import { formatDate, generateDocumentNumber, ordinalFr } from '../utils'
import type { BulletinData } from '../../scolarite'

export async function templateBulletin(data: BulletinData): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('bulletin')
  const effectif = data.bulletin?.effectif_classe || data.moyenne.details.length

  const builder = await PdfBuilder.create()
  builder.setMeta('Bulletin de notes', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle(
    'BULLETIN DE NOTES',
    `${data.periode.libelle} — Année scolaire ${data.annee_libelle}`
  )

  builder.drawInfoGrid([
    { label: 'Nom', value: data.eleve.nom.toUpperCase() },
    { label: 'Prénom', value: data.eleve.prenom },
    { label: 'Matricule', value: data.eleve.matricule },
    { label: 'Classe', value: `${data.classe.nom} (${data.classe.section_code})` },
    { label: 'Niveau', value: data.classe.niveau_nom },
    { label: 'Date de naissance', value: formatDate(data.eleve.date_naissance) }
  ])

  builder.drawTable(
    [
      { header: 'Matière', width: 200, align: 'left' },
      { header: 'Coef.', width: 45, align: 'center' },
      { header: 'Note', width: 55, align: 'center' },
      { header: 'Note /20', width: 60, align: 'center' },
      { header: 'Appréciation', width: 130, align: 'left' }
    ],
    data.moyenne.details.map((d) => ({
      cells: [
        d.matiere_nom,
        String(d.coefficient),
        `${d.valeur}/${d.note_sur}`,
        d.note_sur_20.toFixed(2),
        ''
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

  if (data.appreciation_maitre) {
    builder.drawParagraph('Appréciation du maître de classe :', data.appreciation_maitre)
  }

  builder.drawSignatureBlocks(
    [
      { title: 'Le Maître de classe', subtitle: 'Nom et signature' },
      { title: 'La Directrice', subtitle: 'Cachet et signature' }
    ],
    `Fait à Douala, le ${formatDate(new Date().toISOString())}`
  )

  return builder.build()
}
