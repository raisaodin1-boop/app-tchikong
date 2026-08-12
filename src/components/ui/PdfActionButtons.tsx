import { Printer, FileDown } from 'lucide-react'

interface PdfActionButtonsProps {
  onSave: () => Promise<void>
  onPrint: () => Promise<void>
  saving?: boolean
  printing?: boolean
  size?: 'sm' | 'md'
  disabled?: boolean
}

export default function PdfActionButtons({
  onSave,
  onPrint,
  saving,
  printing,
  size = 'sm',
  disabled
}: PdfActionButtonsProps) {
  const cls = size === 'sm' ? 'btn-sm' : ''

  return (
    <div className="flex gap-1">
      <button
        className={`btn-secondary ${cls}`}
        onClick={onPrint}
        disabled={disabled || printing}
        title="Imprimer"
      >
        <Printer className="h-4 w-4" />
        {printing ? '...' : 'Imprimer'}
      </button>
      <button
        className={`btn-secondary ${cls}`}
        onClick={onSave}
        disabled={disabled || saving}
        title="Enregistrer en PDF"
      >
        <FileDown className="h-4 w-4" />
        {saving ? '...' : 'PDF'}
      </button>
    </div>
  )
}
