import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCog,
  FileText,
  ScrollText,
  CalendarRange
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const tabs = [
  { to: '/admin', icon: LayoutDashboard, label: "Vue d'ensemble", end: true },
  { to: '/admin/personnel', icon: Users, label: 'Personnel' },
  { to: '/admin/classes', icon: GraduationCap, label: 'Classes' },
  { to: '/admin/annees', icon: CalendarRange, label: 'Années scolaires' },
  { to: '/admin/utilisateurs', icon: UserCog, label: 'Utilisateurs', directriceOnly: true },
  { to: '/admin/documents', icon: FileText, label: 'Documents' },
  { to: '/admin/journal', icon: ScrollText, label: 'Journal' }
]

export default function AdminPage() {
  const { user } = useAuth()
  const isDirectrice = user?.role === 'directrice'

  const visibleTabs = tabs.filter((t) => !t.directriceOnly || isDirectrice)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Module Administratif</h1>
        <p className="text-sm text-gray-500">
          Personnel, classes, utilisateurs, documents officiels et journal d'activité
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                isActive
                  ? 'border-tchikong-500 text-tchikong-600'
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
