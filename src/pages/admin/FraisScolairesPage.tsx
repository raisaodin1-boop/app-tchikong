import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type {
  DemoStatus,
  GrilleTarifaireDetail,
  TarifFormData,
  TypeFrais
} from '@shared/types'

const FRAIS_OPTIONS: { value: TypeFrais; label: string }[] = [
  { value: 'scolarite', label: 'Frais de scolarité' },
  { value: 'inscription', label: "Frais d'inscription" },
  { value: 'uniforme', label: 'Uniforme' },
  { value: 'fournitures', label: 'Fournitures' },
  { value: 'examen', label: "Frais d'examen" },
  { value: 'activite', label: 'Activité' },
  { value: 'autre', label: 'Autre frais' }
]

const defaultForm = {
  section_id: 0,
  niveau_id: 0,
  type_frais: 'scolarite' as TypeFrais,
  libelle: 'Frais de scolarité',
  montant: ''
}

export default function FraisScolairesPage() {
  const { user, token } = useAuth()
  const { anneeActive, sections, niveaux } = useApp()
  const [tarifs, setTarifs] = useState<GrilleTarifaireDetail[]>([])
  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [resetting, setResetting] = useState(false)

  const filteredNiveaux = useMemo(
    () => niveaux.filter((niveau) => niveau.section_id === form.section_id),
    [niveaux, form.section_id]
  )

  const load = async () => {
    if (!anneeActive || !token || user?.role !== 'directrice') return
    const [fees, status] = await Promise.all([
      window.api.listGrilleTarifaire(anneeActive.id),
      window.api.getDemoStatus(token)
    ])
    setTarifs(fees)
    setDemoStatus(status)
  }

  useEffect(() => {
    load().catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'Chargement impossible')
    })
  }, [anneeActive?.id, token, user?.role])

  useEffect(() => {
    if (form.section_id || sections.length === 0) return
    const sectionId = sections[0].id
    const niveauId = niveaux.find((niveau) => niveau.section_id === sectionId)?.id ?? 0
    setForm((current) => ({ ...current, section_id: sectionId, niveau_id: niveauId }))
  }, [sections, niveaux, form.section_id])

  const resetForm = () => {
    const sectionId = sections[0]?.id ?? 0
    setEditingId(null)
    setForm({
      ...defaultForm,
      section_id: sectionId,
      niveau_id: niveaux.find((niveau) => niveau.section_id === sectionId)?.id ?? 0
    })
  }

  const handleTypeChange = (type: TypeFrais) => {
    const label = FRAIS_OPTIONS.find((option) => option.value === type)?.label ?? ''
    setForm((current) => ({ ...current, type_frais: type, libelle: label }))
  }

  const handleSectionChange = (sectionId: number) => {
    const niveauId = niveaux.find((niveau) => niveau.section_id === sectionId)?.id ?? 0
    setForm((current) => ({ ...current, section_id: sectionId, niveau_id: niveauId }))
  }

  const editTarif = (tarif: GrilleTarifaireDetail) => {
    setEditingId(tarif.id)
    setForm({
      section_id: tarif.section_id,
      niveau_id: tarif.niveau_id,
      type_frais: tarif.type_frais,
      libelle: tarif.libelle,
      montant: String(tarif.montant)
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveTarif = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!anneeActive || !token) return
    setError('')
    setSaving(true)
    try {
      const data: TarifFormData = {
        annee_scolaire_id: anneeActive.id,
        section_id: form.section_id,
        niveau_id: form.niveau_id,
        type_frais: form.type_frais,
        libelle: form.libelle,
        montant: Number(form.montant)
      }
      await window.api.upsertTarif(data, token)
      resetForm()
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L'enregistrement a échoué")
    } finally {
      setSaving(false)
    }
  }

  const deleteTarif = async (tarif: GrilleTarifaireDetail) => {
    if (!token || !confirm(`Supprimer « ${tarif.libelle} » pour ${tarif.niveau_nom} ?`)) return
    setError('')
    try {
      await window.api.deleteTarif(tarif.id, token)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La suppression a échoué')
    }
  }

  const backup = async () => {
    const result = await window.api.backupDb()
    if (result.success) alert(`Sauvegarde téléchargée : ${result.path}`)
  }

  const exitDemo = async () => {
    if (!token || confirmation !== 'QUITTER DEMO') return
    if (
      !confirm(
        'Dernière confirmation : toutes les données fictives seront définitivement supprimées. Continuer ?'
      )
    ) {
      return
    }
    setResetting(true)
    setError('')
    try {
      const result = await window.api.exitDemoMode(confirmation, token)
      alert(
        `Mode démo quitté : ${result.deleted.eleves} élèves, ${result.deleted.paiements} paiements et ${result.deleted.personnel} personnels fictifs supprimés.`
      )
      window.location.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La sortie du mode démo a échoué')
      setResetting(false)
    }
  }

  if (user?.role !== 'directrice') {
    return <div className="card p-8 text-center text-red-600">Accès réservé à la directrice.</div>
  }
  if (!anneeActive) {
    return <div className="card p-8 text-center text-gray-400">Aucune année scolaire active.</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={saveTarif} className="card p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {editingId ? 'Modifier un frais' : 'Définir un frais'}
            </h2>
            <p className="text-sm text-gray-500">Année scolaire {anneeActive.libelle}</p>
          </div>
          {!editingId && <Plus className="h-5 w-5 text-tchikong-600" />}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label">Section</label>
            <select
              className="input"
              value={form.section_id}
              onChange={(event) => handleSectionChange(Number(event.target.value))}
              required
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Niveau</label>
            <select
              className="input"
              value={form.niveau_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, niveau_id: Number(event.target.value) }))
              }
              required
            >
              {filteredNiveaux.map((niveau) => (
                <option key={niveau.id} value={niveau.id}>
                  {niveau.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type de frais</label>
            <select
              className="input"
              value={form.type_frais}
              onChange={(event) => handleTypeChange(event.target.value as TypeFrais)}
              required
            >
              {FRAIS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Libellé</label>
            <input
              className="input"
              value={form.libelle}
              onChange={(event) =>
                setForm((current) => ({ ...current, libelle: event.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="label">Montant (FCFA)</label>
            <input
              type="number"
              min={1}
              step={1}
              className="input"
              value={form.montant}
              onChange={(event) =>
                setForm((current) => ({ ...current, montant: event.target.value }))
              }
              required
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="btn-primary btn-sm" type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {editingId && (
            <button className="btn-secondary btn-sm" type="button" onClick={resetForm}>
              Annuler
            </button>
          )}
        </div>
      </form>

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
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Aucun frais défini pour cette année scolaire.
                </td>
              </tr>
            ) : (
              tarifs.map((tarif) => (
                <tr key={tarif.id}>
                  <td>
                    <span className="badge-gray">{tarif.section_code}</span>
                  </td>
                  <td>{tarif.niveau_nom}</td>
                  <td>{FRAIS_OPTIONS.find((option) => option.value === tarif.type_frais)?.label}</td>
                  <td className="font-medium">{tarif.libelle}</td>
                  <td className="text-right font-semibold">
                    {new Intl.NumberFormat('fr-FR').format(tarif.montant)} FCFA
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button
                        className="btn-icon"
                        type="button"
                        onClick={() => editTarif(tarif)}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="btn-icon text-red-600"
                        type="button"
                        onClick={() => deleteTarif(tarif)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="card border border-red-200 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <h2 className="font-semibold text-red-800">Mode démonstration</h2>
            {demoStatus?.active ? (
              <>
                <p className="mt-1 text-sm text-gray-600">
                  {demoStatus.eleves} élèves fictifs sont actuellement présents. La sortie conserve
                  les comptes, sections, niveaux, matières, année scolaire et classes.
                </p>
                <button type="button" className="btn-secondary btn-sm mt-3" onClick={backup}>
                  <Save className="h-4 w-4" />
                  Sauvegarder avant de continuer
                </button>
                <div className="mt-4 max-w-md">
                  <label className="label">
                    Saisissez <strong>QUITTER DEMO</strong> pour confirmer
                  </label>
                  <input
                    className="input"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={exitDemo}
                  disabled={confirmation !== 'QUITTER DEMO' || resetting}
                >
                  {resetting ? 'Suppression...' : 'Quitter le mode démo'}
                </button>
              </>
            ) : (
              <p className="mt-1 text-sm font-medium text-green-700">
                Le mode démonstration est désactivé. Les nouvelles données sont des données réelles.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
