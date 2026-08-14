import { useEffect, useState } from 'react'
import { AlertTriangle, Database, Save } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { BackupSettings, DemoStatus } from '@shared/types'

export default function MaintenancePage() {
  const { token, user } = useAuth()
  const [demo, setDemo] = useState<DemoStatus | null>(null)
  const [backup, setBackup] = useState<BackupSettings | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    if (!token) return
    const [status, settings] = await Promise.all([
      window.api.getDemoStatus(token),
      window.api.getBackupSettings(token)
    ])
    setDemo(status)
    setBackup(settings)
  }

  useEffect(() => {
    void load().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Chargement impossible')
    })
  }, [token])

  const saveBackup = async (enabled: boolean) => {
    if (!token) return
    const settings = await window.api.setBackupSettings({ enabled }, token)
    setBackup(settings)
    setMessage(enabled ? 'Sauvegarde automatique activée.' : 'Sauvegarde automatique désactivée.')
  }

  const chooseDir = async () => {
    if (!token) return
    const dir = await window.api.chooseBackupDirectory(token)
    if (dir) {
      const settings = await window.api.getBackupSettings(token)
      setBackup(settings)
      setMessage(`Dossier : ${dir}`)
    }
  }

  const runNow = async () => {
    if (!token) return
    const result = await window.api.runAutoBackup(true, token)
    if (result.ran) setMessage(`Sauvegarde créée : ${result.path}`)
    else setError(result.error || 'Aucune sauvegarde effectuée')
    await load()
  }

  const manualBackup = async () => {
    const result = await window.api.backupDb()
    if (result.success) setMessage(`Sauvegarde : ${result.path}`)
  }

  const exitDemo = async () => {
    if (!token || confirmation !== 'QUITTER DEMO') return
    if (
      !confirm(
        'Dernière confirmation : toutes les données fictives seront définitivement supprimées. Continuer ?'
      )
    ) {
      return
    }
    setResetting(true)
    setError('')
    try {
      const result = await window.api.exitDemoMode(confirmation, token)
      alert(
        `Mode démo quitté : ${result.deleted.eleves} élèves, ${result.deleted.paiements} paiements et ${result.deleted.personnel} personnels fictifs supprimés.`
      )
      window.location.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La sortie du mode démo a échoué')
      setResetting(false)
    }
  }

  if (user?.role !== 'directrice') {
    return <div className="card p-8 text-center text-red-600">Accès réservé à la directrice.</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5 text-tchikong-500" />
          Sauvegarde automatique
        </h2>
        <p className="text-sm text-gray-600">
          Une copie <code>.db</code> est créée chaque jour (Bureau\TCHIKONG-sauvegardes par défaut, ou
          le dossier / la clé USB que vous choisissez). Les fichiers de plus de 30 jours sont
          supprimés.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(backup?.enabled)}
            onChange={(e) => void saveBackup(e.target.checked)}
          />
          Activer la copie quotidienne
        </label>
        <p className="text-xs text-gray-500">
          Dossier : {backup?.directory || 'Bureau / TCHIKONG-sauvegardes'}
          {backup?.lastDate ? ` — dernière copie le ${backup.lastDate}` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={chooseDir}>
            Choisir un dossier (clé USB…)
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={runNow}>
            Sauvegarder maintenant
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={manualBackup}>
            <Save className="h-4 w-4" />
            Exporter une copie
          </button>
        </div>
      </section>

      <section className="card border border-red-200 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <h2 className="font-semibold text-red-800">Mode démonstration</h2>
            {demo?.active ? (
              <>
                <p className="mt-1 text-sm text-gray-600">
                  {demo.eleves} élèves fictifs sont présents. Les comptes, le référentiel, l’année
                  scolaire et les classes seront conservés.
                </p>
                <div className="mt-4 max-w-md">
                  <label className="label">
                    Saisissez <strong>QUITTER DEMO</strong> pour confirmer
                  </label>
                  <input
                    className="input"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  onClick={exitDemo}
                  disabled={confirmation !== 'QUITTER DEMO' || resetting}
                >
                  {resetting ? 'Suppression...' : 'Quitter le mode démo'}
                </button>
              </>
            ) : (
              <p className="mt-1 text-sm font-medium text-green-700">
                Le mode démonstration est désactivé.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
