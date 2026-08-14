import { PDFDocument } from 'pdf-lib'
import type { DocumentType } from './config'
import { templateBulletin } from './templates/bulletin'
import { templatePalmares } from './templates/palmares'
import {
  templateAttestationScolarite,
  templateCertificatFrequentation,
  templateAttestationReussite,
  templateCertificatRadiation
} from './templates/attestations'
import { templateListeClasse } from './templates/liste-classe'
import { templateAnnuaireClasse } from './templates/annuaire'
import { templateRecuPaiement, templateListeImpayes } from './templates/recu'
import { templateCaisseJournaliere } from './templates/caisse'
import type { BulletinData } from '../scolarite'
import type { AttestationData, AnnuaireClasseData } from '../documents'
import type { EleveMoyenne } from '../scolarite'
import type { CaisseJournaliere, PeriodeEvaluation } from '../../../../shared/types'
import type { ListeClasseData } from './templates/liste-classe'
import type { RecuData } from '../finances'
import { todayIso } from './utils'

export type PdfPayload =
  | { type: 'bulletin'; data: BulletinData }
  | { type: 'bulletins_classe'; data: { items: BulletinData[] } }
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
  | { type: 'certificat_radiation'; data: AttestationData }
  | { type: 'liste_classe'; data: ListeClasseData }
  | { type: 'annuaire_classe'; data: AnnuaireClasseData }
  | { type: 'recu_paiement'; data: RecuData }
  | {
      type: 'liste_impayes'
      data: { anneeLibelle: string; impayes: ListeImpayesItem[] }
    }
  | { type: 'caisse_journaliere'; data: CaisseJournaliere }

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

async function mergePdfBuffers(buffers: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()
  for (const bytes of buffers) {
    const src = await PDFDocument.load(bytes)
    const pages = await merged.copyPages(src, src.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }
  return merged.save()
}

export async function generatePdf(payload: PdfPayload): Promise<Uint8Array> {
  switch (payload.type) {
    case 'bulletin':
      return templateBulletin(payload.data)
    case 'bulletins_classe': {
      if (payload.data.items.length === 0) {
        throw new Error('Aucun bulletin à imprimer. Générez d’abord les bulletins.')
      }
      const parts = await Promise.all(payload.data.items.map((item) => templateBulletin(item)))
      return mergePdfBuffers(parts)
    }
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
    case 'certificat_radiation':
      return templateCertificatRadiation(payload.data)
    case 'liste_classe':
      return templateListeClasse(payload.data)
    case 'annuaire_classe':
      return templateAnnuaireClasse(payload.data)
    case 'recu_paiement':
      return templateRecuPaiement(payload.data)
    case 'liste_impayes':
      return templateListeImpayes(payload.data.anneeLibelle, payload.data.impayes)
    case 'caisse_journaliere':
      return templateCaisseJournaliere(payload.data)
    default:
      throw new Error(`Type de document inconnu: ${(payload as { type: string }).type}`)
  }
}

export function getDefaultFilename(type: DocumentType, identifier: string): string {
  const date = todayIso()
  const names: Record<DocumentType, string> = {
    bulletin: `bulletin-${identifier}-${date}.pdf`,
    bulletins_classe: `bulletins-${identifier}-${date}.pdf`,
    palmares: `palmares-${identifier}-${date}.pdf`,
    attestation_scolarite: `attestation-scolarite-${identifier}-${date}.pdf`,
    certificat_frequentation: `certificat-frequentation-${identifier}-${date}.pdf`,
    attestation_reussite: `attestation-reussite-${identifier}-${date}.pdf`,
    certificat_radiation: `certificat-radiation-${identifier}-${date}.pdf`,
    liste_classe: `liste-classe-${identifier}-${date}.pdf`,
    annuaire_classe: `annuaire-parents-${identifier}-${date}.pdf`,
    recu_paiement: `recu-${identifier}-${date}.pdf`,
    liste_impayes: `impayes-${identifier}-${date}.pdf`,
    caisse_journaliere: `caisse-${identifier}-${date}.pdf`
  }
  return names[type] || `document-${date}.pdf`
}

// Rétrocompatibilité
export { templateBulletin as generateBulletinPdf } from './templates/bulletin'
export { templatePalmares as generatePalmaresPdf } from './templates/palmares'
