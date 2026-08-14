import { PdfBuilder } from '../engine'
import { generateDocumentNumber, formatDateShort, todayFormatted } from '../utils'

export interface ListeClasseData {
  classe_nom: string
  section_code: string
  annee_libelle: string
  effectif: number
  titulaire_nom?: string | null
  eleves: {
    numero: number
    matricule: string
    nom: string
    prenom: string
    sexe: string
    date_naissance: string
  }[]
}

export async function templateListeClasse(data: ListeClasseData): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('liste_classe')

  const builder = await PdfBuilder.create()
  builder.setMeta('Liste de classe', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle(
    'LISTE DE CLASSE',
    `${data.classe_nom} (${data.section_code}) — ${data.annee_libelle} — Effectif : ${data.effectif}${
      data.titulaire_nom ? ` — Maître : ${data.titulaire_nom}` : ''
    }`
  )

  builder.drawTable(
    [
      { header: 'N°', width: 30, align: 'center' },
      { header: 'Matricule', width: 90, align: 'left' },
      { header: 'Nom', width: 120, align: 'left' },
      { header: 'Prénom', width: 110, align: 'left' },
      { header: 'Sexe', width: 45, align: 'center' },
      { header: 'Date de naissance', width: 90, align: 'center' }
    ],
    data.eleves.map((e) => ({
      cells: [
        String(e.numero),
        e.matricule,
        e.nom,
        e.prenom,
        e.sexe === 'F' ? 'F' : 'M',
        formatDateShort(e.date_naissance)
      ]
    })),
    17
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
