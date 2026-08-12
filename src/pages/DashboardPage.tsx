import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Wallet,
  AlertTriangle,
  UserPlus,
  CreditCard,
  FileText,
  TrendingUp
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import type { DashboardStats } from '@shared/types'

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
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { anneeActive } = useApp()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    window.api.getDashboardStats(anneeActive?.id).then(setStats)
  }, [anneeActive?.id])

  const handleSeed = async () => {
    setSeeding(true)
    const result = await window.api.seedDemo()
    alert(result.message)
    window.location.reload()
  }

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500">
            Vue d'ensemble de l'établissement
            {anneeActive && ` — ${anneeActive.libelle}`}
          </p>
        </div>
        {!anneeActive && (
          <button className="btn-primary" onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Chargement...' : 'Charger les données de démonstration'}
          </button>
        )}
      </div>

      {!anneeActive && (
        <div className="card p-8 text-center mb-6">
          <p className="text-gray-500 mb-4">
            Aucune année scolaire active. Chargez les données de démonstration pour commencer.
          </p>
          <button className="btn-primary" onClick={handleSeed} disabled={seeding}>
            Charger les données de démonstration
          </button>
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Effectif total"
              value={stats.effectifs.total}
              icon={Users}
              color="bg-tchikong-500"
              subtitle="élèves inscrits"
            />
            <StatCard
              title="Recettes du mois"
              value={formatMoney(stats.finances.recettes_mois)}
              icon={Wallet}
              color="bg-accent-green"
            />
            <StatCard
              title="Recettes de l'année"
              value={formatMoney(stats.finances.recettes_annee)}
              icon={TrendingUp}
              color="bg-blue-500"
            />
            <StatCard
              title="Alertes"
              value={stats.alertes.length}
              icon={AlertTriangle}
              color="bg-accent-red"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-5">
              <h2 className="text-lg font-semibold mb-4">Effectifs par section</h2>
              {stats.effectifs.par_section.length > 0 ? (
                <div className="space-y-3">
                  {stats.effectifs.par_section.map((s) => (
                    <div key={s.section} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{s.section}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-tchikong-500 rounded-full"
                            style={{
                              width: `${(s.count / stats.effectifs.total) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-8 text-right">{s.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Aucune donnée</p>
              )}
            </div>

            <div className="card p-5">
              <h2 className="text-lg font-semibold mb-4">Effectifs par niveau</h2>
              {stats.effectifs.par_niveau.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {stats.effectifs.par_niveau.map((n) => (
                    <div
                      key={n.niveau}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <span className="text-sm text-gray-600">{n.niveau}</span>
                      <span className="text-sm font-semibold">{n.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Aucune donnée</p>
              )}
            </div>
          </div>

          {stats.alertes.length > 0 && (
            <div className="card p-5 mb-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-accent-red" />
                Alertes
              </h2>
              <div className="space-y-2">
                {stats.alertes.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700"
                  >
                    {a.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/eleves/nouveau" className="btn-secondary flex-col py-4 h-auto">
            <UserPlus className="h-5 w-5 text-tchikong-500" />
            <span>Nouvel élève</span>
          </Link>
          <Link to="/finances" className="btn-secondary flex-col py-4 h-auto">
            <CreditCard className="h-5 w-5 text-accent-green" />
            <span>Enregistrer paiement</span>
          </Link>
          <Link to="/scolarite" className="btn-secondary flex-col py-4 h-auto">
            <FileText className="h-5 w-5 text-blue-500" />
            <span>Imprimer bulletin</span>
          </Link>
          <Link to="/eleves" className="btn-secondary flex-col py-4 h-auto">
            <Users className="h-5 w-5 text-tchikong-500" />
            <span>Liste des élèves</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
