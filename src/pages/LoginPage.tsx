import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { GraduationCap, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const success = await login(username, password)
    if (!success) {
      setError('Identifiant ou mot de passe incorrect')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-tchikong-500 items-center justify-center p-12">
        <div className="text-center text-white">
          <GraduationCap className="mx-auto h-24 w-24 mb-6 opacity-90" />
          <h1 className="text-3xl font-bold mb-2">TCHIKONG</h1>
          <p className="text-lg opacity-90">Groupe Scolaire Bilingue</p>
          <p className="text-sm opacity-75 mt-2">Primaire et Maternelle</p>
          <div className="mt-8 text-sm opacity-70">
            <p>Plus de 400 élèves</p>
            <p>Sections : Francophone · Anglophone · Bilingue</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <GraduationCap className="mx-auto h-12 w-12 text-tchikong-500 mb-2" />
            <h1 className="text-2xl font-bold text-tchikong-500">TCHIKONG</h1>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Connexion</h2>
          <p className="text-sm text-gray-500 mb-8">
            Accédez à l'espace de gestion scolaire
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="label">
                Identifiant
              </label>
              <input
                id="username"
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre identifiant"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-8 text-xs text-center text-gray-400">
            Compte démo : admin / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
