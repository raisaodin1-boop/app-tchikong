import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AnneeScolaire, Classe, Section, Niveau } from '@shared/types'

interface AppContextType {
  anneeActive: AnneeScolaire | null
  sections: Section[]
  classes: Classe[]
  niveaux: Niveau[]
  refreshData: () => Promise<void>
  loading: boolean
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [anneeActive, setAnneeActive] = useState<AnneeScolaire | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [niveaux, setNiveaux] = useState<Niveau[]>([])
  const [loading, setLoading] = useState(true)

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      const [annee, secs, nivs] = await Promise.all([
        window.api.getActiveAnnee(),
        window.api.listSections(),
        window.api.listNiveaux()
      ])
      setAnneeActive(annee)
      setSections(secs)
      setNiveaux(nivs)
      if (annee) {
        const cls = await window.api.listClasses(annee.id)
        setClasses(cls)
      } else {
        setClasses([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  return (
    <AppContext.Provider value={{ anneeActive, sections, classes, niveaux, refreshData, loading }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
