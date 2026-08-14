import { useEffect, useState } from 'react'
import { Printer, FileDown, Phone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../contexts/AppContext'
import { formatMoney } from '../../lib/money'
import type { ImpayeEleve } from '@shared/types'

export default function ImpayesPage() {
  const { anneeActive, classes } = useApp()
  const navigate = useNavigate()
  const [impayes, setImpayes] = useState<ImpayeEleve[]>([])
  const [classeId, setClasseId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!anneeActive) return
    setLoading(true)
    window.api.listImpayes(anneeActive.id, classeId || undefined).then((data: ImpayeEleve[]) => {
      setImpayes(data)
      setLoading(false)
    })
  }, [anneeActive?.id, classeId])

  const totalReste = impayes.reduce((s, i) => s + i.reste, 0)

  const handleExport = async (action: 'save' | 'print') => {
    if (!anneeActive) return
    setExporting(true)
    const result = await window.api.exportImpayesPdf(
      anneeActive.id,
      anneeActive.libelle,
      action,
      classeId || undefined
    )
    if (result.success && action === 'save' && result.path) {
      alert(`Liste enregistrée : ${result.path}`)
    }
    setExporting(false)
  }

  return (
    <div>
      <div className="card p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
          <div className="w-full md:w-64">
            <label className="label">Filtrer par classe</label>
            <select
              className="input"
              value={classeId}
              onChange={(e) => setClasseId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-accent-red">{formatMoney(totalReste)}</p>
            <p className="text-sm text-gray-500">{impayes.length} élève(s) en impayé</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" onClick={() => handleExport('print')} disabled={exporting || impayes.length === 0}>
              <Printer className="h-4 w-4" /> Imprimer
            </button>
            <button className="btn-primary btn-sm" onClick={() => handleExport('save')} disabled={exporting || impayes.length === 0}>
              <FileDown className="h-4 w-4" /> Exporter PDF
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Classe</th>
              <th>Contact</th>
              <th className="text-right">Total dû</th>
              <th className="text-right">Payé</th>
              <th className="text-right">Reste</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Chargement...</td></tr>
            ) : impayes.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">
                Aucun impayé — tous les élèves sont à jour !
              </td></tr>
            ) : (
              impayes.map((i) => (
                <tr
                  key={i.eleve_id}
                  onClick={() => navigate(`/finances/paiement?eleve=${i.eleve_id}`)}
                  title="Enregistrer un paiement"
                >
                  <td className="font-mono text-xs">{i.matricule}</td>
                  <td className="font-medium">{i.nom}</td>
                  <td>{i.prenom}</td>
                  <td>{i.classe_nom} <span className="badge-blue text-[10px]">{i.section_code}</span></td>
                  <td>
                    {i.telephone ? (
                      <span className="flex items-center gap-1 text-xs">
                        <Phone className="h-3 w-3" /> {i.telephone}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="text-right">{formatMoney(i.total_du)}</td>
                  <td className="text-right text-accent-green">{formatMoney(i.total_paye)}</td>
                  <td className="text-right font-bold text-accent-red">{formatMoney(i.reste)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
