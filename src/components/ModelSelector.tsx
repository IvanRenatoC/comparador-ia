import type { ModelEntry, CollectionType } from '../types'

interface Props {
  label: string
  models: ModelEntry[]
  selected: string
  onChange: (slug: string) => void
  color: string
}

const COLLECTION_BADGE: Record<CollectionType | 'custom', { label: string; color: string }> = {
  contrast: { label: 'CURADO', color: '#00d4ff' },
  test: { label: 'TEST', color: '#f59e0b' },
  custom: { label: 'LOCAL', color: '#8b5cf6' },
}

export function CollectionBadge({ collection }: { collection: CollectionType | 'custom' }) {
  const badge = COLLECTION_BADGE[collection] ?? COLLECTION_BADGE.test
  return (
    <span
      className="inline-block text-[8px] font-mono px-1 py-0.5 rounded border leading-none"
      style={{ color: badge.color, borderColor: badge.color + '50', background: badge.color + '10' }}
    >
      {badge.label}
    </span>
  )
}

export default function ModelSelector({ label, models, selected, onChange, color }: Props) {
  const selectedModel = models.find(m => m.slug === selected)

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-mono tracking-widest uppercase text-[#f5f6f7]">
        {label}
      </label>
      <div className="relative">
        <select
          value={selected}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-[#111827] border rounded px-3 py-2.5 text-sm font-mono text-[#e2e8f0] cursor-pointer focus:outline-none focus:ring-1 pr-8 transition-colors"
          style={{ borderColor: color + '40' }}
          onFocus={e => (e.target.style.borderColor = color)}
          onBlur={e => (e.target.style.borderColor = color + '40')}
        >
          {models.map(m => (
            <option key={m.slug} value={m.slug} style={{ background: '#111827' }}>
              {m.displayName}
              {m.collection === 'contrast' ? ' ★' : ''}
              {m.isFallback ? ' [fb]' : ''}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" style={{ color }}>
            <path d="M8 11L3 6h10L8 11z" />
          </svg>
        </div>
      </div>
      {selectedModel && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#f5f6f7] bg-[#0d1220] rounded p-2">
          <CollectionBadge collection={selectedModel.collection} />
          <span className="truncate">{selectedModel.metrics.modelType ?? '—'}</span>
          {selectedModel.metrics.isMoE && <span className="text-[#8b5cf6]">MoE</span>}
          {selectedModel.metrics.hasVision && <span className="text-[#10b981]">Vision</span>}
          {selectedModel.isFallback && <span className="text-[#f59e0b]">↪fallback</span>}
        </div>
      )}
    </div>
  )
}
