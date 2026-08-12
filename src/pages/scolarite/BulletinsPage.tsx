import { useEffect, useState } from 'react'
import { Award, FileDown, Medal, RefreshCw, Printer, Sparkles, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { Bulletin, EleveMoyenne, PeriodeEvaluation } from '@shared/types'

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

type BulletinRow = {
  eleve_id: number
  nom: string
  prenom: string
  matricule: string
  moyenne: number
  rang: number
  mention: string
  appreciation: string
}

export default function BulletinsPage() {
  const { token } = useAuth()
  const { anneeActive, classes } = useApp()
  const [classeId, setClasseId] = useState(0)
  const [periodeId, setPeriodeId] = useState(0)
  const [periodes, setPeriodes] = useState<PeriodeEvaluation[]>([])
  const [rows, setRows] = useState<BulletinRow[]>([])
  const [appreciations, setAppreciations] = useState<Record<number, string>>({})
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState<number | null>(null)

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

  const loadData = async () => {
    if (!classeId || !periodeId) return
    const [moyennes, bulletins] = await Promise.all([
      window.api.getMoyennesClasse(classeId, periodeId) as Promise<EleveMoyenne[]>,
      window.api.listBulletinsClasse(classeId, periodeId) as Promise<
        (Bulletin & { nom: string; prenom: string; matricule: string })[]
      >
    ])

    if (bulletins.length > 0) {
      setAppreciations(
        Object.fromEntries(
          bulletins.map((bulletin) => [
            bulletin.eleve_id,
            bulletin.appreciation_maitre || ''
          ])
        )
      )
      setRows(
        bulletins.map((b) => ({
          eleve_id: b.eleve_id,
          nom: b.nom,
          prenom: b.prenom,
          matricule: b.matricule,
          moyenne: b.moyenne_generale,
          rang: b.rang,
          mention: b.mention,
          appreciation: b.appreciation_maitre || ''
        }))
      )
    } else {
      setRows(
        moyennes
          .filter((m) => m.details.length > 0)
          .map((m) => ({
            eleve_id: m.eleve_id,
            nom: m.nom,
            prenom: m.prenom,
            matricule: m.matricule,
            moyenne: m.moyenne,
            rang: m.rang,
            mention: m.mention,
            appreciation: ''
          }))
      )
    }
  }

  useEffect(() => {
    loadData()
  }, [classeId, periodeId])

  const handleGenerer = async () => {
    if (!token || !classeId || !periodeId) return
    setGenerating(true)
    try {
      await window.api.genererBulletins(classeId, periodeId, appreciations, token)
      await loadData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'La génération des bulletins a échoué')
    } finally {
      setGenerating(false)
    }
  }

  const handleExportPdf = async (eleveId: number, action: 'save' | 'print') => {
    setExporting(eleveId)
    try {
      const result = await window.api.exportBulletinPdf(eleveId, periodeId, action)
      if (result.success) {
        if (action === 'save' && result.path) alert(`Bulletin enregistré : ${result.path}`)
      } else if (result.error) {
        alert(result.error)
      }
    } finally {
      setExporting(null)
    }
  }

  const classAverage =
    rows.length > 0 ? rows.reduce((sum, row) => sum + row.moyenne, 0) / rows.length : 0

  return (
    <div>
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-tchikong-700 via-tchikong-600 to-blue-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-3">
            <Sparkles className="h-7 w-7 text-yellow-300" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
              Édition premium certifiée
            </p>
            <h2 className="text-2xl font-bold">Studio des bulletins</h2>
            <p className="mt-1 text-sm text-blue-100">
              Classement, statistiques comparatives, appréciations et QR d’authenticité
            </p>
          </div>
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

      <div className="flex gap-2 mb-4">
        <button className="btn-primary btn-sm" onClick={handleGenerer} disabled={generating}>
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Génération...' : 'Calculer moyennes et générer bulletins'}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="card flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-blue-600" />
            <div><p className="text-xs text-gray-400">Effectif évalué</p><p className="text-xl font-bold">{rows.length}</p></div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <Award className="h-8 w-8 text-tchikong-600" />
            <div><p className="text-xs text-gray-400">Moyenne de classe</p><p className="text-xl font-bold">{classAverage.toFixed(2)}/20</p></div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <Medal className="h-8 w-8 text-yellow-500" />
            <div><p className="text-xs text-gray-400">Meilleure moyenne</p><p className="text-xl font-bold">{Math.max(...rows.map((row) => row.moyenne)).toFixed(2)}/20</p></div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          Aucune note saisie pour cette classe et période. Commencez par la saisie des notes.
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rang</th>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Moyenne</th>
                <th>Mention</th>
                <th>Appréciation maître</th>
                <th className="w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.eleve_id}>
                  <td className="font-bold text-tchikong-500">{row.rang}</td>
                  <td className="font-mono text-xs">{row.matricule}</td>
                  <td className="font-medium">{row.nom}</td>
                  <td>{row.prenom}</td>
                  <td className="font-semibold">{row.moyenne.toFixed(2)}</td>
                  <td>
                    <span className={mentionBadges[row.mention] || 'badge-gray'}>
                      {mentionLabels[row.mention] || row.mention}
                    </span>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input py-1 text-xs"
                      placeholder="Appréciation..."
                      value={appreciations[row.eleve_id] ?? ''}
                      onChange={(e) =>
                        setAppreciations((prev) => ({
                          ...prev,
                          [row.eleve_id]: e.target.value
                        }))
                      }
                    />
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => handleExportPdf(row.eleve_id, 'print')}
                        disabled={exporting === row.eleve_id}
                        title="Imprimer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => handleExportPdf(row.eleve_id, 'save')}
                        disabled={exporting === row.eleve_id}
                        title="Enregistrer PDF"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
