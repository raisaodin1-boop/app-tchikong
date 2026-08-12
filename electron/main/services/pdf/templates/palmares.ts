import { PdfBuilder } from '../engine'
import { generateDocumentNumber, ordinalFr } from '../utils'
import { MENTION_LABELS } from '../config'
import type { EleveMoyenne } from '../../scolarite'
import type { PeriodeEvaluation } from '../../../../../shared/types'

export async function templatePalmares(
  classeNom: string,
  periode: PeriodeEvaluation,
  anneeLibelle: string,
  palmares: EleveMoyenne[]
): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('palmares')
  const moyenneClasse =
    palmares.length > 0
      ? palmares.reduce((s, p) => s + p.moyenne, 0) / palmares.length
      : 0

  const builder = await PdfBuilder.create()
  builder.setMeta('Palmarès de classe', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle(
    'PALMARÈS DE CLASSE',
    `${classeNom} — ${periode.libelle} — ${anneeLibelle}`
  )

  builder.drawResultRow([
    { label: 'EFFECTIF CLASSÉ', value: String(palmares.length) },
    { label: 'MOYENNE DE CLASSE', value: `${moyenneClasse.toFixed(2)} / 20` },
    {
      label: 'MEILLEURE MOYENNE',
      value: palmares[0] ? `${palmares[0].moyenne.toFixed(2)} / 20` : '—'
    }
  ])

  builder.drawTable(
    [
      { header: 'Rang', width: 45, align: 'center' },
      { header: 'Matricule', width: 85, align: 'left' },
      { header: 'Nom et Prénom', width: 200, align: 'left' },
      { header: 'Moyenne /20', width: 75, align: 'center' },
      { header: 'Mention', width: 100, align: 'center' }
    ],
    palmares.map((p, i) => ({
      cells: [
        ordinalFr(p.rang),
        p.matricule,
        `${p.nom} ${p.prenom}`,
        p.moyenne.toFixed(2),
        MENTION_LABELS[p.mention] || p.mention
      ],
      highlight: i < 3,
      bold: i < 3
    })),
    20
  )

  builder.drawSignatureBlocks(
    [{ title: 'La Directrice', subtitle: 'Cachet et signature' }],
    `Fait à Douala, le ${new Date().toLocaleDateString('fr-FR')}`
  )

  return builder.build()
}
