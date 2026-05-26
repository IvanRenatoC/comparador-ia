import { useState } from 'react'
import type { ModelEntry } from '../types'
import { extractMetrics, buildScores } from '../lib/extractMetrics'

interface Props {
  onAdd: (model: ModelEntry, rawConfig: Record<string, unknown>) => void
  onClose: () => void
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function AddModelModal({ onAdd, onClose }: Props) {
  const [jsonText, setJsonText] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ModelEntry | null>(null)

  function validate() {
    setError(null)
    setPreview(null)
    if (!displayName.trim()) { setError('Ingresa un nombre visible para el modelo.'); return }
    if (!jsonText.trim()) { setError('Pega el contenido del config.json arriba.'); return }

    let raw: Record<string, unknown>
    try { raw = JSON.parse(jsonText) } catch {
      setError('JSON inválido. Verifica el formato (sin comas finales, comillas dobles, etc.).')
      return
    }

    const { metrics, missingFields } = extractMetrics(raw)
    const scores = buildScores(metrics)
    const slug = `custom-${slugify(displayName)}`

    const entry: ModelEntry = {
      slug,
      displayName,
      file: `${slug}.json`,
      collection: 'custom',
      availableIn: ['custom'],
      metrics,
      scores,
      missingFields,
    }
    setPreview(entry)
  }

  function handleAdd() {
    if (!preview) return
    let raw: Record<string, unknown>
    try { raw = JSON.parse(jsonText) } catch { return }

    const stored = JSON.parse(localStorage.getItem('customModels') ?? '[]') as Array<{
      entry: ModelEntry; raw: Record<string, unknown>
    }>
    const existing = stored.findIndex(s => s.entry.slug === preview.slug)
    if (existing >= 0) stored[existing] = { entry: preview, raw }
    else stored.push({ entry: preview, raw })
    localStorage.setItem('customModels', JSON.stringify(stored))

    onAdd(preview, raw)
    onClose()
  }

  function downloadJson() {
    if (!preview) return
    const blob = new Blob([jsonText], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = preview.file
    a.click()
    URL.revokeObjectURL(url)
  }

  function fmt(val: number | undefined, suffix = '') {
    if (val == null) return '—'
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M${suffix}`
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k${suffix}`
    return `${val}${suffix}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d1220] border border-[#2d4060] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d45] sticky top-0 bg-[#0d1220] z-10">
          <div>
            <h2 className="text-sm font-mono font-bold text-[#e2e8f0]">Agregar modelo por config.json</h2>
            <p className="text-[10px] text-[#f59e0b] font-mono mt-0.5">
              ⚠ Este modelo se agrega temporalmente en tu navegador. Para dejarlo permanente, agrega el config.json al repo y vuelve a desplegar.
            </p>
          </div>
          <button onClick={onClose} className="text-[#f5f6f7] hover:text-[#e2e8f0] transition-colors font-mono text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-mono tracking-widest uppercase text-[#f5f6f7] block mb-1.5">
              Nombre visible del modelo
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="ej: Llama 3.1 8B Custom"
              className="w-full bg-[#111827] border border-[#1e2d45] rounded px-3 py-2 text-sm font-mono text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff] transition-colors placeholder:text-[#4b5e7a]"
            />
            {displayName && (
              <p className="text-[10px] font-mono text-[#f5f6f7] mt-1">Slug: custom-{slugify(displayName)}</p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-mono tracking-widest uppercase text-[#f5f6f7] block mb-1.5">
              Contenido del config.json
            </label>
            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder={'{\n  "model_type": "llama",\n  "hidden_size": 4096,\n  ...\n}'}
              rows={10}
              className="w-full bg-[#080b14] border border-[#1e2d45] rounded px-3 py-2 text-[11px] font-mono text-[#f5f6f7] focus:outline-none focus:border-[#00d4ff] transition-colors resize-y placeholder:text-[#2d4060]"
            />
          </div>

          {error && (
            <div className="text-[11px] font-mono text-[#f43f5e] bg-[#f43f5e]/5 border border-[#f43f5e]/20 rounded p-3">
              {error}
            </div>
          )}

          <button
            onClick={validate}
            className="w-full bg-[#1a2235] border border-[#2d4060] rounded px-4 py-2.5 text-[12px] font-mono text-[#00d4ff] hover:bg-[#00d4ff]/10 hover:border-[#00d4ff] transition-all"
          >
            Validar y previsualizar métricas
          </button>

          {preview && (
            <div className="bg-[#080b14] border border-[#10b981]/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#10b981]">
                <span>✓</span><span>JSON válido — métricas extraídas</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  ['Context', fmt(preview.metrics.contextWindowTokens, ' tok')],
                  ['Capas', fmt(preview.metrics.layers)],
                  ['Hidden', fmt(preview.metrics.hiddenSize)],
                  ['Attn Heads', fmt(preview.metrics.attentionHeads)],
                  ['KV Heads', fmt(preview.metrics.kvHeads)],
                  ['Vocab', fmt(preview.metrics.vocabSize, ' tok')],
                  ['MoE', preview.metrics.isMoE ? `Sí (${fmt(preview.metrics.totalExperts)} exp)` : 'No'],
                  ['Visión', preview.metrics.hasVision ? 'Sí' : 'No'],
                  ['Dtype', preview.metrics.dtype ?? '—'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="bg-[#111827] rounded p-2">
                    <div className="text-[9px] text-[#f5f6f7] font-mono">{k}</div>
                    <div className="text-[11px] text-[#00d4ff] font-mono font-bold mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
              {preview.missingFields.length > 0 && (
                <p className="text-[10px] font-mono text-[#f59e0b]">
                  Campos no encontrados: {preview.missingFields.join(', ')}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAdd}
                  className="flex-1 bg-[#00d4ff]/10 border border-[#00d4ff]/40 rounded px-4 py-2 text-[12px] font-mono text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-all"
                >
                  Agregar y comparar (sesión)
                </button>
                <button
                  onClick={downloadJson}
                  className="bg-[#1a2235] border border-[#2d4060] rounded px-4 py-2 text-[12px] font-mono text-[#f5f6f7] hover:text-[#e2e8f0] transition-all"
                >
                  ↓ Descargar JSON
                </button>
              </div>
              <div className="bg-[#111827] rounded p-3 text-[10px] font-mono text-[#f5f6f7] leading-relaxed">
                <div className="text-[#f59e0b] mb-1">Para agregar permanentemente al repo:</div>
                <div className="text-[#f5f6f7]">1. Descarga el JSON y cópialo en <span className="text-[#e2e8f0]">models-config-test/</span></div>
                <div className="text-[#f5f6f7]">2. Ejecuta: <span className="text-[#e2e8f0]">npm run prepare:data</span></div>
                <div className="text-[#f5f6f7]">3. Ejecuta: <span className="text-[#e2e8f0]">npm run build</span> y redespliega</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
