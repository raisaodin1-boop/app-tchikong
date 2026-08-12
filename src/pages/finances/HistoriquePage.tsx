import { useEffect, useState } from 'react'
import { Search, Printer, FileDown } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { Paiement, TypeFrais } from '@shared/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

const TYPE_LABELS: Record<TypeFrais, string> = {
  scolarite: 'Scolarité',
  inscription: 'Inscription',
  uniforme: 'Uniforme',
  fournitures: 'Fournitures',
  examen: 'Examen',
  activite: 'Activités',
  autre: 'Autre'
}

export default function HistoriquePage() {
  const { anneeActive } = useApp()
  const [paiements, setPaiements] = useState<(Paiement & { nom: string; prenom: string; matricule: string; classe_nom: string })[]>([])
  const [recherche, setRecherche] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!anneeActive) return
    setLoading(true)
    const data = await window.api.listPaiements({
      annee_scolaire_id: anneeActive.id,
      recherche: recherche || undefined
    })
    setPaiements(data)
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [anneeActive?.id, recherche])

  const handleRecu = async (id: number, action: 'save' | 'print') => {
    const result = await window.api.exportRecuPdf(id, action)
    if (result.success && action === 'save' && result.path) {
      alert(`Reçu enregistré : ${result.path}`)
    }
  }

  const total = paiements.reduce((s, p) => s + p.montant, 0)

  return (
    <div>
      <div className="card p-4 mb-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher par nom, matricule ou n° reçu..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
        <p className="text-sm text-gray-500 whitespace-nowrap">
          {paiements.length} paiement(s) — Total : <strong>{formatMoney(total)}</strong>
        </p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>N° Reçu</th>
              <th>Élève</th>
              <th>Classe</th>
              <th>Type</th>
              <th>Mode</th>
              <th className="text-right">Montant</th>
              <th className="w-24">Reçu</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Chargement...</td></tr>
            ) : paiements.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Aucun paiement trouvé</td></tr>
            ) : (
              paiements.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                  <td className="font-mono text-xs">{p.numero_recu}</td>
                  <td className="font-medium">{p.nom} {p.prenom}</td>
                  <td>{p.classe_nom}</td>
                  <td><span className="badge-blue">{TYPE_LABELS[p.type_frais]}</span></td>
                  <td className="text-xs capitalize">{p.mode_paiement.replace('_', ' ')}</td>
                  <td className="text-right font-semibold text-accent-green">{formatMoney(p.montant)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secondary btn-sm px-2" onClick={() => handleRecu(p.id, 'print')} title="Imprimer">
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button className="btn-secondary btn-sm px-2" onClick={() => handleRecu(p.id, 'save')} title="PDF">
                        <FileDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
