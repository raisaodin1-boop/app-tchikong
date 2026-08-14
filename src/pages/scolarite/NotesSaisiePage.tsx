import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { Matiere, NoteInput, NotesGrid, PeriodeEvaluation } from '@shared/types'

export default function NotesSaisiePage() {
  const { token } = useAuth()
  const { anneeActive, classes } = useApp()
  const [classeId, setClasseId] = useState(0)
  const [periodeId, setPeriodeId] = useState(0)
  const [matiereId, setMatiereId] = useState(0)
  const [periodes, setPeriodes] = useState<PeriodeEvaluation[]>([])
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [grid, setGrid] = useState<NotesGrid | null>(null)
  const [notes, setNotes] = useState<Record<number, { valeur: string; appreciation: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (classes.length > 0 && !classeId) setClasseId(classes[0].id)
  }, [classes, classeId])

  useEffect(() => {
    if (!anneeActive) return
    window.api.listPeriodes(anneeActive.id).then(setPeriodes)
  }, [anneeActive])

  useEffect(() => {
    if (periodes.length > 0 && !periodeId) setPeriodeId(periodes[0].id)
  }, [periodes, periodeId])

  useEffect(() => {
    if (!classeId) return
    const classe = classes.find((c) => c.id === classeId)
    if (classe) {
      window.api.listMatieres(classe.section_id).then((m: Matiere[]) => {
        setMatieres(m)
        if (m.length > 0 && !matiereId) setMatiereId(m[0].id)
      })
    }
  }, [classeId, classes])

  useEffect(() => {
    if (!classeId || !periodeId) return
    let cancelled = false
    setGrid(null)
    setNotes({})
    setSaved(false)
    window.api.getNotesGrid(classeId, periodeId).then((g: NotesGrid | null) => {
      if (cancelled) return
      setGrid(g)
      if (g && matiereId) {
        const initial: Record<number, { valeur: string; appreciation: string }> = {}
        for (const e of g.eleves) {
          const note = g.notes[`${e.eleve_id}-${matiereId}`]
          initial[e.eleve_id] = {
            valeur: note ? String(note.valeur) : '',
            appreciation: note?.appreciation || ''
          }
        }
        setNotes(initial)
      } else {
        setNotes({})
      }
    })
    return () => {
      cancelled = true
    }
  }, [classeId, periodeId, matiereId])

  const handleSave = async () => {
    if (!token || !classeId || !periodeId || !matiereId) return
    setSaving(true)

    const noteInputs: NoteInput[] = Object.entries(notes).map(([eleveId, n]) => {
      const raw = n.valeur.trim()
      if (raw === '') {
        return { eleve_id: Number(eleveId), valeur: Number.NaN, appreciation: n.appreciation || undefined }
      }
      return {
        eleve_id: Number(eleveId),
        valeur: Number(raw),
        note_sur: 20,
        appreciation: n.appreciation || undefined
      }
    })

    const invalid = noteInputs.find(
      (n) => !Number.isNaN(n.valeur) && (n.valeur < 0 || n.valeur > 20)
    )
    if (invalid) {
      alert('Les notes doivent être comprises entre 0 et 20')
      setSaving(false)
      return
    }

    try {
      await window.api.saveNotes(classeId, periodeId, matiereId, noteInputs, token)
      setSaved(true)
    } catch (err) {
      alert((err as Error).message || 'Erreur lors de l\'enregistrement des notes')
    } finally {
      setSaving(false)
    }
  }

  const selectedMatiere = matieres.find((m) => m.id === matiereId)

  return (
    <div>
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Classe</label>
            <select
              className="input"
              value={classeId}
              onChange={(e) => {
                setClasseId(Number(e.target.value))
                setMatiereId(0)
              }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.section_code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Période</label>
            <select
              className="input"
              value={periodeId}
              onChange={(e) => setPeriodeId(Number(e.target.value))}
            >
              {periodes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.libelle} ({p.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Matière</label>
            <select
              className="input"
              value={matiereId}
              onChange={(e) => setMatiereId(Number(e.target.value))}
            >
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom} (coef. {m.coefficient})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {selectedMatiere && (
            <>
              Saisie pour <strong>{selectedMatiere.nom}</strong> — notes sur 20
            </>
          )}
        </p>
        <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Enregistrer les notes'}
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-12">N°</th>
              <th>Matricule</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th className="w-28">Note /20</th>
              <th>Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {!grid || grid.eleves.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Aucun élève dans cette classe
                </td>
              </tr>
            ) : (
              grid.eleves.map((e, i) => (
                <tr key={e.eleve_id}>
                  <td className="text-gray-400">{i + 1}</td>
                  <td className="font-mono text-xs">{e.matricule}</td>
                  <td className="font-medium">{e.nom}</td>
                  <td>{e.prenom}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      className="input py-1 text-center"
                      value={notes[e.eleve_id]?.valeur ?? ''}
                      onChange={(ev) => {
                        const v = ev.target.value
                        if (v !== '' && (Number(v) < 0 || Number(v) > 20)) return
                        setNotes((prev) => ({
                          ...prev,
                          [e.eleve_id]: {
                            ...prev[e.eleve_id],
                            valeur: v
                          }
                        }))
                        setSaved(false)
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input py-1 text-sm"
                      placeholder="Optionnel"
                      value={notes[e.eleve_id]?.appreciation ?? ''}
                      onChange={(ev) => {
                        setNotes((prev) => ({
                          ...prev,
                          [e.eleve_id]: {
                            ...prev[e.eleve_id],
                            appreciation: ev.target.value
                          }
                        }))
                        setSaved(false)
                      }}
                    />
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
