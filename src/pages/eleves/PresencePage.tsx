import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { Inscription, MotifAbsence, PresenceEleve } from '@shared/types'
import { Save, Check, X } from 'lucide-react'
import { todayIso } from '../../lib/dates'

const motifOptions: { value: MotifAbsence; label: string }[] = [
  { value: 'maladie', label: 'Maladie' },
  { value: 'raison_familiale', label: 'Raison familiale' },
  { value: 'autorisation', label: 'Autorisation' },
  { value: 'sans_motif', label: 'Sans motif' },
  { value: 'autre', label: 'Autre' }
]

export default function PresencePage() {
  const { token } = useAuth()
  const { anneeActive, classes } = useApp()
  const [classeId, setClasseId] = useState<number>(0)
  const [date, setDate] = useState(todayIso())
  const [eleves, setEleves] = useState<Inscription[]>([])
  const [presences, setPresences] = useState<
    Record<number, { present: boolean; motif?: MotifAbsence; notes?: string }>
  >({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (classes.length > 0 && !classeId) {
      setClasseId(classes[0].id)
    }
  }, [classes, classeId])

  useEffect(() => {
    if (!classeId || !anneeActive) return

    const load = async () => {
      const [elevesList, existingPresences] = await Promise.all([
        window.api.listEleves({
          annee_scolaire_id: anneeActive.id,
          classe_id: classeId,
          statut: 'actif'
        }),
        window.api.getPresences(classeId, date)
      ])

      setEleves(elevesList)

      const map: Record<number, { present: boolean; motif?: MotifAbsence; notes?: string }> = {}
      for (const e of elevesList) {
        const existing = existingPresences.find((p: PresenceEleve) => p.eleve_id === e.eleve_id)
        map[e.eleve_id] = {
          present: existing ? Boolean(existing.present) : true,
          motif: existing?.motif_absence ?? undefined,
          notes: existing?.notes ?? undefined
        }
      }
      setPresences(map)
      setSaved(false)
    }

    load()
  }, [classeId, date, anneeActive])

  const togglePresent = (eleveId: number) => {
    setPresences((prev) => ({
      ...prev,
      [eleveId]: {
        ...prev[eleveId],
        present: !prev[eleveId]?.present
      }
    }))
    setSaved(false)
  }

  const markAllPresent = () => {
    const map: typeof presences = {}
    for (const e of eleves) {
      map[e.eleve_id] = { present: true }
    }
    setPresences(map)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!token || !classeId) return
    setSaving(true)
    setError('')
    try {
      await window.api.savePresences(
        {
          classe_id: classeId,
          date,
          presences: eleves.map((e) => ({
            eleve_id: e.eleve_id,
            present: presences[e.eleve_id]?.present ?? true,
            motif_absence: presences[e.eleve_id]?.motif,
            notes: presences[e.eleve_id]?.notes
          }))
        },
        token
      )
      setSaved(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'L’enregistrement a échoué')
    } finally {
      setSaving(false)
    }
  }

  const absents = eleves.filter((e) => !presences[e.eleve_id]?.present).length
  const presents = eleves.length - absents

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registre de présence</h1>
          <p className="text-sm text-gray-500">
            {presents} présent{presents !== 1 ? 's' : ''} · {absents} absent
            {absents !== 1 ? 's' : ''}
          </p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={markAllPresent}>
            Tout marquer présent
          </button>
          <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Classe</label>
            <select
              className="input"
              value={classeId}
              onChange={(e) => setClasseId(Number(e.target.value))}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.section_code}) — {c.effectif} élèves
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-12">N°</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th className="w-24 text-center">Présent</th>
              <th>Motif d'absence</th>
            </tr>
          </thead>
          <tbody>
            {eleves.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Aucun élève dans cette classe
                </td>
              </tr>
            ) : (
              eleves.map((e, i) => {
                const p = presences[e.eleve_id]
                return (
                  <tr key={e.eleve_id}>
                    <td className="text-gray-400">{i + 1}</td>
                    <td className="font-medium">{e.nom}</td>
                    <td>{e.prenom}</td>
                    <td className="text-center">
                      <button
                        onClick={() => togglePresent(e.eleve_id)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                          p?.present
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {p?.present ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td>
                      {!p?.present && (
                        <select
                          className="input py-1 text-xs"
                          value={p?.motif || ''}
                          onChange={(ev) => {
                            setPresences((prev) => ({
                              ...prev,
                              [e.eleve_id]: {
                                ...prev[e.eleve_id],
                                motif: ev.target.value as MotifAbsence
                              }
                            }))
                            setSaved(false)
                          }}
                        >
                          <option value="">Sélectionner...</option>
                          {motifOptions.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      )}
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
