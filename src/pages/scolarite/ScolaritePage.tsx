import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardEdit, FileText, Trophy } from 'lucide-react'

const tabs = [
  { to: '/scolarite/notes', icon: ClipboardEdit, label: 'Saisie des notes' },
  { to: '/scolarite/bulletins', icon: FileText, label: 'Bulletins' },
  { to: '/scolarite/palmares', icon: Trophy, label: 'Palmarès' }
]

export default function ScolaritePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Module Scolarité</h1>
        <p className="text-sm text-gray-500">
          Matières, notes, moyennes, bulletins et palmarès
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-tchikong-500 text-tchikong-500'
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
