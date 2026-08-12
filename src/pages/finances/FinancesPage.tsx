import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, CreditCard, History, AlertCircle, Receipt, BarChart3 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const tabs = [
  { to: '/finances', icon: LayoutDashboard, label: "Vue d'ensemble", end: true },
  { to: '/finances/paiement', icon: CreditCard, label: 'Nouveau paiement' },
  { to: '/finances/historique', icon: History, label: 'Historique' },
  { to: '/finances/impayes', icon: AlertCircle, label: 'Impayés' },
  { to: '/finances/depenses', icon: Receipt, label: 'Dépenses', financeOnly: true },
  { to: '/finances/bilan', icon: BarChart3, label: 'Bilan annuel', financeOnly: true }
]

export default function FinancesPage() {
  const { user } = useAuth()
  const visibleTabs = tabs.filter(
    (tab) => !tab.financeOnly || ['directrice', 'comptable'].includes(user?.role || '')
  )
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Module Finances</h1>
        <p className="text-sm text-gray-500">
          Frais de scolarité, paiements, reçus et suivi des impayés
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-accent-green text-accent-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
