import { Navigate } from 'react-router-dom'

/** Ancienne grille tarifaire : remplacée par les modules de frais (Administration → Frais scolaires). */
export default function TarifsPage() {
  return <Navigate to="/admin/frais" replace />
}
