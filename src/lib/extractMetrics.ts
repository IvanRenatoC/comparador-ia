import type { ModelMetrics, ModelScores, PairExplanation } from '../types'

function getFirst(obj: Record<string, unknown>, paths: string[]): unknown {
  for (const p of paths) {
    const parts = p.split('.')
    let cur: unknown = obj
    for (const part of parts) {
      if (cur == null || typeof cur !== 'object') { cur = undefined; break }
      cur = (cur as Record<string, unknown>)[part]
    }
    if (cur !== undefined && cur !== null) return cur
  }
  return undefined
}

export function extractMetrics(raw: Record<string, unknown>): { metrics: ModelMetrics; missingFields: string[] } {
  const missing: string[] = []
  function grab(label: string, paths: string[]) {
    const val = getFirst(raw, paths)
    if (val === undefined) missing.push(label)
    return val
  }

  const architectures = (grab('architectures', ['architectures']) ?? []) as string[]
  const modelType = grab('model_type', ['model_type', 'text_config.model_type']) as string | undefined
  const torchDtype = grab('torch_dtype', ['torch_dtype', 'text_config.torch_dtype', 'text_config.dtype', 'dtype']) as string | undefined
  const hiddenSize = grab('hidden_size', ['hidden_size', 'text_config.hidden_size']) as number | undefined
  const numHiddenLayers = grab('num_hidden_layers', ['num_hidden_layers', 'text_config.num_hidden_layers']) as number | undefined
  const numAttentionHeads = grab('num_attention_heads', ['num_attention_heads', 'text_config.num_attention_heads']) as number | undefined
  const numKeyValueHeads = grab('num_key_value_heads', ['num_key_value_heads', 'text_config.num_key_value_heads']) as number | undefined
  const headDim = getFirst(raw, ['head_dim', 'text_config.head_dim']) as number | undefined
  const vocabSize = grab('vocab_size', ['vocab_size', 'text_config.vocab_size']) as number | undefined
  const maxPositionEmbeddings = grab('max_position_embeddings', ['max_position_embeddings', 'text_config.max_position_embeddings']) as number | undefined
  const numLocalExperts = getFirst(raw, ['num_local_experts', 'text_config.num_experts', 'text_config.num_local_experts']) as number | undefined
  const numExpertsPerTok = getFirst(raw, ['num_experts_per_tok', 'experts_per_token', 'text_config.num_experts_per_tok']) as number | undefined
  const visionConfig = getFirst(raw, ['vision_config']) as Record<string, unknown> | undefined

  const hasVision = !!visionConfig
  const isMoE = (numLocalExperts ?? 0) > 0 || (numExpertsPerTok ?? 0) > 0

  const metrics: ModelMetrics = {
    contextWindowTokens: maxPositionEmbeddings,
    layers: numHiddenLayers,
    hiddenSize,
    attentionHeads: numAttentionHeads,
    kvHeads: numKeyValueHeads,
    headDim,
    vocabSize,
    hasVision,
    isMoE,
    totalExperts: numLocalExperts,
    activeExpertsPerToken: numExpertsPerTok,
    dtype: torchDtype,
    architecture: Array.isArray(architectures) ? architectures[0] : undefined,
    modelType,
  }

  return { metrics, missingFields: missing }
}

function clampScore(val: number | undefined, min: number, max: number): number {
  if (val == null) return 0
  return Math.round(Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100)))
}

export function buildScores(metrics: ModelMetrics): ModelScores {
  return {
    contextScore: clampScore(metrics.contextWindowTokens, 4096, 2097152),
    widthScore: clampScore(metrics.hiddenSize, 1024, 16384),
    depthScore: clampScore(metrics.layers, 8, 128),
    attentionScore: clampScore(metrics.attentionHeads, 4, 128),
    kvEfficiencyScore: metrics.attentionHeads && metrics.kvHeads
      ? Math.round(100 - (metrics.kvHeads / metrics.attentionHeads) * 100)
      : 0,
    moeScore: metrics.isMoE ? clampScore(metrics.totalExperts, 4, 512) : 0,
    multimodalScore: metrics.hasVision ? 100 : 0,
    deploymentComplexityScore: metrics.isMoE
      ? Math.min(100, 30 + clampScore(metrics.totalExperts, 4, 512) * 0.7)
      : clampScore(metrics.hiddenSize, 1024, 16384),
  }
}

export function fmt(val: number | undefined, suffix = ''): string {
  if (val == null) return 'N/D'
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M${suffix}`
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k${suffix}`
  return `${val}${suffix}`
}

type Direction = 'up' | 'down' | 'neutral'

function compareNum(
  label: string,
  bv: number | undefined,
  cv: number | undefined,
  higherBetter = true,
  unit = ''
): { type: Direction | 'missing' | 'info'; text: string } | null {
  if (bv == null && cv == null) return null
  if (bv == null) return { type: 'info', text: `${label}: solo en B (${fmt(cv, unit)})` }
  if (cv == null) return { type: 'missing', text: `${label}: no declarado en B (A: ${fmt(bv, unit)})` }
  const diff = Math.abs(((cv - bv) / (bv || 1)) * 100)
  if (diff < 5) return { type: 'neutral', text: `${label}: similar (${fmt(bv, unit)} vs ${fmt(cv, unit)})` }
  const better = higherBetter ? cv > bv : cv < bv
  const pct = diff.toFixed(0)
  return {
    type: better ? 'up' : 'down',
    text: better
      ? `${label}: B supera a A — ${fmt(cv, unit)} vs ${fmt(bv, unit)} (${pct}% ${higherBetter ? 'mayor' : 'menor'})`
      : `${label}: A supera a B — ${fmt(bv, unit)} vs ${fmt(cv, unit)} (${pct}% ${higherBetter ? 'mayor' : 'menor'})`,
  }
}

