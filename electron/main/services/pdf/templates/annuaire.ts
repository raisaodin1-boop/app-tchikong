import { PdfBuilder } from '../engine'
import { generateDocumentNumber, todayFormatted } from '../utils'
import type { AnnuaireClasseData } from '../../documents'

export async function templateAnnuaireClasse(data: AnnuaireClasseData): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('annuaire_classe')

  const builder = await PdfBuilder.create()
  builder.setMeta('Annuaire des parents', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle(
    'ANNUAIRE DES PARENTS',
    `${data.classe_nom} (${data.section_code}) — ${data.annee_libelle} — Effectif : ${data.effectif}${
      data.titulaire_nom ? ` — Maître : ${data.titulaire_nom}` : ''
    }`
  )

  builder.drawTable(
    [
      { header: 'N°', width: 28, align: 'center' },
      { header: 'Matricule', width: 72, align: 'left' },
      { header: 'Élève', width: 130, align: 'left' },
      { header: 'Parents / téléphones', width: 255, align: 'left' }
    ],
    data.eleves.map((e) => ({
      cells: [
        String(e.numero),
        e.matricule,
        `${e.nom} ${e.prenom}`,
        e.contacts || '—'
      ]
    })),
    18
  )

  builder.drawSignatureBlocks(
    [
      { title: 'Le Maître de classe', subtitle: data.titulaire_nom || 'Signature' },
      { title: 'La Directrice', subtitle: 'Cachet et signature' }
    ],
    `Fait à Douala, le ${todayFormatted()}`
  )

  return builder.build()
}
