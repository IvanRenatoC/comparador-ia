#!/usr/bin/env node
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT_DIR = join(ROOT, 'models-config-contrast')
const SOURCES_FILE = join(OUTPUT_DIR, '_model_sources.json')

const MODELS = [
  {
    displayName: 'Gemma 4 31B-IT',
    repoId: 'google/gemma-4-31B-it',
    outputFile: 'modelo-gemma-4-31b-it.json',
  },
  {
    displayName: 'Qwen3.6-27B',
    repoId: 'Qwen/Qwen3.6-27B',
    fallbackRepoId: 'Qwen/Qwen2.5-VL-7B-Instruct',
    outputFile: 'modelo-qwen3-6-27b.json',
  },
  {
    displayName: 'Llama 4 Scout 17B',
    repoId: 'meta-llama/Llama-4-Scout-17B-16E',
    fallbackRepoId: 'unsloth/Llama-4-Scout-17B-16E-Instruct',
    outputFile: 'modelo-llama-4-scout-17b-16e.json',
    fallbackNote: 'Fallback desde unsloth — repo original requiere acceso gated',
  },
  {
    displayName: 'GPT-OSS-120B',
    repoId: 'openai/gpt-oss-120b',
    outputFile: 'modelo-gpt-oss-120b.json',
  },
  {
    displayName: 'DeepSeek V4-Flash',
    repoId: 'deepseek-ai/DeepSeek-V4-Flash',
    outputFile: 'modelo-deepseek-v4-flash.json',
  },
  {
    displayName: 'Qwen3.5-397B-A17B',
    repoId: 'Qwen/Qwen3.5-397B-A17B',
    outputFile: 'modelo-qwen3-5-397b-a17b.json',
  },
  {
    displayName: 'GLM-5.1',
    repoId: 'zai-org/GLM-5.1',
    outputFile: 'modelo-glm-5-1.json',
  },
  {
    displayName: 'DeepSeek V4-Pro',
    repoId: 'deepseek-ai/DeepSeek-V4-Pro',
    outputFile: 'modelo-deepseek-v4-pro.json',
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
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const text = await res.text()
  JSON.parse(text) // validate JSON
  return text
}

mkdirSync(OUTPUT_DIR, { recursive: true })

let sources = { models: [] }
if (existsSync(SOURCES_FILE)) {
  try { sources = JSON.parse(readFileSync(SOURCES_FILE, 'utf-8')) } catch {}
}

const results = []

for (const model of MODELS) {
  const outPath = join(OUTPUT_DIR, model.outputFile)
  let status = 'ok'
  let usedRepo = model.repoId
  let usedUrl = hfUrl(model.repoId)
  let error = null
  let isFallback = false

  if (existsSync(outPath)) {
    console.log(`⏭  SKIP   ${model.displayName} — ya existe ${model.outputFile}`)
    results.push({ displayName: model.displayName, status: 'skipped', file: model.outputFile })
    continue
  }

  process.stdout.write(`⬇  FETCH  ${model.displayName} ... `)

  try {
    const text = await fetchConfig(usedUrl)
    writeFileSync(outPath, text)
    console.log('✓')
  } catch (err) {
    if (model.fallbackRepoId) {
      process.stdout.write(`  fallback → ${model.fallbackRepoId} ... `)
      try {
        usedRepo = model.fallbackRepoId
        usedUrl = hfUrl(model.fallbackRepoId)
        const text = await fetchConfig(usedUrl)
        writeFileSync(outPath, text)
        isFallback = true
        console.log('✓ (fallback)')
      } catch (err2) {
        error = `${err.message} | fallback: ${err2.message}`
        status = 'error'
        console.log(`✗ ${error}`)
      }
    } else {
      error = err.message
      status = 'error'
      console.log(`✗ ${error}`)
    }
  }

  const entry = {
    displayName: model.displayName,
    repoId: usedRepo,
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

writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2))

console.log('\n── Resumen ─────────────────────────────────────────────')
console.table(
  results.map(r => ({
    Modelo: r.displayName,
    Estado: r.status,
    Archivo: r.file,
    Error: r.error ?? '',
  }))
)
