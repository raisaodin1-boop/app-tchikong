import { dialog } from 'electron'
import { generatePdf, getDefaultFilename, type PdfPayload } from './pdf'
import { printPdf, savePdf } from './pdf/print'
import type { DocumentType } from './pdf/config'

export interface PdfActionResult {
  success: boolean
  path?: string
  error?: string
  printed?: boolean
}

export async function handlePdfAction(
  payload: PdfPayload,
  action: 'save' | 'print' | 'both',
  identifier: string,
  dialogTitle?: string
): Promise<PdfActionResult> {
  try {
    const pdfBytes = await generatePdf(payload)
    const defaultName = getDefaultFilename(payload.type as DocumentType, identifier)

    if (action === 'print' || action === 'both') {
      const printed = await printPdf(pdfBytes, dialogTitle || defaultName)
      if (action === 'print') {
        return { success: printed, printed, error: printed ? undefined : 'Impression annulée' }
      }
    }

    if (action === 'save' || action === 'both') {
      const result = await dialog.showSaveDialog({
        title: dialogTitle || 'Enregistrer le document PDF',
        defaultPath: defaultName,
        filters: [{ name: 'Document PDF', extensions: ['pdf'] }]
      })

      if (!result.canceled && result.filePath) {
        await savePdf(pdfBytes, result.filePath)
        return {
          success: true,
          path: result.filePath,
          printed: action === 'both' ? true : undefined
        }
      }
      return { success: false, error: 'Enregistrement annulé' }
    }

    return { success: false, error: 'Action inconnue' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur de génération PDF'
    return { success: false, error: message }
  }
}

/** Impression directe sans dialogue de sauvegarde */
export async function handlePdfPrint(
  payload: PdfPayload,
  title?: string
): Promise<PdfActionResult> {
  try {
    const pdfBytes = await generatePdf(payload)
    const printed = await printPdf(pdfBytes, title)
    return { success: printed, printed, error: printed ? undefined : 'Impression annulée' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur de génération PDF'
    return { success: false, error: message }
  }
}

/** Sauvegarde rapide sans impression */
export async function handlePdfSave(
  payload: PdfPayload,
  identifier: string,
  title?: string
): Promise<PdfActionResult> {
  return handlePdfAction(payload, 'save', identifier, title)
}
