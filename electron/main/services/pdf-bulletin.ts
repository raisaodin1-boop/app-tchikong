import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { BulletinData, EleveMoyenne } from './scolarite'
import type { PeriodeEvaluation } from '../../../shared/types'

const SCHOOL_NAME = 'GROUPE SCOLAIRE BILINGUE PRIMAIRE ET MATERNELLE TCHIKONG'
const SCHOOL_ADDRESS = 'Douala, Cameroun'
const SCHOOL_PHONE = 'Tél: +237 6XX XXX XXX'

const mentionLabels: Record<string, string> = {
  felicitations: 'Félicitations',
  encouragements: 'Encouragements',
  avertissement: 'Avertissement',
  blame: 'Blâme',
  aucune: '—'
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR')
  } catch {
    return dateStr
  }
}

export async function generateBulletinPdf(data: BulletinData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  const margin = 50
  let y = height - margin

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    size = 10,
    bold = false,
    color = rgb(0, 0, 0)
  ) => {
    page.drawText(text, { x, y: yPos, size, font: bold ? fontBold : font, color })
  }

  const drawLine = (yPos: number) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7)
    })
  }

  // En-tête
  drawText('RÉPUBLIQUE DU CAMEROUN', width / 2 - 80, y, 9, true)
  y -= 14
  drawText('Paix - Travail - Patrie', width / 2 - 55, y, 8)
  y -= 24

  drawText(SCHOOL_NAME, margin, y, 11, true, rgb(0.12, 0.25, 0.69))
  y -= 14
  drawText(SCHOOL_ADDRESS, margin, y, 8)
  y -= 12
  drawText(SCHOOL_PHONE, margin, y, 8)
  y -= 20

  drawLine(y)
  y -= 20

  drawText('BULLETIN DE NOTES', width / 2 - 55, y, 14, true)
  y -= 18
  drawText(`${data.periode.libelle} — Année scolaire ${data.annee_libelle}`, width / 2 - 90, y, 9)
  y -= 24

  // Infos élève
  drawText(`Nom : ${data.eleve.nom}`, margin, y, 10, true)
  drawText(`Prénom : ${data.eleve.prenom}`, width / 2, y, 10, true)
  y -= 16
  drawText(`Matricule : ${data.eleve.matricule}`, margin, y, 9)
  drawText(`Classe : ${data.classe.nom} (${data.classe.section_code})`, width / 2, y, 9)
  y -= 14
  drawText(`Niveau : ${data.classe.niveau_nom}`, margin, y, 9)
  drawText(`Né(e) le : ${formatDate(data.eleve.date_naissance)}`, width / 2, y, 9)
  y -= 20

  drawLine(y)
  y -= 16

  // Tableau des notes
  const colMatiere = margin
  const colCoef = 280
  const colNote = 330
  const colSur20 = 400
  const colApp = 460

  drawText('Matière', colMatiere, y, 9, true)
  drawText('Coef.', colCoef, y, 9, true)
  drawText('Note', colNote, y, 9, true)
  drawText('/20', colSur20, y, 9, true)
  y -= 4
  drawLine(y)
  y -= 14

  for (const d of data.moyenne.details) {
    drawText(d.matiere_nom, colMatiere, y, 9)
    drawText(String(d.coefficient), colCoef, y, 9)
    drawText(`${d.valeur}/${d.note_sur}`, colNote, y, 9)
    drawText(d.note_sur_20.toFixed(2), colSur20, y, 9)
    y -= 14
    if (y < 200) break
  }

  y -= 8
  drawLine(y)
  y -= 18

  // Résultats
  drawText(`Moyenne générale : ${data.moyenne.moyenne.toFixed(2)} / 20`, margin, y, 11, true)
  const effectif = data.bulletin?.effectif_classe || data.moyenne.details.length
  drawText(`Rang : ${data.moyenne.rang}e / ${effectif}`, width / 2, y, 11, true)
  y -= 16
  drawText(`Mention : ${mentionLabels[data.moyenne.mention] || data.moyenne.mention}`, margin, y, 10, true)
  y -= 24

  if (data.appreciation_maitre) {
    drawText('Appréciation du maître :', margin, y, 9, true)
    y -= 14
    const words = data.appreciation_maitre.split(' ')
    let line = ''
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word
      if (test.length > 70) {
        drawText(line, margin, y, 9)
        y -= 12
        line = word
      } else {
        line = test
      }
    }
    if (line) drawText(line, margin, y, 9)
    y -= 20
  }

  y = 120
  drawLine(y)
  y -= 16
  drawText('Le Directeur', width - margin - 80, y, 9)
  drawText('Le Maître de classe', margin, y, 9)

  y -= 40
  drawText(`Document généré le ${formatDate(new Date().toISOString())}`, margin, y, 7, false, rgb(0.5, 0.5, 0.5))

  return doc.save()
}

export async function generatePalmaresPdf(
  classeNom: string,
  periode: PeriodeEvaluation,
  anneeLibelle: string,
  palmares: EleveMoyenne[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  const margin = 50
  let y = height - margin

  const drawText = (text: string, x: number, yPos: number, size = 10, bold = false) => {
    page.drawText(text, { x, y: yPos, size, font: bold ? fontBold : font })
  }

  drawText(SCHOOL_NAME, margin, y, 10, true)
  y -= 20
  drawText(`PALMARÈS DE CLASSE — ${classeNom}`, margin, y, 12, true)
  y -= 16
  drawText(`${periode.libelle} — ${anneeLibelle}`, margin, y, 9)
  y -= 24

  drawText('Rang', margin, y, 9, true)
  drawText('Matricule', margin + 40, y, 9, true)
  drawText('Nom et Prénom', margin + 120, y, 9, true)
  drawText('Moyenne', margin + 350, y, 9, true)
  drawText('Mention', margin + 420, y, 9, true)
  y -= 14

  for (const p of palmares) {
    drawText(`${p.rang}`, margin, y, 9)
    drawText(p.matricule, margin + 40, y, 8)
    drawText(`${p.nom} ${p.prenom}`, margin + 120, y, 9)
    drawText(p.moyenne.toFixed(2), margin + 350, y, 9)
    drawText(mentionLabels[p.mention] || p.mention, margin + 420, y, 8)
    y -= 14
    if (y < 80) break
  }

  return doc.save()
}
