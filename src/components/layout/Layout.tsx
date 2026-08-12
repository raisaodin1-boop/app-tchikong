import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Wallet,
  Settings,
  LogOut,
  ClipboardCheck,
  GraduationCap,
  Database
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import GlobalSearch from './GlobalSearch'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/eleves', icon: Users, label: 'Élèves' },
  { to: '/presence', icon: ClipboardCheck, label: 'Présences' },
  { to: '/scolarite', icon: BookOpen, label: 'Scolarité' },
  { to: '/finances', icon: Wallet, label: 'Finances' },
  { to: '/admin', icon: Settings, label: 'Administratif' }
]

const roleLabels: Record<string, string> = {
  directrice: 'Directrice',
  secretariat: 'Secrétariat',
  comptable: 'Comptable'
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { anneeActive } = useApp()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleBackup = async () => {
    const result = await window.api.backupDb()
    if (result.success) {
      alert(`Sauvegarde effectuée : ${result.path}`)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 flex-col bg-tchikong-700 text-white">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-tchikong-600">
          <GraduationCap className="h-8 w-8 text-accent-gold" />
          <div>
            <h1 className="text-lg font-bold leading-tight">TCHIKONG</h1>
            <p className="text-xs text-tchikong-200">Gestion Scolaire</p>
          </div>
        </div>

        {anneeActive && (
          <div className="px-5 py-3 bg-tchikong-600/50 text-xs">
            <span className="text-tchikong-200">Année scolaire</span>
            <p className="font-semibold">{anneeActive.libelle}</p>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-tchikong-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-tchikong-600 p-3 space-y-1">
          <button
            onClick={handleBackup}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-tchikong-100 hover:bg-white/10"
          >
            <Database className="h-4 w-4" />
            Sauvegarder
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-tchikong-100 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
          <GlobalSearch />
          <div className="ml-auto text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-xs text-gray-500">{user && roleLabels[user.role]}</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
