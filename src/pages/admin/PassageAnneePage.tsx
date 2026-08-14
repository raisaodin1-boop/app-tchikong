import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, GraduationCap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { AnneeScolaire, CandidatPassage, DecisionPassage, LignePassage } from '@shared/types'

const DECISIONS: { value: DecisionPassage; label: string }[] = [
  { value: 'admission', label: 'Admission' },
  { value: 'redoublement', label: 'Redoublement' },
  { value: 'transfert', label: 'Transfert' },
  { value: 'diplome', label: 'Diplômé / fin de cycle' }
]

type RowState = {
  included: boolean
  decision: DecisionPassage
  classe_id: number
}

export default function PassageAnneePage() {
  const { token } = useAuth()
  const { anneeActive, annees, classes, niveaux } = useApp()
  const [sourceId, setSourceId] = useState(0)
  const [candidats, setCandidats] = useState<CandidatPassage[]>([])
  const [rows, setRows] = useState<Record<number, RowState>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const previousYears = useMemo(
    () => annees.filter((year: AnneeScolaire) => year.id !== anneeActive?.id),
    [annees, anneeActive?.id]
  )

  useEffect(() => {
    if (!sourceId && previousYears[0]) setSourceId(previousYears[0].id)
  }, [previousYears, sourceId])

  const load = async () => {
    if (!anneeActive || !sourceId) return
    setError('')
    const list = await window.api.listCandidatsPassage(sourceId, anneeActive.id)
    setCandidats(list)
    setRows(
      Object.fromEntries(
        list.map((c: CandidatPassage) => [
          c.eleve_id,
          {
            included: !c.deja_inscrit,
            decision: c.decision_suggeree,
            classe_id: c.classe_cible_id ?? 0
          }
        ])
      )
    )
  }

  useEffect(() => {
    void load().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Chargement impossible')
    })
  }, [sourceId, anneeActive?.id])

  const pending = candidats.filter((c) => !c.deja_inscrit)
  const selected = pending.filter((c) => rows[c.eleve_id]?.included)

  const applyAll = (decision: DecisionPassage) => {
    setRows((current) => {
      const next = { ...current }
      for (const c of pending) {
        if (!next[c.eleve_id]?.included) continue
        next[c.eleve_id] = {
          ...next[c.eleve_id],
          decision,
          classe_id:
            decision === 'redoublement'
              ? classes.find((cl) => cl.niveau_id === c.niveau_id && cl.section_id === c.section_id)
                  ?.id ?? next[c.eleve_id].classe_id
              : next[c.eleve_id].classe_id
        }
      }
      return next
    })
  }

  const submit = async () => {
    if (!token || !anneeActive || !sourceId) return
    const lignes: LignePassage[] = selected.map((c) => ({
      eleve_id: c.eleve_id,
      decision: rows[c.eleve_id].decision,
      classe_id: rows[c.eleve_id].classe_id || undefined
    }))
    if (lignes.length === 0) return
    if (!confirm(`Valider le passage de ${lignes.length} élève(s) vers ${anneeActive.libelle} ?`)) {
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await window.api.inscrirePassage(sourceId, anneeActive.id, lignes, token)
      const errText = result.erreurs.length
        ? '\n' +
          result.erreurs
            .map((err: { eleve_id: number; message: string }) => {
              const candidat = candidats.find((c) => c.eleve_id === err.eleve_id)
              return `• ${candidat?.matricule ?? err.eleve_id} : ${err.message}`
            })
            .join('\n')
        : ''
      alert(
        `Terminé : ${result.inscrits} admissions, ${result.redoublants} redoublements, ${result.transferes} transferts, ${result.diplomes} diplômés.` +
          errText
      )
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Le passage a échoué')
    } finally {
      setSaving(false)
    }
  }

  if (!anneeActive) {
    return <div className="card p-8 text-center text-gray-400">Aucune année scolaire active.</div>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Inscrivez les élèves de l’année précédente dans {anneeActive.libelle} : admission, redoublement,
        transfert ou fin de cycle.
      </p>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Année d’origine</label>
          <select className="input" value={sourceId} onChange={(e) => setSourceId(Number(e.target.value))}>
            {previousYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.libelle}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => applyAll('admission')}>
          Tous en admission
        </button>
        <button className="btn-secondary btn-sm" onClick={() => applyAll('redoublement')}>
          Tous en redoublement
        </button>
        <button className="btn-primary btn-sm ml-auto" onClick={submit} disabled={saving || selected.length === 0}>
          <GraduationCap className="h-4 w-4" />
          {saving ? 'Enregistrement...' : `Valider (${selected.length})`}
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Élève</th>
              <th>Classe actuelle</th>
              <th>Décision</th>
              <th>Classe cible</th>
              <th>État</th>
            </tr>
          </thead>
          <tbody>
            {candidats.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Aucun élève à faire passer. Démarrez d’abord la nouvelle année.
                </td>
              </tr>
            ) : (
              candidats.map((c) => {
                const state = rows[c.eleve_id]
                const needsClass = state?.decision === 'admission' || state?.decision === 'redoublement'
                const targetClasses = classes.filter((cl) => {
                  if (state?.decision === 'redoublement') {
                    return cl.niveau_id === c.niveau_id && cl.section_id === c.section_id
                  }
                  if (state?.decision === 'admission') {
                    const dest = niveaux.find((n) => n.id === cl.niveau_id)
                    return cl.section_id === c.section_id && dest?.ordre === c.niveau_ordre + 1
                  }
                  return false
                })
                return (
                  <tr key={c.eleve_id} className={c.deja_inscrit ? 'opacity-50' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={c.deja_inscrit}
                        checked={Boolean(state?.included)}
                        onChange={(e) =>
                          setRows((current) => ({
                            ...current,
                            [c.eleve_id]: { ...current[c.eleve_id], included: e.target.checked }
                          }))
                        }
                      />
                    </td>
                    <td>
                      <p className="font-medium">
                        {c.nom} {c.prenom}
                      </p>
                      <p className="font-mono text-xs text-gray-400">{c.matricule}</p>
                    </td>
                    <td>
                      {c.classe_source_nom}{' '}
                      <span className="badge-gray">{c.section_code}</span>
                    </td>
                    <td>
                      <select
                        className="input py-1 text-sm"
                        disabled={c.deja_inscrit}
                        value={state?.decision ?? c.decision_suggeree}
                        onChange={(e) =>
                          setRows((current) => {
                            const decision = e.target.value as DecisionPassage
                            const nextClasses =
                              decision === 'redoublement'
                                ? classes.filter(
                                    (cl) =>
                                      cl.niveau_id === c.niveau_id && cl.section_id === c.section_id
                                  )
                                : decision === 'admission'
                                  ? classes.filter((cl) => {
                                      const dest = niveaux.find((n) => n.id === cl.niveau_id)
                                      return (
                                        cl.section_id === c.section_id &&
                                        dest?.ordre === c.niveau_ordre + 1
                                      )
                                    })
                                  : []
                            return {
                              ...current,
                              [c.eleve_id]: {
                                ...current[c.eleve_id],
                                decision,
                                classe_id:
                                  decision === 'admission'
                                    ? c.classe_cible_id ?? nextClasses[0]?.id ?? 0
                                    : nextClasses[0]?.id ?? 0
                              }
                            }
                          })
                        }
                      >
                        {DECISIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {needsClass ? (
                        <select
                          className="input py-1 text-sm"
                          disabled={c.deja_inscrit}
                          value={state?.classe_id ?? 0}
                          onChange={(e) =>
                            setRows((current) => ({
                              ...current,
                              [c.eleve_id]: {
                                ...current[c.eleve_id],
                                classe_id: Number(e.target.value)
                              }
                            }))
                          }
                        >
                          <option value={0}>Choisir...</option>
                          {targetClasses.map((cl) => (
                            <option key={cl.id} value={cl.id}>
                              {cl.nom}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td>
                      {c.deja_inscrit ? (
                        <span className="badge-green inline-flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Inscrit
                        </span>
                      ) : (
                        <span className="badge-yellow">À traiter</span>
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
