import { rgb, type RGB } from 'pdf-lib'

/** Dimensions A4 en points (72 dpi) — format standard imprimante */
export const A4 = { width: 595.28, height: 841.89 }

export const MARGINS = {
  top: 48,
  bottom: 52,
  left: 48,
  right: 48
}

export const SCHOOL = {
  name: 'GROUPE SCOLAIRE BILINGUE',
  subtitle: 'PRIMAIRE ET MATERNELLE TCHIKONG',
  address: 'Passage à niveau Nyalla Rail, Douala — Cameroun',
  phone: 'Tél. : 676379007 / 689688435',
  email: '',
  bp: ''
}

/** Couleurs officielles : bleu roi + jaune */
export const COLORS = {
  primary: rgb(0.0, 0.165, 0.545) as RGB,
  primaryDeep: rgb(0.02, 0.08, 0.32) as RGB,
  primaryMid: rgb(0.1, 0.28, 0.72) as RGB,
  primaryLight: rgb(0.93, 0.95, 0.99) as RGB,
  accent: rgb(0.96, 0.78, 0.08) as RGB,
  accentDark: rgb(0.78, 0.58, 0.02) as RGB,
  accentSoft: rgb(1, 0.96, 0.82) as RGB,
  text: rgb(0.08, 0.1, 0.18) as RGB,
  textMuted: rgb(0.38, 0.4, 0.48) as RGB,
  border: rgb(0.72, 0.76, 0.86) as RGB,
  borderLight: rgb(0.88, 0.9, 0.94) as RGB,
  tableHeader: rgb(0.0, 0.165, 0.545) as RGB,
  tableHeaderText: rgb(1, 1, 1) as RGB,
  tableRowAlt: rgb(0.95, 0.96, 0.99) as RGB,
  success: rgb(0.07, 0.55, 0.3) as RGB,
  danger: rgb(0.78, 0.14, 0.16) as RGB,
  white: rgb(1, 1, 1) as RGB,
  cream: rgb(0.99, 0.98, 0.95) as RGB,
  watermark: rgb(0.91, 0.93, 0.97) as RGB
}

export const MENTION_COLORS: Record<string, RGB> = {
  felicitations: rgb(0.07, 0.55, 0.3),
  encouragements: rgb(0.96, 0.78, 0.08),
  avertissement: rgb(0.85, 0.5, 0.05),
  blame: rgb(0.78, 0.14, 0.16),
  aucune: rgb(0.85, 0.88, 0.95)
}

export const MENTION_LABELS: Record<string, string> = {
  felicitations: 'Félicitations',
  encouragements: 'Encouragements',
  avertissement: 'Avertissement',
  blame: 'Blâme',
  aucune: '—'
}

export type DocumentType =
  | 'bulletin'
  | 'palmares'
  | 'attestation_scolarite'
  | 'certificat_frequentation'
  | 'attestation_reussite'
  | 'liste_classe'
  | 'recu_paiement'
  | 'liste_impayes'

export const DOCUMENT_TITLES: Record<DocumentType, string> = {
  bulletin: 'BULLETIN DE NOTES',
  palmares: 'PALMARÈS DE CLASSE',
  attestation_scolarite: 'ATTESTATION DE SCOLARITÉ',
  certificat_frequentation: 'CERTIFICAT DE FRÉQUENTATION',
  attestation_reussite: 'ATTESTATION DE RÉUSSITE',
  liste_classe: 'LISTE DE CLASSE',
  recu_paiement: 'REÇU DE PAIEMENT',
  liste_impayes: 'LISTE DES IMPAYÉS'
}
