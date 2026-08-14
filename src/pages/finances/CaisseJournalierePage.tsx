import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileDown,
  Printer,
  Receipt,
  Wallet
} from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { addDaysIso, formatDateFr, todayIso } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import type { CaisseJournaliere, ModePaiement, TypeFrais } from '@shared/types'

const TYPE_LABELS: Record<TypeFrais, string> = {
  scolarite: 'Scolarité',
  inscription: 'Inscription',
  uniforme: 'Uniforme',
  fournitures: 'Fournitures',
  examen: 'Examen',
  activite: 'Activités',
  autre: 'Autre'
}

const MODE_LABELS: Record<ModePaiement, string> = {
  especes: 'Espèces',
  cheque: 'Chèque',
  virement: 'Virement',
  mobile_money: 'Mobile Money'
}

export default function CaisseJournalierePage() {
  const { anneeActive } = useApp()
  const [date, setDate] = useState(todayIso())
  const [caisse, setCaisse] = useState<CaisseJournaliere | null>(null)
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!anneeActive) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await window.api.getCaisseJournaliere(anneeActive.id, date)
        if (!cancelled) setCaisse(data)
      } catch (reason) {
        if (!cancelled) {
          setCaisse(null)
          setError(
            reason instanceof Error ? reason.message : 'Impossible de charger la caisse journalière'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [anneeActive?.id, date])

  const handlePdf = async (action: 'save' | 'print') => {
    if (!anneeActive) return
    setPrinting(true)
    try {
      const result = await window.api.exportCaissePdf(anneeActive.id, date, action)
      if (result.success && action === 'save' && result.path) {
        alert(`Caisse enregistrée : ${result.path}`)
      } else if (!result.success) {
        alert(result.error || 'Impossible de générer la caisse journalière')
      }
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : 'Impossible de générer la caisse journalière')
    } finally {
      setPrinting(false)
    }
  }

  if (!anneeActive) {
    return (
      <div className="card p-8 text-center text-gray-400">Aucune année scolaire active.</div>
    )
  }

  const isToday = date === todayIso()

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Caisse journalière</h2>
          <p className="text-sm text-gray-500">
            Encaissements du {formatDateFr(date)}
            {isToday ? ' (aujourd’hui)' : ''} — {anneeActive.libelle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setDate((current) => addDaysIso(current, -1))}
            title="Jour précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            className="input py-1.5 w-auto"
            value={date}
            max={todayIso()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setDate((current) => addDaysIso(current, 1))}
            disabled={date >= todayIso()}
            title="Jour suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isToday && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => setDate(todayIso())}>
              Aujourd’hui
            </button>
          )}
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={printing || loading}
            onClick={() => void handlePdf('print')}
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={printing || loading}
            onClick={() => void handlePdf('save')}
          >
            <FileDown className="h-4 w-4" />
            PDF
          </button>
          <Link to="/finances/paiement" className="btn-secondary btn-sm">
            <Wallet className="h-4 w-4" />
            Nouveau paiement
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card p-8 text-center text-red-600">{error}</div>
      ) : loading || !caisse ? (
        <div className="card p-8 text-center text-gray-400">Chargement...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total encaissé</p>
                  <p className="mt-1 text-xl font-bold text-accent-green">
                    {formatMoney(caisse.total_encaisse)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{caisse.nombre_recus} reçu(s) valide(s)</p>
                </div>
                <div className="rounded-lg bg-accent-green p-2.5">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Espèces</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{formatMoney(caisse.especes)}</p>
                  <p className="mt-1 text-xs text-gray-400">À verser en caisse</p>
                </div>
                <div className="rounded-lg bg-tchikong-500 p-2.5">
                  <Banknote className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Autres modes</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {formatMoney(caisse.autres_modes)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">Mobile Money, chèque, virement</p>
                </div>
                <div className="rounded-lg bg-blue-500 p-2.5">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Annulés</p>
                  <p className="mt-1 text-xl font-bold text-accent-red">
                    {formatMoney(caisse.total_annule)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{caisse.nombre_annules} paiement(s)</p>
                </div>
                <div className="rounded-lg bg-accent-red p-2.5">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="mb-3 font-semibold">Répartition par mode</h3>
              <div className="space-y-2">
                {caisse.par_mode.map((row) => (
                  <div key={row.cle} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {row.libelle}
                      <span className="ml-2 text-xs text-gray-400">{row.nombre}</span>
                    </span>
                    <span className="font-semibold">{formatMoney(row.montant)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="mb-3 font-semibold">Répartition par nature</h3>
              {caisse.par_type.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun encaissement ce jour.</p>
              ) : (
                <div className="space-y-2">
                  {caisse.par_type.map((row) => (
                    <div key={row.cle} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {row.libelle}
                        <span className="ml-2 text-xs text-gray-400">{row.nombre}</span>
                      </span>
                      <span className="font-semibold">{formatMoney(row.montant)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° reçu</th>
                  <th>Élève</th>
                  <th>Classe</th>
                  <th>Nature</th>
                  <th>Mode</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {caisse.paiements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Aucun paiement enregistré à cette date.
                    </td>
                  </tr>
                ) : (
                  caisse.paiements.map((p) => (
                    <tr key={p.id} className={p.annule ? 'opacity-60' : ''}>
                      <td className="font-mono text-xs">{p.numero_recu}</td>
                      <td className="font-medium">
                        {p.nom} {p.prenom}
                        <span className="ml-2 font-mono text-xs text-gray-400">{p.matricule}</span>
                      </td>
                      <td>{p.classe_nom || '—'}</td>
                      <td>
                        <span className="badge-blue">{TYPE_LABELS[p.type_frais]}</span>
                      </td>
                      <td className="text-xs">{MODE_LABELS[p.mode_paiement]}</td>
                      <td className="text-right font-semibold text-accent-green">
                        {formatMoney(p.montant)}
                        {p.annule ? <span className="ml-2 badge-red">Annulé</span> : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
