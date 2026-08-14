import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { AffectationDetail, EmploiDuTempsDetail, Enseignant, Matiere } from '@shared/types'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const SLOTS = [
  ['07:30', '08:30'],
  ['08:30', '09:30'],
  ['09:30', '10:30'],
  ['10:45', '11:45'],
  ['11:45', '12:45'],
  ['13:30', '14:30'],
  ['14:30', '15:30']
]

export default function EmploiDuTempsPage() {
  const { token } = useAuth()
  const { anneeActive, classes } = useApp()
  const [classeId, setClasseId] = useState(0)
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [enseignants, setEnseignants] = useState<Enseignant[]>([])
  const [slots, setSlots] = useState<EmploiDuTempsDetail[]>([])
  const [affectations, setAffectations] = useState<AffectationDetail[]>([])
  const [form, setForm] = useState({
    jour: 1,
    heure_debut: '07:30',
    heure_fin: '08:30',
    matiere_id: 0,
    enseignant_id: 0
  })
  const [error, setError] = useState('')

  const classe = classes.find((c) => c.id === classeId)

  useEffect(() => {
    if (classes[0] && !classeId) setClasseId(classes[0].id)
  }, [classes, classeId])

  const load = async () => {
    if (!classeId || !anneeActive) return
    const current = classes.find((c) => c.id === classeId)
    const [emploi, aff, personnel, mats] = await Promise.all([
      window.api.listEmploiDuTemps(classeId),
      window.api.listAffectations(anneeActive.id),
      window.api.listPersonnel(true),
      current ? window.api.listMatieres(current.section_id) : Promise.resolve([])
    ])
    setSlots(emploi)
    setAffectations(aff.filter((a: AffectationDetail) => a.classe_id === classeId))
    setEnseignants(personnel.filter((p: Enseignant) => p.poste === 'enseignant' || p.poste === 'directrice'))
    setMatieres(mats)
    if (mats[0] && !form.matiere_id) setForm((f) => ({ ...f, matiere_id: mats[0].id }))
  }

  useEffect(() => {
    void load().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Chargement impossible')
    })
  }, [classeId, anneeActive?.id])

  const addSlot = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token || !classeId || !form.matiere_id) return
    setError('')
    try {
      await window.api.upsertEmploiDuTemps(
        {
          classe_id: classeId,
          jour: form.jour,
          heure_debut: form.heure_debut,
          heure_fin: form.heure_fin,
          matiere_id: form.matiere_id,
          enseignant_id: form.enseignant_id || null
        },
        token
      )
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d'ajouter le créneau")
    }
  }

  const remove = async (id: number) => {
    if (!token || !confirm('Supprimer ce créneau ?')) return
    await window.api.deleteEmploiDuTemps(id, token)
    await load()
  }

  const cell = (jour: number, debut: string) =>
    slots.find((s) => s.jour === jour && s.heure_debut === debut)

  if (!anneeActive) {
    return <div className="card p-8 text-center text-gray-400">Aucune année scolaire active.</div>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="card p-4">
        <label className="label">Classe</label>
        <select className="input max-w-xs" value={classeId} onChange={(e) => setClasseId(Number(e.target.value))}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom} ({c.section_code})
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={addSlot} className="card p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div>
          <label className="label">Jour</label>
          <select className="input" value={form.jour} onChange={(e) => setForm({ ...form, jour: Number(e.target.value) })}>
            {JOURS.map((j, i) => (
              <option key={j} value={i + 1}>
                {j}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Début</label>
          <select
            className="input"
            value={form.heure_debut}
            onChange={(e) => {
              const slot = SLOTS.find((s) => s[0] === e.target.value)
              setForm({ ...form, heure_debut: e.target.value, heure_fin: slot?.[1] ?? form.heure_fin })
            }}
          >
            {SLOTS.map((s) => (
              <option key={s[0]} value={s[0]}>
                {s[0]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Fin</label>
          <input
            className="input"
            value={form.heure_fin}
            onChange={(e) => setForm({ ...form, heure_fin: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Matière</label>
          <select
            className="input"
            value={form.matiere_id}
            onChange={(e) => setForm({ ...form, matiere_id: Number(e.target.value) })}
          >
            {matieres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Enseignant</label>
          <select
            className="input"
            value={form.enseignant_id}
            onChange={(e) => setForm({ ...form, enseignant_id: Number(e.target.value) })}
          >
            <option value={0}>—</option>
            {enseignants.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom} {e.prenom}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary btn-sm">
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </form>

      <div className="overflow-x-auto card">
        <table className="data-table text-xs">
          <thead>
            <tr>
              <th>Horaire</th>
              {JOURS.map((j) => (
                <th key={j}>{j}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(([debut, fin]) => (
              <tr key={debut}>
                <td className="whitespace-nowrap font-medium">
                  {debut}–{fin}
                </td>
                {JOURS.map((_, index) => {
                  const item = cell(index + 1, debut)
                  return (
                    <td key={index} className="align-top min-w-[120px]">
                      {item ? (
                        <div className="rounded bg-tchikong-50 p-1.5">
                          <p className="font-semibold text-tchikong-800">{item.matiere_nom}</p>
                          <p className="text-gray-500">{item.enseignant_nom || '—'}</p>
                          <button className="text-red-500 mt-1" onClick={() => remove(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300">·</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3">Affectations {classe ? `— ${classe.nom}` : ''}</h3>
        {affectations.length === 0 ? (
          <p className="text-sm text-gray-400">
            Les enseignants sont aussi enregistrés comme affectés lorsqu’un créneau est ajouté.
          </p>
        ) : (
          <ul className="text-sm space-y-1">
            {affectations.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{a.enseignant_nom}</span> — {a.matiere_nom}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
