import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import './index.css'

async function bootstrap() {
  const root = ReactDOM.createRoot(document.getElementById('root')!)

  try {
    if (!window.api) {
      const { installBrowserApi } = await import('./browser/api')
      await installBrowserApi()
    }

    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </AuthProvider>
        </BrowserRouter>
      </React.StrictMode>
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Impossible d’initialiser la base de données'
    root.render(
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-lg rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold text-red-700">Démarrage impossible</h1>
          <p className="mt-3 text-sm text-gray-700">{message}</p>
          <p className="mt-2 text-xs text-gray-500">
            Vérifiez que le stockage local est autorisé, puis rechargez la page.
          </p>
        </div>
      </div>
    )
  }
}

bootstrap()
