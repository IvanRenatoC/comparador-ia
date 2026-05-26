import type { ModelMetrics, ModelScores } from '../types'

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

export function generateDynamicExplanation(
  base: { displayName: string; metrics: ModelMetrics },
  cmp: { displayName: string; metrics: ModelMetrics; missingFields: string[] }
) {
  const bm = base.metrics
  const cm = cmp.metrics

  function fmt(val: number | undefined, suffix = '') {
    if (val == null) return 'N/D'
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M${suffix}`
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k${suffix}`
    return `${val}${suffix}`
  }

  function compareMetric(label: string, baseVal: number | undefined, cmpVal: number | undefined, higherBetter = true, unit = '') {
    if (baseVal == null && cmpVal == null) return null
    if (baseVal == null) return { type: 'info', text: `${label}: solo disponible en el modelo comparado (${fmt(cmpVal, unit)}).` }
    if (cmpVal == null) return { type: 'missing', text: `${label}: no declarado en este modelo (base: ${fmt(baseVal, unit)}).` }
    const ratio = cmpVal / baseVal
    if (Math.abs(ratio - 1) < 0.05) {
      return { type: 'tie', text: `${label}: similar en ambos modelos (${fmt(baseVal, unit)} vs ${fmt(cmpVal, unit)}).` }
    }
    const better = higherBetter ? cmpVal > baseVal : cmpVal < baseVal
    const diff = Math.abs(((cmpVal - baseVal) / baseVal) * 100).toFixed(0)
    if (better) {
      return { type: 'win', text: `${label}: ${fmt(cmpVal, unit)} vs ${fmt(baseVal, unit)} — ${diff}% ${higherBetter ? 'mayor' : 'menor'} según config.` }
    } else {
      return { type: 'loss', text: `${label}: ${fmt(cmpVal, unit)} vs ${fmt(baseVal, unit)} — ${diff}% ${higherBetter ? 'menor' : 'mayor'} según config.` }
    }
  }

  const comparisons = [
    compareMetric('Ventana de contexto', bm.contextWindowTokens, cm.contextWindowTokens, true, ' tokens'),
    compareMetric('Capas', bm.layers, cm.layers, true),
    compareMetric('Hidden size', bm.hiddenSize, cm.hiddenSize, true),
    compareMetric('Cabezas de atención', bm.attentionHeads, cm.attentionHeads, true),
    compareMetric('Cabezas KV', bm.kvHeads, cm.kvHeads, false),
    compareMetric('Vocabulario', bm.vocabSize, cm.vocabSize, true, ' tokens'),
  ]

  const wins: string[] = []
  const losses: string[] = []
  const ties: string[] = []
  const missingInfo: string[] = []

  for (const c of comparisons) {
    if (!c) continue
    if (c.type === 'win') wins.push(c.text)
    else if (c.type === 'loss') losses.push(c.text)
    else if (c.type === 'tie') ties.push(c.text)
    else if (c.type === 'missing') missingInfo.push(c.text)
    else if (c.type === 'info') ties.push(c.text)
  }

  if (cm.isMoE && !bm.isMoE) {
    wins.push(`MoE: ${fmt(cm.totalExperts)} expertos totales, ${fmt(cm.activeExpertsPerToken)} activos/token. La base no declara MoE.`)
  } else if (!cm.isMoE && bm.isMoE) {
    losses.push(`La base tiene MoE (${fmt(bm.totalExperts)} expertos, ${fmt(bm.activeExpertsPerToken)}/token). Este modelo es denso.`)
  } else if (cm.isMoE && bm.isMoE) {
    const c = compareMetric('Expertos totales', bm.totalExperts, cm.totalExperts, true)
    if (c) {
      if (c.type === 'win') wins.push(c.text)
      else if (c.type === 'loss') losses.push(c.text)
      else ties.push(c.text)
    }
  }

  if (cm.hasVision && !bm.hasVision) wins.push('Multimodal: declara vision_config. La base es solo texto.')
  else if (!cm.hasVision && bm.hasVision) losses.push('La base declara soporte multimodal. Este modelo es solo texto.')
  else if (cm.hasVision && bm.hasVision) ties.push('Ambos modelos declaran soporte multimodal.')

  if (cmp.missingFields.length > 0) missingInfo.push(`Campos no encontrados: ${cmp.missingFields.join(', ')}.`)

  const parts = []
  if (wins.length) parts.push(`ventaja en ${wins.length} dimensión(es)`)
  if (losses.length) parts.push(`desventaja en ${losses.length} dimensión(es)`)
  if (ties.length) parts.push(`${ties.length} similares`)

  return {
    wins,
    losses,
    ties,
    missingInfo,
    summary: `${cmp.displayName} vs ${base.displayName}: ${parts.join(', ')}.`,
    methodologyWarning: 'Análisis basado en config.json. No refleja benchmarks empíricos.',
  }
}
