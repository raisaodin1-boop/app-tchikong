import { useEffect, useState } from 'react'
import { Search, Save, Printer, CheckCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { formatMoney } from '../../lib/money'
import type { Inscription, ModePaiement, SituationFinanciere, TypeFrais, Paiement } from '@shared/types'

const TYPE_FRAIS_OPTIONS: { value: TypeFrais; label: string }[] = [
  { value: 'scolarite', label: 'Frais de scolarité' },
  { value: 'inscription', label: 'Inscription' },
  { value: 'uniforme', label: 'Uniforme' },
  { value: 'fournitures', label: 'Fournitures' },
  { value: 'examen', label: 'Examen' },
  { value: 'activite', label: 'Activités' },
  { value: 'autre', label: 'Autre' }
]

const MODE_OPTIONS: { value: ModePaiement; label: string }[] = [
  { value: 'especes', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' }
]

export default function PaiementPage() {
  const { token } = useAuth()
  const { anneeActive } = useApp()
  const [searchParams] = useSearchParams()
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState<Inscription[]>([])
  const [eleveSelectionne, setEleveSelectionne] = useState<Inscription | null>(null)
  const [situation, setSituation] = useState<SituationFinanciere | null>(null)
  const [form, setForm] = useState({
    type_frais: 'scolarite' as TypeFrais,
    montant: '',
    mode_paiement: 'especes' as ModePaiement,
    date_paiement: new Date().toISOString().slice(0, 10),
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [dernierPaiement, setDernierPaiement] = useState<Paiement | null>(null)

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
        const detail = sit.details.find((d: SituationFinanciere['details'][number]) => d.type_frais === 'scolarite')
        if (detail && detail.reste > 0) {
          setForm((f) => ({ ...f, type_frais: 'scolarite', montant: String(detail.reste) }))
        }
      }
    }
  }

  useEffect(() => {
    const eleveId = Number(searchParams.get('eleve'))
    if (!eleveId || !anneeActive) return
    window.api.getEleve(eleveId, anneeActive.id).then((data: {
      eleve: { id: number; nom: string; prenom: string; matricule: string }
      inscription: Inscription | null
    } | null) => {
      if (!data?.inscription && !data?.eleve) return
      const ins = data.inscription
      void selectionnerEleve({
        ...(ins || {}),
        eleve_id: data.eleve.id,
        nom: data.eleve.nom,
        prenom: data.eleve.prenom,
        matricule: data.eleve.matricule
      } as Inscription)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, anneeActive?.id])

  const handleTypeChange = (type: TypeFrais) => {
    const detail = situation?.details.find((d) => d.type_frais === type)
    setForm((f) => ({
      ...f,
      type_frais: type,
      montant: detail && detail.reste > 0 ? String(detail.reste) : f.montant
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !anneeActive || !eleveSelectionne) return
    const montant = Number(form.montant)
    if (!montant || montant <= 0) return

    const detail = situation?.details.find((d) => d.type_frais === form.type_frais)
    if (detail && montant > detail.reste) {
      if (
        !confirm(
          `Le montant (${montant} FCFA) dépasse le reste dû (${detail.reste} FCFA). Enregistrer quand même ?`
        )
      ) {
        return
      }
    }

    setSaving(true)
    try {
      const paiement = await window.api.createPaiement(
        {
          eleve_id: eleveSelectionne.eleve_id,
          annee_scolaire_id: anneeActive.id,
          type_frais: form.type_frais,
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
      setForm((f) => ({ ...f, montant: '', notes: '' }))
    } catch (err) {
      alert((err as Error).message || 'Erreur lors de l\'enregistrement')
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
              situation.statut === 'partiel' ? 'badge-yellow' : 'badge-red'
            }`}>
              {situation.statut === 'a_jour' ? 'À jour' :
               situation.statut === 'partiel' ? 'Paiement partiel' : 'Impayé'}
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
                <tr key={d.type_frais} className="border-t border-gray-100">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Type de frais</label>
              <select
                className="input"
                value={form.type_frais}
                onChange={(e) => handleTypeChange(e.target.value as TypeFrais)}
              >
                {TYPE_FRAIS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
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
