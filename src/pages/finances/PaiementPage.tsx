import { useEffect, useState } from 'react'
import { Search, Save, Printer, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { Inscription, ModePaiement, SituationFinanciere, Paiement } from '@shared/types'

const MODE_OPTIONS: { value: ModePaiement; label: string }[] = [
  { value: 'especes', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' }
]

function formatMoney(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

export default function PaiementPage() {
  const { token } = useAuth()
  const { anneeActive } = useApp()
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState<Inscription[]>([])
  const [eleveSelectionne, setEleveSelectionne] = useState<Inscription | null>(null)
  const [situation, setSituation] = useState<SituationFinanciere | null>(null)
  const [form, setForm] = useState({
    frais_modele_id: 0,
    montant: '',
    mode_paiement: 'especes' as ModePaiement,
    date_paiement: new Date().toISOString().slice(0, 10),
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [dernierPaiement, setDernierPaiement] = useState<Paiement | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (recherche.length < 2) {
      setResultats([])
      return
    }
    const timer = setTimeout(async () => {
      const res = await window.api.searchEleves(recherche, anneeActive?.id)
      setResultats(res)
    }, 300)
    return () => clearTimeout(timer)
  }, [recherche, anneeActive?.id])

  const selectionnerEleve = async (eleve: Inscription) => {
    setEleveSelectionne(eleve)
    setRecherche(`${eleve.nom} ${eleve.prenom}`)
    setResultats([])
    setDernierPaiement(null)
    if (anneeActive) {
      const sit = await window.api.getSituationFinanciere(eleve.eleve_id, anneeActive.id)
      setSituation(sit)
      if (sit) {
        const detail = sit.details.find(
          (d: SituationFinanciere['details'][number]) => d.type_frais === 'scolarite'
        ) ?? sit.details.find((item: SituationFinanciere['details'][number]) => item.reste > 0)
        if (detail) {
          setForm((f) => ({
            ...f,
            frais_modele_id: detail.frais_modele_id,
            montant: detail.reste > 0 ? String(detail.reste) : ''
          }))
        }
      }
    }
  }

  const handleTypeChange = (id: number) => {
    const detail = situation?.details.find((item) => item.frais_modele_id === id)
    setForm((f) => ({
      ...f,
      frais_modele_id: id,
      montant: detail && detail.reste > 0 ? String(detail.reste) : f.montant
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !anneeActive || !eleveSelectionne) return
    const montant = Number(form.montant)
    if (!montant || montant <= 0) return
    const selectedFee = situation?.details.find(
      (detail) => detail.frais_modele_id === form.frais_modele_id
    )
    if (!selectedFee) return

    setSaving(true)
    setError('')
    try {
      const paiement = await window.api.createPaiement(
        {
          eleve_id: eleveSelectionne.eleve_id,
          annee_scolaire_id: anneeActive.id,
          type_frais: selectedFee.type_frais,
          frais_modele_id: selectedFee.frais_modele_id,
          montant,
          mode_paiement: form.mode_paiement,
          date_paiement: form.date_paiement,
          notes: form.notes || undefined
        },
        token
      )
      setDernierPaiement(paiement)
      const sit = await window.api.getSituationFinanciere(eleveSelectionne.eleve_id, anneeActive.id)
      setSituation(sit)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L'enregistrement a échoué")
    } finally {
      setSaving(false)
    }
  }

  const handlePrintRecu = async (action: 'save' | 'print') => {
    if (!dernierPaiement) return
    const result = await window.api.exportRecuPdf(dernierPaiement.id, action)
    if (result.success && action === 'save' && result.path) {
      alert(`Reçu enregistré : ${result.path}`)
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Recherche élève */}
      <div className="card p-5 mb-4">
        <label className="label">Rechercher un élève</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Nom, prénom ou matricule..."
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value)
              if (!e.target.value) {
                setEleveSelectionne(null)
                setSituation(null)
              }
            }}
          />
        </div>
        {resultats.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
            {resultats.map((e) => (
              <button
                key={e.eleve_id}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                onClick={() => selectionnerEleve(e)}
              >
                <span className="font-medium">{e.nom} {e.prenom}</span>
                <span className="text-gray-400 ml-2">{e.matricule} — {e.classe_nom}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Situation financière */}
      {situation && (
        <div className="card p-5 mb-4">
          <h3 className="font-semibold mb-3">
            Situation de {situation.prenom} {situation.nom}
            <span className={`ml-2 badge ${
              situation.statut === 'a_jour' ? 'badge-green' :
              situation.statut === 'partiel' ? 'badge-yellow' :
              situation.statut === 'non_configure' ? 'badge-gray' : 'badge-red'
            }`}>
              {situation.statut === 'a_jour' ? 'À jour' :
               situation.statut === 'partiel' ? 'Paiement partiel' :
               situation.statut === 'non_configure' ? 'Frais non configurés' : 'Impayé'}
            </span>
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Total dû</p>
              <p className="font-bold">{formatMoney(situation.total_du)}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-500">Payé</p>
              <p className="font-bold text-accent-green">{formatMoney(situation.total_paye)}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-gray-500">Reste</p>
              <p className="font-bold text-accent-red">{formatMoney(situation.reste)}</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs">
                <th className="pb-2">Frais</th>
                <th className="pb-2 text-right">Dû</th>
                <th className="pb-2 text-right">Payé</th>
                <th className="pb-2 text-right">Reste</th>
              </tr>
            </thead>
            <tbody>
              {situation.details.map((d) => (
                <tr key={d.frais_modele_id} className="border-t border-gray-100">
                  <td className="py-1.5">{d.libelle}</td>
                  <td className="py-1.5 text-right">{formatMoney(d.montant_du)}</td>
                  <td className="py-1.5 text-right text-accent-green">{formatMoney(d.montant_paye)}</td>
                  <td className={`py-1.5 text-right font-medium ${d.reste > 0 ? 'text-accent-red' : ''}`}>
                    {formatMoney(d.reste)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulaire paiement */}
      {eleveSelectionne && (
        <form onSubmit={handleSubmit} className="card p-5">
          <h3 className="font-semibold mb-4">Enregistrer un paiement</h3>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Module à payer</label>
              <select
                className="input"
                value={form.frais_modele_id}
                onChange={(e) => handleTypeChange(Number(e.target.value))}
                required
              >
                <option value={0}>Sélectionner un module</option>
                {situation?.details.map((detail) => (
                  <option
                    key={detail.frais_modele_id}
                    value={detail.frais_modele_id}
                    disabled={detail.reste <= 0}
                  >
                    {detail.libelle} — reste {formatMoney(detail.reste)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Montant (FCFA) *</label>
              <input
                type="number"
                className="input"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                required
                min="1"
              />
            </div>
            <div>
              <label className="label">Mode de paiement</label>
              <select
                className="input"
                value={form.mode_paiement}
                onChange={(e) => setForm({ ...form, mode_paiement: e.target.value as ModePaiement })}
              >
                {MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={form.date_paiement}
                onChange={(e) => setForm({ ...form, date_paiement: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Notes (optionnel)</label>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Référence chèque, remarque..."
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </button>
          </div>
        </form>
      )}

      {/* Reçu après paiement */}
      {dernierPaiement && (
        <div className="card p-5 mt-4 border-accent-green border-2">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-accent-green" />
            <p className="font-semibold text-accent-green">
              Paiement enregistré — {dernierPaiement.numero_recu}
            </p>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Montant : {formatMoney(dernierPaiement.montant)} — {dernierPaiement.date_paiement}
          </p>
          <div className="flex gap-2">
            <button className="btn-primary btn-sm" onClick={() => handlePrintRecu('print')}>
              <Printer className="h-4 w-4" /> Imprimer le reçu
            </button>
            <button className="btn-secondary btn-sm" onClick={() => handlePrintRecu('save')}>
              Enregistrer le reçu (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
