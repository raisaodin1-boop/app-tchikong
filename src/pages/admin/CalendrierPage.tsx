import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { formatDateFr } from '../../lib/dates'
import type { CalendrierScolaire } from '@shared/types'

const TYPES: { value: CalendrierScolaire['type']; label: string }[] = [
  { value: 'rentree', label: 'Rentrée' },
  { value: 'vacances', label: 'Vacances' },
  { value: 'composition', label: 'Composition' },
  { value: 'ferie', label: 'Jour férié' },
  { value: 'autre', label: 'Autre' }
]

const badges: Record<CalendrierScolaire['type'], string> = {
  rentree: 'badge-green',
  vacances: 'badge-blue',
  composition: 'badge-yellow',
  ferie: 'badge-red',
  autre: 'badge-gray'
}

export default function CalendrierPage() {
  const { token } = useAuth()
  const { anneeActive } = useApp()
  const [events, setEvents] = useState<CalendrierScolaire[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState({
    type: 'vacances' as CalendrierScolaire['type'],
    libelle: '',
    date_debut: '',
    date_fin: ''
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!anneeActive) return
    setEvents(await window.api.listCalendrier(anneeActive.id))
  }

  useEffect(() => {
    void load()
  }, [anneeActive?.id])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token || !anneeActive) return
    setSaving(true)
    setError('')
    try {
      await window.api.upsertCalendrier(
        {
          id: editing ?? undefined,
          annee_scolaire_id: anneeActive.id,
          type: form.type,
          libelle: form.libelle,
          date_debut: form.date_debut,
          date_fin: form.date_fin || null
        },
        token
      )
      setEditing(null)
      setForm({ type: 'vacances', libelle: '', date_debut: '', date_fin: '' })
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L'enregistrement a échoué")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    if (!token || !confirm('Supprimer cet événement ?')) return
    await window.api.deleteCalendrier(id, token)
    await load()
  }

  if (!anneeActive) {
    return <div className="card p-8 text-center text-gray-400">Aucune année scolaire active.</div>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={submit} className="card p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as CalendrierScolaire['type'] })}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Libellé</label>
          <input
            className="input"
            value={form.libelle}
            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
            required
            placeholder="Vacances de Noël"
          />
        </div>
        <div>
          <label className="label">Début</label>
          <input
            type="date"
            className="input"
            value={form.date_debut}
            onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Fin (optionnel)</label>
          <input
            type="date"
            className="input"
            value={form.date_fin}
            onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
          />
        </div>
        <div className="md:col-span-5 flex gap-2">
          <button type="submit" className="btn-primary btn-sm" disabled={saving}>
            <Plus className="h-4 w-4" />
            {editing ? 'Enregistrer' : 'Ajouter'}
          </button>
          {editing && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setEditing(null)
                setForm({ type: 'vacances', libelle: '', date_debut: '', date_fin: '' })
              }}
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Libellé</th>
              <th>Période</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  Aucun événement. Ajoutez la rentrée, les vacances et les compositions.
                </td>
              </tr>
            ) : (
              events.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={badges[item.type]}>
                      {TYPES.find((t) => t.value === item.type)?.label}
                    </span>
                  </td>
                  <td className="font-medium">{item.libelle}</td>
                  <td className="text-gray-500">
                    {formatDateFr(item.date_debut)}
                    {item.date_fin ? ` — ${formatDateFr(item.date_fin)}` : ''}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn-icon"
                      onClick={() => {
                        setEditing(item.id)
                        setForm({
                          type: item.type,
                          libelle: item.libelle,
                          date_debut: item.date_debut,
                          date_fin: item.date_fin || ''
                        })
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="btn-icon text-red-500" onClick={() => remove(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
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
