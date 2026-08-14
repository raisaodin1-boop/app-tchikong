/** Formate une date ISO (YYYY-MM-DD) sans décalage de fuseau horaire. */
export function formatDateFr(value: string | null | undefined): string {
  if (!value) return '—'
  const datePart = value.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  if (!match) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('fr-FR')
  }
  const [, y, m, d] = match
  return `${d}/${m}/${y}`
}

export function formatDateTimeFr(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('fr-FR')
}

export function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDaysIso(value: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10))
  const base = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date()
  base.setDate(base.getDate() + days)
  const y = base.getFullYear()
  const m = String(base.getMonth() + 1).padStart(2, '0')
  const d = String(base.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
