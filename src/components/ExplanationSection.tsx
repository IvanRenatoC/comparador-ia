import type { PairExplanation } from '../types'

interface Props {
  explanation: PairExplanation
  nameA: string
  nameB: string
}

function List({ items, color, icon }: { items: string[]; color: string; icon: string }) {
  if (!items.length) return null
  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-[#94a3b8]">
          <span className="shrink-0 mt-0.5" style={{ color }}>{icon}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function ExplanationSection({ explanation, nameA, nameB }: Props) {
  return (
    <div>
      <div className="text-[10px] font-mono tracking-widest uppercase text-[#4b5e7a] mb-3">
        Lectura ejecutiva de la comparación
      </div>

      <div className="bg-[#111827] border border-[#1e2d45] rounded-lg overflow-hidden">
        {/* Summary */}
        <div className="px-4 py-3 bg-[#0d1220] border-b border-[#1e2d45]">
          <p className="text-[12px] font-mono text-[#e2e8f0] leading-relaxed">{explanation.summary}</p>
          <div className="flex gap-3 mt-2 text-[10px] font-mono">
            <span className="text-[#3b82f6]">A: {nameA}</span>
            <span className="text-[#00d4ff]">B: {nameB}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1e2d45]">
          <div className="bg-[#111827] p-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-[#00d4ff] rounded-full" />
              <span className="text-[9px] font-mono tracking-widest uppercase text-[#00d4ff]">
                B supera a A ({explanation.wins.length})
              </span>
            </div>
            {explanation.wins.length
              ? <List items={explanation.wins} color="#00d4ff" icon="↑" />
              : <p className="text-[11px] text-[#4b5e7a] font-mono mt-2">Sin ventajas detectadas.</p>}
          </div>

          <div className="bg-[#111827] p-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-[#3b82f6] rounded-full" />
              <span className="text-[9px] font-mono tracking-widest uppercase text-[#3b82f6]">
                A supera a B ({explanation.losses.length})
              </span>
            </div>
            {explanation.losses.length
              ? <List items={explanation.losses} color="#3b82f6" icon="↑" />
              : <p className="text-[11px] text-[#4b5e7a] font-mono mt-2">Sin ventajas de A detectadas.</p>}
          </div>

          <div className="bg-[#111827] p-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-[#f59e0b] rounded-full" />
              <span className="text-[9px] font-mono tracking-widest uppercase text-[#f59e0b]">
                Similares / N/D ({explanation.ties.length})
              </span>
            </div>
            {explanation.ties.length
              ? <List items={explanation.ties} color="#f59e0b" icon="≈" />
              : <p className="text-[11px] text-[#4b5e7a] font-mono mt-2">Sin empates.</p>}
          </div>
        </div>

        {/* On-premise notes */}
        {explanation.onPremiseNotes.length > 0 && (
          <div className="px-4 py-3 border-t border-[#1e2d45] bg-[#0d1220]">
            <div className="text-[9px] font-mono tracking-widest uppercase text-[#8b5cf6] mb-2">
              Relevancia para operación on-premise
            </div>
            <List items={explanation.onPremiseNotes} color="#8b5cf6" icon="→" />
          </div>
        )}

        {/* Missing info */}
        {explanation.missingInfo.length > 0 && (
          <div className="px-4 py-2.5 border-t border-[#1e2d45] bg-[#0d1220]">
            <div className="text-[9px] font-mono tracking-widest uppercase text-[#f59e0b] mb-1">Campos no declarados</div>
            <List items={explanation.missingInfo} color="#f59e0b" icon="!" />
          </div>
        )}

        {/* Methodology */}
        <div className="px-4 py-2 border-t border-[#1e2d45] bg-[#080b14]">
          <p className="text-[10px] font-mono text-[#4b5e7a]">⚠ {explanation.methodologyWarning}</p>
        </div>
      </div>
    </div>
  )
}
