import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateFr } from '../../lib/dates'
import type { Enseignant, PersonnelFormData, PostePersonnel, Sexe } from '@shared/types'

const POSTE_OPTIONS: { value: PostePersonnel; label: string }[] = [
  { value: 'enseignant', label: 'Enseignant' },
  { value: 'directrice', label: 'Directrice' },
  { value: 'secretaire', label: 'Secrétaire' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'surveillant', label: 'Surveillant' },
  { value: 'autre', label: 'Autre' }
]

const emptyForm: PersonnelFormData = {
  nom: '',
  prenom: '',
  sexe: 'F',
  poste: 'enseignant',
  telephone: '',
  email: '',
  date_embauche: '',
  actif: true
}

export default function PersonnelPage() {
  const { token, user } = useAuth()
  const [personnel, setPersonnel] = useState<Enseignant[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Enseignant | null>(null)
  const [form, setForm] = useState<PersonnelFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterActif, setFilterActif] = useState(false)

  const load = async () => {
    setPersonnel(await window.api.listPersonnel(filterActif))
  }

  useEffect(() => { load() }, [filterActif])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (p: Enseignant) => {
    setEditing(p)
    setForm({
      nom: p.nom,
      prenom: p.prenom,
      sexe: p.sexe,
      poste: p.poste,
      telephone: p.telephone || '',
      email: p.email || '',
      date_embauche: p.date_embauche || '',
      actif: p.actif
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    try {
      if (editing) {
        await window.api.updatePersonnel(editing.id, form, token)
      } else {
        await window.api.createPersonnel(form, token)
      }
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={filterActif}
            onChange={(e) => setFilterActif(e.target.checked)}
            className="rounded"
          />
          Actifs uniquement
        </label>
        {user?.role === 'directrice' && (
          <button className="btn-primary btn-sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-4">
          <h3 className="font-semibold mb-4">
            {editing ? `Modifier — ${editing.prenom} ${editing.nom}` : 'Nouveau membre du personnel'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div>
              <label className="label">Prénom *</label>
              <input className="input" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            </div>
            <div>
              <label className="label">Sexe</label>
              <select className="input" value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value as Sexe })}>
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </div>
            <div>
              <label className="label">Poste</label>
              <select className="input" value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value as PostePersonnel })}>
                {POSTE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="6XX XXX XXX" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Date d'embauche</label>
              <input type="date" className="input" value={form.date_embauche} onChange={(e) => setForm({ ...form, date_embauche: e.target.value })} />
            </div>
            {editing && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} className="rounded" />
                  Actif
                </label>
              </div>
            )}
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
              <th>Matricule</th>
              <th>Nom</th>
              <th>Poste</th>
              <th>Téléphone</th>
              <th>Embauche</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {personnel.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun personnel enregistré</td></tr>
            ) : (
              personnel.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.matricule}</td>
                  <td className="font-medium">{p.prenom} {p.nom}</td>
                  <td><span className="badge-gray capitalize">{p.poste}</span></td>
                  <td className="text-gray-500">{p.telephone || '—'}</td>
                  <td className="text-gray-500">
                    {p.date_embauche ? formatDateFr(p.date_embauche) : '—'}
                  </td>
                  <td>
                    <span className={p.actif ? 'badge-green' : 'badge-red'}>
                      {p.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>
                    {user?.role === 'directrice' && (
                      <button className="btn-icon" onClick={() => openEdit(p)} title="Modifier">
                        <Pencil className="h-4 w-4" />
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
