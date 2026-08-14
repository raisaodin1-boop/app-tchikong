import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { formatDateFr } from '../../lib/dates'
import type { AnneeScolaire } from '@shared/types'

export default function AnneesPage() {
  const { annees, anneeActive, refreshData, setAnneeActiveId } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    libelle: '',
    date_debut: '',
    date_fin: '',
    activer: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.date_fin <= form.date_debut) {
      setError('La date de fin doit être postérieure à la date de début')
      return
    }
    setSaving(true)
    setError('')
    try {
      await window.api.createAnnee({
        libelle: form.libelle,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        activer: form.activer
      })
      setShowForm(false)
      setForm({ libelle: '', date_debut: '', date_fin: '', activer: false })
      await refreshData()
    } catch (err) {
      setError((err as Error).message || 'Impossible de créer l\'année')
    } finally {
      setSaving(false)
    }
  }

  const activer = async (a: AnneeScolaire) => {
    if (a.id === anneeActive?.id) return
    if (!confirm(`Activer l'année ${a.libelle} ? Les écrans afficheront cette année.`)) return
    await setAnneeActiveId(a.id)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Nouvelle année
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-4">
          <h3 className="font-semibold mb-4">Créer une année scolaire</h3>
          <p className="text-xs text-gray-500 mb-4">
            Les 6 séquences et 3 trimestres sont créés automatiquement.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Libellé *</label>
              <input
                className="input"
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                required
                placeholder="2026-2027"
              />
            </div>
            <div>
              <label className="label">Début *</label>
              <input
                type="date"
                className="input"
                value={form.date_debut}
                onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Fin *</label>
              <input
                type="date"
                className="input"
                value={form.date_fin}
                onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm mt-4">
            <input
              type="checkbox"
              checked={form.activer}
              onChange={(e) => setForm({ ...form, activer: e.target.checked })}
              className="rounded"
            />
            Activer cette année immédiatement
          </label>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>
              {saving ? 'Création...' : 'Créer'}
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowForm(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Période</th>
              <th>Séquences</th>
              <th>Trimestres</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {annees.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Aucune année scolaire
                </td>
              </tr>
            ) : (
              annees.map((a) => (
                <tr key={a.id} className="cursor-default">
                  <td className="font-medium">{a.libelle}</td>
                  <td className="text-gray-500">
                    {formatDateFr(a.date_debut)} — {formatDateFr(a.date_fin)}
                  </td>
                  <td>{a.nb_sequences}</td>
                  <td>{a.nb_trimestres}</td>
                  <td>
                    <span className={a.active ? 'badge-green' : 'badge-gray'}>
                      {a.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {!a.active && (
                      <button className="btn-secondary btn-sm" onClick={() => activer(a)}>
                        Activer
                      </button>
                    )}
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
