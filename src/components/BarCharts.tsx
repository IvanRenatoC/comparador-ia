import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts'
import type { ModelEntry } from '../types'

interface Props {
  base: ModelEntry
  cmp: ModelEntry
}

function fmt(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`
  return `${val}`
}

const METRICS: { key: keyof import('../types').ModelMetrics; label: string }[] = [
  { key: 'contextWindowTokens', label: 'Context Window' },
  { key: 'layers', label: 'Capas' },
  { key: 'hiddenSize', label: 'Hidden Size' },
  { key: 'attentionHeads', label: 'Attn Heads' },
  { key: 'kvHeads', label: 'KV Heads' },
  { key: 'vocabSize', label: 'Vocabulario' },
  { key: 'totalExperts', label: 'Expertos Totales' },
  { key: 'activeExpertsPerToken', label: 'Activos/Token' },
]

interface ChartData {
  metric: string
  base: number
  cmp: number
  baseLabel: string
  cmpLabel: string
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a2235] border border-[#2d4060] rounded p-2.5 text-[11px] font-mono shadow-xl">
      <div className="text-[#94a3b8] mb-1.5">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: p.color }} />
          <span className="text-[#94a3b8]">{p.name}:</span>
          <span className="text-[#e2e8f0]">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function BarCharts({ base, cmp }: Props) {
  const data: ChartData[] = METRICS
    .map(({ key, label }) => {
      const bv = base.metrics[key] as number | undefined
      const cv = cmp.metrics[key] as number | undefined
      if (!bv && !cv) return null
      return {
        metric: label,
        base: bv ?? 0,
        cmp: cv ?? 0,
        baseLabel: bv != null ? fmt(bv) : '—',
        cmpLabel: cv != null ? fmt(cv) : '—',
      }
    })
    .filter(Boolean) as ChartData[]

  return (
    <div>
      <div className="text-[10px] font-mono tracking-widest uppercase text-[#4b5e7a] mb-3">
        Comparación directa — métricas arquitectónicas
      </div>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-lg p-4">
        <div className="flex items-center gap-4 mb-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#3b82f6] inline-block" />
            <span className="text-[#94a3b8]">{base.displayName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#00d4ff] inline-block" />
            <span className="text-[#e2e8f0]">{cmp.displayName}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e2d45" vertical={false} />
            <XAxis
              dataKey="metric"
              tick={{ fill: '#4b5e7a', fontSize: 9, fontFamily: 'Space Mono' }}
              angle={-35}
              textAnchor="end"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: '#1e2d45' }}
            />
            <YAxis
              tick={{ fill: '#4b5e7a', fontSize: 9, fontFamily: 'Space Mono' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => fmt(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="base" name={base.displayName} fill="#3b82f6" radius={[2, 2, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill="#3b82f6" fillOpacity={0.7} />)}
              <LabelList dataKey="baseLabel" position="top" style={{ fill: '#4b5e7a', fontSize: 8, fontFamily: 'Space Mono' }} />
            </Bar>
            <Bar dataKey="cmp" name={cmp.displayName} fill="#00d4ff" radius={[2, 2, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill="#00d4ff" fillOpacity={0.8} />)}
              <LabelList dataKey="cmpLabel" position="top" style={{ fill: '#00d4ff', fontSize: 8, fontFamily: 'Space Mono' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[9px] text-[#4b5e7a] font-mono mt-2 text-center">
          * Valores derivados de config.json. No representan benchmark empírico.
        </p>
      </div>
    </div>
  )
}
