import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Phone, MapPin, Calendar, User } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { Eleve, Inscription, ParentTuteur, HistoriqueEleve } from '@shared/types'

const lienLabels: Record<string, string> = {
  pere: 'Père',
  mere: 'Mère',
  tuteur: 'Tuteur',
  autre: 'Autre'
}

const historiqueLabels: Record<string, string> = {
  redoublement: 'Redoublement',
  transfert_entrant: 'Transfert entrant',
  transfert_sortant: 'Transfert sortant',
  changement_section: 'Changement de section',
  changement_classe: 'Changement de classe',
  evolution_comportement: 'Évolution comportement'
}

export default function EleveDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { anneeActive } = useApp()
  const navigate = useNavigate()
  const [eleve, setEleve] = useState<Eleve | null>(null)
  const [inscription, setInscription] = useState<Inscription | null>(null)
  const [parents, setParents] = useState<ParentTuteur[]>([])
  const [historique, setHistorique] = useState<HistoriqueEleve[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    window.api.getEleve(Number(id), anneeActive?.id).then((data) => {
      if (data) {
        setEleve(data.eleve)
        setInscription(data.inscription)
        setParents(data.parents)
        setHistorique(data.historique)
      }
      setLoading(false)
    })
  }, [id, anneeActive?.id])

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Chargement...</div>
  }

  if (!eleve) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Élève introuvable</p>
        <Link to="/eleves" className="btn-primary btn-sm">
          Retour à la liste
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/eleves')} className="btn-secondary btn-sm">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {eleve.nom} {eleve.prenom}
          </h1>
          <p className="text-sm text-gray-500 font-mono">{eleve.matricule}</p>
        </div>
        <Link to={`/eleves/${id}/modifier`} className="btn-primary btn-sm">
          <Edit className="h-4 w-4" />
          Modifier
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-tchikong-500" />
              Informations personnelles
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Date de naissance</dt>
                <dd className="font-medium flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {new Date(eleve.date_naissance).toLocaleDateString('fr-FR')}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Sexe</dt>
                <dd className="font-medium mt-0.5">
                  {eleve.sexe === 'M' ? 'Masculin' : 'Féminin'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">Adresse</dt>
                <dd className="font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  {eleve.adresse || 'Non renseignée'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Statut</dt>
                <dd className="mt-0.5">
                  <span className="badge-green">{eleve.statut}</span>
                </dd>
              </div>
            </dl>
          </div>

          {inscription && (
            <div className="card p-5">
              <h2 className="text-lg font-semibold mb-4">Scolarité actuelle</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Classe</dt>
                  <dd className="font-medium mt-0.5">{inscription.classe_nom}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Section</dt>
                  <dd className="mt-0.5">
                    <span className="badge-blue">{inscription.section_code}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Niveau</dt>
                  <dd className="font-medium mt-0.5">{inscription.niveau_nom}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Redoublement</dt>
                  <dd className="font-medium mt-0.5">
                    {inscription.redoublement ? 'Oui' : 'Non'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {parents.length > 0 && (
            <div className="card p-5">
              <h2 className="text-lg font-semibold mb-4">Parents / Tuteurs</h2>
              <div className="space-y-4">
                {parents.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between rounded-lg bg-gray-50 p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {p.nom} {p.prenom}
                        {p.contact_urgence && (
                          <span className="ml-2 badge-red text-[10px]">Urgence</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{lienLabels[p.lien_parente]}</p>
                      {p.profession && (
                        <p className="text-xs text-gray-400 mt-1">{p.profession}</p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="flex items-center gap-1 justify-end">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {p.telephone}
                      </p>
                      {p.telephone_secondaire && (
                        <p className="text-gray-400 mt-0.5">{p.telephone_secondaire}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {historique.length > 0 && (
            <div className="card p-5">
              <h2 className="text-lg font-semibold mb-4">Historique</h2>
              <div className="space-y-3">
                {historique.map((h) => (
                  <div key={h.id} className="flex gap-3 text-sm">
                    <div className="w-24 flex-shrink-0 text-gray-400">
                      {new Date(h.date_evenement).toLocaleDateString('fr-FR')}
                    </div>
                    <div>
                      <span className="badge-gray">{historiqueLabels[h.type]}</span>
                      <p className="mt-1 text-gray-600">{h.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Actions</h3>
            <div className="space-y-2">
              <button className="btn-secondary w-full text-sm">Imprimer fiche</button>
              <button className="btn-secondary w-full text-sm">Attestation de scolarité</button>
              <button className="btn-secondary w-full text-sm">Historique des paiements</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
