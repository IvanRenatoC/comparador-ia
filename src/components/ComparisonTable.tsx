import type { ModelEntry } from '../types'

interface Props {
  base: ModelEntry
  cmp: ModelEntry
}

function fmt(val: number | undefined, suffix = ''): string {
  if (val == null) return '—'
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M${suffix}`
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k${suffix}`
  return `${val}${suffix}`
}

interface Row {
  label: string
  baseVal: string
  cmpVal: string
  note: string
  direction?: 'up' | 'down' | 'neutral'
}

function compare(baseNum: number | undefined, cmpNum: number | undefined, higherBetter = true): 'up' | 'down' | 'neutral' {
  if (baseNum == null || cmpNum == null) return 'neutral'
  const diff = (cmpNum - baseNum) / (baseNum || 1)
  if (Math.abs(diff) < 0.05) return 'neutral'
  return (higherBetter ? diff > 0 : diff < 0) ? 'up' : 'down'
}

export default function ComparisonTable({ base, cmp }: Props) {
  const bm = base.metrics
  const cm = cmp.metrics

  const rows: Row[] = [
    {
      label: 'Arquitectura',
      baseVal: bm.architecture ?? '—',
      cmpVal: cm.architecture ?? '—',
      note: 'Nombre de la clase de modelo',
      direction: 'neutral',
    },
    {
      label: 'Tipo de modelo',
      baseVal: bm.modelType ?? '—',
      cmpVal: cm.modelType ?? '—',
      note: 'Identificador interno del tipo',
      direction: 'neutral',
    },
    {
      label: 'Context window',
      baseVal: fmt(bm.contextWindowTokens, ' tok'),
      cmpVal: fmt(cm.contextWindowTokens, ' tok'),
      note: 'Tokens máximos aceptados según config (teórico, no empírico)',
      direction: compare(bm.contextWindowTokens, cm.contextWindowTokens),
    },
    {
      label: 'Capas',
      baseVal: fmt(bm.layers),
      cmpVal: fmt(cm.layers),
      note: 'Número de capas del transformador',
      direction: compare(bm.layers, cm.layers),
    },
    {
      label: 'Hidden size',
      baseVal: fmt(bm.hiddenSize),
      cmpVal: fmt(cm.hiddenSize),
      note: 'Dimensión del espacio de representación interno',
      direction: compare(bm.hiddenSize, cm.hiddenSize),
    },
    {
      label: 'Cabezas de atención',
      baseVal: fmt(bm.attentionHeads),
      cmpVal: fmt(cm.attentionHeads),
      note: 'Número total de cabezas de atención',
      direction: compare(bm.attentionHeads, cm.attentionHeads),
    },
    {
      label: 'Cabezas KV',
      baseVal: fmt(bm.kvHeads),
      cmpVal: fmt(cm.kvHeads),
      note: 'Menos cabezas KV = GQA, mayor eficiencia de memoria',
      direction: compare(bm.kvHeads, cm.kvHeads, false),
    },
    {
      label: 'Head dim',
      baseVal: fmt(bm.headDim),
      cmpVal: fmt(cm.headDim),
      note: 'Dimensión por cabeza de atención',
      direction: 'neutral',
    },
    {
      label: 'Vocabulario',
      baseVal: fmt(bm.vocabSize, ' tok'),
      cmpVal: fmt(cm.vocabSize, ' tok'),
      note: 'Tamaño del vocabulario declarado',
      direction: compare(bm.vocabSize, cm.vocabSize),
    },
    {
      label: 'MoE',
      baseVal: bm.isMoE ? `Sí (${fmt(bm.totalExperts)} exp, ${fmt(bm.activeExpertsPerToken)}/tok)` : 'No',
      cmpVal: cm.isMoE ? `Sí (${fmt(cm.totalExperts)} exp, ${fmt(cm.activeExpertsPerToken)}/tok)` : 'No',
      note: 'Mixture of Experts: expertos totales y activos por token',
      direction: 'neutral',
    },
    {
      label: 'Multimodal',
      baseVal: bm.hasVision ? 'Sí (vision_config)' : 'No',
      cmpVal: cm.hasVision ? 'Sí (vision_config)' : 'No',
      note: 'Presencia de vision_config en el config.json',
      direction: 'neutral',
    },
    {
      label: 'Dtype',
      baseVal: bm.dtype ?? '—',
      cmpVal: cm.dtype ?? '—',
      note: 'Tipo de dato declarado para pesos',
      direction: 'neutral',
    },
  ]

  const arrows = { up: '↑', down: '↓', neutral: '≈' }
  const arrowColors = { up: '#10b981', down: '#f43f5e', neutral: '#8fa3bf' }

  return (
    <div>
      <div className="text-[10px] font-mono tracking-widest uppercase text-[#4b5e7a] mb-3">
        Tabla técnica comparativa
      </div>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] font-mono">
            <thead>
              <tr className="border-b border-[#1e2d45] bg-[#0d1220]">
                <th className="text-left px-4 py-2.5 text-[#8fa3bf] tracking-widest uppercase text-[10px] w-36">Métrica</th>
                <th className="text-left px-4 py-2.5 text-[#3b82f6] tracking-widest uppercase text-[10px]">{base.displayName}</th>
                <th className="text-left px-4 py-2.5 text-[#00d4ff] tracking-widest uppercase text-[10px]">{cmp.displayName}</th>
                <th className="text-left px-4 py-2.5 text-[10px] text-[#8fa3bf] tracking-widest uppercase hidden lg:table-cell">Interpretación</th>
                <th className="px-4 py-2.5 text-[10px] text-[#8fa3bf] tracking-widest uppercase text-center w-8">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-[#1e2d45]/50 hover:bg-[#0d1220]/50 transition-colors">
                  <td className="px-4 py-2.5 text-[#8fa3bf]">{row.label}</td>
                  <td className="px-4 py-2.5 text-[#b6c2d2]">{row.baseVal}</td>
                  <td className="px-4 py-2.5 font-bold" style={{ color: '#e2e8f0' }}>{row.cmpVal}</td>
                  <td className="px-4 py-2.5 text-[#8fa3bf] hidden lg:table-cell leading-relaxed">{row.note}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-base" style={{ color: arrowColors[row.direction ?? 'neutral'] }}>
                    {arrows[row.direction ?? 'neutral']}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-[#0d1220] flex gap-4 text-[10px] font-mono text-[#8fa3bf]">
          <span><span className="text-[#10b981]">↑</span> CMP mejor</span>
          <span><span className="text-[#f43f5e]">↓</span> CMP inferior</span>
          <span><span>≈</span> Similar o N/D</span>
          <span className="ml-auto">Flecha = inferencia arquitectónica, no empírica</span>
        </div>
      </div>

      {(base.missingFields.length > 0 || cmp.missingFields.length > 0) && (
        <div className="mt-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded p-3 text-[10px] font-mono text-[#f59e0b]">
          <div className="font-bold mb-1">Campos faltantes detectados</div>
          {base.missingFields.length > 0 && <div>{base.displayName}: {base.missingFields.join(', ')}</div>}
          {cmp.missingFields.length > 0 && <div>{cmp.displayName}: {cmp.missingFields.join(', ')}</div>}
        </div>
      )}
    </div>
  )
}
