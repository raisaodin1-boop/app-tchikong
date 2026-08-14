import { PdfBuilder } from '../engine'
import { COLORS } from '../config'
import { formatDate, generateDocumentNumber, todayFormatted } from '../utils'
import type { CaisseJournaliere } from '../../../../../shared/types'
import { MODE_PAIEMENT_LABELS, TYPE_FRAIS_LABELS } from '../../finances'

function formatMoney(n: number): string {
  const rounded = Math.round(Number(n) || 0)
  return `${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`
}

export async function templateCaisseJournaliere(data: CaisseJournaliere): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('caisse_journaliere')
  const builder = await PdfBuilder.create()
  builder.setMeta('Caisse journalière', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle(
    'CAISSE JOURNALIÈRE',
    `${data.annee_libelle}  •  ${formatDate(data.date)}  •  ${data.nombre_recus} reçu(s)`
  )

  builder.drawHeroAmount('TOTAL ENCAISSÉ', formatMoney(data.total_encaisse))

  builder.drawResultRow([
    { label: 'ESPÈCES', value: formatMoney(data.especes) },
    { label: 'AUTRES MODES', value: formatMoney(data.autres_modes) },
    {
      label: 'ANNULÉS',
      value: `${data.nombre_annules} / ${formatMoney(data.total_annule)}`,
      color: data.nombre_annules > 0 ? COLORS.danger : COLORS.success
    }
  ])

  builder.drawTable(
    [
      { header: 'Mode de paiement', width: 180, align: 'left' },
      { header: 'Nb', width: 70, align: 'center' },
      { header: 'Montant', width: 245, align: 'right' }
    ],
    data.par_mode.map((row) => ({
      cells: [row.libelle, String(row.nombre), formatMoney(row.montant)]
    })),
    18
  )

  if (data.par_type.length > 0) {
    builder.drawTable(
      [
        { header: 'Nature des frais', width: 180, align: 'left' },
        { header: 'Nb', width: 70, align: 'center' },
        { header: 'Montant', width: 245, align: 'right' }
      ],
      data.par_type.map((row) => ({
        cells: [row.libelle, String(row.nombre), formatMoney(row.montant)]
      })),
      18
    )
  }

  const lignes = data.paiements.filter((p) => !p.annule)
  if (lignes.length > 0) {
    builder.drawTable(
      [
        { header: 'N° reçu', width: 88, align: 'left' },
        { header: 'Élève', width: 130, align: 'left' },
        { header: 'Classe', width: 70, align: 'left' },
        { header: 'Mode', width: 85, align: 'left' },
        { header: 'Montant', width: 122, align: 'right' }
      ],
      lignes.map((p) => ({
        cells: [
          p.numero_recu,
          `${p.nom} ${p.prenom}`,
          p.classe_nom || '—',
          MODE_PAIEMENT_LABELS[p.mode_paiement],
          formatMoney(p.montant)
        ]
      })),
      16
    )
  }

  if (data.nombre_annules > 0) {
    builder.drawParagraph(
      'Paiements annulés',
      data.paiements
        .filter((p) => p.annule)
        .map(
          (p) =>
            `${p.numero_recu} — ${p.nom} ${p.prenom} — ${formatMoney(p.montant)} (${TYPE_FRAIS_LABELS[p.type_frais]})`
        )
        .join('  •  ')
    )
  }

  builder.drawSignatureBlocks(
    [
      { title: 'Le Caissier / Secrétariat', subtitle: 'Signature' },
      { title: 'La Directrice', subtitle: 'Cachet et visa' }
    ],
    `Arrêté à ${formatMoney(data.total_encaisse)}  •  Douala, le ${todayFormatted()}`
  )

  return builder.build()
}
