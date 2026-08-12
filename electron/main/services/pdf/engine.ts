import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  type RGB
} from 'pdf-lib'
import QRCode from 'qrcode'
import { A4, MARGINS, SCHOOL, COLORS } from './config'
import { todayFormatted } from './utils'

export interface TableColumn {
  header: string
  width: number
  align?: 'left' | 'center' | 'right'
}

export interface TableRow {
  cells: string[]
  bold?: boolean
  highlight?: boolean
}

export class PdfBuilder {
  private doc: PDFDocument
  private font!: PDFFont
  private fontBold!: PDFFont
  private page!: PDFPage
  private y = 0
  private pageNum = 0
  private documentTitle = ''
  private documentNumber = ''
  private contentWidth: number

  private constructor(doc: PDFDocument) {
    this.doc = doc
    this.contentWidth = A4.width - MARGINS.left - MARGINS.right
  }

  static async create(): Promise<PdfBuilder> {
    const doc = await PDFDocument.create()
    doc.setTitle('Document TCHIKONG')
    doc.setProducer('TCHIKONG Gestion Scolaire')
    doc.setCreator('Groupe Scolaire Bilingue TCHIKONG')

    const builder = new PdfBuilder(doc)
    builder.font = await doc.embedFont(StandardFonts.Helvetica)
    builder.fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
    builder.addPage()
    return builder
  }

  setMeta(title: string, documentNumber: string): this {
    this.documentTitle = title
    this.documentNumber = documentNumber
    this.doc.setTitle(title)
    return this
  }

  addPage(): this {
    this.page = this.doc.addPage([A4.width, A4.height])
    this.pageNum++
    this.y = A4.height - MARGINS.top
    this.drawPageBorder()
    return this
  }

  getY(): number {
    return this.y
  }

  setY(y: number): this {
    this.y = y
    return this
  }

  moveY(delta: number): this {
    this.y -= delta
    return this
  }

  ensureSpace(needed: number): this {
    if (this.y - needed < MARGINS.bottom + 30) {
      this.drawFooter()
      this.addPage()
      this.drawCompactHeader()
    }
    return this
  }

  private drawPageBorder(): void {
    const inset = 20
    this.page.drawRectangle({
      x: inset,
      y: inset,
      width: A4.width - inset * 2,
      height: A4.height - inset * 2,
      borderColor: COLORS.primary,
      borderWidth: 1.5
    })
    this.page.drawRectangle({
      x: inset + 3,
      y: inset + 3,
      width: A4.width - inset * 2 - 6,
      height: A4.height - inset * 2 - 6,
      borderColor: COLORS.accent,
      borderWidth: 0.5
    })
  }

  /** En-tête officiel complet (première page) */
  drawOfficialHeader(): this {
    const cx = A4.width / 2

    // Bandeau supérieur
    this.page.drawRectangle({
      x: MARGINS.left,
      y: A4.height - MARGINS.top - 5,
      width: this.contentWidth,
      height: 3,
      color: COLORS.primary
    })

    // République du Cameroun
    this.drawCentered('RÉPUBLIQUE DU CAMEROUN', cx, this.y, 9, true, COLORS.text)
    this.moveY(12)
    this.drawCentered('Paix — Travail — Patrie', cx, this.y, 8, false, COLORS.textMuted)
    this.moveY(12)
    this.drawCentered('********', cx, this.y, 8, false, COLORS.accent)
    this.moveY(18)

    // Ministère
    this.drawCentered('MINISTÈRE DE L’ÉDUCATION DE BASE', cx, this.y, 8, true)
    this.moveY(11)
    this.drawCentered('DÉLÉGATION RÉGIONALE DU LITTORAL', cx, this.y, 7)
    this.moveY(16)

    // École — bloc central
    const boxY = this.y - 50
    this.page.drawRectangle({
      x: MARGINS.left + 40,
      y: boxY,
      width: this.contentWidth - 80,
      height: 52,
      color: COLORS.primaryLight,
      borderColor: COLORS.primary,
      borderWidth: 1
    })

    this.drawCentered(SCHOOL.name, cx, this.y - 14, 11, true, COLORS.primary)
    this.drawCentered(SCHOOL.subtitle, cx, this.y - 28, 10, true, COLORS.primary)
    this.drawCentered(SCHOOL.address, cx, this.y - 40, 8, false, COLORS.textMuted)
    const contacts = [SCHOOL.phone, SCHOOL.email].filter(Boolean).join('  |  ')
    if (contacts) {
      this.drawCentered(contacts, cx, this.y - 50, 7, false, COLORS.textMuted)
    }

    this.y = boxY - 16
    return this
  }

