import { useEffect, useState } from 'react'
import { CalendarPlus, CheckCircle, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { AnneeScolaire, NouvelleAnneeFormData } from '@shared/types'

function suggestedYear() {
  const now = new Date()
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return {
    libelle: `${startYear}-${startYear + 1}`,
    date_debut: `${startYear}-09-01`,
    date_fin: `${startYear + 1}-06-30`,
    nb_sequences: 6,
    nb_trimestres: 3
  }
}

export default function AnneesScolairesPage() {
  const { user, token } = useAuth()
  const { anneeActive, refreshData } = useApp()
  const navigate = useNavigate()
  const [years, setYears] = useState<AnneeScolaire[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NouvelleAnneeFormData>(suggestedYear())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.listAnnees().then(setYears)
  }, [anneeActive?.id])

  const backup = async () => {
    const result = await window.api.backupDb()
    if (result.success) alert(`Sauvegarde téléchargée : ${result.path}`)
  }

  const startYear = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return
    if (
      !confirm(
        `Démarrer l'année ${form.libelle} ? Elle deviendra l'année active et les classes actuelles seront copiées sans les élèves.`
      )
    ) {
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await window.api.startNewAnnee(form, token)
      await refreshData()
      alert(
        `${result.annee.libelle} démarrée. ${result.classes_copiees} classes copiées. Configurez les frais, puis inscrivez les élèves via Passage d'année.`
      )
      navigate('/admin/passage')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de démarrer l'année")
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'directrice') {
    return <div className="card p-8 text-center text-red-600">Accès réservé à la directrice.</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Année scolaire active</h2>
            <p className="mt-1 text-2xl font-bold text-tchikong-700">
              {anneeActive?.libelle ?? 'Aucune'}
            </p>
            {anneeActive && (
              <p className="mt-1 text-sm text-gray-500">
                Du {anneeActive.date_debut} au {anneeActive.date_fin}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={backup}>
              <Save className="h-4 w-4" />
              Sauvegarder
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setShowForm((visible) => !visible)}
            >
              <CalendarPlus className="h-4 w-4" />
              Démarrer une nouvelle année
            </button>
          </div>
        </div>
      </section>

      {showForm && (
        <form onSubmit={startYear} className="card border-2 border-tchikong-200 p-5">
          <h2 className="font-semibold">Nouvelle année scolaire</h2>
          <p className="mt-1 text-sm text-gray-500">
            Les classes et leurs capacités seront copiées. Les élèves, paiements et tarifs ne le
            seront pas.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="label">Libellé</label>
              <input
                className="input"
                value={form.libelle}
                onChange={(event) => setForm({ ...form, libelle: event.target.value })}
                placeholder="2026-2027"
                required
              />
            </div>
            <div>
              <label className="label">Date de début</label>
              <input
                type="date"
                className="input"
                value={form.date_debut}
                onChange={(event) => setForm({ ...form, date_debut: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Date de fin</label>
              <input
                type="date"
                className="input"
                value={form.date_fin}
                onChange={(event) => setForm({ ...form, date_fin: event.target.value })}
                required
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Démarrage...' : "Créer l'année et configurer les frais"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Historique des années</h2>
        <div className="space-y-2">
          {years.map((year) => (
            <div
              key={year.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
            >
              <div>
                <p className="font-medium">{year.libelle}</p>
                <p className="text-xs text-gray-500">
                  {year.date_debut} — {year.date_fin}
                </p>
              </div>
              {year.active && (
                <span className="badge-green flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Active
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
