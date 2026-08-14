import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { formatDateFr } from '../../lib/dates'
import type { Classe, Enseignant, PersonnelFormData, PostePersonnel, Sexe } from '@shared/types'

const POSTE_PERSONNEL: { value: PostePersonnel; label: string }[] = [
  { value: 'directrice', label: 'Directrice' },
  { value: 'secretaire', label: 'Secrétaire' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'surveillant', label: 'Surveillant' },
  { value: 'autre', label: 'Autre' }
]

function emptyForm(kind: 'enseignant' | 'personnel'): PersonnelFormData {
  return {
    nom: '',
    prenom: '',
    sexe: 'F',
    poste: kind === 'enseignant' ? 'enseignant' : 'secretaire',
    telephone: '',
    email: '',
    date_embauche: '',
    actif: true,
    classe_id: null
  }
}

export default function PersonnelPage({ kind }: { kind: 'enseignant' | 'personnel' }) {
  const { token, user } = useAuth()
  const { anneeActive } = useApp()
  const isTeachers = kind === 'enseignant'
  const [personnel, setPersonnel] = useState<Enseignant[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Enseignant | null>(null)
  const [form, setForm] = useState<PersonnelFormData>(emptyForm(kind))
  const [saving, setSaving] = useState(false)
  const [filterActif, setFilterActif] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const list = await window.api.listPersonnel(filterActif, anneeActive?.id)
    setPersonnel(
      list.filter((p: Enseignant) => (isTeachers ? p.poste === 'enseignant' : p.poste !== 'enseignant'))
    )
    if (isTeachers && anneeActive) {
      setClasses(await window.api.listClasses(anneeActive.id))
    }
  }

  useEffect(() => {
    void load()
  }, [filterActif, anneeActive?.id, kind])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm(kind))
    setError('')
    setShowForm(true)
  }

  const openEdit = (p: Enseignant) => {
    setEditing(p)
    setForm({
      nom: p.nom,
      prenom: p.prenom,
      sexe: p.sexe,
      poste: isTeachers ? 'enseignant' : p.poste,
      telephone: p.telephone || '',
      email: p.email || '',
      date_embauche: p.date_embauche || '',
      actif: p.actif,
      classe_id: p.classe_titulaire_id ?? null
    })
    setError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const payload: PersonnelFormData = {
        ...form,
        poste: isTeachers ? 'enseignant' : form.poste,
        classe_id: isTeachers ? form.classe_id || null : null
      }
      if (editing) {
        await window.api.updatePersonnel(editing.id, payload, token)
      } else {
        await window.api.createPersonnel(payload, token)
      }
      setShowForm(false)
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const colSpan = 7
  const titleCreate = isTeachers ? 'Nouvel enseignant' : 'Nouveau membre du personnel'
  const emptyLabel = isTeachers ? 'Aucun enseignant enregistré' : 'Aucun personnel enregistré'

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

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-4">
          <h3 className="font-semibold mb-4">
            {editing ? `Modifier — ${editing.prenom} ${editing.nom}` : titleCreate}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nom *</label>
              <input
                className="input"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Prénom *</label>
              <input
                className="input"
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Sexe</label>
              <select
                className="input"
                value={form.sexe}
                onChange={(e) => setForm({ ...form, sexe: e.target.value as Sexe })}
              >
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </div>
            {isTeachers ? (
              <div>
                <label className="label">Classe titulaire (bulletin)</label>
                <select
                  className="input"
                  value={form.classe_id ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      classe_id: e.target.value ? Number(e.target.value) : null
                    })
                  }
                >
                  <option value="">Aucune classe</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.section_code})
                      {c.titulaire_id && c.titulaire_id !== editing?.id ? ' — déjà attribuée' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Le nom de l’enseignant apparaîtra sur le bulletin de cette classe.
                </p>
              </div>
            ) : (
              <div>
                <label className="label">Poste</label>
                <select
                  className="input"
                  value={form.poste}
                  onChange={(e) => setForm({ ...form, poste: e.target.value as PostePersonnel })}
                >
                  {POSTE_PERSONNEL.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Téléphone</label>
              <input
                className="input"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="6XX XXX XXX"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Date d'embauche</label>
              <input
                type="date"
                className="input"
                value={form.date_embauche}
                onChange={(e) => setForm({ ...form, date_embauche: e.target.value })}
              />
            </div>
            {editing && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.actif}
                    onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                    className="rounded"
                  />
                  Actif
                </label>
              </div>
            )}
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
              <th>Matricule</th>
              <th>Nom</th>
              {isTeachers ? <th>Classe</th> : <th>Poste</th>}
              <th>Téléphone</th>
              <th>Embauche</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {personnel.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="text-center py-8 text-gray-400">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              personnel.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.matricule}</td>
                  <td className="font-medium">
                    {p.prenom} {p.nom}
                  </td>
                  {isTeachers ? (
                    <td className="text-gray-600">{p.classe_titulaire_nom || '—'}</td>
                  ) : (
                    <td>
                      <span className="badge-gray capitalize">{p.poste}</span>
                    </td>
                  )}
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
