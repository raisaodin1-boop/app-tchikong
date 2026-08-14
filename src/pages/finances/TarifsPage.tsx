import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { formatMoney } from '../../lib/money'
import type { GrilleTarifaire, TypeFrais } from '@shared/types'

const TYPE_OPTIONS: { value: TypeFrais; label: string }[] = [
  { value: 'scolarite', label: 'Scolarité' },
  { value: 'inscription', label: 'Inscription' },
  { value: 'uniforme', label: 'Uniforme' },
  { value: 'fournitures', label: 'Fournitures' },
  { value: 'examen', label: 'Examen' },
  { value: 'activite', label: 'Activités' },
  { value: 'autre', label: 'Autre' }
]

export default function TarifsPage() {
  const { token } = useAuth()
  const { anneeActive, sections, niveaux } = useApp()
  const [tarifs, setTarifs] = useState<GrilleTarifaire[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    section_id: 0,
    niveau_id: 0,
    type_frais: 'scolarite' as TypeFrais,
    libelle: 'Frais de scolarité',
    montant: ''
  })

  const load = async () => {
    if (!anneeActive) return
    setTarifs(await window.api.listGrilleTarifaire(anneeActive.id))
  }

  useEffect(() => {
    void load()
  }, [anneeActive?.id])

  const filteredNiveaux = niveaux.filter((n) => !form.section_id || n.section_id === form.section_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !anneeActive || !form.niveau_id || !form.section_id) return
    setSaving(true)
    try {
      await window.api.upsertTarif(
        {
          annee_scolaire_id: anneeActive.id,
          niveau_id: form.niveau_id,
          section_id: form.section_id,
          type_frais: form.type_frais,
          libelle: form.libelle,
          montant: Number(form.montant)
        },
        token
      )
      setShowForm(false)
      await load()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!token || !confirm('Supprimer ce tarif ?')) return
    await window.api.deleteTarif(id, token)
    await load()
  }

  if (!anneeActive) {
    return <div className="card p-8 text-center text-gray-400">Aucune année scolaire active.</div>
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Ajouter / modifier un tarif
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-4">
          <h3 className="font-semibold mb-4">Tarif</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Section *</label>
              <select
                className="input"
                value={form.section_id}
                onChange={(e) =>
                  setForm({ ...form, section_id: Number(e.target.value), niveau_id: 0 })
                }
                required
              >
                <option value={0}>Sélectionner...</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Niveau *</label>
              <select
                className="input"
                value={form.niveau_id}
                onChange={(e) => setForm({ ...form, niveau_id: Number(e.target.value) })}
                required
              >
                <option value={0}>Sélectionner...</option>
                {filteredNiveaux.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type de frais</label>
              <select
                className="input"
                value={form.type_frais}
                onChange={(e) => {
                  const type = e.target.value as TypeFrais
                  const label = TYPE_OPTIONS.find((o) => o.value === type)?.label || type
                  setForm({ ...form, type_frais: type, libelle: `Frais ${label.toLowerCase()}` })
                }}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
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
                min="0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Libellé</label>
              <input
                className="input"
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
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
              <th>Section</th>
              <th>Niveau</th>
              <th>Type</th>
              <th>Libellé</th>
              <th className="text-right">Montant</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tarifs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Aucun tarif. Ajoutez la grille pour calculer les impayés.
                </td>
              </tr>
            ) : (
              tarifs.map((t) => (
                <tr key={t.id} className="cursor-default">
                  <td>
                    <span className="badge-blue">{t.section_code}</span>
                  </td>
                  <td>{t.niveau_nom}</td>
                  <td className="capitalize">{t.type_frais.replace('_', ' ')}</td>
                  <td>{t.libelle}</td>
                  <td className="text-right font-semibold">{formatMoney(t.montant)}</td>
                  <td>
                    <button
                      className="btn-icon text-red-400 hover:text-red-600"
                      onClick={() => handleDelete(t.id)}
                      title="Supprimer"
                    >
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
