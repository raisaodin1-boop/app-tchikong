import { useEffect, useState } from 'react'
import { Plus, Pencil, KeyRound } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateFr } from '../../lib/dates'
import type { RoleUtilisateur, Utilisateur, UtilisateurFormData } from '@shared/types'

const ROLE_OPTIONS: { value: RoleUtilisateur; label: string }[] = [
  { value: 'directrice', label: 'Directrice' },
  { value: 'secretariat', label: 'Secrétariat' },
  { value: 'comptable', label: 'Comptable' }
]

const emptyForm: UtilisateurFormData = {
  username: '',
  nom: '',
  prenom: '',
  role: 'secretariat',
  password: '',
  actif: true
}

export default function UtilisateursPage() {
  const { token, user } = useAuth()
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Utilisateur | null>(null)
  const [form, setForm] = useState<UtilisateurFormData>(emptyForm)
  const [resetId, setResetId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!token) return
    try {
      setUtilisateurs(await window.api.listUtilisateurs(token))
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => { load() }, [token])

  if (user?.role !== 'directrice') {
    return (
      <div className="card p-8 text-center text-gray-500">
        Accès réservé à la directrice.
      </div>
    )
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (u: Utilisateur) => {
    setEditing(u)
    setForm({
      username: u.username,
      nom: u.nom,
      prenom: u.prenom,
      role: u.role,
      actif: u.actif
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    try {
      if (editing) {
        await window.api.updateUtilisateur(editing.id, form, token)
      } else {
        await window.api.createUtilisateur(form, token)
      }
      setShowForm(false)
      await load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !resetId || !newPassword) return
    setSaving(true)
    try {
      await window.api.resetUtilisateurPassword(resetId, newPassword, token)
      setResetId(null)
      setNewPassword('')
      alert('Mot de passe réinitialisé')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="card p-4 mb-4 text-accent-red text-sm">{error}</div>
      )}

      <div className="flex justify-end mb-4">
        <button className="btn-primary btn-sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouvel utilisateur
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-4">
          <h3 className="font-semibold mb-4">
            {editing ? `Modifier — ${editing.username}` : 'Nouvel utilisateur'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Identifiant *</label>
              <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required disabled={!!editing} />
            </div>
            <div>
              <label className="label">Rôle</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as RoleUtilisateur })}>
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div>
              <label className="label">Prénom *</label>
              <input className="input" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            </div>
            {!editing && (
              <div className="md:col-span-2">
                <label className="label">Mot de passe *</label>
                <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
            )}
            {editing && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} className="rounded" />
                  Compte actif
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

      {resetId !== null && (
        <form onSubmit={handleResetPassword} className="card p-5 mb-4 border-l-4 border-tchikong-500">
          <h3 className="font-semibold mb-4">Réinitialiser le mot de passe</h3>
          <div className="max-w-sm">
            <label className="label">Nouveau mot de passe</label>
            <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>Confirmer</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => { setResetId(null); setNewPassword('') }}>Annuler</button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Créé le</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
              <tr key={u.id}>
                <td className="font-mono text-sm">{u.username}</td>
                <td className="font-medium">{u.prenom} {u.nom}</td>
                <td><span className="badge-gray capitalize">{u.role}</span></td>
                <td className="text-gray-500 text-sm">{formatDateFr(u.created_at)}</td>
                <td>
                  <span className={u.actif ? 'badge-green' : 'badge-red'}>
                    {u.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="flex gap-1">
                  <button className="btn-icon" onClick={() => openEdit(u)} title="Modifier">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="btn-icon" onClick={() => setResetId(u.id)} title="Réinitialiser mot de passe">
                    <KeyRound className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
