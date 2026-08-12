import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import ElevesPage from './pages/eleves/ElevesPage'
import EleveDetailPage from './pages/eleves/EleveDetailPage'
import EleveFormPage from './pages/eleves/EleveFormPage'
import PresencePage from './pages/eleves/PresencePage'
import ScolaritePage from './pages/scolarite/ScolaritePage'
import NotesSaisiePage from './pages/scolarite/NotesSaisiePage'
import BulletinsPage from './pages/scolarite/BulletinsPage'
import PalmaresPage from './pages/scolarite/PalmaresPage'
import FinancesPage from './pages/finances/FinancesPage'
import FinancesDashboardPage from './pages/finances/FinancesDashboardPage'
import PaiementPage from './pages/finances/PaiementPage'
import HistoriquePage from './pages/finances/HistoriquePage'
import ImpayesPage from './pages/finances/ImpayesPage'
import DepensesPage from './pages/finances/DepensesPage'
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
        <Route path="scolarite" element={<ScolaritePage />}>
          <Route index element={<Navigate to="notes" replace />} />
          <Route path="notes" element={<NotesSaisiePage />} />
          <Route path="bulletins" element={<BulletinsPage />} />
          <Route path="palmares" element={<PalmaresPage />} />
        </Route>
        <Route path="finances" element={<FinancesPage />}>
          <Route index element={<FinancesDashboardPage />} />
          <Route path="paiement" element={<PaiementPage />} />
          <Route path="historique" element={<HistoriquePage />} />
          <Route path="impayes" element={<ImpayesPage />} />
          <Route path="depenses" element={<DepensesPage />} />
        </Route>
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
