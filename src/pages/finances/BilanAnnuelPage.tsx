import { useEffect, useState } from 'react'
import { AlertTriangle, Banknote, Download, Landmark, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { AnneeScolaire, BilanAnnuel } from '@shared/types'

const money = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`

export default function BilanAnnuelPage() {
  const { token, user } = useAuth()
  const { anneeActive } = useApp()
  const [years, setYears] = useState<AnneeScolaire[]>([])
  const [yearId, setYearId] = useState(anneeActive?.id ?? 0)
  const [report, setReport] = useState<BilanAnnuel | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.api.listAnnees().then((items: AnneeScolaire[]) => {
      setYears(items)
      if (!yearId && items.length > 0) setYearId(items[0].id)
    })
  }, [])

  useEffect(() => {
    if (!yearId || !token) return
    setReport(null)
    setError('')
    window.api
      .getBilanAnnuel(yearId, token)
      .then(setReport)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'Bilan annuel indisponible')
      )
  }, [yearId, token])

  const exportCsv = () => {
    if (!report) return
    const rows = [
      ['Bilan annuel', report.annee_libelle],
      ['Élèves inscrits', report.effectif_total],
      ['Montant attendu', report.montant_attendu],
      ['Montant perçu', report.montant_percu],
      ['Montant non perçu', report.montant_non_percu],
      ['Dépenses totales', report.depenses_totales],
      ['Solde', report.solde],
      [],
      ['Classe', 'Section', 'Effectif', 'Attendu', 'Perçu', 'Non perçu', 'Taux'],
      ...report.classes.map((row) => [
        row.classe_nom,
        row.section_code,
        row.effectif,
        row.montant_attendu,
        row.montant_percu,
        row.montant_non_percu,
        `${row.taux_recouvrement}%`
      ]),
      [],
      ['Matricule', 'Nom', 'Prénom', 'Classe', 'Attendu', 'Perçu', 'Non perçu', 'Statut'],
      ...report.eleves.map((student) => [
        student.matricule,
        student.nom,
        student.prenom,
        student.classe_nom,
        student.montant_attendu,
        student.montant_percu,
        student.montant_non_percu,
        student.statut
      ])
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `bilan-${report.annee_libelle}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!['directrice', 'comptable'].includes(user?.role || '')) {
    return (
      <div className="card p-8 text-center text-red-600">
        Accès réservé à la direction et à la comptabilité.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-tchikong-700 to-tchikong-500 p-6 text-white">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tchikong-100">
                Cockpit de clôture
              </p>
              <h2 className="mt-1 text-2xl font-bold">Bilan financier annuel</h2>
              <p className="mt-1 text-sm text-tchikong-100">
                Vue consolidée des inscriptions, encaissements, impayés et charges
              </p>
            </div>
            <div className="flex items-end gap-2">
              {report && (
                <button
                  type="button"
                  onClick={exportCsv}
                  className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25"
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </button>
              )}
              <div>
              <label className="mb-1 block text-xs text-tchikong-100">Année analysée</label>
              <select
                className="rounded-lg border border-white/30 bg-white/15 px-4 py-2 text-sm text-white outline-none"
                value={yearId}
                onChange={(event) => setYearId(Number(event.target.value))}
              >
                {years.map((year) => (
                  <option key={year.id} value={year.id} className="text-gray-900">
                    {year.libelle}
                  </option>
                ))}
              </select>
              </div>
            </div>
          </div>
        </div>
        {report && (
          <div className="p-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-gray-700">Objectif annuel encaissé</span>
              <span className="font-bold text-tchikong-700">{report.taux_recouvrement}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-green-500"
                style={{ width: `${Math.min(100, report.taux_recouvrement)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!report && !error ? (
        <div className="py-10 text-center text-gray-400">Calcul du bilan...</div>
      ) : (
        report && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Élèves inscrits"
                value={String(report.effectif_total)}
                icon={Users}
                tone="blue"
              />
              <Metric
                label="Montant annuel attendu"
                value={money(report.montant_attendu)}
                icon={Landmark}
                tone="slate"
              />
              <Metric
                label="Montant perçu"
                value={money(report.montant_percu)}
                icon={TrendingUp}
                tone="green"
              />
              <Metric
                label="Reste non perçu"
                value={money(report.montant_non_percu)}
                icon={AlertTriangle}
                tone="red"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="card p-5">
                <h3 className="font-semibold">Journal des charges</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <Line label="Autres dépenses" value={money(report.depenses_hors_salaires)} />
                  <Line label="Salaires annuels prévus" value={money(report.salaires_attendus)} />
                  <Line label="Salaires déjà perçus" value={money(report.salaires_payes)} success />
                  <Line label="Salaires restant à payer" value={money(report.salaires_non_payes)} danger />
                  <div className="border-t pt-3">
                    <Line label="Dépenses réellement engagées" value={money(report.depenses_totales)} />
                  </div>
                </div>
              </section>
              <section className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-tchikong-50 p-3">
                    <Banknote className="h-6 w-6 text-tchikong-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Solde de trésorerie</p>
                    <p
                      className={`text-2xl font-bold ${
                        report.solde >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {money(report.solde)}
                    </p>
                  </div>
                </div>
                <p className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  Le solde correspond aux encaissements réels moins toutes les dépenses validées,
                  y compris les salaires déjà marqués comme perçus.
                </p>
              </section>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Section</th>
                    <th className="text-center">Élèves</th>
                    <th className="text-right">Attendu</th>
                    <th className="text-right">Perçu</th>
                    <th className="text-right">Non perçu</th>
                    <th className="text-right">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {report.classes.map((row) => (
                    <tr key={row.classe_id}>
                      <td className="font-medium">{row.classe_nom}</td>
                      <td><span className="badge-gray">{row.section_code}</span></td>
                      <td className="text-center">{row.effectif}</td>
                      <td className="text-right">{money(row.montant_attendu)}</td>
                      <td className="text-right font-medium text-green-700">
                        {money(row.montant_percu)}
                      </td>
                      <td className="text-right text-red-700">{money(row.montant_non_percu)}</td>
                      <td className="text-right font-semibold">{row.taux_recouvrement}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <section className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Journal financier des élèves</h3>
                  <p className="text-sm text-gray-500">
                    {report.eleves.length} inscriptions consolidées avec attendu, perçu et reste
                  </p>
                </div>
                <input
                  className="input max-w-xs"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un élève ou une classe..."
                />
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Matricule</th>
                      <th>Élève</th>
                      <th>Classe</th>
                      <th className="text-right">Attendu</th>
                      <th className="text-right">Perçu</th>
                      <th className="text-right">Non perçu</th>
                      <th>État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.eleves
                      .filter((student) =>
                        `${student.matricule} ${student.nom} ${student.prenom} ${student.classe_nom}`
                          .toLowerCase()
                          .includes(search.toLowerCase())
                      )
                      .map((student) => (
                        <tr key={student.eleve_id}>
                          <td className="font-mono text-xs">{student.matricule}</td>
                          <td className="font-medium">
                            {student.nom} {student.prenom}
                          </td>
                          <td>{student.classe_nom}</td>
                          <td className="text-right">{money(student.montant_attendu)}</td>
                          <td className="text-right text-green-700">{money(student.montant_percu)}</td>
                          <td className="text-right text-red-700">
                            {money(student.montant_non_percu)}
                          </td>
                          <td>
                            <span
                              className={
                                student.statut === 'a_jour'
                                  ? 'badge-green'
                                  : student.statut === 'partiel'
                                    ? 'badge-yellow'
                                    : student.statut === 'non_configure'
                                      ? 'badge-gray'
                                      : 'badge-red'
                              }
                            >
                              {student.statut === 'a_jour'
                                ? 'À jour'
                                : student.statut === 'partiel'
                                  ? 'Partiel'
                                  : student.statut === 'non_configure'
                                    ? 'À configurer'
                                    : 'Impayé'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
  tone
}: {
  label: string
  value: string
  icon: React.ElementType
  tone: 'blue' | 'slate' | 'green' | 'red'
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700'
  }
  return (
    <div className="card p-5">
      <div className={`inline-flex rounded-lg p-2 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function Line({
  label,
  value,
  success,
  danger
}: {
  label: string
  value: string
  success?: boolean
  danger?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className={success ? 'font-semibold text-green-700' : danger ? 'font-semibold text-red-700' : 'font-semibold'}>
        {value}
      </span>
    </div>
  )
}
