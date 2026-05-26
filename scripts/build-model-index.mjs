#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CONFIGS_DIR = join(ROOT, 'models-config-contrast')
const SOURCES_FILE = join(CONFIGS_DIR, '_model_sources.json')
const OUT_DIR = join(ROOT, 'src', 'data', 'generated')
const PUBLIC_DIR = join(ROOT, 'public')
const OUT_FILE = join(OUT_DIR, 'model-index.json')
const PUBLIC_OUT = join(PUBLIC_DIR, 'model-index.json')

const SKIP = new Set(['_model_sources.json', '_model_index.json'])

function getFirst(obj, paths) {
  for (const p of paths) {
    const parts = p.split('.')
    let cur = obj
    for (const part of parts) {
      if (cur == null || typeof cur !== 'object') { cur = undefined; break }
      cur = cur[part]
    }
    if (cur !== undefined && cur !== null) return cur
  }
  return undefined
}

function extractMetrics(raw) {
  const missing = []

  function grab(label, paths) {
    const val = getFirst(raw, paths)
    if (val === undefined) missing.push(label)
    return val
  }

  const architectures = grab('architectures', ['architectures']) ?? []
  const modelType = grab('model_type', ['model_type', 'text_config.model_type'])
  const torchDtype = grab('torch_dtype', ['torch_dtype', 'text_config.torch_dtype', 'text_config.dtype', 'dtype'])
  const transformersVersion = getFirst(raw, ['transformers_version'])
  const hiddenSize = grab('hidden_size', ['hidden_size', 'text_config.hidden_size', 'model.hidden_size'])
  const numHiddenLayers = grab('num_hidden_layers', ['num_hidden_layers', 'text_config.num_hidden_layers'])
  const numAttentionHeads = grab('num_attention_heads', ['num_attention_heads', 'text_config.num_attention_heads'])
  const numKeyValueHeads = grab('num_key_value_heads', ['num_key_value_heads', 'text_config.num_key_value_heads'])
  const headDim = getFirst(raw, ['head_dim', 'text_config.head_dim'])
  const intermediateSize = getFirst(raw, ['intermediate_size', 'text_config.intermediate_size', 'text_config.moe_intermediate_size'])
  const vocabSize = grab('vocab_size', ['vocab_size', 'text_config.vocab_size'])
  const maxPositionEmbeddings = grab('max_position_embeddings', ['max_position_embeddings', 'text_config.max_position_embeddings'])
  const ropeTheta = getFirst(raw, ['rope_theta', 'text_config.rope_theta', 'text_config.rope_parameters.rope_theta'])
  const ropeScaling = getFirst(raw, ['rope_scaling', 'text_config.rope_scaling', 'text_config.rope_parameters'])
  const numLocalExperts = getFirst(raw, ['num_local_experts', 'text_config.num_experts', 'text_config.num_local_experts'])
  const numExpertsPerTok = getFirst(raw, ['num_experts_per_tok', 'experts_per_token', 'text_config.num_experts_per_tok'])
  const interleaveStep = getFirst(raw, ['interleave_moe_layer_step', 'text_config.interleave_moe_layer_step'])
  const routerAuxLoss = getFirst(raw, ['router_aux_loss_coef', 'text_config.router_aux_loss_coef'])

  const visionConfig = getFirst(raw, ['vision_config'])
  const hasVision = !!visionConfig
  const visionHiddenSize = visionConfig?.hidden_size
  const visionLayers = visionConfig?.num_hidden_layers ?? visionConfig?.depth
  const visionImageSize = visionConfig?.image_size
  const visionPatchSize = visionConfig?.patch_size

  const isMoE = (numLocalExperts ?? 0) > 0 || (numExpertsPerTok ?? 0) > 0

  return {
    raw: {
      architectures,
      modelType,
      torchDtype,
      transformersVersion,
      hiddenSize,
      numHiddenLayers,
      numAttentionHeads,
      numKeyValueHeads,
      headDim,
      intermediateSize,
      vocabSize,
      maxPositionEmbeddings,
      ropeTheta,
      ropeScaling,
      numLocalExperts,
      numExpertsPerTok,
      interleaveStep,
      routerAuxLoss,
      visionHiddenSize,
      visionLayers,
      visionImageSize,
      visionPatchSize,
    },
    metrics: {
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
      architecture: Array.isArray(architectures) ? architectures[0] : architectures,
      modelType,
    },
    missingFields: missing,
  }
}

// Normalization helpers
function clampScore(val, min, max) {
  if (val == null) return 0
  return Math.round(Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100)))
}

function buildScores(metrics) {
  return {
    contextScore: clampScore(metrics.contextWindowTokens, 4096, 2097152),
    widthScore: clampScore(metrics.hiddenSize, 1024, 16384),
    depthScore: clampScore(metrics.layers, 8, 128),
    attentionScore: clampScore(metrics.attentionHeads, 4, 128),
    kvEfficiencyScore: metrics.attentionHeads && metrics.kvHeads
      ? Math.round(100 - (metrics.kvHeads / metrics.attentionHeads) * 100)
      : 0,
    moeScore: metrics.isMoE
      ? clampScore((metrics.totalExperts ?? 0), 4, 512)
      : 0,
    multimodalScore: metrics.hasVision ? 100 : 0,
    deploymentComplexityScore: metrics.isMoE
      ? Math.min(100, 30 + clampScore(metrics.totalExperts ?? 0, 4, 512) * 0.7)
      : clampScore(metrics.hiddenSize, 1024, 16384),
  }
}

let sources = { models: [] }
if (existsSync(SOURCES_FILE)) {
  try { sources = JSON.parse(readFileSync(SOURCES_FILE, 'utf-8')) } catch {}
}

const files = readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json') && !SKIP.has(f))
const index = []

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(CONFIGS_DIR, file), 'utf-8'))
  const slug = basename(file, '.json').replace(/^modelo-/, '')
  const sourceEntry = sources.models.find(m => m.file === file)
  const { metrics, missingFields } = extractMetrics(raw)
  const scores = buildScores(metrics)

  const displayName = sourceEntry?.displayName ?? slug

  index.push({
    slug,
    displayName,
    file,
    sourceUrl: sourceEntry?.sourceUrl,
    downloadedAt: sourceEntry?.downloadedAt,
    isFallback: sourceEntry?.isFallback ?? false,
    metrics,
    scores,
    missingFields,
  })

  console.log(`  ✓ ${displayName} (${file}) — ${missingFields.length} campos faltantes`)
}

index.sort((a, b) => a.displayName.localeCompare(b.displayName))

const output = { generatedAt: new Date().toISOString(), models: index }

mkdirSync(OUT_DIR, { recursive: true })
mkdirSync(PUBLIC_DIR, { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(output, null, 2))
writeFileSync(PUBLIC_OUT, JSON.stringify(output, null, 2))

console.log(`\n✓ Índice generado con ${index.length} modelos → ${OUT_FILE}`)
