#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const INDEX_FILE = join(ROOT, 'src', 'data', 'generated', 'model-index.json')
const OUT_FILE = join(ROOT, 'src', 'data', 'generated', 'explanations.json')
const PUBLIC_OUT = join(ROOT, 'public', 'explanations.json')

const BASELINE_SLUG = 'gpt-oss-120b'
const METHODOLOGY_WARNING =
  'Este análisis se basa en los campos declarados en config.json de cada modelo. No refleja benchmarks empíricos (MMLU, HumanEval, GPQA, etc.) ni desempeño real en producción.'

if (!existsSync(INDEX_FILE)) {
  console.error('ERROR: No se encontró model-index.json. Ejecuta primero: npm run build:model-index')
  process.exit(1)
}

const { models } = JSON.parse(readFileSync(INDEX_FILE, 'utf-8'))
const baseline = models.find(m => m.slug === BASELINE_SLUG)

if (!baseline) {
  console.error(`ERROR: Modelo base "${BASELINE_SLUG}" no encontrado en el índice.`)
  process.exit(1)
}

function fmt(val, suffix = '') {
  if (val == null) return 'no disponible'
  if (typeof val === 'number') {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M${suffix}`
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k${suffix}`
    return `${val}${suffix}`
  }
  return String(val)
}

function compareMetric(label, baseVal, cmpVal, higherBetter = true, unit = '') {
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
    return { type: 'win', text: `${label}: ${fmt(cmpVal, unit)} vs ${fmt(baseVal, unit)} del base — ${diff}% ${higherBetter ? 'mayor' : 'menor'} según config.` }
  } else {
    return { type: 'loss', text: `${label}: ${fmt(cmpVal, unit)} vs ${fmt(baseVal, unit)} del base — ${diff}% ${higherBetter ? 'menor' : 'mayor'} que la base según config.` }
  }
}

function generateExplanation(model) {
  const bm = baseline.metrics
  const cm = model.metrics
  const comparisons = [
    compareMetric('Ventana de contexto', bm.contextWindowTokens, cm.contextWindowTokens, true, ' tokens'),
    compareMetric('Capas de transformador', bm.layers, cm.layers, true),
    compareMetric('Dimensión oculta (hidden size)', bm.hiddenSize, cm.hiddenSize, true),
    compareMetric('Cabezas de atención', bm.attentionHeads, cm.attentionHeads, true),
    compareMetric('Cabezas KV', bm.kvHeads, cm.kvHeads, false),
    compareMetric('Vocabulario', bm.vocabSize, cm.vocabSize, true, ' tokens'),
  ]

  const wins = []
  const losses = []
  const ties = []
  const missing = []

  for (const c of comparisons) {
    if (!c) continue
    if (c.type === 'win') wins.push(c.text)
    else if (c.type === 'loss') losses.push(c.text)
    else if (c.type === 'tie') ties.push(c.text)
    else if (c.type === 'missing') missing.push(c.text)
    else if (c.type === 'info') ties.push(c.text)
  }

  // MoE comparison
  if (cm.isMoE && !bm.isMoE) {
    wins.push(`Arquitectura MoE: usa ${fmt(cm.totalExperts)} expertos totales, activando ${fmt(cm.activeExpertsPerToken)} por token. El modelo base no declara MoE.`)
  } else if (!cm.isMoE && bm.isMoE) {
    losses.push(`El modelo base tiene arquitectura MoE (${fmt(bm.totalExperts)} expertos, ${fmt(bm.activeExpertsPerToken)} activos/token); este modelo es denso.`)
  } else if (cm.isMoE && bm.isMoE) {
    const cmpExperts = compareMetric('Expertos totales MoE', bm.totalExperts, cm.totalExperts, true)
    if (cmpExperts) {
      if (cmpExperts.type === 'win') wins.push(cmpExperts.text)
      else if (cmpExperts.type === 'loss') losses.push(cmpExperts.text)
      else ties.push(cmpExperts.text)
    }
  }

  // Vision comparison
  if (cm.hasVision && !bm.hasVision) {
    wins.push('Multimodal: declara vision_config, lo que indica soporte de visión. El modelo base no tiene este bloque.')
  } else if (!cm.hasVision && bm.hasVision) {
    losses.push('El modelo base declara vision_config (soporte multimodal). Este modelo es solo texto según config.')
  } else if (cm.hasVision && bm.hasVision) {
    ties.push('Ambos modelos declaran soporte multimodal (vision_config presente).')
  }

  if (model.missingFields.length > 0) {
    missing.push(`Campos no encontrados en este config: ${model.missingFields.join(', ')}.`)
  }

  const summaryParts = []
  if (wins.length > 0) summaryParts.push(`ventaja en ${wins.length} dimensión(es)`)
  if (losses.length > 0) summaryParts.push(`desventaja en ${losses.length} dimensión(es)`)
  if (ties.length > 0) summaryParts.push(`${ties.length} dimensión(es) similares`)

  const summary = `${model.displayName} vs ${baseline.displayName}: ${summaryParts.join(', ')}, según arquitectura declarada en config.json.`

  return { wins, losses, ties, missingInfo: missing, summary, methodologyWarning: METHODOLOGY_WARNING }
}

const items = {}
for (const model of models) {
  if (model.slug === BASELINE_SLUG) continue
  items[model.slug] = generateExplanation(model)
  console.log(`  ✓ ${model.displayName}`)
}

const output = {
  generatedAt: new Date().toISOString(),
  baselineSlug: BASELINE_SLUG,
  baselineDisplayName: baseline.displayName,
  items,
}

const serialized = JSON.stringify(output, null, 2)
writeFileSync(OUT_FILE, serialized)
writeFileSync(PUBLIC_OUT, serialized)
console.log(`\n✓ Explicaciones generadas para ${Object.keys(items).length} modelos → ${OUT_FILE}`)
