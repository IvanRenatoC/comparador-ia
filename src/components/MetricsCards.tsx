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

function Card({
  label, baseVal, cmpVal, highlight, unit
}: { label: string; baseVal: string; cmpVal: string; highlight?: 'up' | 'down' | null; unit?: string }) {
  const colors = {
    up: '#10b981',
    down: '#f43f5e',
    null: '#f5f6f7',
    undefined: '#f5f6f7',
  }
  const c = colors[highlight as keyof typeof colors] ?? '#f5f6f7'

  return (
    <div className="bg-[#111827] border border-[#1e2d45] rounded-lg p-3 flex flex-col gap-2 hover:border-[#2d4060] transition-colors">
      <div className="text-[9px] font-mono tracking-widest uppercase text-[#f5f6f7]">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[10px] text-[#f5f6f7] font-mono mb-0.5">BASE</div>
          <div className="text-sm font-mono text-[#f5f6f7]">{baseVal}{unit}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#f5f6f7] font-mono mb-0.5">CMP</div>
          <div className="text-sm font-mono font-bold" style={{ color: c }}>{cmpVal}{unit}</div>
        </div>
      </div>
    </div>
  )
}

function boolCard(label: string, baseVal: boolean, cmpVal: boolean) {
  return (
    <div key={label} className="bg-[#111827] border border-[#1e2d45] rounded-lg p-3 flex flex-col gap-2 hover:border-[#2d4060] transition-colors">
      <div className="text-[9px] font-mono tracking-widest uppercase text-[#f5f6f7]">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] text-[#f5f6f7] font-mono mb-0.5">BASE</div>
          <div className={`text-xs font-mono font-bold ${baseVal ? 'text-[#10b981]' : 'text-[#f5f6f7]'}`}>
            {baseVal ? 'SÍ' : 'NO'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#f5f6f7] font-mono mb-0.5">CMP</div>
          <div className={`text-xs font-mono font-bold ${cmpVal ? 'text-[#10b981]' : 'text-[#f5f6f7]'}`}>
            {cmpVal ? 'SÍ' : 'NO'}
          </div>
        </div>
      </div>
    </div>
  )
}

function getHighlight(baseVal: number | undefined, cmpVal: number | undefined, higherBetter = true): 'up' | 'down' | null {
  if (baseVal == null || cmpVal == null) return null
  if (Math.abs((cmpVal - baseVal) / (baseVal || 1)) < 0.05) return null
  const better = higherBetter ? cmpVal > baseVal : cmpVal < baseVal
  return better ? 'up' : 'down'
}

export default function MetricsCards({ base, cmp }: Props) {
  const bm = base.metrics
  const cm = cmp.metrics

  return (
    <div>
      <div className="text-[10px] font-mono tracking-widest uppercase text-[#f5f6f7] mb-3">
        Resumen de métricas clave
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        <Card label="Context Window" baseVal={fmt(bm.contextWindowTokens)} cmpVal={fmt(cm.contextWindowTokens)} highlight={getHighlight(bm.contextWindowTokens, cm.contextWindowTokens)} unit=" tok" />
        <Card label="Capas" baseVal={fmt(bm.layers)} cmpVal={fmt(cm.layers)} highlight={getHighlight(bm.layers, cm.layers)} />
        <Card label="Hidden Size" baseVal={fmt(bm.hiddenSize)} cmpVal={fmt(cm.hiddenSize)} highlight={getHighlight(bm.hiddenSize, cm.hiddenSize)} />
        <Card label="Attn Heads" baseVal={fmt(bm.attentionHeads)} cmpVal={fmt(cm.attentionHeads)} highlight={getHighlight(bm.attentionHeads, cm.attentionHeads)} />
        <Card label="KV Heads" baseVal={fmt(bm.kvHeads)} cmpVal={fmt(cm.kvHeads)} highlight={getHighlight(bm.kvHeads, cm.kvHeads, false)} />
        <Card label="Vocabulario" baseVal={fmt(bm.vocabSize)} cmpVal={fmt(cm.vocabSize)} highlight={getHighlight(bm.vocabSize, cm.vocabSize)} />
        <Card label="Expertos MoE" baseVal={bm.isMoE ? fmt(bm.totalExperts) : 'NO MoE'} cmpVal={cm.isMoE ? fmt(cm.totalExperts) : 'NO MoE'} />
        <Card label="Act./Token" baseVal={bm.isMoE ? fmt(bm.activeExpertsPerToken) : '—'} cmpVal={cm.isMoE ? fmt(cm.activeExpertsPerToken) : '—'} />
        {boolCard('Multimodal', bm.hasVision, cm.hasVision)}
        <div className="bg-[#111827] border border-[#1e2d45] rounded-lg p-3 flex flex-col gap-2 hover:border-[#2d4060] transition-colors">
          <div className="text-[9px] font-mono tracking-widest uppercase text-[#f5f6f7]">Dtype</div>
          <div className="flex items-center justify-between gap-1">
            <div className="text-[9px] font-mono text-[#f5f6f7] truncate">{bm.dtype ?? '—'}</div>
            <div className="text-[9px] font-mono font-bold text-[#00d4ff] truncate">{cm.dtype ?? '—'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
