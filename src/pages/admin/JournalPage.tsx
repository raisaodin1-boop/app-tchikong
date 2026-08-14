import { useEffect, useState } from 'react'
import { formatDateTimeFr } from '../../lib/dates'
import type { JournalActiviteDetail } from '@shared/types'

const actionLabels: Record<string, string> = {
  connexion: 'Connexion',
  deconnexion: 'Déconnexion',
  creation: 'Création',
  modification: 'Modification',
  suppression: 'Suppression',
  generation: 'Génération',
  reset_password: 'Réinitialisation mot de passe'
}

const entiteLabels: Record<string, string> = {
  utilisateur: 'Utilisateur',
  enseignant: 'Personnel',
  eleve: 'Élève',
  classe: 'Classe',
  document_officiel: 'Document',
  paiement: 'Paiement'
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalActiviteDetail[]>([])
  const [actionFilter, setActionFilter] = useState('')
  const [entiteFilter, setEntiteFilter] = useState('')

  const load = async () => {
    setEntries(
      await window.api.listJournal({
        action: actionFilter || undefined,
        entite: entiteFilter || undefined,
        limit: 150
      })
    )
  }

  useEffect(() => { load() }, [actionFilter, entiteFilter])

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select className="input sm:w-48" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">Toutes les actions</option>
          {Object.entries(actionLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select className="input sm:w-48" value={entiteFilter} onChange={(e) => setEntiteFilter(e.target.value)}>
          <option value="">Toutes les entités</option>
          {Object.entries(entiteLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Utilisateur</th>
              <th>Action</th>
              <th>Entité</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucune entrée</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id}>
                  <td className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDateTimeFr(e.created_at)}
                  </td>
                  <td className="font-medium">{e.utilisateur_nom || 'Système'}</td>
                  <td>
                    <span className="badge-gray">{actionLabels[e.action] || e.action}</span>
                  </td>
                  <td>{entiteLabels[e.entite] || e.entite}</td>
                  <td className="text-gray-500 text-sm max-w-xs truncate">
                    {e.details || (e.entite_id ? `#${e.entite_id}` : '—')}
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
