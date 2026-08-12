import { useEffect, useState } from 'react'
import { Pencil, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { Classe } from '@shared/types'

export default function ClassesPage() {
  const { token } = useAuth()
  const { anneeActive } = useApp()
  const [classes, setClasses] = useState<Classe[]>([])
  const [editing, setEditing] = useState<Classe | null>(null)
  const [form, setForm] = useState({ nom: '', capacite_max: 40 })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!anneeActive) return
    setClasses(await window.api.listClasses(anneeActive.id))
  }

  useEffect(() => { load() }, [anneeActive?.id])

  const openEdit = (c: Classe) => {
    setEditing(c)
    setForm({ nom: c.nom, capacite_max: c.capacite_max })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !editing) return
    setSaving(true)
    try {
      await window.api.updateClasse(editing.id, form, token)
      setEditing(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (!anneeActive) {
    return <div className="card p-8 text-center text-gray-400">Aucune année scolaire active.</div>
  }

  return (
    <div>
      {editing && (
        <form onSubmit={handleSubmit} className="card p-5 mb-4">
          <h3 className="font-semibold mb-4">Modifier — {editing.niveau_nom} ({editing.section_code})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="label">Nom de la classe</label>
              <input className="input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div>
              <label className="label">Capacité maximale</label>
              <input
                type="number"
                className="input"
                value={form.capacite_max}
                onChange={(e) => setForm({ ...form, capacite_max: Number(e.target.value) })}
                required
                min={1}
                max={60}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(null)}>Annuler</button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Classe</th>
              <th>Section</th>
              <th>Niveau</th>
              <th className="text-center">Effectif</th>
              <th className="text-center">Capacité</th>
              <th className="text-center">Taux</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucune classe</td></tr>
            ) : (
              classes.map((c) => {
                const effectif = c.effectif ?? 0
                const surcharge = effectif > c.capacite_max
                const taux = c.capacite_max > 0 ? Math.round((effectif / c.capacite_max) * 100) : 0
                return (
                  <tr key={c.id} className={surcharge ? 'bg-red-50' : ''}>
                    <td className="font-medium">
                      {surcharge && <AlertTriangle className="inline h-4 w-4 text-accent-red mr-1" />}
                      {c.nom}
                    </td>
                    <td><span className="badge-gray">{c.section_code}</span></td>
                    <td className="text-gray-500">{c.niveau_nom}</td>
                    <td className="text-center font-semibold">{effectif}</td>
                    <td className="text-center text-gray-500">{c.capacite_max}</td>
                    <td className="text-center">
                      <span className={surcharge ? 'text-accent-red font-semibold' : taux > 80 ? 'text-orange-600' : 'text-gray-600'}>
                        {taux}%
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => openEdit(c)} title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
