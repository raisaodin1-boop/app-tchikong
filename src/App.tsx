import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import ElevesPage from './pages/eleves/ElevesPage'
import EleveDetailPage from './pages/eleves/EleveDetailPage'
import EleveFormPage from './pages/eleves/EleveFormPage'
import PresencePage from './pages/eleves/PresencePage'
import ScolaritePage from './pages/ScolaritePage'
import FinancesPage from './pages/FinancesPage'
import AdminPage from './pages/AdminPage'
import LoadingScreen from './components/ui/LoadingScreen'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="eleves" element={<ElevesPage />} />
        <Route path="eleves/nouveau" element={<EleveFormPage />} />
        <Route path="eleves/:id" element={<EleveDetailPage />} />
        <Route path="eleves/:id/modifier" element={<EleveFormPage />} />
        <Route path="presence" element={<PresencePage />} />
        <Route path="scolarite" element={<ScolaritePage />} />
        <Route path="finances" element={<FinancesPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
