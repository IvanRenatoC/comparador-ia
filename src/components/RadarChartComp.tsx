import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip
} from 'recharts'
import type { ModelEntry } from '../types'
import { useChartColors } from '../hooks/useChartColors'

interface Props {
  base: ModelEntry
  cmp: ModelEntry
}

const AXES = [
  { key: 'contextScore', label: 'Contexto' },
  { key: 'depthScore', label: 'Profundidad' },
  { key: 'widthScore', label: 'Ancho' },
  { key: 'attentionScore', label: 'Atención' },
  { key: 'moeScore', label: 'MoE' },
  { key: 'multimodalScore', label: 'Multimodal' },
  { key: 'deploymentComplexityScore', label: 'Complejidad' },
]

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#e8edf4] dark:bg-[#1a2235] border border-[#cbd5e1] dark:border-[#2d4060] rounded p-2 text-xs font-mono shadow-xl">
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="text-[#0f172a] dark:text-[#e2e8f0]">{p.value}/100</span>
        </div>
      ))}
    </div>
  )
}

export default function RadarChartComp({ base, cmp }: Props) {
  const { text: chartText, grid: chartGrid } = useChartColors()

  const data = AXES.map(({ key, label }) => ({
    axis: label,
    base: Math.round((base.scores[key as keyof typeof base.scores] as number) ?? 0),
    cmp: Math.round((cmp.scores[key as keyof typeof cmp.scores] as number) ?? 0),
  }))

  return (
    <div>
      <div className="text-xs font-mono tracking-widest uppercase text-[#334155] dark:text-[#f5f6f7] mb-3">
        Radar arquitectónico — scores normalizados (0–100)
      </div>
      <div className="bg-[#f8fafc] dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1e2d45] rounded-lg p-4">
        <div className="flex items-center gap-4 mb-2 text-xs font-mono justify-center">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#3b82f6] inline-block" />
            <span className="text-[#334155] dark:text-[#f5f6f7]">{base.displayName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#00d4ff] inline-block" />
            <span className="text-[#0f172a] dark:text-[#e2e8f0]">{cmp.displayName}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke={chartGrid} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: chartText, fontSize: 10, fontFamily: 'Space Mono' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar name={base.displayName} dataKey="base" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={1.5} />
            <Radar name={cmp.displayName} dataKey="cmp" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.2} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
        <p className="text-[9px] text-[#334155] dark:text-[#f5f6f7] font-mono mt-1 text-center">
          Scores heurísticos para visualización. No son benchmarks.
        </p>
      </div>
    </div>
  )
}
