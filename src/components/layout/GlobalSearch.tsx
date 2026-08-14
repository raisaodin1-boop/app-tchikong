import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import type { RechercheResultat } from '@shared/types'
import { useApp } from '../../contexts/AppContext'

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RechercheResultat[]>([])
  const [open, setOpen] = useState(false)
  const { anneeActive } = useApp()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const res = await window.api.rechercheGlobale(query, anneeActive?.id)
      setResults(res)
      setOpen(true)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, anneeActive?.id])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (r: RechercheResultat) => {
    setOpen(false)
    setQuery('')
    if (r.type === 'eleve') navigate(`/eleves/${r.id}`)
    if (r.type === 'enseignant') navigate('/admin/enseignants')
  }

  return (
    <div ref={ref} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          className="input pl-9 pr-8 py-1.5 text-sm"
          placeholder="Rechercher un élève, enseignant..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {query && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => {
              setQuery('')
              setResults([])
              setOpen(false)
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              onClick={() => handleSelect(r)}
            >
              <span
                className={`badge ${r.type === 'eleve' ? 'badge-blue' : 'badge-gray'}`}
              >
                {r.type === 'eleve' ? 'Élève' : r.type === 'enseignant' ? 'Ens.' : 'Paiement'}
              </span>
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                {r.sous_label && <p className="text-xs text-gray-500">{r.sous_label}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
