import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AuthSession, Utilisateur } from '@shared/types'

interface AuthContextType {
  session: AuthSession | null
  loading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  user: Utilisateur | null
  token: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)
const TOKEN_KEY = 'tchikong_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      window.api
        .getSession(token)
        .then((s: AuthSession | null) => {
          if (s) setSession(s)
          else localStorage.removeItem(TOKEN_KEY)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const result = await window.api.login({ username, password })
    if (result) {
      localStorage.setItem(TOKEN_KEY, result.token)
      setSession(result)
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    if (session?.token) {
      window.api.logout(session.token)
    }
    localStorage.removeItem(TOKEN_KEY)
    setSession(null)
  }, [session])

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        login,
        logout,
        user: session?.utilisateur ?? null,
        token: session?.token ?? null
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