export function generatePairExplanation(
  modelA: { displayName: string; metrics: ModelMetrics; missingFields: string[] },
  modelB: { displayName: string; metrics: ModelMetrics; missingFields: string[] }
): PairExplanation {
  const am = modelA.metrics
  const bm = modelB.metrics
  const A = modelA.displayName
  const B = modelB.displayName

  const comparisons = [
    compareNum('Ventana de contexto', am.contextWindowTokens, bm.contextWindowTokens, true, ' tokens'),
    compareNum('Capas de transformador', am.layers, bm.layers, true),
    compareNum('Hidden size', am.hiddenSize, bm.hiddenSize, true),
    compareNum('Cabezas de atención', am.attentionHeads, bm.attentionHeads, true),
    compareNum('Cabezas KV', am.kvHeads, bm.kvHeads, false),
    compareNum('Vocabulario', am.vocabSize, bm.vocabSize, true, ' tokens'),
  ]

  const wins: string[] = []   // B gana
  const losses: string[] = [] // A gana
  const ties: string[] = []
  const missingInfo: string[] = []
  const onPremiseNotes: string[] = []

  for (const c of comparisons) {
    if (!c) continue
    if (c.type === 'up') wins.push(c.text)
    else if (c.type === 'down') losses.push(c.text)
    else if (c.type === 'neutral') ties.push(c.text)
    else if (c.type === 'missing') missingInfo.push(c.text)
    else if (c.type === 'info') ties.push(c.text)
  }

  // MoE
  if (bm.isMoE && !am.isMoE) {
    wins.push(`Arquitectura MoE: B usa ${fmt(bm.totalExperts)} expertos totales (${fmt(bm.activeExpertsPerToken)} activos/token). A es denso.`)
    onPremiseNotes.push(`B es MoE: tiene más parámetros totales que A, pero activa solo ${fmt(bm.activeExpertsPerToken)} expertos por token. El consumo de VRAM en inferencia puede ser menor de lo esperado para su tamaño total.`)
  } else if (am.isMoE && !bm.isMoE) {
    losses.push(`A tiene MoE: ${fmt(am.totalExperts)} expertos totales (${fmt(am.activeExpertsPerToken)} activos/token). B es denso.`)
    onPremiseNotes.push(`A es MoE: su costo de inferencia por token es menor que su tamaño total sugiere, pero requiere cargar todos los pesos en VRAM.`)
  } else if (am.isMoE && bm.isMoE) {
    const c = compareNum('Expertos totales (MoE)', am.totalExperts, bm.totalExperts, true)
    if (c) {
      if (c.type === 'up') wins.push(c.text)
      else if (c.type === 'down') losses.push(c.text)
      else ties.push(c.text)
    }
  }

  // Vision
  if (bm.hasVision && !am.hasVision) {
    wins.push(`${B} declara vision_config — soporte multimodal. ${A} es solo texto.`)
    onPremiseNotes.push('Capacidad multimodal arquitectónica no equivale a calidad OCR o análisis documental. Evaluar en producción.')
  } else if (am.hasVision && !bm.hasVision) {
    losses.push(`${A} declara vision_config — soporte multimodal. ${B} es solo texto.`)
    onPremiseNotes.push('Capacidad multimodal arquitectónica no equivale a calidad OCR o análisis documental. Evaluar en producción.')
  } else if (am.hasVision && bm.hasVision) {
    ties.push('Ambos modelos declaran soporte multimodal (vision_config).')
  }

  // VRAM estimate
  const vramA = am.hiddenSize && am.layers
    ? Math.round(am.hiddenSize * am.layers * 12 / 1e9 * 2)
    : null
  const vramB = bm.hiddenSize && bm.layers
    ? Math.round(bm.hiddenSize * bm.layers * 12 / 1e9 * 2)
    : null

  if (vramA != null && vramB != null) {
    const diff = Math.abs(vramB - vramA)
    if (diff > 5) {
      const heavier = vramB > vramA ? B : A
      onPremiseNotes.push(
        `Estimación aproximada de VRAM (fp16, solo pesos): ${A} ≈ ${vramA} GB, ${B} ≈ ${vramB} GB. ` +
        `${heavier} requiere más hardware. Esta estimación no incluye KV cache ni overhead.`
      )
    }
  }

  // Missing fields
  if (modelA.missingFields.length) missingInfo.push(`Campos N/A en ${A}: ${modelA.missingFields.join(', ')}.`)
  if (modelB.missingFields.length) missingInfo.push(`Campos N/A en ${B}: ${modelB.missingFields.join(', ')}.`)

  const parts = []
  if (wins.length) parts.push(`${B} supera en ${wins.length}`)
  if (losses.length) parts.push(`${A} supera en ${losses.length}`)
  if (ties.length) parts.push(`${ties.length} similares`)

  return {
    summary: `${A} vs ${B}: ${parts.join(', ')}. Lectura basada en config.json.`,
    wins,
    losses,
    ties,
    missingInfo,
    onPremiseNotes,
    methodologyWarning: 'Análisis basado en campos declarados en config.json. No refleja benchmarks empíricos ni desempeño real.',
  }
}
