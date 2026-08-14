import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCog, GraduationCap, FileText, AlertTriangle, ArrowRight } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { formatDateTimeFr } from '../../lib/dates'
import type { AdminDashboard } from '@shared/types'

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  subtitle?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

const actionLabels: Record<string, string> = {
  connexion: 'Connexion',
  deconnexion: 'Déconnexion',
  creation: 'Création',
  modification: 'Modification',
  suppression: 'Suppression',
  generation: 'Génération',
  reset_password: 'Réinitialisation mot de passe'
}

export default function AdminDashboardPage() {
  const { anneeActive } = useApp()
  const [data, setData] = useState<AdminDashboard | null>(null)

  useEffect(() => {
    window.api.getAdminDashboard(anneeActive?.id).then(setData)
  }, [anneeActive?.id])

  if (!data) return <div className="text-center py-8 text-gray-400">Chargement...</div>

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Personnel"
          value={data.personnel_actif}
          icon={Users}
          color="bg-tchikong-500"
          subtitle={`${data.personnel_total} au total`}
        />
        <StatCard
          title="Utilisateurs actifs"
          value={data.utilisateurs_actifs}
          icon={UserCog}
          color="bg-blue-500"
        />
        <StatCard
          title="Classes"
          value={data.classes_total}
          icon={GraduationCap}
          color="bg-accent-green"
          subtitle={
            data.classes_surchargees > 0
              ? `${data.classes_surchargees} en surcharge`
              : 'Capacités OK'
          }
        />
        <StatCard
          title="Documents générés"
          value={data.documents_generes}
          icon={FileText}
          color="bg-purple-500"
        />
      </div>

      {data.classes_surchargees > 0 && (
        <div className="card p-4 mb-6 border-l-4 border-accent-red flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-accent-red shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">
              {data.classes_surchargees} classe{data.classes_surchargees > 1 ? 's' : ''} en surcharge
            </p>
            <p className="text-sm text-gray-500 mt-1">
              L'effectif dépasse la capacité maximale. Consultez l'onglet Classes pour ajuster.
            </p>
            <Link to="/admin/classes" className="text-sm text-tchikong-600 hover:underline mt-2 inline-flex items-center gap-1">
              Voir les classes <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Activité récente</h3>
          <Link to="/admin/journal" className="text-sm text-tchikong-600 hover:underline flex items-center gap-1">
            Tout voir <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {data.activites_recentes.length === 0 ? (
            <p className="px-5 py-8 text-center text-gray-400 text-sm">Aucune activité enregistrée</p>
          ) : (
            data.activites_recentes.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {actionLabels[a.action] || a.action} — {a.entite}
                    {a.details && <span className="text-gray-500 font-normal"> ({a.details})</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {a.utilisateur_nom || 'Système'} · {formatDateTimeFr(a.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
