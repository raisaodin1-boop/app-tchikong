import { Wallet, Construction } from 'lucide-react'

export default function FinancesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Module Finances</h1>
      <p className="text-sm text-gray-500 mb-6">
        Frais de scolarité, paiements, reçus, impayés
      </p>
      <div className="card p-12 text-center">
        <Construction className="mx-auto h-16 w-16 text-gray-300 mb-4" />
        <Wallet className="mx-auto h-8 w-8 text-accent-green mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">En cours de développement</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Ce module comprendra la grille tarifaire, l'enregistrement des paiements avec reçus PDF
          numérotés, le suivi des impayés et le tableau de bord financier.
        </p>
      </div>
    </div>
  )
}
