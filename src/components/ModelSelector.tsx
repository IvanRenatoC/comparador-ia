import type { ModelEntry } from '../types'

interface Props {
  label: string
  models: ModelEntry[]
  selected: string
  onChange: (slug: string) => void
  color: string
  exclude?: string
}

export default function ModelSelector({ label, models, selected, onChange, color, exclude }: Props) {
  const available = exclude ? models.filter(m => m.slug !== exclude) : models

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-mono tracking-widest uppercase text-[#4b5e7a]">
        {label}
      </label>
      <div className="relative">
        <select
          value={selected}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-[#111827] border rounded px-3 py-2.5 text-sm font-mono text-[#e2e8f0] cursor-pointer focus:outline-none focus:ring-1 pr-8"
          style={{ borderColor: color + '40', background: '#111827' }}
          onFocus={e => (e.target.style.borderColor = color)}
          onBlur={e => (e.target.style.borderColor = color + '40')}
        >
          {available.map(m => (
            <option key={m.slug} value={m.slug} style={{ background: '#111827' }}>
              {m.displayName}
              {m.isFallback ? ' [fallback]' : ''}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" style={{ color }}>
            <path d="M8 11L3 6h10L8 11z" />
          </svg>
        </div>
      </div>
      <div className="text-[10px] font-mono text-[#4b5e7a] truncate">
        {available.find(m => m.slug === selected)?.metrics.modelType ?? '—'}
      </div>
    </div>
  )
}
