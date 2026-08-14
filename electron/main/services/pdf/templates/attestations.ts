import type { AttestationData } from '../../documents'
import { PdfBuilder } from '../engine'
import { formatDate, generateDocumentNumber, sexeLabel, sexeNe, todayFormatted } from '../utils'

export async function templateAttestationScolarite(data: AttestationData): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('attestation_scolarite')

  const builder = await PdfBuilder.create()
  builder.setMeta('Attestation de scolarité', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle('ATTESTATION DE SCOLARITÉ', `Année scolaire ${data.annee_libelle}`)

  builder.drawAttestationBody([
    `Je soussignée, Directrice du Groupe Scolaire Bilingue Primaire et Maternelle TCHIKONG, atteste par la présente que :`,
    ``,
    `    ${sexeNe(data.eleve.sexe)} ${data.eleve.prenom} ${data.eleve.nom.toUpperCase()}, matricule ${data.eleve.matricule}, de sexe ${sexeLabel(data.eleve.sexe).toLowerCase()}, ${sexeNe(data.eleve.sexe).toLowerCase()} le ${formatDate(data.eleve.date_naissance)},`,
    ``,
    `est régulièrement inscrit(e) et suit les cours dans notre établissement pour l'année scolaire ${data.annee_libelle}, en classe de ${data.classe.nom} (section ${data.classe.section_nom}, niveau ${data.classe.niveau_nom}).`,
    ``,
    `En foi de quoi, la présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.`
  ])

  builder.drawSignatureBlocks(
    [{ title: 'La Directrice', subtitle: 'Cachet et signature' }],
    `Fait à Douala, le ${todayFormatted()}`
  )

  return builder.build()
}

export async function templateCertificatFrequentation(data: AttestationData): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('certificat_frequentation')
  const dateDebut = data.date_debut ? formatDate(data.date_debut) : formatDate(data.annee_debut)
  const dateFin = data.date_fin ? formatDate(data.date_fin) : 'à ce jour'

  const builder = await PdfBuilder.create()
  builder.setMeta('Certificat de fréquentation', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle('CERTIFICAT DE FRÉQUENTATION', `Année scolaire ${data.annee_libelle}`)

  builder.drawAttestationBody([
    `Je soussignée, Directrice du Groupe Scolaire Bilingue Primaire et Maternelle TCHIKONG, certifie que :`,
    ``,
    `    ${sexeNe(data.eleve.sexe)} ${data.eleve.prenom} ${data.eleve.nom.toUpperCase()}, matricule ${data.eleve.matricule},`,
    ``,
    `a fréquenté régulièrement notre établissement du ${dateDebut} au ${dateFin}, en classe de ${data.classe.nom} (section ${data.classe.section_nom}).`,
    ``,
    `Pendant cette période, l'élève a fait preuve d'assiduité et de bonne conduite.`,
    ``,
    `Le présent certificat est délivré à la demande de l'intéressé(e) pour servir et valoir ce que de droit.`
  ])

  builder.drawSignatureBlocks(
    [{ title: 'La Directrice', subtitle: 'Cachet et signature' }],
    `Fait à Douala, le ${todayFormatted()}`
  )

  return builder.build()
}

export async function templateAttestationReussite(data: AttestationData): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('attestation_reussite')

  const builder = await PdfBuilder.create()
  builder.setMeta('Attestation de réussite', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle('ATTESTATION DE RÉUSSITE', `Année scolaire ${data.annee_libelle}`)

  builder.drawAttestationBody([
    `Je soussignée, Directrice du Groupe Scolaire Bilingue Primaire et Maternelle TCHIKONG, atteste que :`,
    ``,
    `    ${sexeNe(data.eleve.sexe)} ${data.eleve.prenom} ${data.eleve.nom.toUpperCase()}, matricule ${data.eleve.matricule},`,
    ``,
    `inscrit(e) en classe de ${data.classe.nom} (section ${data.classe.section_nom}, niveau ${data.classe.niveau_nom}), a satisfait aux épreuves de fin d'année et est déclaré(e) admis(e) au niveau supérieur pour l'année scolaire prochaine.`,
    ``,
    `En foi de quoi, la présente attestation est délivrée pour servir et valoir ce que de droit.`
  ])

  builder.drawSignatureBlocks(
    [{ title: 'La Directrice', subtitle: 'Cachet et signature' }],
    `Fait à Douala, le ${todayFormatted()}`
  )

  return builder.build()
}

export async function templateCertificatRadiation(data: AttestationData): Promise<Uint8Array> {
  const docNum = generateDocumentNumber('certificat_radiation')

  const builder = await PdfBuilder.create()
  builder.setMeta('Certificat de radiation / transfert', docNum)

  builder.drawOfficialHeader()
  builder.drawDocumentTitle(
    'CERTIFICAT DE RADIATION',
    `Transfert scolaire  •  ${data.annee_libelle}`
  )

  builder.drawAttestationBody([
    `Je soussignée, Directrice du Groupe Scolaire Bilingue Primaire et Maternelle TCHIKONG, certifie que :`,
    ``,
    `    ${sexeNe(data.eleve.sexe)} ${data.eleve.prenom} ${data.eleve.nom.toUpperCase()}, matricule ${data.eleve.matricule}, de sexe ${sexeLabel(data.eleve.sexe).toLowerCase()}, ${sexeNe(data.eleve.sexe).toLowerCase()} le ${formatDate(data.eleve.date_naissance)},`,
    ``,
    `était régulièrement inscrit(e) dans notre établissement en classe de ${data.classe.nom} (section ${data.classe.section_nom}, niveau ${data.classe.niveau_nom}) pour l'année scolaire ${data.annee_libelle}.`,
    ``,
    `L'élève est radié(e) des effectifs à compter de ce jour. Le présent certificat de radiation / transfert est délivré pour permettre son inscription dans un autre établissement et pour servir et valoir ce que de droit.`
  ])

  builder.drawSignatureBlocks(
    [{ title: 'La Directrice', subtitle: 'Cachet et signature' }],
    `Fait à Douala, le ${todayFormatted()}`
  )

  return builder.build()
}
