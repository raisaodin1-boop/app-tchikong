import { useEffect, useState } from 'react'
import { AlertTriangle, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type {
  DemoStatus,
  FraisConfiguration,
  FraisConfigurationFormData,
  ModeTarification,
  TypeFrais
} from '@shared/types'

const FRAIS_OPTIONS: { value: TypeFrais; label: string }[] = [
  { value: 'scolarite', label: 'Frais de scolarité' },
  { value: 'inscription', label: "Frais d'inscription" },
  { value: 'uniforme', label: 'Tenue scolaire ou sportive' },
  { value: 'fournitures', label: 'Fournitures' },
  { value: 'examen', label: "Frais d'examen" },
  { value: 'activite', label: 'Activité' },
  { value: 'autre', label: 'Autre module' }
]

const formatMoney = (amount: number) =>
  `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`

const emptyForm = {
  type_frais: 'scolarite' as TypeFrais,
  libelle: 'Frais de scolarité',
  mode_tarification: 'par_classe' as ModeTarification,
  montant_unique: '',
  montants: {} as Record<number, string>
}

export default function FraisScolairesPage() {
  const { user, token } = useAuth()
  const { anneeActive, classes } = useApp()
  const [configurations, setConfigurations] = useState<FraisConfiguration[]>([])
  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [copyAmount, setCopyAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [resetting, setResetting] = useState(false)

  const load = async () => {
    if (!anneeActive || !token || user?.role !== 'directrice') return
    const [fees, status] = await Promise.all([
      window.api.listFraisConfigurations(anneeActive.id),
      window.api.getDemoStatus(token)
    ])
    setConfigurations(fees)
    setDemoStatus(status)
  }

  useEffect(() => {
    load().catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'Chargement impossible')
    })
  }, [anneeActive?.id, token, user?.role])

  const resetForm = () => {
    setEditingId(null)
    setCopyAmount('')
    setForm({ ...emptyForm, montants: {} })
  }

  const handleTypeChange = (type: TypeFrais) => {
    const label = FRAIS_OPTIONS.find((option) => option.value === type)?.label ?? ''
    setForm((current) => ({ ...current, type_frais: type, libelle: label }))
  }

  const applyToAllClasses = () => {
    if (!copyAmount || Number(copyAmount) <= 0) return
    setForm((current) => ({
      ...current,
      montants: Object.fromEntries(classes.map((classe) => [classe.id, copyAmount]))
    }))
  }

  const editConfiguration = (configuration: FraisConfiguration) => {
    setEditingId(configuration.id)
    setForm({
      type_frais: configuration.type_frais,
      libelle: configuration.libelle,
      mode_tarification: configuration.mode_tarification,
      montant_unique: configuration.montant_unique
        ? String(configuration.montant_unique)
        : '',
      montants: Object.fromEntries(
        configuration.montants_par_classe.map((amount) => [
          amount.classe_id,
          String(amount.montant)
        ])
      )
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveConfiguration = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!anneeActive || !token) return
    setSaving(true)
    setError('')
    try {
      const payload: FraisConfigurationFormData = {
        id: editingId ?? undefined,
        annee_scolaire_id: anneeActive.id,
        type_frais: form.type_frais,
        libelle: form.libelle,
        mode_tarification: form.mode_tarification,
        montant_unique:
          form.mode_tarification === 'unique' ? Number(form.montant_unique) : undefined,
        montants_par_classe:
          form.mode_tarification === 'par_classe'
            ? classes.map((classe) => ({
                classe_id: classe.id,
                montant: Number(form.montants[classe.id] || 0)
              }))
            : undefined
      }
      await window.api.upsertFraisConfiguration(payload, token)
      resetForm()
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L'enregistrement a échoué")
    } finally {
      setSaving(false)
    }
  }

  const deleteConfiguration = async (configuration: FraisConfiguration) => {
    if (!token || !confirm(`Supprimer le module « ${configuration.libelle} » ?`)) return
    setError('')
    try {
      await window.api.deleteFraisConfiguration(configuration.id, token)
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

      <form onSubmit={saveConfiguration} className="card p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {editingId ? 'Modifier un module' : 'Ajouter un module à payer'}
            </h2>
            <p className="text-sm text-gray-500">
              Configuration {anneeActive.libelle} — tous les montants sont obligatoires
            </p>
          </div>
          {!editingId && <Plus className="h-5 w-5 text-tchikong-600" />}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label">Catégorie</label>
            <select
              className="input"
              value={form.type_frais}
              onChange={(event) => handleTypeChange(event.target.value as TypeFrais)}
            >
              {FRAIS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nom affiché du module</label>
            <input
              className="input"
              value={form.libelle}
              onChange={(event) =>
                setForm((current) => ({ ...current, libelle: event.target.value }))
              }
              placeholder="Ex. Tenue de sport, Assurance..."
              required
            />
          </div>
          <div>
            <label className="label">Méthode de tarification</label>
            <select
              className="input"
              value={form.mode_tarification}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  mode_tarification: event.target.value as ModeTarification
                }))
              }
            >
              <option value="unique">Prix unique — toutes les classes</option>
              <option value="par_classe">Prix différent par classe</option>
            </select>
          </div>
        </div>

        {form.mode_tarification === 'unique' ? (
          <div className="mt-4 max-w-xs">
            <label className="label">Prix unique (FCFA)</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.montant_unique}
              onChange={(event) =>
                setForm((current) => ({ ...current, montant_unique: event.target.value }))
              }
              required
            />
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <div>
                <label className="label">Même montant à préremplir</label>
                <input
                  type="number"
                  min={1}
                  className="input w-48"
                  value={copyAmount}
                  onChange={(event) => setCopyAmount(event.target.value)}
                  placeholder="Montant"
                />
              </div>
              <button type="button" className="btn-secondary btn-sm" onClick={applyToAllClasses}>
                Appliquer à toutes les classes
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((classe) => (
                <label
                  key={classe.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <span className="text-sm font-medium">
                    {classe.nom}{' '}
                    <span className="text-xs text-gray-400">({classe.section_code})</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="input w-32"
                    value={form.montants[classe.id] ?? ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        montants: {
                          ...current.montants,
                          [classe.id]: event.target.value
                        }
                      }))
                    }
                    placeholder="FCFA"
                    required
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button className="btn-primary btn-sm" type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer le module'}
          </button>
          {editingId && (
            <button className="btn-secondary btn-sm" type="button" onClick={resetForm}>
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {configurations.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            Aucun module configuré. Ajoutez la scolarité, les tenues, les fournitures et les autres
            frais avant de commencer les encaissements.
          </div>
        ) : (
          configurations.map((configuration) => (
            <article key={configuration.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{configuration.libelle}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {configuration.mode_tarification === 'unique'
                      ? `Prix unique : ${formatMoney(configuration.montant_unique || 0)}`
                      : `Prix par classe — ${configuration.montants_par_classe.length} classes`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => editConfiguration(configuration)}
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon text-red-600"
                    onClick={() => deleteConfiguration(configuration)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {configuration.mode_tarification === 'par_classe' && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 md:grid-cols-4">
                  {configuration.montants_par_classe.map((amount) => (
                    <div key={amount.classe_id} className="text-sm">
                      <span className="text-gray-500">{amount.classe_nom} :</span>{' '}
                      <span className="font-medium">{formatMoney(amount.montant)}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <section className="card border border-red-200 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <h2 className="font-semibold text-red-800">Mode démonstration</h2>
            {demoStatus?.active ? (
              <>
                <p className="mt-1 text-sm text-gray-600">
                  {demoStatus.eleves} élèves fictifs sont présents. Les comptes, référentiels,
                  année scolaire et classes seront conservés.
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
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  onClick={exitDemo}
                  disabled={confirmation !== 'QUITTER DEMO' || resetting}
                >
                  {resetting ? 'Suppression...' : 'Quitter le mode démo'}
                </button>
              </>
            ) : (
              <p className="mt-1 text-sm font-medium text-green-700">
                Le mode démonstration est désactivé.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
