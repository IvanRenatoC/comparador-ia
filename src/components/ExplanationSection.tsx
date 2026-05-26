import type { ExplanationItem } from '../types'

interface Props {
  explanation: ExplanationItem
  baseDisplayName: string
  cmpDisplayName: string
}

function List({ items, color, icon }: { items: string[]; color: string; icon: string }) {
  if (!items.length) return null
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[12px] font-body leading-relaxed" style={{ color: '#94a3b8' }}>
          <span className="mt-0.5 text-sm shrink-0" style={{ color }}>{icon}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function ExplanationSection({ explanation, baseDisplayName, cmpDisplayName }: Props) {
  return (
    <div>
      <div className="text-[10px] font-mono tracking-widest uppercase text-[#4b5e7a] mb-3">
        Análisis en español — inferencia arquitectónica
      </div>

      <div className="bg-[#111827] border border-[#1e2d45] rounded-lg overflow-hidden">
        {/* Summary bar */}
        <div className="px-4 py-3 border-b border-[#1e2d45] bg-[#0d1220]">
          <p className="text-[12px] font-mono text-[#e2e8f0] leading-relaxed">
            {explanation.summary}
          </p>
          <p className="text-[10px] text-[#4b5e7a] mt-1 font-mono">
            {cmpDisplayName} comparado contra {baseDisplayName}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1e2d45]">
          {/* Wins */}
          <div className="bg-[#111827] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-[#10b981] rounded-full" />
              <div className="text-[9px] font-mono tracking-widest uppercase text-[#10b981]">
                Donde gana ({explanation.wins.length})
              </div>
            </div>
            {explanation.wins.length > 0 ? (
              <List items={explanation.wins} color="#10b981" icon="+" />
            ) : (
              <p className="text-[11px] text-[#4b5e7a] font-mono">Sin ventajas detectadas.</p>
            )}
          </div>

          {/* Losses */}
          <div className="bg-[#111827] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-[#f43f5e] rounded-full" />
              <div className="text-[9px] font-mono tracking-widest uppercase text-[#f43f5e]">
                Donde pierde ({explanation.losses.length})
              </div>
            </div>
            {explanation.losses.length > 0 ? (
              <List items={explanation.losses} color="#f43f5e" icon="−" />
            ) : (
              <p className="text-[11px] text-[#4b5e7a] font-mono">Sin desventajas detectadas.</p>
            )}
          </div>

          {/* Ties */}
          <div className="bg-[#111827] p-4 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-[#f59e0b] rounded-full" />
              <div className="text-[9px] font-mono tracking-widest uppercase text-[#f59e0b]">
                Empate / diferencia menor ({explanation.ties.length})
              </div>
            </div>
            {explanation.ties.length > 0 ? (
              <List items={explanation.ties} color="#f59e0b" icon="≈" />
            ) : (
              <p className="text-[11px] text-[#4b5e7a] font-mono">Sin empates detectados.</p>
            )}
          </div>
        </div>

        {/* Missing info */}
        {explanation.missingInfo.length > 0 && (
          <div className="px-4 py-3 border-t border-[#1e2d45] bg-[#0d1220]">
            <div className="text-[9px] font-mono tracking-widest uppercase text-[#f59e0b] mb-2">Campos ausentes</div>
            <List items={explanation.missingInfo} color="#f59e0b" icon="!" />
          </div>
        )}

        {/* Methodology warning */}
        <div className="px-4 py-2.5 border-t border-[#1e2d45] bg-[#080b14]">
          <p className="text-[10px] font-mono text-[#4b5e7a]">
            ⚠ {explanation.methodologyWarning}
          </p>
        </div>
      </div>
    </div>
  )
}
