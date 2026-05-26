import { useState, useEffect, useMemo } from 'react'
import type { ModelEntry, ModelIndex } from './types'
import { generatePairExplanation } from './lib/extractMetrics'
import Header from './components/Header'
import ModelSelector from './components/ModelSelector'
import MetricsCards from './components/MetricsCards'
import BarCharts from './components/BarCharts'
import RadarChartComp from './components/RadarChartComp'
import ComparisonTable from './components/ComparisonTable'
import ExplanationSection from './components/ExplanationSection'
import RawConfigViewer from './components/RawConfigViewer'
import AddModelModal from './components/AddModelModal'
import MetricsGuide from './components/MetricsGuide'
import ChartGuide from './components/ChartGuide'
import { CollectionBadge } from './components/ModelSelector'

const DEFAULT_A = 'gpt-oss-120b'

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      {title && (
        <div className="flex items-center gap-3">
          <div className="w-4 h-px bg-[#00d4ff]/40" />
          <span className="text-[9px] font-mono tracking-widest uppercase text-[#00d4ff]/60">{title}</span>
          <div className="flex-1 h-px bg-[#e2e8f0] dark:bg-[#1e2d45]" />
        </div>
      )}
      {children}
    </section>
  )
}

export default function App() {
  const [allModels, setAllModels] = useState<ModelEntry[]>([])
  const [rawConfigs, setRawConfigs] = useState<Record<string, Record<string, unknown>>>({})
  const [modelIndex, setModelIndex] = useState<ModelIndex | null>(null)
  const [slugA, setSlugA] = useState(DEFAULT_A)
  const [slugB, setSlugB] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/model-index.json')
      .then(r => r.json() as Promise<ModelIndex>)
      .then(idx => {
        setModelIndex(idx)

        // Restore custom models from localStorage
        const stored = JSON.parse(localStorage.getItem('customModels') ?? '[]') as Array<{
          entry: ModelEntry; raw: Record<string, unknown>
        }>
        const storedRaws: Record<string, Record<string, unknown>> = {}
        stored.forEach(s => { storedRaws[s.entry.slug] = s.raw })
        setRawConfigs(storedRaws)

        const allM: ModelEntry[] = [...idx.models, ...stored.map(s => s.entry)]
        setAllModels(allM)

        const defaultA = allM.find(m => m.slug === DEFAULT_A) ? DEFAULT_A : allM[0]?.slug ?? ''
        setSlugA(defaultA)
        const defaultB = allM.find(m => m.slug !== defaultA)?.slug ?? ''
        setSlugB(defaultB)
        setLoading(false)
      })
      .catch(err => {
        setFetchError(`Error cargando índice: ${err.message}`)
        setLoading(false)
      })
  }, [])

  const modelA = useMemo(() => allModels.find(m => m.slug === slugA), [allModels, slugA])
  const modelB = useMemo(() => allModels.find(m => m.slug === slugB), [allModels, slugB])

  const isSameModel = slugA === slugB

  const explanation = useMemo(() => {
    if (!modelA || !modelB || isSameModel) return null
    return generatePairExplanation(modelA, modelB)
  }, [modelA, modelB, isSameModel])

  function handleAChange(slug: string) {
    setSlugA(slug)
  }

  function handleBChange(slug: string) {
    setSlugB(slug)
  }

  function handleAddModel(model: ModelEntry, rawConfig: Record<string, unknown>) {
    setAllModels(prev => [...prev.filter(m => m.slug !== model.slug), model])
    setRawConfigs(prev => ({ ...prev, [model.slug]: rawConfig }))
    setSlugB(model.slug)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border border-[#00d4ff]/40 rounded animate-spin border-t-[#00d4ff] mx-auto" />
          <p className="text-[12px] font-mono text-[#334155] dark:text-[#f5f6f7]">Cargando índice de modelos...</p>
        </div>
      </div>
    )
  }

  if (fetchError || !modelA || !modelB) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md px-4">
          <p className="text-[#f43f5e] font-mono text-sm">{fetchError ?? 'No se encontraron modelos en el índice.'}</p>
          <p className="text-[11px] text-[#334155] dark:text-[#f5f6f7] font-mono">Ejecuta: npm run prepare:data && npm run build</p>
        </div>
      </div>
    )
  }

  const contrastCount = allModels.filter(m => m.collection === 'contrast').length
  const testCount = allModels.filter(m => m.collection === 'test').length
  const customCount = allModels.filter(m => m.collection === 'custom').length

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-10">

        {/* Model selection */}
        <Section title="Selección de modelos">
          <div className="bg-[#f8fafc] dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1e2d45] rounded-xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <ModelSelector
                  label="Modelo A (referencia izquierda)"
                  models={allModels}
                  selected={slugA}
                  onChange={handleAChange}
                  color="#3b82f6"
                />
              </div>
              <div>
                <ModelSelector
                  label="Modelo B (comparado)"
                  models={allModels}
                  selected={slugB}
                  onChange={handleBChange}
                  color="#00d4ff"
                />
              </div>
            </div>

            {/* Same model warning */}
            {isSameModel && (
              <div className="mt-4 bg-[#f59e0b]/5 border border-[#f59e0b]/30 rounded p-3 text-[11px] font-mono text-[#f59e0b]">
                Estás comparando el mismo modelo en ambos lados. Selecciona un modelo distinto para ver diferencias.
              </div>
            )}

            {/* Stats + add button */}
            <div className="mt-4 pt-4 border-t border-[#e2e8f0] dark:border-[#1e2d45] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#334155] dark:text-[#f5f6f7]">
                <span>{allModels.length} modelos en total</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <CollectionBadge collection="contrast" /> {contrastCount} curados
                </span>
                <span className="flex items-center gap-1">
                  <CollectionBadge collection="test" /> {testCount} candidatos
                </span>
                {customCount > 0 && (
                  <span className="flex items-center gap-1">
                    <CollectionBadge collection="custom" /> {customCount} locales
                  </span>
                )}
                <span>· índice: {modelIndex?.generatedAt?.slice(0, 10) ?? '—'}</span>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-[11px] font-mono text-[#00d4ff] hover:text-[#0f172a] dark:hover:text-white border border-[#00d4ff]/30 hover:border-[#00d4ff] rounded px-3 py-1.5 transition-all"
              >
                + Agregar por config.json
              </button>
            </div>
          </div>
        </Section>

        {/* Only show comparison sections when models differ */}
        {!isSameModel && (
          <>
            {/* Executive explanation — first, so the user reads the interpretation before the raw numbers */}
            {explanation && (
              <Section title="Análisis comparativo">
                <ExplanationSection explanation={explanation} nameA={modelA.displayName} nameB={modelB.displayName} />
              </Section>
            )}

            {/* Metrics cards */}
            <Section title="Métricas clave">
              <MetricsCards base={modelA} cmp={modelB} />
            </Section>

            {/* Charts */}
            <Section title="Visualización comparativa">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <BarCharts base={modelA} cmp={modelB} />
                <RadarChartComp base={modelA} cmp={modelB} />
              </div>
            </Section>

            {/* Comparison table */}
            <Section title="Tabla técnica">
              <ComparisonTable base={modelA} cmp={modelB} />
            </Section>

            {/* Raw config viewers */}
            <Section title="Config raw">
              <div className="space-y-3">
                <RawConfigViewer model={modelA} rawConfig={rawConfigs[slugA]} />
                <RawConfigViewer model={modelB} rawConfig={rawConfigs[slugB]} />
              </div>
            </Section>
          </>
        )}

        {/* Always-visible guides */}
        <Section title="Documentación">
          <div className="space-y-3">
            <MetricsGuide />
            <ChartGuide />
          </div>
        </Section>

        <footer className="border-t border-[#e2e8f0] dark:border-[#1e2d45] pt-6 pb-4 text-[10px] font-mono text-[#334155] dark:text-[#f5f6f7] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>COMPARADOR_IA · Análisis arquitectónico desde config.json · Sin benchmarks empíricos</span>
          <span className="text-[#94a3b8] dark:text-[#2d4060]">localhost:5050 · Vercel-ready</span>
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
