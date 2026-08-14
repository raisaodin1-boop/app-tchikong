import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { canAccess, type NavKey } from './lib/roles'
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
import EmploiDuTempsPage from './pages/scolarite/EmploiDuTempsPage'
import FinancesPage from './pages/finances/FinancesPage'
import FinancesDashboardPage from './pages/finances/FinancesDashboardPage'
import PaiementPage from './pages/finances/PaiementPage'
import HistoriquePage from './pages/finances/HistoriquePage'
import ImpayesPage from './pages/finances/ImpayesPage'
import DepensesPage from './pages/finances/DepensesPage'
import BilanAnnuelPage from './pages/finances/BilanAnnuelPage'
import EcheancierPage from './pages/finances/EcheancierPage'
import AdminPage from './pages/admin/AdminPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import PersonnelPage from './pages/admin/PersonnelPage'
import ClassesPage from './pages/admin/ClassesPage'
import FraisScolairesPage from './pages/admin/FraisScolairesPage'
import AnneesScolairesPage from './pages/admin/AnneesScolairesPage'
import PaiePersonnelPage from './pages/admin/PaiePersonnelPage'
import UtilisateursPage from './pages/admin/UtilisateursPage'
import DocumentsPage from './pages/admin/DocumentsPage'
import JournalPage from './pages/admin/JournalPage'
import PassageAnneePage from './pages/admin/PassageAnneePage'
import CalendrierPage from './pages/admin/CalendrierPage'
import MaintenancePage from './pages/admin/MaintenancePage'
import LoadingScreen from './components/ui/LoadingScreen'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRoute({ access, children }: { access: NavKey; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!canAccess(user?.role, access)) return <Navigate to="/" replace />
  return <>{children}</>
}

function DirectriceRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user?.role !== 'directrice') return <Navigate to="/" replace />
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
        <Route
          path="eleves"
          element={
            <RoleRoute access="eleves">
              <ElevesPage />
            </RoleRoute>
          }
        />
        <Route
          path="eleves/nouveau"
          element={
            <RoleRoute access="eleves">
              <EleveFormPage />
            </RoleRoute>
          }
        />
        <Route
          path="eleves/:id"
          element={
            <RoleRoute access="eleves">
              <EleveDetailPage />
            </RoleRoute>
          }
        />
        <Route
          path="eleves/:id/modifier"
          element={
            <RoleRoute access="eleves">
              <EleveFormPage />
            </RoleRoute>
          }
        />
        <Route
          path="presence"
          element={
            <RoleRoute access="presence">
              <PresencePage />
            </RoleRoute>
          }
        />
        <Route
          path="scolarite"
          element={
            <RoleRoute access="scolarite">
              <ScolaritePage />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="notes" replace />} />
          <Route path="notes" element={<NotesSaisiePage />} />
          <Route path="bulletins" element={<BulletinsPage />} />
          <Route path="palmares" element={<PalmaresPage />} />
          <Route path="emploi-du-temps" element={<EmploiDuTempsPage />} />
        </Route>
        <Route
          path="finances"
          element={
            <RoleRoute access="finances">
              <FinancesPage />
            </RoleRoute>
          }
        >
          <Route index element={<FinancesDashboardPage />} />
          <Route path="paiement" element={<PaiementPage />} />
          <Route path="historique" element={<HistoriquePage />} />
          <Route path="impayes" element={<ImpayesPage />} />
          <Route path="depenses" element={<DepensesPage />} />
          <Route path="bilan" element={<BilanAnnuelPage />} />
          <Route path="echeancier" element={<EcheancierPage />} />
        </Route>
        <Route
          path="admin"
          element={
            <RoleRoute access="admin">
              <AdminPage />
            </RoleRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="enseignants" element={<PersonnelPage kind="enseignant" />} />
          <Route path="personnel" element={<PersonnelPage kind="personnel" />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="passage" element={<PassageAnneePage />} />
          <Route path="calendrier" element={<CalendrierPage />} />
          <Route
            path="frais"
            element={
              <DirectriceRoute>
                <FraisScolairesPage />
              </DirectriceRoute>
            }
          />
          <Route
            path="annees"
            element={
              <DirectriceRoute>
                <AnneesScolairesPage />
              </DirectriceRoute>
            }
          />
          <Route
            path="paie"
            element={
              <DirectriceRoute>
                <PaiePersonnelPage />
              </DirectriceRoute>
            }
          />
          <Route path="utilisateurs" element={<UtilisateursPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route
            path="maintenance"
            element={
              <DirectriceRoute>
                <MaintenancePage />
              </DirectriceRoute>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
