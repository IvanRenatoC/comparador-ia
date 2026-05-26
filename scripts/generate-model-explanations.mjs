#!/usr/bin/env node
/**
 * Genera una explicación base por modelo (no por par).
 * La comparación dinámica de pares se hace en el frontend.
 * Este script genera context arquitectónico por modelo individual.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const INDEX_FILE = join(ROOT, 'src', 'data', 'generated', 'model-index.json')
const OUT_DIR = join(ROOT, 'src', 'data', 'generated')
const PUBLIC_DIR = join(ROOT, 'public')
const OUT_FILE = join(OUT_DIR, 'explanations.json')
const PUBLIC_OUT = join(PUBLIC_DIR, 'explanations.json')

const METHODOLOGY_WARNING =
  'Este análisis se basa en los campos declarados en config.json de cada modelo. No refleja benchmarks empíricos ni desempeño real en producción.'

if (!existsSync(INDEX_FILE)) {
  console.error('ERROR: model-index.json no encontrado. Ejecuta: npm run build:model-index')
  process.exit(1)
}

const { models } = JSON.parse(readFileSync(INDEX_FILE, 'utf-8'))

function fmt(val, suffix = '') {
  if (val == null) return 'no declarado'
  if (typeof val === 'number') {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M${suffix}`
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k${suffix}`
    return `${val}${suffix}`
  }
  return String(val)
}

function generateModelProfile(model) {
  const m = model.metrics
  const highlights = []
  const notes = []

  if (m.contextWindowTokens != null) {
    highlights.push(`Ventana de contexto: ${fmt(m.contextWindowTokens, ' tokens')}`)
  }
  if (m.layers != null) {
    highlights.push(`Profundidad: ${m.layers} capas de transformador`)
  }
  if (m.hiddenSize != null) {
    highlights.push(`Dimensión interna: ${fmt(m.hiddenSize)} (hidden size)`)
  }
  if (m.isMoE) {
    const experts = m.totalExperts != null ? `${fmt(m.totalExperts)} expertos totales` : 'número no declarado de expertos'
    const active = m.activeExpertsPerToken != null ? `, ${m.activeExpertsPerToken} activos por token` : ''
    highlights.push(`Arquitectura MoE: ${experts}${active}`)
    notes.push('Al ser MoE, los parámetros activos por inferencia son menores que el total de parámetros del modelo.')
  }
  if (m.hasVision) {
    highlights.push('Incluye vision_config: el modelo declara soporte multimodal (texto + imagen)')
    notes.push('La presencia de vision_config indica capacidad multimodal declarada, no necesariamente calidad OCR o análisis documental real.')
  }
  if (m.kvHeads != null && m.attentionHeads != null && m.kvHeads < m.attentionHeads) {
    notes.push(`Usa GQA/MQA: ${m.kvHeads} cabezas KV para ${m.attentionHeads} cabezas de atención, lo que reduce uso de memoria en inferencia.`)
  }
  if (m.dtype) {
    notes.push(`Tipo de dato declarado: ${m.dtype}`)
  }
  if (model.isFallback) {
    notes.push(`NOTA: Este config proviene de un repositorio alternativo (fallback). ${model.fallbackNote ?? ''}`)
  }

  return {
    highlights,
    notes,
    collection: model.collection,
    availableIn: model.availableIn,
    methodologyWarning: METHODOLOGY_WARNING,
  }
}

const profiles = {}
for (const model of models) {
  profiles[model.slug] = generateModelProfile(model)
  console.log(`  ✓ ${model.displayName} [${model.collection}]`)
}

const output = {
  generatedAt: new Date().toISOString(),
  note: 'Perfiles por modelo individual. La comparación dinámica de pares se genera en el frontend.',
  profiles,
}

const serialized = JSON.stringify(output, null, 2)
mkdirSync(OUT_DIR, { recursive: true })
mkdirSync(PUBLIC_DIR, { recursive: true })
writeFileSync(OUT_FILE, serialized)
writeFileSync(PUBLIC_OUT, serialized)

console.log(`\n✓ Perfiles generados para ${Object.keys(profiles).length} modelos`)
console.log(`  → ${PUBLIC_OUT}`)
console.log(`  → ${OUT_FILE}`)
