import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  degrees,
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

const FRAME = 16

export class PdfBuilder {
  private doc: PDFDocument
  private font!: PDFFont
  private fontBold!: PDFFont
  private fontItalic!: PDFFont
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
    builder.fontItalic = await doc.embedFont(StandardFonts.TimesRomanItalic)
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
    this.drawPageFrame()
    this.drawWatermark()
    return this
  }

  private textWidth(text: string, size: number, bold = false): number {
    const font = bold ? this.fontBold : this.font
    return font.widthOfTextAtSize(sanitizeText(text), size)
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

  private drawPageFrame(): void {
    this.page.drawRectangle({
      x: FRAME,
      y: FRAME,
      width: A4.width - FRAME * 2,
      height: A4.height - FRAME * 2,
      borderColor: COLORS.primary,
      borderWidth: 2.2
    })
    this.page.drawRectangle({
      x: FRAME + 4,
      y: FRAME + 4,
      width: A4.width - FRAME * 2 - 8,
      height: A4.height - FRAME * 2 - 8,
      borderColor: COLORS.accent,
      borderWidth: 0.9
    })

    const innerLeft = FRAME + 5
    const innerWidth = A4.width - (FRAME + 5) * 2
    this.page.drawRectangle({
      x: innerLeft,
      y: A4.height - FRAME - 14,
      width: innerWidth,
      height: 10,
      color: COLORS.primary
    })
    this.page.drawRectangle({
      x: innerLeft,
      y: A4.height - FRAME - 17,
      width: innerWidth,
      height: 3,
      color: COLORS.accent
    })
    this.page.drawRectangle({
      x: innerLeft,
      y: FRAME + 5,
      width: innerWidth,
      height: 16,
      color: COLORS.primary
    })
    this.page.drawRectangle({
      x: innerLeft,
      y: FRAME + 21,
      width: innerWidth,
      height: 2.5,
      color: COLORS.accent
    })
  }

  private drawWatermark(): void {
    const mark = 'TCHIKONG'
    const size = 52
    const tw = this.fontBold.widthOfTextAtSize(mark, size)
    this.page.drawText(mark, {
      x: (A4.width - tw) / 2,
      y: A4.height / 2 - 10,
      size,
      font: this.fontBold,
      color: COLORS.watermark,
      rotate: degrees(28)
    })
  }

  private drawCrest(cx: number, cy: number, r: number): void {
    this.page.drawEllipse({
      x: cx,
      y: cy,
      xScale: r,
      yScale: r,
      color: COLORS.primary
    })
    this.page.drawEllipse({
      x: cx,
      y: cy,
      xScale: r - 3.2,
      yScale: r - 3.2,
      borderColor: COLORS.accent,
      borderWidth: 1.8
    })
    this.drawCentered('T', cx, cy - 6, r > 16 ? 16 : 13, true, COLORS.accent)
  }

  private drawGoldRule(width = this.contentWidth, x = MARGINS.left): void {
    this.page.drawRectangle({
      x,
      y: this.y,
      width,
      height: 1.4,
      color: COLORS.accent
    })
    this.page.drawRectangle({
      x,
      y: this.y - 2.2,
      width,
      height: 0.5,
      color: COLORS.primary
    })
  }

  /** En-tête officiel complet (première page) */
  drawOfficialHeader(): this {
    const cx = A4.width / 2

    this.drawText('RÉPUBLIQUE DU CAMEROUN', MARGINS.left, this.y, 8, true, COLORS.primary)
    const en = 'REPUBLIC OF CAMEROON'
    this.drawText(en, A4.width - MARGINS.right - this.textWidth(en, 8, true), this.y, 8, true, COLORS.primary)
    this.moveY(11)
    this.page.drawText('Paix - Travail - Patrie', {
      x: MARGINS.left,
      y: this.y,
      size: 7.5,
      font: this.fontItalic,
      color: COLORS.accentDark
    })
    const pw = 'Peace - Work - Fatherland'
    this.page.drawText(pw, {
      x: A4.width - MARGINS.right - this.fontItalic.widthOfTextAtSize(pw, 7.5),
      y: this.y,
      size: 7.5,
      font: this.fontItalic,
      color: COLORS.accentDark
    })
    this.moveY(10)
    this.drawGoldRule()
    this.moveY(12)

    this.drawCentered("MINISTÈRE DE L'ÉDUCATION DE BASE", cx, this.y, 8, true, COLORS.primary)
    this.moveY(11)
    this.drawCentered('DÉLÉGATION RÉGIONALE DU LITTORAL', cx, this.y, 7, false, COLORS.textMuted)
    this.moveY(16)

    const boxHeight = 62
    const boxY = this.y - boxHeight + 4
    this.page.drawRectangle({
      x: MARGINS.left,
      y: boxY,
      width: this.contentWidth,
      height: boxHeight,
      color: COLORS.cream,
      borderColor: COLORS.primary,
      borderWidth: 1
    })
    this.page.drawRectangle({
      x: MARGINS.left,
      y: boxY,
      width: 5,
      height: boxHeight,
      color: COLORS.accent
    })
    this.page.drawRectangle({
      x: MARGINS.left,
      y: boxY,
      width: this.contentWidth,
      height: 3,
      color: COLORS.primary
    })

    this.drawCrest(MARGINS.left + 36, boxY + boxHeight / 2, 18)

    const textX = MARGINS.left + 64
    this.drawText(SCHOOL.name, textX, this.y - 12, 11, true, COLORS.primary)
    this.drawText(SCHOOL.subtitle, textX, this.y - 26, 9, true, COLORS.primaryMid)
    this.drawText(SCHOOL.address, textX, this.y - 40, 8, false, COLORS.textMuted)
    const contacts = [SCHOOL.phone, SCHOOL.email].filter(Boolean).join('   ')
    if (contacts) {
      this.drawText(contacts, textX, this.y - 52, 8, true, COLORS.primary)
    }

    this.y = boxY - 14
    return this
  }

  /** En-tête compact pour pages suivantes */
  drawCompactHeader(): this {
    this.page.drawRectangle({
      x: MARGINS.left,
      y: A4.height - MARGINS.top - 4,
      width: this.contentWidth,
      height: 24,
      color: COLORS.primary
    })
    this.page.drawRectangle({
      x: MARGINS.left,
      y: A4.height - MARGINS.top - 7,
      width: this.contentWidth,
      height: 3,
      color: COLORS.accent
    })
    this.drawText(
      SCHOOL.subtitle,
      MARGINS.left + 10,
      A4.height - MARGINS.top + 4,
      8,
      true,
      COLORS.accent
    )
    if (this.documentTitle) {
      const tw = this.textWidth(this.documentTitle, 8, true)
      this.drawText(
        this.documentTitle,
        A4.width - MARGINS.right - tw - 10,
        A4.height - MARGINS.top + 4,
        8,
        true,
        COLORS.white
      )
    }
    this.y = A4.height - MARGINS.top - 32
    return this
  }

  drawDocumentTitle(title: string, subtitle?: string): this {
    this.ensureSpace(52)
    const bandH = 28
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - 20,
      width: this.contentWidth,
      height: bandH,
      color: COLORS.primary
    })
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - 23,
      width: this.contentWidth,
      height: 3,
      color: COLORS.accent
    })
    this.drawCentered(title, A4.width / 2, this.y - 6, 13, true, COLORS.white)
    this.moveY(36)

    if (subtitle) {
      this.drawCentered(subtitle, A4.width / 2, this.y, 8.5, false, COLORS.textMuted)
      this.moveY(14)
    }
    return this
  }

  drawInfoGrid(rows: { label: string; value: string }[], columns = 2): this {
    const rowH = 22
    const lines = Math.ceil(rows.length / columns)
    const pad = 8
    const boxH = lines * rowH + pad * 2
    this.ensureSpace(boxH + 8)

    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - boxH + 12,
      width: this.contentWidth,
      height: boxH,
      color: COLORS.primaryLight,
      borderColor: COLORS.border,
      borderWidth: 0.6
    })
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - boxH + 12 + boxH - 3,
      width: this.contentWidth,
      height: 3,
      color: COLORS.accent
    })

    const colWidth = this.contentWidth / columns
    this.moveY(pad)
    for (let i = 0; i < rows.length; i += columns) {
      for (let c = 0; c < columns; c++) {
        const row = rows[i + c]
        if (!row) continue
        const x = MARGINS.left + c * colWidth + 10
        this.drawText(`${row.label}`, x, this.y, 7, false, COLORS.textMuted)
        this.drawText(row.value, x + 78, this.y, 9, true, COLORS.primaryDeep)
      }
      this.moveY(rowH)
    }
    this.moveY(10)
    return this
  }

  drawTable(columns: TableColumn[], rows: TableRow[], rowHeight = 18): this {
    const tableWidth = columns.reduce((s, c) => s + c.width, 0)
    const startX = MARGINS.left + (this.contentWidth - tableWidth) / 2

    this.ensureSpace(rowHeight + 6)

    let x = startX
    const headerY = this.y
    this.page.drawRectangle({
      x: startX,
      y: headerY - rowHeight + 4,
      width: tableWidth,
      height: rowHeight,
      color: COLORS.tableHeader
    })
    this.page.drawRectangle({
      x: startX,
      y: headerY - rowHeight + 4,
      width: tableWidth,
      height: 2,
      color: COLORS.accent
    })

    for (const col of columns) {
      const tw = this.textWidth(col.header, 8, true)
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

    for (let i = 0; i < rows.length; i++) {
      this.ensureSpace(rowHeight + 2)
      const row = rows[i]
      x = startX
      const fill = row.highlight ? COLORS.accentSoft : i % 2 === 1 ? COLORS.tableRowAlt : COLORS.white
      this.page.drawRectangle({
        x: startX,
        y: this.y - rowHeight + 4,
        width: tableWidth,
        height: rowHeight,
        color: fill
      })
      if (row.highlight) {
        this.page.drawRectangle({
          x: startX,
          y: this.y - rowHeight + 4,
          width: 3,
          height: rowHeight,
          color: COLORS.accent
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
        this.drawText(fitted, tx, this.y - 10, size, row.bold || false, COLORS.text)
        x += col.width
      }

      this.y -= rowHeight
    }

    this.page.drawRectangle({
      x: startX,
      y: this.y + 4,
      width: tableWidth,
      height: 1.2,
      color: COLORS.primary
    })

    this.moveY(10)
    return this
  }

  drawResultBox(label: string, value: string, color: RGB = COLORS.primary): this {
    this.ensureSpace(40)
    const boxWidth = 170
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - 30,
      width: boxWidth,
      height: 36,
      color: COLORS.primary
    })
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - 30,
      width: 4,
      height: 36,
      color: COLORS.accent
    })
    this.drawText(label, MARGINS.left + 12, this.y - 10, 7, false, COLORS.accent)
    this.drawText(value, MARGINS.left + 12, this.y - 24, 12, true, color === COLORS.primary ? COLORS.white : color)
    this.moveY(44)
    return this
  }

  drawHeroAmount(label: string, value: string): this {
    this.ensureSpace(58)
    const h = 48
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - 36,
      width: this.contentWidth,
      height: h,
      color: COLORS.primary
    })
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - 36,
      width: this.contentWidth,
      height: 4,
      color: COLORS.accent
    })
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - 36 + h - 4,
      width: this.contentWidth,
      height: 4,
      color: COLORS.accent
    })
    this.drawCentered(label, A4.width / 2, this.y - 8, 8, true, COLORS.accent)
    this.drawCentered(value, A4.width / 2, this.y - 26, 18, true, COLORS.white)
    this.moveY(56)
    return this
  }

  drawResultRow(items: { label: string; value: string; color?: RGB }[]): this {
    this.ensureSpace(48)
    const itemWidth = this.contentWidth / items.length
    const h = 40

    items.forEach((item, i) => {
      const x = MARGINS.left + i * itemWidth
      this.page.drawRectangle({
        x: x + 3,
        y: this.y - 32,
        width: itemWidth - 6,
        height: h,
        color: COLORS.primary
      })
      this.page.drawRectangle({
        x: x + 3,
        y: this.y - 32,
        width: itemWidth - 6,
        height: 3,
        color: COLORS.accent
      })
      this.drawText(item.label, x + 12, this.y - 10, 6.5, true, COLORS.accent)
      this.drawText(item.value, x + 12, this.y - 25, 11, true, item.color && item.color !== COLORS.primary ? item.color : COLORS.white)
    })

    this.moveY(50)
    return this
  }

  drawPerformanceBar(value: number, max = 20): this {
    this.ensureSpace(44)
    const normalized = Math.max(0, Math.min(max, value))
    const ratio = max > 0 ? normalized / max : 0
    const barX = MARGINS.left
    const barWidth = this.contentWidth
    this.drawText('INDICE DE PERFORMANCE', barX, this.y, 7, true, COLORS.primary)
    this.moveY(12)
    this.page.drawRectangle({
      x: barX,
      y: this.y - 8,
      width: barWidth,
      height: 11,
      color: COLORS.primaryLight,
      borderColor: COLORS.border,
      borderWidth: 0.5
    })
    const fillColor = ratio >= 0.7 ? COLORS.success : ratio >= 0.5 ? COLORS.accent : COLORS.danger
    if (ratio > 0) {
      this.page.drawRectangle({
        x: barX + 1,
        y: this.y - 7,
        width: Math.max(4, (barWidth - 2) * ratio),
        height: 9,
        color: fillColor
      })
    }
    this.drawText(`${normalized.toFixed(2)} / ${max}`, barX + barWidth - 52, this.y + 6, 7, true, COLORS.primary)
    this.moveY(22)
    return this
  }

  drawSectionTitle(title: string): this {
    this.ensureSpace(28)
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - 14,
      width: this.contentWidth,
      height: 18,
      color: COLORS.primaryLight
    })
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - 14,
      width: 5,
      height: 18,
      color: COLORS.accent
    })
    this.drawText(title.toUpperCase(), MARGINS.left + 12, this.y - 8, 9, true, COLORS.primary)
    this.moveY(26)
    return this
  }

  async drawVerificationQr(payload: string, verificationCode: string): Promise<this> {
    this.ensureSpace(80)
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 160,
      color: { dark: '#002A8B', light: '#FFFFFF' }
    })
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const image = await this.doc.embedPng(bytes)
    const size = 58
    const boxH = 70
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - boxH + 8,
      width: this.contentWidth,
      height: boxH,
      color: COLORS.cream,
      borderColor: COLORS.border,
      borderWidth: 0.6
    })
    this.page.drawImage(image, {
      x: A4.width - MARGINS.right - size - 10,
      y: this.y - size + 2,
      width: size,
      height: size
    })
    this.drawText('CONTRÔLE DU BULLETIN', MARGINS.left + 10, this.y - 10, 8, true, COLORS.primary)
    this.drawText(
      `Référence de contrôle : ${verificationCode}`,
      MARGINS.left + 10,
      this.y - 26,
      8,
      false,
      COLORS.textMuted
    )
    this.drawText(
      'Le QR code contient le matricule, la période et les résultats de contrôle.',
      MARGINS.left + 10,
      this.y - 40,
      7,
      false,
      COLORS.textMuted
    )
    this.moveY(78)
    return this
  }

  drawParagraph(title: string, text: string, indent = 0): this {
    const lines = wrapParagraph(text, 82)
    const boxH = (title ? 16 : 0) + lines.length * 13 + 16
    this.ensureSpace(boxH + 6)
    this.page.drawRectangle({
      x: MARGINS.left + indent,
      y: this.y - boxH + 12,
      width: this.contentWidth - indent,
      height: boxH,
      color: COLORS.accentSoft,
      borderColor: COLORS.accentDark,
      borderWidth: 0.5
    })
    this.page.drawRectangle({
      x: MARGINS.left + indent,
      y: this.y - boxH + 12,
      width: 4,
      height: boxH,
      color: COLORS.accent
    })
    this.moveY(4)
    if (title) {
      this.drawText(title, MARGINS.left + indent + 12, this.y, 8, true, COLORS.primary)
      this.moveY(14)
    }
    for (const line of lines) {
      this.drawText(line, MARGINS.left + indent + 12, this.y, 9)
      this.moveY(13)
    }
    this.moveY(12)
    return this
  }

  /** Corps d'attestation avec texte légal */
  drawAttestationBody(paragraphs: string[]): this {
    const lines: { text: string; gap: boolean }[] = []
    for (const p of paragraphs) {
      if (!p) {
        lines.push({ text: '', gap: true })
        continue
      }
      const wrapped = wrapParagraph(p, 80)
      wrapped.forEach((text, i) => lines.push({ text, gap: i === wrapped.length - 1 }))
    }
    const boxH = lines.reduce((h, l) => h + (l.text ? 14 : 8), 24)
    this.ensureSpace(boxH + 8)
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y - boxH + 14,
      width: this.contentWidth,
      height: boxH,
      color: COLORS.cream,
      borderColor: COLORS.primary,
      borderWidth: 0.8
    })
    this.page.drawRectangle({
      x: MARGINS.left + 3,
      y: this.y - boxH + 17,
      width: this.contentWidth - 6,
      height: boxH - 6,
      borderColor: COLORS.accent,
      borderWidth: 0.6
    })
    this.moveY(10)
    for (const line of lines) {
      if (!line.text) {
        this.moveY(8)
        continue
      }
      this.drawText(line.text, MARGINS.left + 14, this.y, 10)
      this.moveY(line.gap ? 16 : 14)
    }
    this.moveY(8)
    return this
  }

  drawSignatureBlocks(
    blocks: { title: string; subtitle?: string }[],
    dateLabel?: string
  ): this {
    this.ensureSpace(96)

    if (dateLabel) {
      const safeDate = sanitizeText(dateLabel)
      this.page.drawText(safeDate, {
        x: A4.width / 2 - this.fontItalic.widthOfTextAtSize(safeDate, 9) / 2,
        y: this.y,
        size: 9,
        font: this.fontItalic,
        color: COLORS.text
      })
      this.moveY(18)
    }

    const blockWidth = this.contentWidth / blocks.length
    const boxH = 62
    blocks.forEach((block, i) => {
      const x = MARGINS.left + i * blockWidth + 6
      const w = blockWidth - 12
      this.page.drawRectangle({
        x,
        y: this.y - boxH + 8,
        width: w,
        height: boxH,
        color: COLORS.white,
        borderColor: COLORS.primary,
        borderWidth: 0.8
      })
      this.page.drawRectangle({
        x,
        y: this.y - boxH + 8 + boxH - 3,
        width: w,
        height: 3,
        color: COLORS.accent
      })
      const cx = x + w / 2
      this.drawCentered(block.title, cx, this.y - 6, 8.5, true, COLORS.primary)
      if (block.subtitle) {
        this.drawCentered(block.subtitle, cx, this.y - 18, 7, false, COLORS.textMuted)
      }
      const lineW = Math.min(130, w - 24)
      this.page.drawLine({
        start: { x: cx - lineW / 2, y: this.y - 48 },
        end: { x: cx + lineW / 2, y: this.y - 48 },
        thickness: 0.6,
        color: COLORS.border
      })
    })

    this.moveY(70)
    return this
  }

  drawHorizontalLine(): this {
    this.page.drawRectangle({
      x: MARGINS.left,
      y: this.y,
      width: this.contentWidth,
      height: 0.6,
      color: COLORS.border
    })
    return this
  }

  drawFooter(): this {
    const footerY = FRAME + 9
    const left = `Généré le ${todayFormatted()}`
    this.drawText(left, MARGINS.left, footerY, 6.5, false, COLORS.accentSoft)

    if (this.documentNumber) {
      const num = `N° ${this.documentNumber}`
      const nw = this.textWidth(num, 6.5, true)
      this.drawText(num, A4.width / 2 - nw / 2, footerY, 6.5, true, COLORS.white)
    }

    const pageLabel = `Page ${this.pageNum}`
    const pw = this.textWidth(pageLabel, 6.5)
    this.drawText(pageLabel, A4.width - MARGINS.right - pw, footerY, 6.5, false, COLORS.accent)

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
    const tw = this.textWidth(text, size, bold)
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
  const mapped = String(text ?? '')
    .replace(/[\u00A0\u202F\u2000-\u200B\u2028\u2029\u2060\uFEFF]/g, ' ')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/€/g, 'EUR')
    .replace(/→/g, '->')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/…/g, '...')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
  return mapped.replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, '?')
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
