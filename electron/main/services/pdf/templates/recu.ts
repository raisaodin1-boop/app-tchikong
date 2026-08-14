import { PdfBuilder } from '../engine'
import { COLORS } from '../config'
import { formatDate, generateDocumentNumber } from '../utils'
import type { RecuData } from '../../finances'
import { MODE_PAIEMENT_LABELS } from '../../finances'

function formatMoney(n: number): string {
  const rounded = Math.round(Number(n) || 0)
  return `${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`
}

export async function templateRecuPaiement(data: RecuData): Promise<Uint8Array> {
  const docNum = data.paiement.numero_recu
  const builder = await PdfBuilder.create()
  builder.setMeta('Reçu de paiement', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle('REÇU DE PAIEMENT', `N° ${docNum}`)

  // Bloc montant en évidence
  builder.drawResultRow([
    { label: 'MONTANT REÇU', value: formatMoney(data.paiement.montant), color: COLORS.success },
    { label: 'MODE DE PAIEMENT', value: MODE_PAIEMENT_LABELS[data.paiement.mode_paiement] },
    { label: 'DATE', value: formatDate(data.paiement.date_paiement) }
  ])

  builder.drawInfoGrid([
    { label: 'Élève', value: `${data.eleve.nom} ${data.eleve.prenom}` },
    { label: 'Matricule', value: data.eleve.matricule },
    { label: 'Classe', value: `${data.eleve.classe_nom} (${data.eleve.section_code})` },
    { label: 'Année scolaire', value: data.annee_libelle },
    { label: 'Nature du paiement', value: data.libelle_frais },
    { label: 'Type', value: data.paiement.type_frais }
  ])

  if (data.paiement.notes) {
    builder.drawParagraph('Observations :', data.paiement.notes)
  }

  builder.drawHorizontalLine()
  builder.moveY(8)

  builder.drawResultRow([
    { label: 'Total dû (année)', value: formatMoney(data.situation.total_du) },
    { label: 'Total payé', value: formatMoney(data.situation.total_paye) },
    {
      label: 'Reste à payer',
      value: formatMoney(data.situation.reste),
      color: data.situation.reste > 0 ? COLORS.accent : COLORS.success
    }
  ])

  builder.drawParagraph(
    '',
    'Ce reçu atteste du paiement ci-dessus. Il doit être conservé par le payeur comme preuve de règlement. Toute réclamation doit être formulée dans les 48 heures suivant l\'émission du présent reçu.'
  )

  builder.drawSignatureBlocks(
    [
      { title: 'Le Payeur', subtitle: 'Signature' },
      { title: 'Le Caissier / Secrétariat', subtitle: 'Cachet et signature' }
    ],
    `Fait à Douala, le ${formatDate(data.paiement.date_paiement)}`
  )

  return builder.build()
}

export async function templateListeImpayes(
  anneeLibelle: string,
  impayes: {
    matricule: string
    nom: string
    prenom: string
    classe_nom: string
    telephone: string | null
    total_du: number
    total_paye: number
    reste: number
  }[]
): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('impayes')
  const totalReste = impayes.reduce((s, i) => s + i.reste, 0)

  const builder = await PdfBuilder.create()
  builder.setMeta('Liste des impayés', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle(
    'LISTE DES IMPAYÉS',
    `${anneeLibelle} — ${impayes.length} élève(s) — Total : ${formatMoney(totalReste)}`
  )

  builder.drawTable(
    [
      { header: 'Matricule', width: 75, align: 'left' },
      { header: 'Nom et Prénom', width: 140, align: 'left' },
      { header: 'Classe', width: 80, align: 'left' },
      { header: 'Téléphone', width: 80, align: 'left' },
      { header: 'Dû', width: 65, align: 'right' },
      { header: 'Payé', width: 65, align: 'right' },
      { header: 'Reste', width: 65, align: 'right' }
    ],
    impayes.map((i) => ({
      cells: [
        i.matricule,
        `${i.nom} ${i.prenom}`,
        i.classe_nom,
        i.telephone || '—',
        formatMoney(i.total_du),
        formatMoney(i.total_paye),
        formatMoney(i.reste)
      ],
      bold: false
    })),
    17
  )

  builder.drawSignatureBlocks([{ title: 'La Directrice', subtitle: 'Cachet et signature' }])

  return builder.build()
}
