import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Phone, MapPin, Calendar, User, FileText, Printer, Wallet } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateFr } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { canAccess } from '../../lib/roles'
import type {
  Eleve,
  Inscription,
  ParentTuteur,
  HistoriqueEleve,
  SituationFinanciere,
  StatutEleve
} from '@shared/types'

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

const statutLabels: Record<StatutEleve, string> = {
  actif: 'Actif',
  transfere: 'Transféré',
  exclu: 'Exclu',
  diplome: 'Diplômé'
}

const statutBadges: Record<StatutEleve, string> = {
  actif: 'badge-green',
  transfere: 'badge-blue',
  exclu: 'badge-red',
  diplome: 'badge-yellow'
}

export default function EleveDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { anneeActive } = useApp()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [eleve, setEleve] = useState<Eleve | null>(null)
  const [inscription, setInscription] = useState<Inscription | null>(null)
  const [parents, setParents] = useState<ParentTuteur[]>([])
  const [historique, setHistorique] = useState<HistoriqueEleve[]>([])
  const [situation, setSituation] = useState<SituationFinanciere | null>(null)
  const [loading, setLoading] = useState(true)
  const [docLoading, setDocLoading] = useState<string | null>(null)
  const [statutSaving, setStatutSaving] = useState(false)

  const genererDocument = async (
    type: 'attestation_scolarite' | 'certificat_frequentation' | 'attestation_reussite',
    action: 'save' | 'print'
  ) => {
    if (!id || !token) return
    setDocLoading(`${type}-${action}`)
    const result = await window.api.genererDocument(
      type,
      Number(id),
      anneeActive?.id,
      action,
      token
    )
    if (result.success && action === 'save' && result.path) {
      alert(`Document enregistré : ${result.path}`)
    } else if (result.error) {
      alert(result.error)
    }
    setDocLoading(null)
  }

  useEffect(() => {
    if (!id) return
      window.api.getEleve(Number(id), anneeActive?.id).then((data: {
        eleve: Eleve
        inscription: Inscription | null
        parents: ParentTuteur[]
        historique: HistoriqueEleve[]
      } | null) => {
      if (data) {
        setEleve(data.eleve)
        setInscription(data.inscription)
        setParents(data.parents)
        setHistorique(data.historique)
      }
      setLoading(false)
    })
    if (anneeActive) {
      window.api.getSituationFinanciere(Number(id), anneeActive.id).then(setSituation)
    }
  }, [id, anneeActive?.id])

  const handleStatut = async (statut: StatutEleve) => {
    if (!id || !token || !eleve || statut === eleve.statut) return
    const label = statutLabels[statut]
    if (!confirm(`Passer ${eleve.prenom} ${eleve.nom} au statut « ${label} » ?`)) return
    setStatutSaving(true)
    try {
      const updated = await window.api.changeStatutEleve(
        Number(id),
        statut,
        anneeActive?.id,
        `Statut : ${statutLabels[eleve.statut]} → ${label}`,
        token
      )
      setEleve(updated)
      const data = await window.api.getEleve(Number(id), anneeActive?.id)
      if (data) {
        setInscription(data.inscription)
        setHistorique(data.historique)
      }
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setStatutSaving(false)
    }
  }

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
                  {formatDateFr(eleve.date_naissance)}
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
                  <span className={statutBadges[eleve.statut]}>{statutLabels[eleve.statut]}</span>
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
                      {formatDateFr(h.date_evenement)}
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
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Documents officiels</h3>
            <p className="text-xs text-gray-400 mb-3">
              Génération hors-ligne, directement imprimable (format A4)
            </p>
            <div className="space-y-2">
              {(
                [
                  { type: 'attestation_scolarite' as const, label: 'Attestation de scolarité' },
                  { type: 'certificat_frequentation' as const, label: 'Certificat de fréquentation' },
                  { type: 'attestation_reussite' as const, label: 'Attestation de réussite' }
                ] as const
              ).map((doc) => (
                <div key={doc.type} className="flex gap-1">
                  <button
                    className="btn-secondary btn-sm flex-1 text-xs justify-start"
                    onClick={() => genererDocument(doc.type, 'print')}
                    disabled={docLoading !== null}
                  >
                    <Printer className="h-3.5 w-3.5 flex-shrink-0" />
                    {docLoading === `${doc.type}-print` ? '...' : doc.label}
                  </button>
                  <button
                    className="btn-secondary btn-sm px-2"
                    onClick={() => genererDocument(doc.type, 'save')}
                    disabled={docLoading !== null}
                    title="Enregistrer en PDF"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {situation && canAccess(user?.role, 'finances') && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Situation financière
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                {situation.statut === 'a_jour'
                  ? 'À jour'
                  : situation.statut === 'partiel'
                    ? 'Paiement partiel'
                    : 'Impayé'}
              </p>
              <p className="text-sm">
                Payé : <strong>{formatMoney(situation.total_paye)}</strong>
              </p>
              <p className="text-sm">
                Reste :{' '}
                <strong className={situation.reste > 0 ? 'text-accent-red' : ''}>
                  {formatMoney(situation.reste)}
                </strong>
              </p>
              {situation.reste > 0 && (
                <Link to={`/finances/paiement?eleve=${eleve.id}`} className="btn-secondary btn-sm mt-3">
                  Enregistrer un paiement
                </Link>
              )}
            </div>
          )}

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Changer le statut</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(statutLabels) as StatutEleve[]).map((s) => (
                <button
                  key={s}
                  className={`btn-sm ${eleve.statut === s ? 'btn-primary' : 'btn-secondary'}`}
                  disabled={statutSaving || eleve.statut === s}
                  onClick={() => handleStatut(s)}
                >
                  {statutLabels[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
