import { useState, useEffect, useMemo } from 'react'
import type { ModelEntry, ModelIndex, Explanations, ExplanationItem } from './types'

import { generateDynamicExplanation } from './lib/extractMetrics'
import Header from './components/Header'
import ModelSelector from './components/ModelSelector'
import MetricsCards from './components/MetricsCards'
import BarCharts from './components/BarCharts'
import RadarChartComp from './components/RadarChartComp'
import ComparisonTable from './components/ComparisonTable'
import ExplanationSection from './components/ExplanationSection'
import RawConfigViewer from './components/RawConfigViewer'
import AddModelModal from './components/AddModelModal'

const DEFAULT_BASE = 'gpt-oss-120b'

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      {title && (
        <div className="flex items-center gap-3">
          <div className="w-4 h-px bg-[#00d4ff]/40" />
          <span className="text-[9px] font-mono tracking-widest uppercase text-[#00d4ff]/60">{title}</span>
          <div className="flex-1 h-px bg-[#1e2d45]" />
        </div>
      )}
      {children}
    </section>
  )
}

export default function App() {
  const [modelIndex, setModelIndex] = useState<ModelIndex | null>(null)
  const [explanations, setExplanations] = useState<Explanations | null>(null)
  const [allModels, setAllModels] = useState<ModelEntry[]>([])
  const [baseSlug, setBaseSlug] = useState(DEFAULT_BASE)
  const [cmpSlug, setCmpSlug] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [rawConfigs, setRawConfigs] = useState<Record<string, Record<string, unknown>>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/model-index.json').then(r => r.json()) as Promise<ModelIndex>,
      fetch('/explanations.json').then(r => r.json()).catch(() => null) as Promise<Explanations | null>,
    ]).then(([idx, expl]) => {
      setModelIndex(idx)
      if (expl) setExplanations(expl)

      // Load custom models from localStorage
      const stored = JSON.parse(localStorage.getItem('customModels') ?? '[]') as Array<{ entry: ModelEntry; raw: Record<string, unknown> }>
      const allM = [...idx.models, ...stored.map(s => s.entry)]
      const raws: Record<string, Record<string, unknown>> = {}
      stored.forEach(s => { raws[s.entry.slug] = s.raw })
      setRawConfigs(raws)
      setAllModels(allM)

      const defaultBase = allM.find(m => m.slug === DEFAULT_BASE) ? DEFAULT_BASE : allM[0]?.slug ?? ''
      setBaseSlug(defaultBase)
      const firstCmp = allM.find(m => m.slug !== defaultBase)?.slug ?? ''
      setCmpSlug(firstCmp)
      setLoading(false)
    }).catch(err => {
      setError(`Error al cargar datos: ${err.message}`)
      setLoading(false)
    })
  }, [])

  const baseModel = useMemo(() => allModels.find(m => m.slug === baseSlug), [allModels, baseSlug])
  const cmpModel = useMemo(() => allModels.find(m => m.slug === cmpSlug), [allModels, cmpSlug])

  const explanation = useMemo((): ExplanationItem | null => {
    if (!baseModel || !cmpModel) return null
    // Use pre-generated if base is the default baseline
    if (baseSlug === DEFAULT_BASE && explanations?.items[cmpSlug]) {
      return explanations.items[cmpSlug]
    }
    return generateDynamicExplanation(baseModel, cmpModel)
  }, [baseModel, cmpModel, baseSlug, cmpSlug, explanations])

  function handleAddModel(model: ModelEntry, rawConfig: Record<string, unknown>) {
    setAllModels(prev => [...prev.filter(m => m.slug !== model.slug), model])
    setRawConfigs(prev => ({ ...prev, [model.slug]: rawConfig }))
    setCmpSlug(model.slug)
  }

  function handleBaseChange(slug: string) {
    setBaseSlug(slug)
    if (cmpSlug === slug) {
      const other = allModels.find(m => m.slug !== slug)
      if (other) setCmpSlug(other.slug)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border border-[#00d4ff]/40 rounded animate-spin border-t-[#00d4ff] mx-auto" />
          <p className="text-[12px] font-mono text-[#4b5e7a]">Cargando índice de modelos...</p>
        </div>
      </div>
    )
  }

  if (error || !baseModel || !cmpModel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md">
          <p className="text-[#f43f5e] font-mono text-sm">{error ?? 'No se encontraron modelos'}</p>
          <p className="text-[11px] text-[#4b5e7a] font-mono">Ejecuta: npm run prepare:data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-10">

        {/* Model selection */}
        <Section title="Selección de modelos">
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <ModelSelector
                  label="Modelo base (referencia)"
                  models={allModels}
                  selected={baseSlug}
                  onChange={handleBaseChange}
                  color="#3b82f6"
                  exclude={cmpSlug}
                />
                <div className="text-[10px] font-mono text-[#4b5e7a] bg-[#0d1220] rounded p-2">
                  <span className="text-[#3b82f6]">Arquitectura:</span> {baseModel.metrics.architecture ?? '—'}
                  {baseModel.metrics.isMoE && <span className="ml-2 text-[#8b5cf6]">MoE</span>}
                  {baseModel.metrics.hasVision && <span className="ml-2 text-[#10b981]">Vision</span>}
                </div>
              </div>
              <div className="space-y-3">
                <ModelSelector
                  label="Modelo a comparar"
                  models={allModels}
                  selected={cmpSlug}
                  onChange={setCmpSlug}
                  color="#00d4ff"
                  exclude={baseSlug}
                />
                <div className="text-[10px] font-mono text-[#4b5e7a] bg-[#0d1220] rounded p-2">
                  <span className="text-[#00d4ff]">Arquitectura:</span> {cmpModel.metrics.architecture ?? '—'}
                  {cmpModel.metrics.isMoE && <span className="ml-2 text-[#8b5cf6]">MoE</span>}
                  {cmpModel.metrics.hasVision && <span className="ml-2 text-[#10b981]">Vision</span>}
                  {cmpModel.isFallback && <span className="ml-2 text-[#f59e0b]">[fallback]</span>}
                </div>
              </div>
            </div>

            {/* Add model button */}
            <div className="mt-4 pt-4 border-t border-[#1e2d45] flex items-center justify-between">
              <p className="text-[10px] font-mono text-[#4b5e7a]">
                {allModels.length} modelos disponibles · índice generado {modelIndex?.generatedAt?.slice(0, 10) ?? '—'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-[11px] font-mono text-[#00d4ff] hover:text-white border border-[#00d4ff]/30 hover:border-[#00d4ff] rounded px-3 py-1.5 transition-all"
              >
                + Agregar modelo por config.json
              </button>
            </div>
          </div>
        </Section>

        {/* Metrics cards */}
        <Section title="Métricas clave">
          <MetricsCards base={baseModel} cmp={cmpModel} />
        </Section>

        {/* Charts */}
        <Section title="Visualización comparativa">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <BarCharts base={baseModel} cmp={cmpModel} />
            <RadarChartComp base={baseModel} cmp={cmpModel} />
          </div>
        </Section>

        {/* Comparison table */}
        <Section title="Tabla técnica">
          <ComparisonTable base={baseModel} cmp={cmpModel} />
        </Section>

        {/* Explanation */}
        {explanation && (
          <Section title="Análisis en español">
            <ExplanationSection
              explanation={explanation}
              baseDisplayName={baseModel.displayName}
              cmpDisplayName={cmpModel.displayName}
            />
          </Section>
        )}

        {/* Raw config viewer */}
        <Section title="Config raw">
          <div className="space-y-3">
            <RawConfigViewer model={baseModel} rawConfig={rawConfigs[baseSlug]} />
            <RawConfigViewer model={cmpModel} rawConfig={rawConfigs[cmpSlug]} />
          </div>
        </Section>

        {/* Footer */}
        <footer className="border-t border-[#1e2d45] pt-6 pb-4 text-[10px] font-mono text-[#4b5e7a] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>COMPARADOR_IA · Análisis desde config.json · No contiene benchmarks empíricos</span>
          <span className="text-[#2d4060]">localhost:5050 · Vercel-ready</span>
        </footer>
      </main>

      {showAddModal && (
        <AddModelModal
          onAdd={handleAddModel}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
