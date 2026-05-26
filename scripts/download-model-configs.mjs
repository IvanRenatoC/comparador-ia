#!/usr/bin/env node
/**
 * Descarga config.json de modelos desde Hugging Face.
 * - models-config-contrast/ → modelos curados/referencia
 * - models-config-test/     → modelos candidatos
 *
 * Regla: si un repo está gated o falla, se reporta sin fallback silencioso.
 * Si se usa un fallback, queda explícitamente marcado en metadata.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CONTRAST_DIR = join(ROOT, 'models-config-contrast')
const TEST_DIR = join(ROOT, 'models-config-test')
const CONTRAST_SOURCES = join(CONTRAST_DIR, '_model_sources.json')
const TEST_SOURCES = join(TEST_DIR, '_model_sources.json')

// ──────────────────────────────────────────────
// Modelos curados → models-config-contrast/
// ──────────────────────────────────────────────
const CURATED_MODELS = [
  {
    displayName: 'GPT-OSS-120B',
    repoId: 'openai/gpt-oss-120b',
    outputFile: 'modelo-gpt-oss-120b.json',
  },
  {
    displayName: 'Qwen3.6-35B-A3B',
    repoId: 'Qwen/Qwen3.6-35B-A3B',
    outputFile: 'modelo-Qwen3.6-35B-A3B.json',
  },
]

// ──────────────────────────────────────────────
// Modelos candidatos → models-config-test/
// ──────────────────────────────────────────────
const CANDIDATE_MODELS = [
  {
    displayName: 'Llama 4 Maverick 17B',
    repoId: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct',
    outputFile: 'modelo-Llama-4-Maverick-17B-128E-Instruct.json',
    fallbackRepoId: 'unsloth/Llama-4-Maverick-17B-128E-Instruct',
    fallbackNote: 'Repo original gated — se usó unsloth como fallback',
  },
  {
    displayName: 'Mistral Small 3.2 24B',
    repoId: 'mistralai/Mistral-Small-3.2-24B-Instruct-2506',
    outputFile: 'modelo-Mistral-Small-3.2-24B-Instruct-2506.json',
  },
  {
    displayName: 'DeepSeek V4-Flash',
    repoId: 'deepseek-ai/DeepSeek-V4-Flash',
    outputFile: 'modelo-deepseek-v4-flash.json',
  },
  {
    displayName: 'DeepSeek V4-Pro',
    repoId: 'deepseek-ai/DeepSeek-V4-Pro',
    outputFile: 'modelo-deepseek-v4-pro.json',
  },
  {
    displayName: 'Gemma 4 31B-IT',
    repoId: 'google/gemma-4-31B-it',
    outputFile: 'modelo-gemma-4-31b-it.json',
  },
  {
    displayName: 'GLM-5.1',
    repoId: 'zai-org/GLM-5.1',
    outputFile: 'modelo-glm-5-1.json',
  },
  {
    displayName: 'Llama 4 Scout 17B',
    repoId: 'meta-llama/Llama-4-Scout-17B-16E',
    outputFile: 'modelo-llama-4-scout-17b-16e.json',
    fallbackRepoId: 'unsloth/Llama-4-Scout-17B-16E-Instruct',
    fallbackNote: 'Repo original gated — se usó unsloth como fallback',
  },
  {
    displayName: 'Qwen3.5-397B-A17B',
    repoId: 'Qwen/Qwen3.5-397B-A17B',
    outputFile: 'modelo-qwen3-5-397b-a17b.json',
  },
  {
    displayName: 'Qwen3.6-27B',
    repoId: 'Qwen/Qwen3.6-27B',
    outputFile: 'modelo-qwen3-6-27b.json',
  },
]

function hfUrl(repoId) {
  return `https://huggingface.co/${repoId}/resolve/main/config.json`
}

async function fetchConfig(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'comparador-ia/1.0' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`)
  const text = await res.text()
  JSON.parse(text)
  return text
}

function loadSources(path) {
  if (existsSync(path)) {
    try { return JSON.parse(readFileSync(path, 'utf-8')) } catch {}
  }
  return { models: [] }
}

async function downloadGroup(models, outDir, sourcesPath, label) {
  mkdirSync(outDir, { recursive: true })
  const sources = loadSources(sourcesPath)
  const results = []

  console.log(`\n── ${label} ──────────────────────────────────`)

  for (const model of models) {
    const outPath = join(outDir, model.outputFile)

    if (existsSync(outPath)) {
      console.log(`⏭  SKIP   ${model.displayName} — ya existe`)
      results.push({ displayName: model.displayName, status: 'skipped', file: model.outputFile })
      continue
    }

    process.stdout.write(`⬇  FETCH  ${model.displayName} ... `)
    let status = 'ok'
    let usedRepo = model.repoId
    let usedUrl = hfUrl(model.repoId)
    let error = null
    let isFallback = false

    try {
      const text = await fetchConfig(usedUrl)
      writeFileSync(outPath, text)
      console.log('✓')
    } catch (err) {
      if (model.fallbackRepoId) {
        process.stdout.write(`\n  ↪ fallback ${model.fallbackRepoId} ... `)
        try {
          usedRepo = model.fallbackRepoId
          usedUrl = hfUrl(model.fallbackRepoId)
          const text = await fetchConfig(usedUrl)
          writeFileSync(outPath, text)
          isFallback = true
          console.log('✓ (FALLBACK — ver metadata)')
        } catch (err2) {
          error = `Original: ${err.message} | Fallback: ${err2.message}`
          status = 'error'
          console.log(`✗\n  ERROR: ${error}`)
        }
      } else {
        error = `${err.message} — repo original no disponible o gated, sin fallback configurado`
        status = 'error'
        console.log(`✗\n  ERROR: ${error}`)
      }
    }

    const entry = {
      displayName: model.displayName,
      repoId: usedRepo,
      originalRepoId: isFallback ? model.repoId : undefined,
      file: model.outputFile,
      sourceUrl: usedUrl,
      downloadedAt: new Date().toISOString(),
      status,
      ...(isFallback && { isFallback: true, fallbackNote: model.fallbackNote }),
      ...(error && { error }),
    }

    const idx = sources.models.findIndex(m => m.file === model.outputFile)
    if (idx >= 0) sources.models[idx] = entry
    else sources.models.push(entry)

    results.push({ displayName: model.displayName, status, file: model.outputFile, error })
  }

  writeFileSync(sourcesPath, JSON.stringify(sources, null, 2))
  return results
}

const curatedResults = await downloadGroup(CURATED_MODELS, CONTRAST_DIR, CONTRAST_SOURCES, 'Modelos curados → contrast')
const candidateResults = await downloadGroup(CANDIDATE_MODELS, TEST_DIR, TEST_SOURCES, 'Modelos candidatos → test')

const allResults = [...curatedResults, ...candidateResults]
console.log('\n── Resumen final ──────────────────────────────────────────')
console.table(
  allResults.map(r => ({
    Modelo: r.displayName,
    Estado: r.status,
    Archivo: r.file,
    Error: r.error ? r.error.slice(0, 60) : '',
  }))
)
