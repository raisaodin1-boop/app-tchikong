import { BookOpen, Construction } from 'lucide-react'

export default function ScolaritePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Module Scolarité</h1>
      <p className="text-sm text-gray-500 mb-6">
        Matières, notes, bulletins, emplois du temps
      </p>
      <div className="card p-12 text-center">
        <Construction className="mx-auto h-16 w-16 text-gray-300 mb-4" />
        <BookOpen className="mx-auto h-8 w-8 text-tchikong-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">En cours de développement</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Ce module comprendra la gestion des matières par section, la saisie des notes par
          séquence/trimestre, le calcul automatique des moyennes et la génération de bulletins PDF.
        </p>
      </div>
    </div>
  )
}
