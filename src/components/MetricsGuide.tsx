import { useState } from 'react'

const METRICS = [
  {
    key: 'max_position_embeddings',
    label: 'Context length / max_position_embeddings',
    short: 'Cuánta información cabe en una sola consulta.',
    detail: 'Define cuántos tokens (palabras o fragmentos) puede recibir el modelo en una sola solicitud. Un documento de 50 páginas densas puede rondar los 50.000–80.000 tokens. Si el modelo tiene 128k de contexto, puede analizar ese documento completo sin truncarlo. Valores más altos permiten análisis de documentos más extensos, pero también incrementan el consumo de memoria.',
  },
  {
    key: 'hidden_size',
    label: 'hidden_size',
    short: 'Tamaño interno de las representaciones del modelo.',
    detail: 'Es la dimensión del vector con el que el modelo representa cada token internamente. Valores más altos permiten representaciones más ricas y expresivas, pero también aumentan el costo computacional y la VRAM requerida. No define calidad por sí solo: un modelo pequeño bien entrenado puede superar a uno grande mal ajustado.',
  },
  {
    key: 'num_hidden_layers',
    label: 'num_hidden_layers — Capas',
    short: 'Profundidad del modelo. Más capas, más capacidad de razonamiento.',
    detail: 'Cada capa procesa y transforma la representación de los tokens. Modelos más profundos pueden capturar relaciones más abstractas y complejas en el texto. Sin embargo, más capas implica más costo computacional por token generado y mayor latencia.',
  },
  {
    key: 'num_attention_heads',
    label: 'num_attention_heads — Cabezas de atención',
    short: 'Cuántas perspectivas simultáneas analiza el modelo sobre el texto.',
    detail: 'Cada cabeza de atención aprende a enfocarse en relaciones distintas entre tokens (sintaxis, semántica, correferencia, etc.). Más cabezas permiten capturar más tipos de relaciones en paralelo. No es directamente comparable entre arquitecturas distintas.',
  },
  {
    key: 'num_key_value_heads',
    label: 'num_key_value_heads — Cabezas KV (GQA/MQA)',
    short: 'Relacionado con eficiencia de memoria en inferencia.',
    detail: 'En arquitecturas con Grouped Query Attention (GQA) o Multi-Query Attention (MQA), múltiples cabezas de atención comparten las mismas cabezas KV. Esto reduce significativamente el tamaño del KV cache durante la inferencia, permitiendo mayor throughput o contextos más largos con la misma VRAM. Menos cabezas KV no significa menor calidad necesariamente.',
  },
  {
    key: 'vocab_size',
    label: 'vocab_size — Vocabulario',
    short: 'Cuántas unidades distintas puede reconocer el tokenizador.',
    detail: 'Un vocabulario más grande puede representar mejor idiomas con morfología compleja (español, árabe, chino) y reducir la fragmentación de palabras poco comunes. Sin embargo, un vocab grande no garantiza buena calidad en español: el entrenamiento y los datos son más determinantes. Vocabularios pequeños con buenos datos pueden funcionar mejor que vocabularios grandes con datos pobres.',
  },
  {
    key: 'intermediate_size',
    label: 'intermediate_size — Capa MLP interna',
    short: 'Tamaño de las capas feed-forward internas.',
    detail: 'Entre capas de atención, los modelos aplican capas MLP (perceptrón multicapa) para transformar las representaciones. El intermediate_size define el ancho de esas capas. Más ancho implica más capacidad pero también más parámetros y mayor consumo de VRAM.',
  },
  {
    key: 'num_local_experts',
    label: 'num_local_experts / num_experts_per_tok — MoE',
    short: 'Arquitectura Mixture of Experts: parámetros totales vs activos por token.',
    detail: 'En modelos MoE (Mixture of Experts), el modelo tiene múltiples "expertos" (sub-redes), pero solo activa una fracción de ellos por cada token. Por ejemplo, un modelo con 256 expertos y 8 activos/token usa solo 8 de 256 por inferencia. Esto permite tener muchos parámetros totales (mayor capacidad potencial) con un costo de cómputo similar al de un modelo denso más pequeño. La VRAM sigue siendo proporcional a los parámetros totales.',
  },
  {
    key: 'vision_config',
    label: 'vision_config — Soporte multimodal',
    short: 'Indica si el modelo declara capacidad visual (texto + imagen).',
    detail: 'La presencia de vision_config en el archivo config.json indica que el modelo tiene una arquitectura multimodal. Esto no garantiza calidad en tareas específicas como OCR, análisis de gráficas o lectura de PDFs escaneados. Para casos de uso documental se recomienda evaluar en producción con los documentos reales del proyecto.',
  },
  {
    key: 'torch_dtype',
    label: 'torch_dtype — Tipo de dato',
    short: 'Tipo numérico esperado para los pesos. Determina uso de VRAM.',
    detail: 'bfloat16 y float16 usan 2 bytes por parámetro. float32 usa 4 bytes. Un modelo de 7B parámetros en bfloat16 ocupa ~14 GB de VRAM solo para pesos (sin contar KV cache ni activaciones). En cuantización int8 o int4 ese valor baja a ~7 GB o ~4 GB respectivamente. El tipo declarado en config.json es el nativo del modelo; vLLM puede servir en tipos distintos según configuración.',
  },
  {
    key: 'vram_estimate',
    label: 'VRAM estimada (aproximación)',
    short: 'Estimación del hardware mínimo necesario para cargar el modelo.',
    detail: 'La VRAM mínima para carga en fp16 se aproxima como: parámetros × 2 bytes. Esta estimación no incluye el KV cache (que depende del contexto y batch size), ni las activaciones intermedias. Para inferencia con vLLM se recomienda una GPU con 20–30% de margen sobre el mínimo de pesos. Los valores mostrados en el comparador son estimaciones derivadas de config.json y deben tomarse como referencia, no como especificación exacta.',
  },
]

export default function MetricsGuide() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[11px] font-mono text-[#4b5e7a] hover:text-[#00d4ff] transition-colors w-full"
      >
        <span className="border border-[#1e2d45] rounded px-2 py-0.5 text-[10px] font-mono">
          {open ? '▲' : '▼'}
        </span>
        <span>Cómo leer las métricas</span>
        <span className="flex-1 h-px bg-[#1e2d45] ml-2" />
      </button>

      {open && (
        <div className="mt-3 bg-[#111827] border border-[#1e2d45] rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-[#0d1220] border-b border-[#1e2d45]">
            <p className="text-[11px] font-mono text-[#4b5e7a]">
              Las métricas provienen de <span className="text-[#00d4ff]">config.json</span> de cada modelo.
              Describen su arquitectura declarada, no su desempeño real ni resultados en benchmarks.
            </p>
          </div>
          <div className="divide-y divide-[#1e2d45]">
            {METRICS.map(m => (
              <div key={m.key} className="hover:bg-[#0d1220] transition-colors">
                <button
                  onClick={() => setExpanded(expanded === m.key ? null : m.key)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left"
                >
                  <span className="text-[10px] font-mono text-[#4b5e7a] mt-0.5 shrink-0">
                    {expanded === m.key ? '▼' : '▶'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono text-[#e2e8f0]">{m.label}</div>
                    <div className="text-[11px] text-[#94a3b8] mt-0.5">{m.short}</div>
                  </div>
                </button>
                {expanded === m.key && (
                  <div className="px-9 pb-3 text-[11px] text-[#94a3b8] leading-relaxed border-t border-[#1e2d45]/50 pt-2 bg-[#080b14]">
                    {m.detail}
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
