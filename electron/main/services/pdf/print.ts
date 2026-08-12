import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { app, BrowserWindow } from 'electron'

export async function savePdf(
  pdfBytes: Uint8Array,
  filePath: string
): Promise<void> {
  writeFileSync(filePath, pdfBytes)
}

export async function printPdf(pdfBytes: Uint8Array, title = 'Document TCHIKONG'): Promise<boolean> {
  const tempDir = join(app.getPath('temp'), 'tchikong-print')
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })

  const tempPath = join(tempDir, `print-${Date.now()}.pdf`)
  writeFileSync(tempPath, pdfBytes)

  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    const base64 = Buffer.from(pdfBytes).toString('base64')
    const html = `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>*{margin:0;padding:0}body{background:#525659}</style>
</head><body>
<embed src="data:application/pdf;base64,${base64}" type="application/pdf" width="100%" height="100%" />
</body></html>`

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    win.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        win.webContents.print(
          {
            silent: false,
            printBackground: true,
            margins: { marginType: 'default' }
          },
          (success) => {
            win.close()
            resolve(success)
          }
        )
      }, 800)
    })

    win.webContents.on('did-fail-load', () => {
      win.close()
      resolve(false)
    })

    // Timeout de sécurité
    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.close()
        resolve(false)
      }
    }, 30000)
  })
}
