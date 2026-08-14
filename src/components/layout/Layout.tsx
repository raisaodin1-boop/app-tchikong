import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Wallet,
  Settings,
  LogOut,
  ClipboardCheck,
  GraduationCap,
  Database,
  RotateCcw,
  WifiOff
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import GlobalSearch from './GlobalSearch'
import { canAccess, ROLE_LABELS, type NavKey } from '../../lib/roles'

const navItems: { to: string; icon: typeof LayoutDashboard; label: string; key: NavKey }[] = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', key: 'dashboard' },
  { to: '/eleves', icon: Users, label: 'Élèves', key: 'eleves' },
  { to: '/presence', icon: ClipboardCheck, label: 'Présences', key: 'presence' },
  { to: '/scolarite', icon: BookOpen, label: 'Scolarité', key: 'scolarite' },
  { to: '/finances', icon: Wallet, label: 'Finances', key: 'finances' },
  { to: '/admin', icon: Settings, label: 'Administratif', key: 'admin' }
]

export default function Layout() {
  const { user, token, logout } = useAuth()
  const { anneeActive, annees, setAnneeActiveId } = useApp()
  const navigate = useNavigate()
  const [online, setOnline] = useState(navigator.onLine)

  const visibleNav = navItems.filter((item) => canAccess(user?.role, item.key))

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

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

  const handleRestore = async () => {
    if (!token || user?.role !== 'directrice') return
    if (
      !confirm(
        'Restaurer une sauvegarde remplace la base actuelle. L’application rechargera les données. Continuer ?'
      )
    ) {
      return
    }
    try {
      const result = await window.api.restoreDb(token)
      if (result.success) {
        alert('Sauvegarde restaurée. L’application va se recharger.')
        window.location.reload()
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'La restauration a échoué')
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

        <div className="px-5 py-3 bg-tchikong-600/50 text-xs">
          <span className="text-tchikong-200">Année scolaire</span>
          {annees.length > 1 ? (
            <select
              className="mt-1 w-full rounded bg-tchikong-800/80 border border-tchikong-500 px-2 py-1 text-xs font-semibold text-white disabled:opacity-70"
              value={anneeActive?.id ?? ''}
              disabled={user?.role !== 'directrice'}
              title={
                user?.role === 'directrice'
                  ? 'Changer l’année active pour tout le monde'
                  : 'Seul la direction peut changer l’année scolaire active'
              }
              onChange={(e) => {
                const id = Number(e.target.value)
                if (!id || id === anneeActive?.id || !token) return
                const year = annees.find((a) => a.id === id)
                if (
                  !confirm(
                    `Activer l’année ${year?.libelle ?? id} pour tout l’établissement ? Les autres utilisateurs verront cette année.`
                  )
                ) {
                  e.target.value = String(anneeActive?.id ?? '')
                  return
                }
                void setAnneeActiveId(id, token)
              }}
            >
              {annees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.libelle}
                  {a.active ? ' (active)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <p className="font-semibold">{anneeActive?.libelle || '—'}</p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => (
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
          {user?.role === 'directrice' && (
            <button
              onClick={handleRestore}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-tchikong-100 hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurer
            </button>
          )}
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
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'
            }`}
            title="Les données restent enregistrées uniquement sur cet appareil"
          >
            {!online && <WifiOff className="h-3.5 w-3.5" />}
            {online ? 'Données locales' : 'Hors connexion'}
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-xs text-gray-500">{user && ROLE_LABELS[user.role]}</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
