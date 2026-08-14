import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { Eleve, EleveFormData, Inscription, LienParente, ParentTuteur, Sexe, StatutEleve } from '@shared/types'

const emptyParent = {
  nom: '',
  prenom: '',
  telephone: '',
  telephone_secondaire: '',
  profession: '',
  lien_parente: 'pere' as LienParente,
  contact_urgence: false,
  email: ''
}

export default function EleveFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { token } = useAuth()
  const { anneeActive, sections, classes, niveaux } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    date_naissance: '',
    sexe: 'M' as Sexe,
    adresse: '',
    section_id: 1,
    classe_id: 0,
    niveau_id: 0,
    redoublement: false,
    statut: 'actif' as StatutEleve,
    parents: [{ ...emptyParent }]
  })

  useEffect(() => {
    if (isEdit && id) {
      window.api.getEleve(Number(id), anneeActive?.id).then((data: {
        eleve: Eleve
        inscription: Inscription | null
        parents: ParentTuteur[]
      } | null) => {
        if (data) {
          setForm({
            nom: data.eleve.nom,
            prenom: data.eleve.prenom,
            date_naissance: data.eleve.date_naissance,
            sexe: data.eleve.sexe,
            adresse: data.eleve.adresse || '',
            section_id: data.inscription?.section_id || 1,
            classe_id: data.inscription?.classe_id || 0,
            niveau_id: data.inscription?.niveau_id || 0,
            redoublement: Boolean(data.inscription?.redoublement),
            statut: data.eleve.statut || 'actif',
            parents:
              data.parents.length > 0
                ? data.parents.map((p: ParentTuteur) => ({
                    nom: p.nom,
                    prenom: p.prenom || '',
                    telephone: p.telephone,
                    telephone_secondaire: p.telephone_secondaire || '',
                    profession: p.profession || '',
                    lien_parente: p.lien_parente,
                    contact_urgence: Boolean(p.contact_urgence),
                    email: p.email || ''
                  }))
                : [{ ...emptyParent }]
          })
        }
      })
    }
  }, [id, isEdit, anneeActive?.id])

  const filteredClasses = classes.filter((c) => c.section_id === form.section_id)
  const filteredNiveaux = niveaux.filter((n) => n.section_id === form.section_id)

  const handleClasseChange = (classeId: number) => {
    const classe = classes.find((c) => c.id === classeId)
    setForm((f) => ({
      ...f,
      classe_id: classeId,
      niveau_id: classe?.niveau_id || f.niveau_id,
      section_id: classe?.section_id || f.section_id
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!anneeActive || !token) {
      setError('Année scolaire ou session non disponible')
      return
    }
    if (!form.classe_id) {
      setError('Veuillez sélectionner une classe')
      return
    }

    const classe = classes.find((c) => c.id === form.classe_id)
    if (classe && (classe.effectif ?? 0) >= classe.capacite_max && !isEdit) {
      if (
        !confirm(
          `La classe ${classe.nom} est pleine (${classe.effectif}/${classe.capacite_max}). Inscrire quand même ?`
        )
      ) {
        return
      }
    }

    setLoading(true)
    setError('')

    const data: EleveFormData = {
      nom: form.nom,
      prenom: form.prenom,
      date_naissance: form.date_naissance,
      sexe: form.sexe,
      adresse: form.adresse,
      annee_scolaire_id: anneeActive.id,
      classe_id: form.classe_id,
      section_id: form.section_id,
      niveau_id: form.niveau_id,
      redoublement: form.redoublement,
      statut: form.statut,
      parents: form.parents
        .filter((p) => p.nom && p.telephone)
        .map((p) => ({
          nom: p.nom,
          prenom: p.prenom || null,
          telephone: p.telephone,
          telephone_secondaire: p.telephone_secondaire || null,
          profession: p.profession || null,
          lien_parente: p.lien_parente,
          contact_urgence: p.contact_urgence,
          email: p.email || null
        }))
    }

    try {
      if (isEdit && id) {
        await window.api.updateEleve(Number(id), data, token)
        navigate(`/eleves/${id}`)
      } else {
        const eleve = await window.api.createEleve(data, token)
        navigate(`/eleves/${eleve.id}`)
      }
    } catch {
      setError('Erreur lors de l\'enregistrement')
    }
    setLoading(false)
  }

  const updateParent = (index: number, field: string, value: unknown) => {
    setForm((f) => ({
      ...f,
      parents: f.parents.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    }))
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Modifier l\'élève' : 'Nouvel élève'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">Informations de l'élève</h2>
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
              <label className="label">Date de naissance *</label>
              <input
                type="date"
                className="input"
                value={form.date_naissance}
                onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Sexe *</label>
              <select
                className="input"
                value={form.sexe}
                onChange={(e) => setForm({ ...form, sexe: e.target.value as Sexe })}
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Adresse</label>
              <input
                className="input"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">Affectation scolaire</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Section *</label>
              <select
                className="input"
                value={form.section_id}
                onChange={(e) =>
                  setForm({ ...form, section_id: Number(e.target.value), classe_id: 0 })
                }
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Classe *</label>
              <select
                className="input"
                value={form.classe_id}
                onChange={(e) => handleClasseChange(Number(e.target.value))}
                required
              >
                <option value={0}>Sélectionner...</option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.effectif}/{c.capacite_max})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Niveau</label>
              <select
                className="input"
                value={form.niveau_id}
                onChange={(e) => setForm({ ...form, niveau_id: Number(e.target.value) })}
              >
                {filteredNiveaux.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nom}
                  </option>
                ))}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="label">Statut</label>
                <select
                  className="input"
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value as StatutEleve })}
                >
                  <option value="actif">Actif</option>
                  <option value="transfere">Transféré</option>
                  <option value="exclu">Exclu</option>
                  <option value="diplome">Diplômé</option>
                </select>
              </div>
            )}
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.redoublement}
                  onChange={(e) => setForm({ ...form, redoublement: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Redoublement
              </label>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Parents / Tuteurs</h2>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() =>
                setForm({ ...form, parents: [...form.parents, { ...emptyParent }] })
              }
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          {form.parents.map((parent, index) => (
            <div key={index} className="border border-gray-100 rounded-lg p-4 mb-3">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">
                  Contact {index + 1}
                </span>
                {form.parents.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        parents: form.parents.filter((_, i) => i !== index)
                      })
                    }
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Nom *</label>
                  <input
                    className="input"
                    value={parent.nom}
                    onChange={(e) => updateParent(index, 'nom', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Prénom</label>
                  <input
                    className="input"
                    value={parent.prenom}
                    onChange={(e) => updateParent(index, 'prenom', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Téléphone *</label>
                  <input
                    className="input"
                    value={parent.telephone}
                    onChange={(e) => updateParent(index, 'telephone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Téléphone secondaire</label>
                  <input
                    className="input"
                    value={parent.telephone_secondaire}
                    onChange={(e) => updateParent(index, 'telephone_secondaire', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Lien de parenté</label>
                  <select
                    className="input"
                    value={parent.lien_parente}
                    onChange={(e) => updateParent(index, 'lien_parente', e.target.value)}
                  >
                    <option value="pere">Père</option>
                    <option value="mere">Mère</option>
                    <option value="tuteur">Tuteur</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="label">Profession</label>
                  <input
                    className="input"
                    value={parent.profession}
                    onChange={(e) => updateParent(index, 'profession', e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={parent.contact_urgence}
                      onChange={(e) =>
                        updateParent(index, 'contact_urgence', e.target.checked)
                      }
                      className="rounded border-gray-300"
                    />
                    Contact d'urgence
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Enregistrer l\'élève'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
