import { useState } from 'react'

const SECTIONS = [
  {
    key: 'bars',
    label: 'Gráfico de barras',
    short: 'Comparación directa de magnitudes entre modelos.',
    detail: 'Cada par de barras muestra el valor de una métrica para el Modelo A (azul) y el Modelo B (cyan). Las magnitudes son directas: si la barra de contexto de B es 8× la de A, B acepta 8× más tokens. Las etiquetas muestran los valores exactos formateados. Útil para identificar diferencias absolutas grandes, como context window o vocabulario.',
  },
  {
    key: 'radar',
    label: 'Gráfico radar — perfil arquitectónico',
    short: 'Comparación normalizada de perfiles relativos. No es ranking de calidad.',
    detail: 'El radar normaliza cada métrica en una escala de 0 a 100 relativa al rango posible de la dimensión, no al máximo observado. Sirve para ver el "equilibrio" arquitectónico de cada modelo: un modelo puede dominar en contexto pero ser más angosto en hidden size. Un área mayor en el radar no significa que el modelo sea mejor; significa que tiene valores más altos en esas dimensiones arquitectónicas. Los scores son heurísticos construidos para visualización, no benchmarks.',
  },
  {
    key: 'table',
    label: 'Tabla comparativa',
    short: 'Valores exactos lado a lado con indicador de diferencia.',
    detail: 'La tabla muestra el valor de cada métrica para ambos modelos y un indicador de dirección (↑ B gana, ↓ A gana, ≈ similar). La columna "Interpretación" da contexto de qué significa esa diferencia para el caso de uso. Las flechas reflejan inferencia arquitectónica, no resultado empírico. Si un campo está como "—" significa que no está declarado en el config.json del modelo.',
  },
  {
    key: 'moe',
    label: 'Indicadores MoE (Mixture of Experts)',
    short: 'Parámetros totales ≠ parámetros activos por token.',
    detail: 'Un modelo MoE puede declarar 256 expertos totales pero activar solo 8 por token durante la inferencia. Esto significa que el costo computacional por token es similar al de un modelo denso del tamaño de esos 8 expertos activos, pero la VRAM necesaria sigue siendo proporcional a los parámetros totales (todos los pesos deben estar cargados). El indicador "MoE" en el comparador significa que el modelo tiene esta arquitectura y muestra ambos valores cuando están disponibles.',
  },
  {
    key: 'vision',
    label: 'Indicador multimodal (vision_config)',
    short: 'Presencia de capacidad visual declarada en la arquitectura.',
    detail: 'El badge "Vision" aparece cuando el config.json del modelo contiene un bloque vision_config. Esto indica que la arquitectura incluye un encoder visual (generalmente un Vision Transformer). Sin embargo, la calidad real en tareas de visión —OCR, análisis de gráficas, comprensión de tablas en imágenes— solo puede evaluarse con benchmarks específicos. La presencia de vision_config es condición necesaria pero no suficiente para capacidad multimodal de calidad.',
  },
]

export default function ChartGuide() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[11px] font-mono text-[#f5f6f7] hover:text-[#00d4ff] transition-colors w-full"
      >
        <span className="border border-[#1e2d45] rounded px-2 py-0.5 text-[10px] font-mono">
          {open ? '▲' : '▼'}
        </span>
        <span>Cómo interpretar los gráficos</span>
        <span className="flex-1 h-px bg-[#1e2d45] ml-2" />
      </button>

      {open && (
        <div className="mt-3 bg-[#111827] border border-[#1e2d45] rounded-lg overflow-hidden">
          <div className="divide-y divide-[#1e2d45]">
            {SECTIONS.map(s => (
              <div key={s.key} className="hover:bg-[#0d1220] transition-colors">
                <button
                  onClick={() => setExpanded(expanded === s.key ? null : s.key)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left"
                >
                  <span className="text-[10px] font-mono text-[#f5f6f7] mt-0.5 shrink-0">
                    {expanded === s.key ? '▼' : '▶'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono text-[#e2e8f0]">{s.label}</div>
                    <div className="text-[11px] text-[#f5f6f7] mt-0.5">{s.short}</div>
                  </div>
                </button>
                {expanded === s.key && (
                  <div className="px-9 pb-3 text-[11px] text-[#f5f6f7] leading-relaxed border-t border-[#1e2d45]/50 pt-2 bg-[#080b14]">
                    {s.detail}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