  /** En-tête compact pour pages suivantes */
  drawCompactHeader(): this {
    this.page.drawRectangle({
      x: MARGINS.left,
      y: A4.height - MARGINS.top - 2,
      width: this.contentWidth,
      height: 22,
      color: COLORS.primaryLight
    })
    this.drawText(`${SCHOOL.subtitle}`, MARGINS.left + 8, A4.height - MARGINS.top + 2, 8, true, COLORS.primary)
    if (this.documentTitle) {
      const tw = this.font.widthOfTextAtSize(this.documentTitle, 8)
      this.drawText(this.documentTitle, A4.width - MARGINS.right - tw - 8, A4.height - MARGINS.top + 2, 8, false, COLORS.textMuted)
    }
    this.y = A4.height - MARGINS.top - 30
    return this
  }

  drawDocumentTitle(title: string, subtitle?: string): this {
    this.ensureSpace(50)
    const cx = A4.width / 2
    const tw = this.fontBold.widthOfTextAtSize(title, 14)
    this.page.drawRectangle({
      x: cx - tw / 2 - 16,
      y: this.y - 18,
      width: tw + 32,
      height: 26,
      color: COLORS.primary
    })
    this.drawCentered(title, cx, this.y - 4, 14, true, COLORS.white)
    this.moveY(32)

    if (subtitle) {
      this.drawCentered(subtitle, cx, this.y, 9, false, COLORS.textMuted)
      this.moveY(16)
    }

    this.drawHorizontalLine()
    this.moveY(12)
    return this
  }

  drawInfoGrid(rows: { label: string; value: string }[], columns = 2): this {
    this.ensureSpace(rows.length * 16 + 10)
    const colWidth = this.contentWidth / columns

    for (let i = 0; i < rows.length; i += columns) {
      for (let c = 0; c < columns; c++) {
        const row = rows[i + c]
        if (!row) continue
        const x = MARGINS.left + c * colWidth
        this.drawText(`${row.label} :`, x, this.y, 8, false, COLORS.textMuted)
        this.drawText(row.value, x + 80, this.y, 9, true)
      }
      this.moveY(16)
    }
    this.moveY(6)
    return this
  }

  drawTable(columns: TableColumn[], rows: TableRow[], rowHeight = 18): this {
    const tableWidth = columns.reduce((s, c) => s + c.width, 0)
    const startX = MARGINS.left + (this.contentWidth - tableWidth) / 2

    this.ensureSpace(rowHeight + 4)

    // En-tête tableau
    let x = startX
    const headerY = this.y
    this.page.drawRectangle({
      x: startX,
      y: headerY - rowHeight + 4,
      width: tableWidth,
      height: rowHeight,
      color: COLORS.tableHeader
    })

    for (const col of columns) {
      const tw = this.fontBold.widthOfTextAtSize(col.header, 8)
      const tx =
        col.align === 'center'
          ? x + (col.width - tw) / 2
          : col.align === 'right'
            ? x + col.width - tw - 4
            : x + 4
      this.drawText(col.header, tx, headerY - 10, 8, true, COLORS.tableHeaderText)
      x += col.width
    }
    this.y = headerY - rowHeight

    // Lignes
    for (let i = 0; i < rows.length; i++) {
      this.ensureSpace(rowHeight + 2)
      const row = rows[i]
      x = startX

      if (row.highlight || i % 2 === 1) {
        this.page.drawRectangle({
          x: startX,
          y: this.y - rowHeight + 4,
          width: tableWidth,
          height: rowHeight,
          color: row.highlight ? COLORS.primaryLight : COLORS.tableRowAlt
        })
      }

      for (let c = 0; c < columns.length; c++) {
        const col = columns[c]
        const cell = row.cells[c] || ''
        const font = row.bold ? this.fontBold : this.font
        const size = 8.5
        const fitted = fitTextToWidth(sanitizeText(cell), font, size, col.width - 8)
        const tw = font.widthOfTextAtSize(fitted, size)
        const tx =
          col.align === 'center'
            ? x + (col.width - tw) / 2
            : col.align === 'right'
              ? x + col.width - tw - 4
              : x + 4
        this.drawText(fitted, tx, this.y - 10, size, row.bold || false)
        x += col.width
      }

      this.y -= rowHeight
    }

    this.moveY(8)
    return this
  }

