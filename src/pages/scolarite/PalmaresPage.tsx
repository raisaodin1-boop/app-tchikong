import { useEffect, useState } from 'react'
import { FileDown, Trophy } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { EleveMoyenne, PeriodeEvaluation } from '@shared/types'

const mentionLabels: Record<string, string> = {
  felicitations: 'Félicitations',
  encouragements: 'Encouragements',
  avertissement: 'Avertissement',
  blame: 'Blâme',
  aucune: '—'
}

const mentionBadges: Record<string, string> = {
  felicitations: 'badge-green',
  encouragements: 'badge-blue',
  avertissement: 'badge-yellow',
  blame: 'badge-red',
  aucune: 'badge-gray'
}

export default function PalmaresPage() {
  const { anneeActive, classes } = useApp()
  const [classeId, setClasseId] = useState(0)
  const [periodeId, setPeriodeId] = useState(0)
  const [periodes, setPeriodes] = useState<PeriodeEvaluation[]>([])
  const [palmares, setPalmares] = useState<EleveMoyenne[]>([])
  const [exporting, setExporting] = useState(false)

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
    if (!classeId || !periodeId) return
    window.api.getPalmares(classeId, periodeId).then(setPalmares)
  }, [classeId, periodeId])

  const selectedClasse = classes.find((c) => c.id === classeId)

  const handleExport = async () => {
    setExporting(true)
    const result = await window.api.exportPalmaresPdf(
      classeId,
      periodeId,
      selectedClasse?.nom,
      anneeActive?.libelle
    )
    if (result.success) alert(`Palmarès enregistré : ${result.path}`)
    setExporting(false)
  }

  const moyenneClasse =
    palmares.length > 0
      ? palmares.reduce((s, p) => s + p.moyenne, 0) / palmares.length
      : 0

  return (
    <div>
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
        </div>
      </div>

      {palmares.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="card p-4 text-center">
            <p className="text-sm text-gray-500">Effectif classé</p>
            <p className="text-2xl font-bold text-tchikong-500">{palmares.length}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-sm text-gray-500">Moyenne de classe</p>
            <p className="text-2xl font-bold">{moyenneClasse.toFixed(2)} / 20</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-sm text-gray-500">Meilleure moyenne</p>
            <p className="text-2xl font-bold text-accent-green">
              {palmares[0]?.moyenne.toFixed(2)} / 20
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          className="btn-primary btn-sm"
          onClick={handleExport}
          disabled={exporting || palmares.length === 0}
        >
          <FileDown className="h-4 w-4" />
          {exporting ? 'Export...' : 'Exporter le palmarès (PDF)'}
        </button>
      </div>

      {palmares.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <Trophy className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          Aucune note disponible pour générer le palmarès
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">Rang</th>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Moyenne /20</th>
                <th>Mention</th>
                <th>Matières notées</th>
              </tr>
            </thead>
            <tbody>
              {palmares.map((p, i) => (
                <tr key={p.eleve_id} className={i < 3 ? 'bg-yellow-50/50' : ''}>
                  <td>
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0
                          ? 'bg-yellow-400 text-yellow-900'
                          : i === 1
                            ? 'bg-gray-300 text-gray-700'
                            : i === 2
                              ? 'bg-amber-600 text-white'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.rang}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{p.matricule}</td>
                  <td className="font-medium">{p.nom}</td>
                  <td>{p.prenom}</td>
                  <td className="font-bold text-lg">{p.moyenne.toFixed(2)}</td>
                  <td>
                    <span className={mentionBadges[p.mention]}>
                      {mentionLabels[p.mention]}
                    </span>
                  </td>
                  <td className="text-gray-500">{p.details.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
