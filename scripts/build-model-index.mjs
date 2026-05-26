#!/usr/bin/env node
/**
 * Lee modelos desde models-config-contrast/ y models-config-test/.
 * Genera public/model-index.json y src/data/generated/model-index.json.
 * Deduplica por filename: contrast tiene prioridad.
 * Agrega metadata de colección: "contrast" | "test" | ambas.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CONTRAST_DIR = join(ROOT, 'models-config-contrast')
const TEST_DIR = join(ROOT, 'models-config-test')
const CONTRAST_SOURCES = join(CONTRAST_DIR, '_model_sources.json')
const TEST_SOURCES = join(TEST_DIR, '_model_sources.json')
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
  const hiddenSize = grab('hidden_size', ['hidden_size', 'text_config.hidden_size'])
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
  const routerAuxLoss = getFirst(raw, ['router_aux_loss_coef', 'text_config.router_aux_loss_coef'])
  const visionConfig = getFirst(raw, ['vision_config'])
  const hasVision = !!visionConfig
  const isMoE = (numLocalExperts ?? 0) > 0 || (numExpertsPerTok ?? 0) > 0

  return {
    metrics: {
      architectures: Array.isArray(architectures) ? architectures : [architectures],
      modelType, torchDtype, transformersVersion,
      hiddenSize, numHiddenLayers, numAttentionHeads, numKeyValueHeads,
      headDim, intermediateSize, vocabSize, maxPositionEmbeddings,
      ropeTheta, ropeScaling, numLocalExperts, numExpertsPerTok, routerAuxLoss,
      hasVision, isMoE,
      architecture: Array.isArray(architectures) ? architectures[0] : architectures,
      // Convenience aliases
      contextWindowTokens: maxPositionEmbeddings,
      layers: numHiddenLayers,
      attentionHeads: numAttentionHeads,
      kvHeads: numKeyValueHeads,
      totalExperts: numLocalExperts,
      activeExpertsPerToken: numExpertsPerTok,
      dtype: torchDtype,
    },
    missingFields: missing,
  }
}

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
    moeScore: metrics.isMoE ? clampScore(metrics.totalExperts, 4, 512) : 0,
    multimodalScore: metrics.hasVision ? 100 : 0,
    deploymentComplexityScore: metrics.isMoE
      ? Math.min(100, 30 + clampScore(metrics.totalExperts, 4, 512) * 0.7)
      : clampScore(metrics.hiddenSize, 1024, 16384),
  }
}

function loadSources(path) {
  if (existsSync(path)) {
    try { return JSON.parse(readFileSync(path, 'utf-8')).models ?? [] } catch {}
  }
  return []
}

function readDir(dir, collection) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith('.json') && !SKIP.has(f))
    .map(file => ({ file, dir, collection }))
}

const contrastSources = loadSources(CONTRAST_SOURCES)
const testSources = loadSources(TEST_SOURCES)
const allSources = [...contrastSources, ...testSources]

function findSource(file) {
  return allSources.find(s => s.file === file)
}

// Read both dirs; contrast takes priority on dedup
const contrastFiles = readDir(CONTRAST_DIR, 'contrast')
const testFiles = readDir(TEST_DIR, 'test')

// Dedup: if a file exists in both, mark as both collections
const seenFiles = new Map()
for (const entry of contrastFiles) seenFiles.set(entry.file, { ...entry, collections: ['contrast'] })
for (const entry of testFiles) {
  if (seenFiles.has(entry.file)) {
    seenFiles.get(entry.file).collections.push('test')
  } else {
    seenFiles.set(entry.file, { ...entry, collections: ['test'] })
  }
}

const index = []

for (const [file, entry] of seenFiles) {
  const raw = JSON.parse(readFileSync(join(entry.dir, file), 'utf-8'))
  const slug = basename(file, '.json').replace(/^modelo-/, '')
  const sourceEntry = findSource(file)
  const { metrics, missingFields } = extractMetrics(raw)
  const scores = buildScores(metrics)

  const displayName = sourceEntry?.displayName ?? slug
  const primaryCollection = entry.collections.includes('contrast') ? 'contrast' : 'test'

  index.push({
    slug,
    displayName,
    file,
    collection: primaryCollection,
    availableIn: entry.collections,
    sourceUrl: sourceEntry?.sourceUrl,
    downloadedAt: sourceEntry?.downloadedAt,
    isFallback: sourceEntry?.isFallback ?? false,
    fallbackNote: sourceEntry?.fallbackNote,
    metrics,
    scores,
    missingFields,
  })

  console.log(`  ✓ [${primaryCollection.toUpperCase().padEnd(8)}] ${displayName} — ${missingFields.length} campos N/A`)
}

index.sort((a, b) => {
  if (a.collection !== b.collection) return a.collection === 'contrast' ? -1 : 1
  return a.displayName.localeCompare(b.displayName)
})

const output = { generatedAt: new Date().toISOString(), models: index }
const serialized = JSON.stringify(output, null, 2)

mkdirSync(OUT_DIR, { recursive: true })
mkdirSync(PUBLIC_DIR, { recursive: true })
writeFileSync(OUT_FILE, serialized)
writeFileSync(PUBLIC_OUT, serialized)

console.log(`\n✓ Índice generado — ${index.length} modelos (${contrastFiles.length} contrast, ${testFiles.length} test)`)
console.log(`  → ${PUBLIC_OUT}`)
console.log(`  → ${OUT_FILE}`)