  drawResultBox(label: string, value: string, color: RGB = COLORS.primary): this {
    this.ensureSpace(36)
    const boxWidth = 160
    const x = MARGINS.left

    this.page.drawRectangle({
      x,
      y: this.y - 28,
      width: boxWidth,
      height: 32,
      color: COLORS.primaryLight,
      borderColor: color,
      borderWidth: 1.5
    })
    this.drawText(label, x + 8, this.y - 10, 7, false, COLORS.textMuted)
    this.drawText(value, x + 8, this.y - 22, 12, true, color)
    this.moveY(40)
    return this
  }

  drawResultRow(items: { label: string; value: string; color?: RGB }[]): this {
    this.ensureSpace(40)
    const itemWidth = this.contentWidth / items.length

    items.forEach((item, i) => {
      const x = MARGINS.left + i * itemWidth
      this.page.drawRectangle({
        x: x + 4,
        y: this.y - 30,
        width: itemWidth - 8,
        height: 34,
        color: COLORS.primaryLight,
        borderColor: item.color || COLORS.primary,
        borderWidth: 1
      })
      this.drawText(item.label, x + 12, this.y - 10, 7, false, COLORS.textMuted)
      this.drawText(item.value, x + 12, this.y - 24, 11, true, item.color || COLORS.primary)
    })

    this.moveY(44)
    return this
  }

  drawPerformanceBar(value: number, max = 20): this {
    this.ensureSpace(44)
    const normalized = Math.max(0, Math.min(max, value))
    const ratio = max > 0 ? normalized / max : 0
    const barX = MARGINS.left
    const barWidth = this.contentWidth
    this.drawText('INDICE DE PERFORMANCE', barX, this.y, 7, true, COLORS.textMuted)
    this.moveY(12)
    this.page.drawRectangle({
      x: barX,
      y: this.y - 8,
      width: barWidth,
      height: 10,
      color: COLORS.borderLight
    })
    this.page.drawRectangle({
      x: barX,
      y: this.y - 8,
      width: barWidth * ratio,
      height: 10,
      color: ratio >= 0.7 ? COLORS.success : ratio >= 0.5 ? COLORS.accent : COLORS.danger
    })
    this.drawText(`${normalized.toFixed(2)} / ${max}`, barX + barWidth - 48, this.y + 6, 7, true)
    this.moveY(22)
    return this
  }

