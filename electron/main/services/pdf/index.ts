import type { DocumentType } from './config'
import { templateBulletin } from './templates/bulletin'
import { templatePalmares } from './templates/palmares'
import {
  templateAttestationScolarite,
  templateCertificatFrequentation,
  templateAttestationReussite
} from './templates/attestations'
import { templateListeClasse } from './templates/liste-classe'
import { templateRecuPaiement, templateListeImpayes } from './templates/recu'
import type { BulletinData } from '../scolarite'
import type { AttestationData } from '../documents'
import type { EleveMoyenne } from '../scolarite'
import type { PeriodeEvaluation } from '../../../shared/types'
import type { ListeClasseData } from './templates/liste-classe'
import type { RecuData } from '../finances'

export type PdfPayload =
  | { type: 'bulletin'; data: BulletinData }
  | {
      type: 'palmares'
      data: {
        classeNom: string
        periode: PeriodeEvaluation
        anneeLibelle: string
        palmares: EleveMoyenne[]
      }
    }
  | { type: 'attestation_scolarite'; data: AttestationData }
  | { type: 'certificat_frequentation'; data: AttestationData }
  | { type: 'attestation_reussite'; data: AttestationData }
  | { type: 'liste_classe'; data: ListeClasseData }
  | { type: 'recu_paiement'; data: RecuData }
  | {
      type: 'liste_impayes'
      data: { anneeLibelle: string; impayes: ListeImpayesItem[] }
    }

export interface ListeImpayesItem {
  matricule: string
  nom: string
  prenom: string
  classe_nom: string
  telephone: string | null
  total_du: number
  total_paye: number
  reste: number
}

export async function generatePdf(payload: PdfPayload): Promise<Uint8Array> {
  switch (payload.type) {
    case 'bulletin':
      return templateBulletin(payload.data)
    case 'palmares':
      return templatePalmares(
        payload.data.classeNom,
        payload.data.periode,
        payload.data.anneeLibelle,
        payload.data.palmares
      )
    case 'attestation_scolarite':
      return templateAttestationScolarite(payload.data)
    case 'certificat_frequentation':
      return templateCertificatFrequentation(payload.data)
    case 'attestation_reussite':
      return templateAttestationReussite(payload.data)
    case 'liste_classe':
      return templateListeClasse(payload.data)
    case 'recu_paiement':
      return templateRecuPaiement(payload.data)
    case 'liste_impayes':
      return templateListeImpayes(payload.data.anneeLibelle, payload.data.impayes)
    default:
      throw new Error(`Type de document inconnu: ${(payload as { type: string }).type}`)
  }
}

export function getDefaultFilename(type: DocumentType, identifier: string): string {
  const date = new Date().toISOString().slice(0, 10)
  const names: Record<DocumentType, string> = {
    bulletin: `bulletin-${identifier}-${date}.pdf`,
    palmares: `palmares-${identifier}-${date}.pdf`,
    attestation_scolarite: `attestation-scolarite-${identifier}-${date}.pdf`,
    certificat_frequentation: `certificat-frequentation-${identifier}-${date}.pdf`,
    attestation_reussite: `attestation-reussite-${identifier}-${date}.pdf`,
    liste_classe: `liste-classe-${identifier}-${date}.pdf`,
    recu_paiement: `recu-${identifier}-${date}.pdf`,
    liste_impayes: `impayes-${identifier}-${date}.pdf`
  }
  return names[type] || `document-${date}.pdf`
}

// Rétrocompatibilité
export { templateBulletin as generateBulletinPdf } from './templates/bulletin'
export { templatePalmares as generatePalmaresPdf } from './templates/palmares'
