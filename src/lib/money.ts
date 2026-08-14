export function formatMoney(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}
