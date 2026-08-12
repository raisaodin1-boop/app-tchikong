import { Settings, Construction } from 'lucide-react'

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Module Administratif</h1>
      <p className="text-sm text-gray-500 mb-6">
        Personnel, classes, documents officiels, utilisateurs
      </p>
      <div className="card p-12 text-center">
        <Construction className="mx-auto h-16 w-16 text-gray-300 mb-4" />
        <Settings className="mx-auto h-8 w-8 text-tchikong-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">En cours de développement</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Ce module comprendra la gestion du personnel, les documents officiels (attestations,
          certificats), la gestion multi-utilisateurs et le journal d'activité.
        </p>
      </div>
    </div>
  )
}
