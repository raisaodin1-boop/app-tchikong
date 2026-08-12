import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { Depense, TypeDepense } from '@shared/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

const TYPE_OPTIONS: { value: TypeDepense; label: string }[] = [
  { value: 'charge', label: 'Charge' },
  { value: 'fourniture', label: 'Fourniture' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'autre', label: 'Autre' }
]

export default function DepensesPage() {
  const { token } = useAuth()
  const { anneeActive } = useApp()
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'fourniture' as TypeDepense,
    libelle: '',
    montant: '',
    date_depense: new Date().toISOString().slice(0, 10),
    beneficiaire: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!anneeActive) return
    setDepenses(await window.api.listDepenses(anneeActive.id))
  }

  useEffect(() => { load() }, [anneeActive?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !anneeActive) return
    setSaving(true)
    await window.api.createDepense(
      {
        annee_scolaire_id: anneeActive.id,
        type: form.type,
        libelle: form.libelle,
        montant: Number(form.montant),
        date_depense: form.date_depense,
        beneficiaire: form.beneficiaire || undefined,
        notes: form.notes || undefined
      },
      token
    )
    setForm({ type: 'fourniture', libelle: '', montant: '', date_depense: new Date().toISOString().slice(0, 10), beneficiaire: '', notes: '' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  const total = depenses.reduce((s, d) => s + d.montant, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Total des dépenses : <strong className="text-accent-red">{formatMoney(total)}</strong>
          <span className="ml-2 text-xs">Les salaires sont ajoutés depuis Administration → Paie.</span>
        </p>
        <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Nouvelle dépense
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-4">
          <h3 className="font-semibold mb-4">Enregistrer une dépense</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TypeDepense })}>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Montant (FCFA) *</label>
              <input type="number" className="input" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} required min="1" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Libellé *</label>
              <input className="input" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} required placeholder="Ex: Achat de craies" />
            </div>
            <div>
              <label className="label">Bénéficiaire</label>
              <input className="input" value={form.beneficiaire} onChange={(e) => setForm({ ...form, beneficiaire: e.target.value })} />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date_depense} onChange={(e) => setForm({ ...form, date_depense: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Libellé</th>
              <th>Bénéficiaire</th>
              <th className="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {depenses.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucune dépense enregistrée</td></tr>
            ) : (
              depenses.map((d) => (
                <tr key={d.id}>
                  <td>{new Date(d.date_depense).toLocaleDateString('fr-FR')}</td>
                  <td><span className="badge-gray capitalize">{d.type}</span></td>
                  <td className="font-medium">{d.libelle}</td>
                  <td className="text-gray-500">{d.beneficiaire || '—'}</td>
                  <td className="text-right font-semibold text-accent-red">{formatMoney(d.montant)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
