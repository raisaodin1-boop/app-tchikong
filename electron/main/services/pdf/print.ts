import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { app, BrowserWindow, shell } from 'electron'

export async function savePdf(pdfBytes: Uint8Array, filePath: string): Promise<void> {
  writeFileSync(filePath, pdfBytes)
}

function writeTempPdf(pdfBytes: Uint8Array): string {
  const tempDir = join(app.getPath('temp'), 'tchikong-print')
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })
  const tempPath = join(tempDir, `print-${Date.now()}.pdf`)
  writeFileSync(tempPath, pdfBytes)
  return tempPath
}

/**
 * Affiche le PDF puis ouvre le dialogue d’impression.
 * Une fenêtre cachée ne déclenche souvent aucun dialogue (Windows / Linux).
 */
export async function printPdf(pdfBytes: Uint8Array, title = 'Document TCHIKONG'): Promise<boolean> {
  const tempPath = writeTempPdf(pdfBytes)
  const win = new BrowserWindow({
    show: true,
    width: 920,
    height: 740,
    title,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  try {
    await win.loadURL(pathToFileURL(tempPath).href)
  } catch {
    if (!win.isDestroyed()) win.close()
    const opened = await shell.openPath(tempPath)
    return opened === ''
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      resolve(ok)
    }

    win.webContents.print(
      {
        silent: false,
        printBackground: true,
        margins: { marginType: 'default' }
      },
      (success) => {
        // Document déjà visible : on laisse la fenêtre ouverte si l’impression est annulée.
        if (success && !win.isDestroyed()) win.close()
        finish(success || !win.isDestroyed())
        if (success) {
          setTimeout(() => {
            try {
              unlinkSync(tempPath)
            } catch {
              /* ignore */
            }
          }, 5_000)
        }
      }
    )

    win.on('closed', () => finish(true))
  })
}