  drawSectionTitle(title: string): this {
    this.ensureSpace(28)
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - 13,
      width: 4,
      height: 17,
      color: COLORS.accent
    })
    this.drawText(title.toUpperCase(), MARGINS.left + 10, this.y - 7, 9, true, COLORS.primary)
    this.moveY(24)
    return this
  }

  async drawVerificationQr(payload: string, verificationCode: string): Promise<this> {
    this.ensureSpace(76)
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 160,
      color: { dark: '#12325B', light: '#FFFFFF' }
    })
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const image = await this.doc.embedPng(bytes)
    const size = 58
    const x = A4.width - MARGINS.right - size
    const y = this.y - size + 5
    this.page.drawImage(image, { x, y, width: size, height: size })
    this.drawText('AUTHENTICITÉ DU BULLETIN', MARGINS.left, this.y - 10, 8, true, COLORS.primary)
    this.drawText(
      `Référence sécurisée : ${verificationCode}`,
      MARGINS.left,
      this.y - 26,
      8,
      false,
      COLORS.textMuted
    )
    this.drawText(
      'Le QR code contient le matricule, la période et le résultat signé localement.',
      MARGINS.left,
      this.y - 40,
      7,
      false,
      COLORS.textMuted
    )
    this.moveY(70)
    return this
  }

  drawParagraph(title: string, text: string, indent = 0): this {
    this.ensureSpace(30)
    if (title) {
      this.drawText(title, MARGINS.left + indent, this.y, 9, true)
      this.moveY(14)
    }
    const lines = wrapParagraph(text, 85)
    for (const line of lines) {
      this.ensureSpace(14)
      this.drawText(line, MARGINS.left + indent, this.y, 9)
      this.moveY(13)
    }
    this.moveY(6)
    return this
  }

  /** Corps d'attestation avec texte légal */
  drawAttestationBody(paragraphs: string[]): this {
    for (const p of paragraphs) {
      const lines = wrapParagraph(p, 82)
      for (const line of lines) {
        this.ensureSpace(14)
        this.drawText(line, MARGINS.left, this.y, 10)
        this.moveY(14)
      }
      this.moveY(8)
    }
    return this
  }

  drawSignatureBlocks(
    blocks: { title: string; subtitle?: string }[],
    dateLabel?: string
  ): this {
    this.ensureSpace(80)

    if (dateLabel) {
      const cx = A4.width / 2
      this.drawCentered(dateLabel, cx, this.y, 9)
      this.moveY(24)
    }

    this.drawHorizontalLine()
    this.moveY(20)

    const blockWidth = this.contentWidth / blocks.length
    blocks.forEach((block, i) => {
      const x = MARGINS.left + i * blockWidth + blockWidth / 2
      this.drawCentered(block.title, x, this.y, 9, true)
      if (block.subtitle) {
        this.drawCentered(block.subtitle, x, this.y - 14, 7, false, COLORS.textMuted)
      }
      // Ligne signature
      const lineW = 120
      this.page.drawLine({
        start: { x: x - lineW / 2, y: this.y - 50 },
        end: { x: x + lineW / 2, y: this.y - 50 },
        thickness: 0.5,
        color: COLORS.border
      })
    })

    this.moveY(60)
    return this
  }

  drawHorizontalLine(): this {
    this.page.drawLine({
      start: { x: MARGINS.left, y: this.y },
      end: { x: A4.width - MARGINS.right, y: this.y },
      thickness: 0.5,
      color: COLORS.border
    })
    return this
  }

  drawFooter(): this {
    const footerY = MARGINS.bottom - 5
    this.page.drawLine({
      start: { x: MARGINS.left, y: footerY + 12 },
      end: { x: A4.width - MARGINS.right, y: footerY + 12 },
      thickness: 0.3,
      color: COLORS.borderLight
    })

    const left = `Généré le ${todayFormatted()}`
    this.drawText(left, MARGINS.left, footerY, 6.5, false, COLORS.textMuted)

    if (this.documentNumber) {
      const num = `N° ${this.documentNumber}`
      const nw = this.font.widthOfTextAtSize(num, 6.5)
      this.drawText(num, A4.width / 2 - nw / 2, footerY, 6.5, false, COLORS.textMuted)
    }

    const pageLabel = `Page ${this.pageNum}`
    const pw = this.font.widthOfTextAtSize(pageLabel, 6.5)
    this.drawText(pageLabel, A4.width - MARGINS.right - pw, footerY, 6.5, false, COLORS.textMuted)

    return this
  }

  drawText(
    text: string,
    x: number,
    y: number,
    size: number,
    bold = false,
    color: RGB = COLORS.text
  ): void {
    const safe = sanitizeText(text)
    this.page.drawText(safe, { x, y, size, font: bold ? this.fontBold : this.font, color })
  }

  drawCentered(
    text: string,
    cx: number,
    y: number,
    size: number,
    bold = false,
    color: RGB = COLORS.text
  ): void {
    const font = bold ? this.fontBold : this.font
    const tw = font.widthOfTextAtSize(sanitizeText(text), size)
    this.drawText(text, cx - tw / 2, y, size, bold, color)
  }

  async build(): Promise<Uint8Array> {
    this.drawFooter()
    return this.doc.save()
  }

  getDoc(): PDFDocument {
    return this.doc
  }
}

function sanitizeText(text: string): string {
  return text
    .replace(/→/g, '->')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/…/g, '...')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
}

function wrapParagraph(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (test.length > maxChars) {
      if (line) lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function fitTextToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let fitted = text
  while (fitted.length > 1 && font.widthOfTextAtSize(`${fitted}...`, size) > maxWidth) {
    fitted = fitted.slice(0, -1)
  }
  return `${fitted.trimEnd()}...`
}
