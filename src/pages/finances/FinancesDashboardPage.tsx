import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, TrendingUp, AlertTriangle, Users, ArrowRight, Receipt, BarChart3, Banknote } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { FinancesDashboard } from '@shared/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle
}: {
  title: string
  value: string
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

export default function FinancesDashboardPage() {
  const { anneeActive } = useApp()
  const [data, setData] = useState<FinancesDashboard | null>(null)

  useEffect(() => {
    if (anneeActive) {
      window.api.getFinancesDashboard(anneeActive.id).then(setData)
    }
  }, [anneeActive?.id])

  if (!anneeActive) {
    return (
      <div className="card p-8 text-center text-gray-400">
        Aucune année scolaire active. Chargez les données de démonstration.
      </div>
    )
  }

  if (!data) return <div className="text-center py-8 text-gray-400">Chargement...</div>

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Recettes du mois"
          value={formatMoney(data.recettes_mois)}
          icon={Wallet}
          color="bg-accent-green"
        />
        <StatCard
          title="Recettes de l'année"
          value={formatMoney(data.recettes_annee)}
          icon={TrendingUp}
          color="bg-tchikong-500"
        />
        <StatCard
          title="Taux de recouvrement"
          value={`${data.taux_recouvrement}%`}
          icon={TrendingUp}
          color="bg-blue-500"
          subtitle={`${data.eleves_a_jour} élèves à jour`}
        />
        <StatCard
          title="Impayés"
          value={formatMoney(data.montant_impayes)}
          icon={AlertTriangle}
          color="bg-accent-red"
          subtitle={`${data.eleves_impayes} élève(s)`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Paiements récents</h2>
            <Link to="/finances/historique" className="text-sm text-tchikong-500 hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.paiements_recents.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun paiement enregistré</p>
          ) : (
            <div className="space-y-2">
              {data.paiements_recents.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{p.nom} {p.prenom}</p>
                    <p className="text-xs text-gray-400">{p.numero_recu} — {p.date_paiement}</p>
                  </div>
                  <span className="font-semibold text-accent-green">{formatMoney(p.montant)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">Recettes par section</h2>
          {data.recettes_par_section.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {data.recettes_par_section.map((s) => (
                <div key={s.section} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{s.section}</span>
                  <span className="text-sm font-semibold">{formatMoney(s.montant)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Dépenses de l'année</span>
              <span className="font-medium text-accent-red">{formatMoney(data.depenses_annee)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500 font-medium">Solde</span>
              <span className={`font-bold ${data.solde >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {formatMoney(data.solde)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mt-6">
        <Link to="/finances/caisse" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <Banknote className="h-8 w-8 text-accent-green" />
          <div>
            <p className="font-medium">Caisse journalière</p>
            <p className="text-xs text-gray-400">Encaissements du jour, par mode</p>
          </div>
        </Link>
        <Link to="/finances/paiement" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <Wallet className="h-8 w-8 text-accent-green" />
          <div>
            <p className="font-medium">Enregistrer un paiement</p>
            <p className="text-xs text-gray-400">Avec reçu PDF automatique</p>
          </div>
        </Link>
        <Link to="/finances/impayes" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <Users className="h-8 w-8 text-accent-red" />
          <div>
            <p className="font-medium">Voir les impayés</p>
            <p className="text-xs text-gray-400">{data.eleves_impayes} élève(s) concerné(s)</p>
          </div>
        </Link>
        <Link to="/finances/depenses" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <Receipt className="h-8 w-8 text-tchikong-500" />
          <div>
            <p className="font-medium">Journal des dépenses</p>
            <p className="text-xs text-gray-400">Salaires, charges, fournitures</p>
          </div>
        </Link>
        <Link to="/finances/bilan" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <div>
            <p className="font-medium">Bilan annuel</p>
            <p className="text-xs text-gray-400">Recettes, impayés, salaires et solde</p>
          </div>
        </Link>
      </div>
    </div>
  )
}