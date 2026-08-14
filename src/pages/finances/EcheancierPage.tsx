import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { formatDateFr } from '../../lib/dates'
import type { EcheancierPaiement, FraisConfiguration } from '@shared/types'

export default function EcheancierPage() {
  const { token, user } = useAuth()
  const { anneeActive } = useApp()
  const canEdit = user?.role === 'directrice' || user?.role === 'comptable'
  const [modules, setModules] = useState<FraisConfiguration[]>([])
  const [fraisId, setFraisId] = useState(0)
  const [tranches, setTranches] = useState<EcheancierPaiement[]>([])
  const [form, setForm] = useState({ libelle: '', date_limite: '', pourcentage: '40' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!anneeActive) return
    const list = await window.api.listFraisConfigurations(anneeActive.id)
    setModules(list)
    const selected = fraisId || list.find((m: FraisConfiguration) => m.type_frais === 'scolarite')?.id || list[0]?.id || 0
    if (selected && selected !== fraisId) setFraisId(selected)
    if (selected) setTranches(await window.api.listEcheancier(anneeActive.id, selected))
  }

  useEffect(() => {
    void load().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Chargement impossible')
    })
  }, [anneeActive?.id])

  useEffect(() => {
    if (!anneeActive || !fraisId) return
    void window.api.listEcheancier(anneeActive.id, fraisId).then(setTranches)
  }, [fraisId, anneeActive?.id])

  const total = tranches.reduce((sum, t) => sum + t.pourcentage, 0)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token || !anneeActive || !fraisId) return
    setSaving(true)
    setError('')
    try {
      await window.api.upsertEcheance(
        {
          annee_scolaire_id: anneeActive.id,
          frais_modele_id: fraisId,
          libelle: form.libelle,
          date_limite: form.date_limite,
          pourcentage: Number(form.pourcentage)
        },
        token
      )
      setForm({ libelle: '', date_limite: '', pourcentage: String(Math.max(0, 100 - total)) })
      setTranches(await window.api.listEcheancier(anneeActive.id, fraisId))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L'enregistrement a échoué")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    if (!token || !confirm('Supprimer cette tranche ?')) return
    await window.api.deleteEcheance(id, token)
    if (anneeActive) setTranches(await window.api.listEcheancier(anneeActive.id, fraisId))
  }

  if (!anneeActive) {
    return <div className="card p-8 text-center text-gray-400">Aucune année scolaire active.</div>
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-gray-600">
        Découpez un module (souvent la scolarité) en tranches avec date limite. Les paiements
        s’imputent dans l’ordre des échéances.
      </p>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="card p-4">
        <label className="label">Module de frais</label>
        <select className="input max-w-md" value={fraisId} onChange={(e) => setFraisId(Number(e.target.value))}>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.libelle}
            </option>
          ))}
        </select>
      </div>

      {canEdit && (
      <form onSubmit={submit} className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="label">Libellé</label>
          <input
            className="input"
            value={form.libelle}
            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
            required
            placeholder="1ère tranche — septembre"
          />
        </div>
        <div>
          <label className="label">Date limite</label>
          <input
            type="date"
            className="input"
            value={form.date_limite}
            onChange={(e) => setForm({ ...form, date_limite: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Pourcentage</label>
          <input
            type="number"
            className="input"
            min={1}
            max={100}
            value={form.pourcentage}
            onChange={(e) => setForm({ ...form, pourcentage: e.target.value })}
            required
          />
        </div>
        <button type="submit" className="btn-primary btn-sm md:col-span-4" disabled={saving}>
          <Plus className="h-4 w-4" />
          Ajouter la tranche
        </button>
      </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tranche</th>
              <th>Date limite</th>
              <th className="text-right">%</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tranches.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  Aucune tranche. Sans échéancier, le reste dû reste un montant unique.
                </td>
              </tr>
            ) : (
              tranches.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.libelle}</td>
                  <td>{formatDateFr(t.date_limite)}</td>
                  <td className="text-right">{t.pourcentage} %</td>
                  <td>
                    {canEdit && (
                    <button className="btn-icon text-red-500" onClick={() => remove(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                    )}
                  </td>
                </tr>
              ))
            )}
            {tranches.length > 0 && (
              <tr>
                <td colSpan={2} className="font-semibold">
                  Total
                </td>
                <td className={`text-right font-semibold ${total === 100 ? 'text-green-700' : 'text-orange-600'}`}>
                  {total} %
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
