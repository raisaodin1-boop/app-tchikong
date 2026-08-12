import { rgb, type RGB } from 'pdf-lib'

/** Dimensions A4 en points (72 dpi) — format standard imprimante */
export const A4 = { width: 595.28, height: 841.89 }

export const MARGINS = {
  top: 45,
  bottom: 50,
  left: 50,
  right: 50
}

export const SCHOOL = {
  name: 'GROUPE SCOLAIRE BILINGUE',
  subtitle: 'PRIMAIRE ET MATERNELLE TCHIKONG',
  address: 'Quartier Nkomo, Douala — Cameroun',
  phone: 'Tél : +237 6XX XXX XXX',
  email: 'contact@tchikong.cm',
  bp: 'B.P. XXXX Douala'
}

export const COLORS = {
  primary: rgb(0.12, 0.25, 0.69) as RGB,       // Bleu TCHIKONG
  primaryLight: rgb(0.85, 0.9, 0.98) as RGB,
  accent: rgb(0.83, 0.63, 0.09) as RGB,         // Or
  text: rgb(0.1, 0.1, 0.1) as RGB,
  textMuted: rgb(0.45, 0.45, 0.45) as RGB,
  border: rgb(0.75, 0.75, 0.75) as RGB,
  borderLight: rgb(0.9, 0.9, 0.9) as RGB,
  tableHeader: rgb(0.12, 0.25, 0.69) as RGB,
  tableHeaderText: rgb(1, 1, 1) as RGB,
  tableRowAlt: rgb(0.97, 0.97, 0.99) as RGB,
  success: rgb(0.09, 0.64, 0.29) as RGB,
  white: rgb(1, 1, 1) as RGB
}

export const MENTION_COLORS: Record<string, RGB> = {
  felicitations: rgb(0.09, 0.64, 0.29),
  encouragements: rgb(0.12, 0.25, 0.69),
  avertissement: rgb(0.85, 0.55, 0.05),
  blame: rgb(0.86, 0.15, 0.15),
  aucune: rgb(0.5, 0.5, 0.5)
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
