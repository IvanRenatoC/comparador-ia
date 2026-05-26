import { useState } from 'react'
import type { ModelEntry } from '../types'

interface Props {
  model: ModelEntry
  rawConfig?: Record<string, unknown>
}

export default function RawConfigViewer({ model, rawConfig }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs font-mono text-[#334155] dark:text-[#f5f6f7] hover:text-[#00d4ff] transition-colors"
      >
        <span className="border border-[#e2e8f0] dark:border-[#1e2d45] rounded px-2 py-0.5 font-mono text-xs">
          {open ? '▲' : '▼'}
        </span>
        {open ? 'Ocultar' : 'Ver'} config.json de {model.displayName}
      </button>

      {open && (
        <div className="mt-3 bg-white dark:bg-[#080b14] border border-[#e2e8f0] dark:border-[#1e2d45] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#e2e8f0] dark:border-[#1e2d45] bg-[#f1f5f9] dark:bg-[#0d1220]">
            <span className="text-xs font-mono text-[#334155] dark:text-[#f5f6f7]">
              {model.file} — {model.sourceUrl ?? 'fuente manual'}
            </span>
            {rawConfig && (
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(rawConfig, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = model.file
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="text-xs font-mono text-[#00d4ff] hover:text-white transition-colors"
              >
                ↓ Descargar
              </button>
            )}
          </div>
          <pre className="text-xs font-mono text-[#334155] dark:text-[#f5f6f7] p-4 overflow-auto max-h-80 leading-relaxed whitespace-pre">
            {rawConfig ? JSON.stringify(rawConfig, null, 2) : '(config no disponible en este contexto)'}
          </pre>
        </div>
      )}
    </div>
  )
}
