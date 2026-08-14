export function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseLocalDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (!match) {
    const parsed = new Date(dateStr)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function formatDate(dateStr: string, locale = 'fr-FR'): string {
  try {
    const date = parseLocalDate(dateStr)
    if (!date) return dateStr
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    const date = parseLocalDate(dateStr)
    if (!date) return dateStr
    return date.toLocaleDateString('fr-FR')
  } catch {
    return dateStr
  }
}

export function todayFormatted(): string {
  return formatDate(todayIso())
}

export function generateDocumentNumber(type: string): string {
  const year = new Date().getFullYear()
  const seq = String(Date.now()).slice(-6)
  const prefix: Record<string, string> = {
    bulletin: 'BUL',
    palmares: 'PAL',
    attestation_scolarite: 'ATS',
    certificat_frequentation: 'CTF',
    attestation_reussite: 'ATR',
    certificat_radiation: 'RAD',
    liste_classe: 'LST',
    annuaire_classe: 'ANN',
    bulletins_classe: 'BUL',
    caisse_journaliere: 'CAI'
  }
  return `${prefix[type] || 'DOC'}-${year}-${seq}`
}

export function ordinalFr(n: number): string {
  if (n === 1) return '1er'
  return `${n}e`
}

/** Découpe un texte en lignes selon une largeur max (en caractères approximatifs) */
export function wrapText(text: string, maxChars: number): string[] {
  if (!text) return []
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (test.length > maxChars) {
      if (line) lines.push(line)
      line = word.length > maxChars ? word.slice(0, maxChars) : word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export function sexeLabel(sexe: string): string {
  return sexe === 'F' ? 'Féminin' : 'Masculin'
}

export function sexeNe(sexe: string): string {
  return sexe === 'F' ? 'Née' : 'Né'
}
