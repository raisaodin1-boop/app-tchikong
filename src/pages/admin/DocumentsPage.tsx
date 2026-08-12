import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { DocumentOfficielDetail, TypeDocumentOfficiel } from '@shared/types'

const TYPE_LABELS: Record<TypeDocumentOfficiel, string> = {
  attestation_scolarite: 'Attestation de scolarité',
  certificat_frequentation: 'Certificat de fréquentation',
  attestation_reussite: 'Attestation de réussite',
  autre: 'Autre'
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentOfficielDetail[]>([])
  const [recherche, setRecherche] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const load = async () => {
    setDocuments(
      await window.api.listDocumentsOfficiels({
        recherche: recherche || undefined,
        type: typeFilter || undefined,
        limit: 200
      })
    )
  }

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [recherche, typeFilter])

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher par élève, matricule ou numéro..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
        <select className="input sm:w-64" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Type</th>
              <th>Élève</th>
              <th>Matricule</th>
              <th>Généré par</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Aucun document officiel généré. Les attestations sont créées depuis la fiche élève.
                </td>
              </tr>
            ) : (
              documents.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono text-xs">{d.numero}</td>
                  <td>{TYPE_LABELS[d.type] || d.type}</td>
                  <td className="font-medium">{d.eleve_prenom} {d.eleve_nom}</td>
                  <td className="font-mono text-xs text-gray-500">{d.eleve_matricule}</td>
                  <td className="text-gray-500">{d.generateur_nom || '—'}</td>
                  <td className="text-gray-500 text-sm">
                    {new Date(d.generated_at).toLocaleString('fr-FR')}
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
