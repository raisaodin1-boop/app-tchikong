import { useEffect, useMemo, useState } from 'react'
import { Banknote, CheckCircle, RefreshCw, Save, WalletCards } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type {
  ModePaiement,
  PaieMensuelle,
  PaieMensuelleRow,
  PersonnelAnneeDetail
} from '@shared/types'

const modeOptions: { value: ModePaiement; label: string }[] = [
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Chèque' }
]

const money = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`

export default function PaiePersonnelPage() {
  const { user, token } = useAuth()
  const { anneeActive } = useApp()
  const initialMonth = useMemo(() => {
    if (!anneeActive) return new Date().toISOString().slice(0, 7)
    const current = new Date().toISOString().slice(0, 7)
    const start = anneeActive.date_debut.slice(0, 7)
    const end = anneeActive.date_fin.slice(0, 7)
    return current >= start && current <= end ? current : start
  }, [anneeActive?.id])

  const [month, setMonth] = useState(initialMonth)
  const [personnel, setPersonnel] = useState<PersonnelAnneeDetail[]>([])
  const [payroll, setPayroll] = useState<PaieMensuelle | null>(null)
  const [salaryDrafts, setSalaryDrafts] = useState<Record<number, string>>({})
  const [paying, setPaying] = useState<PaieMensuelleRow | null>(null)
  const [payment, setPayment] = useState({
    date_paiement: new Date().toISOString().slice(0, 10),
    mode_paiement: 'virement' as ModePaiement,
    reference: '',
    notes: ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setMonth(initialMonth), [initialMonth])

  const load = async () => {
    if (!anneeActive || !token || user?.role !== 'directrice') return
    const [annual, monthly] = await Promise.all([
      window.api.listPersonnelAnnee(anneeActive.id, token),
      window.api.getPaieMensuelle(anneeActive.id, month, token)
    ])
    setPersonnel(annual)
    setPayroll(monthly)
    setSalaryDrafts(
      Object.fromEntries(
        annual.map((member: PersonnelAnneeDetail) => [
          member.personnel_id,
          String(member.salaire_mensuel || '')
        ])
      )
    )
  }

  useEffect(() => {
    load().catch((reason) =>
      setError(reason instanceof Error ? reason.message : 'Chargement de la paie impossible')
    )
  }, [anneeActive?.id, month, token, user?.role])

  const syncPersonnel = async () => {
    if (!anneeActive || !token) return
    setBusy(true)
    try {
      const count = await window.api.initializePersonnelAnnee(anneeActive.id, token)
      await load()
      alert(`${count} nouveau(x) membre(s) inscrit(s) pour cette année.`)
    } finally {
      setBusy(false)
    }
  }

  const saveSalary = async (member: PersonnelAnneeDetail) => {
    if (!anneeActive || !token) return
    const salary = Number(salaryDrafts[member.personnel_id])
    setError('')
    try {
      await window.api.configureSalaire(
        {
          personnel_id: member.personnel_id,
          annee_scolaire_id: anneeActive.id,
          salaire_mensuel: salary,
          actif: member.actif
        },
        token
      )
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Salaire invalide')
    }
  }

  const validatePayment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!paying?.salaire_id || !token) return
    setBusy(true)
    setError('')
    try {
      await window.api.validateSalairePayment(
        {
          salaire_id: paying.salaire_id,
          date_paiement: payment.date_paiement,
          mode_paiement: payment.mode_paiement,
          reference: payment.reference || undefined,
          notes: payment.notes || undefined
        },
        token
      )
      setPaying(null)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Validation impossible')
    } finally {
      setBusy(false)
    }
  }

  if (user?.role !== 'directrice') {
    return <div className="card p-8 text-center text-red-600">Accès réservé à la directrice.</div>
  }
  if (!anneeActive) {
    return <div className="card p-8 text-center text-gray-400">Aucune année scolaire active.</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Paie mensuelle du personnel</h2>
            <p className="text-sm text-gray-500">
              Année {anneeActive.libelle} — chaque validation alimente automatiquement les dépenses
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="label">Mois de paie</label>
              <input
                type="month"
                className="input"
                min={anneeActive.date_debut.slice(0, 7)}
                max={anneeActive.date_fin.slice(0, 7)}
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </div>
            <button className="btn-secondary btn-sm" onClick={syncPersonnel} disabled={busy}>
              <RefreshCw className="h-4 w-4" />
              Synchroniser le personnel
            </button>
          </div>
        </div>
      </div>

      {payroll && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Summary label="Masse salariale" value={money(payroll.total_du)} color="text-gray-900" />
          <Summary label="Déjà payé" value={money(payroll.total_paye)} color="text-green-700" />
          <Summary label="Reste à payer" value={money(payroll.total_restant)} color="text-red-700" />
          <Summary
            label="Progression"
            value={`${payroll.payes}/${payroll.payes + payroll.a_payer}`}
            color="text-tchikong-700"
          />
        </div>
      )}

      {paying && (
        <form onSubmit={validatePayment} className="card border-2 border-green-200 p-5">
          <h3 className="font-semibold">
            Confirmer la paie — {paying.prenom} {paying.nom}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Montant perçu : <strong>{money(paying.montant_du)}</strong>
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="label">Date de paiement</label>
              <input
                type="date"
                className="input"
                value={payment.date_paiement}
                onChange={(event) => setPayment({ ...payment, date_paiement: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Mode de paiement</label>
              <select
                className="input"
                value={payment.mode_paiement}
                onChange={(event) =>
                  setPayment({ ...payment, mode_paiement: event.target.value as ModePaiement })
                }
              >
                {modeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Référence</label>
              <input
                className="input"
                value={payment.reference}
                onChange={(event) => setPayment({ ...payment, reference: event.target.value })}
                placeholder="Référence virement ou reçu"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" type="submit" disabled={busy}>
              <CheckCircle className="h-4 w-4" />
              Confirmer comme perçu
            </button>
            <button className="btn-secondary" type="button" onClick={() => setPaying(null)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Personnel</th>
              <th>Poste</th>
              <th>Salaire mensuel</th>
              <th>État du mois</th>
              <th>Paiement</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {personnel.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Aucun personnel inscrit pour cette année.
                </td>
              </tr>
            ) : (
              payroll?.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <p className="font-medium">
                      {row.prenom} {row.nom}
                    </p>
                    <p className="text-xs text-gray-400">{row.matricule}</p>
                  </td>
                  <td className="capitalize">{row.poste}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        className="input w-36 py-1"
                        value={salaryDrafts[row.personnel_id] ?? ''}
                        onChange={(event) =>
                          setSalaryDrafts((current) => ({
                            ...current,
                            [row.personnel_id]: event.target.value
                          }))
                        }
                        disabled={row.statut === 'paye'}
                      />
                      {row.statut !== 'paye' && (
                        <button
                          className="btn-icon"
                          title="Enregistrer le salaire"
                          onClick={() => saveSalary(row)}
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={
                        row.statut === 'paye'
                          ? 'badge-green'
                          : row.statut === 'a_payer'
                            ? 'badge-yellow'
                            : 'badge-red'
                      }
                    >
                      {row.statut === 'paye'
                        ? 'Perçu'
                        : row.statut === 'a_payer'
                          ? 'À payer'
                          : 'Salaire à définir'}
                    </span>
                  </td>
                  <td className="text-sm text-gray-500">
                    {row.date_paiement
                      ? `${row.date_paiement} — ${row.mode_paiement || ''}`
                      : '—'}
                  </td>
                  <td>
                    {row.statut === 'a_payer' && (
                      <button className="btn-primary btn-sm" onClick={() => setPaying(row)}>
                        <Banknote className="h-4 w-4" />
                        Valider
                      </button>
                    )}
                    {row.statut === 'paye' && <WalletCards className="h-5 w-5 text-green-600" />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Summary({
  label,
  value,
  color
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
