import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Printer, FileDown } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { Inscription, StatutEleve } from '@shared/types'

const statutBadges: Record<StatutEleve, string> = {
  actif: 'badge-green',
  transfere: 'badge-blue',
  exclu: 'badge-red',
  diplome: 'badge-yellow'
}

const statutLabels: Record<StatutEleve, string> = {
  actif: 'Actif',
  transfere: 'Transféré',
  exclu: 'Exclu',
  diplome: 'Diplômé'
}

export default function ElevesPage() {
  const { anneeActive, sections, classes } = useApp()
  const navigate = useNavigate()
  const [eleves, setEleves] = useState<Inscription[]>([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [filtreSection, setFiltreSection] = useState<number | ''>('')
  const [filtreClasse, setFiltreClasse] = useState<number | ''>('')
  const [filtreStatut, setFiltreStatut] = useState<StatutEleve | ''>('actif')
  const [showFilters, setShowFilters] = useState(true)
  const [listPrinting, setListPrinting] = useState(false)

  const classesFiltrees = classes.filter(
    (c) => !filtreSection || c.section_id === filtreSection
  )
  const classeSelectionnee = classes.find((c) => c.id === filtreClasse)

  const handlePrintListe = async (action: 'save' | 'print') => {
    if (!filtreClasse) {
      alert('Choisissez d’abord la classe dont vous voulez la liste')
      return
    }
    setListPrinting(true)
    try {
      const result = await window.api.exportListeClassePdf(filtreClasse, action)
      if (result.success && action === 'save' && result.path) {
        alert(`Liste enregistrée : ${result.path}`)
      } else if (!result.success) {
        alert(result.error || 'Impossible de générer la liste de classe')
      }
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : 'Impossible de générer la liste de classe')
    } finally {
      setListPrinting(false)
    }
  }

  const loadEleves = async () => {
    setLoading(true)
    const data = await window.api.listEleves({
      annee_scolaire_id: anneeActive?.id,
      recherche: recherche || undefined,
      section_id: filtreSection || undefined,
      classe_id: filtreClasse || undefined,
      statut: filtreStatut || undefined
    })
    setEleves(data)
    setLoading(false)
  }

  useEffect(() => {
    loadEleves()
  }, [anneeActive?.id, filtreSection, filtreClasse, filtreStatut])

  useEffect(() => {
    const timer = setTimeout(() => loadEleves(), 300)
    return () => clearTimeout(timer)
  }, [recherche])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des élèves</h1>
          <p className="text-sm text-gray-500">
            {eleves.length} élève{eleves.length !== 1 ? 's' : ''} trouvé{eleves.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/eleves/nouveau" className="btn-primary btn-sm">
          <Plus className="h-4 w-4" />
          Nouvel élève
        </Link>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="label">Classe à imprimer</label>
            <select
              className="input"
              value={filtreClasse}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : ''
                setFiltreClasse(id)
                if (id) {
                  const classe = classes.find((c) => c.id === id)
                  if (classe) setFiltreSection(classe.section_id)
                }
              }}
            >
              <option value="">Choisir une classe…</option>
              {classesFiltrees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.section_code}){c.effectif != null ? ` — ${c.effectif} élève(s)` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => void handlePrintListe('print')}
              disabled={listPrinting || !filtreClasse}
              title={
                filtreClasse
                  ? `Imprimer la liste de ${classeSelectionnee?.nom ?? 'la classe'}`
                  : 'Choisissez une classe'
              }
            >
              <Printer className="h-4 w-4" />
              {listPrinting ? 'Préparation...' : 'Imprimer la liste'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => void handlePrintListe('save')}
              disabled={listPrinting || !filtreClasse}
              title="Enregistrer la liste en PDF"
            >
              <FileDown className="h-4 w-4" />
              Enregistrer le PDF
            </button>
          </div>
        </div>
        {!filtreClasse && (
          <p className="mt-2 text-xs text-gray-500">
            Sélectionnez une classe pour afficher ses élèves et imprimer la liste.
          </p>
        )}
      </div>

      <div className="card p-4 mb-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Rechercher par nom, prénom ou matricule..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`btn-secondary btn-sm ${showFilters ? 'ring-2 ring-tchikong-500' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filtres
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
            <div>
              <label className="label">Section</label>
              <select
                className="input"
                value={filtreSection}
                onChange={(e) => {
                  setFiltreSection(e.target.value ? Number(e.target.value) : '')
                  setFiltreClasse('')
                }}
              >
                <option value="">Toutes</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Classe</label>
              <select
                className="input"
                value={filtreClasse}
                onChange={(e) =>
                  setFiltreClasse(e.target.value ? Number(e.target.value) : '')
                }
              >
                <option value="">Toutes</option>
                {classesFiltrees.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.section_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Statut</label>
              <select
                className="input"
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value as StatutEleve | '')}
              >
                <option value="">Tous</option>
                <option value="actif">Actif</option>
                <option value="transfere">Transféré</option>
                <option value="exclu">Exclu</option>
                <option value="diplome">Diplômé</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Classe</th>
              <th>Section</th>
              <th>Sexe</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Chargement...
                </td>
              </tr>
            ) : eleves.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Aucun élève trouvé
                </td>
              </tr>
            ) : (
              eleves.map((e) => (
                <tr key={e.id} onClick={() => navigate(`/eleves/${e.eleve_id}`)}>
                  <td className="font-mono text-xs">{e.matricule}</td>
                  <td className="font-medium">{e.nom}</td>
                  <td>{e.prenom}</td>
                  <td>{e.classe_nom}</td>
                  <td>
                    <span className="badge-blue">{e.section_code}</span>
                  </td>
                  <td>{e.sexe === 'M' ? 'Garçon' : 'Fille'}</td>
                  <td>
                    <span className={statutBadges[e.statut]}>{statutLabels[e.statut]}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
