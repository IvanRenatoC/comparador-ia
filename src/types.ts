export interface ModelMetrics {
  contextWindowTokens?: number
  layers?: number
  hiddenSize?: number
  attentionHeads?: number
  kvHeads?: number
  headDim?: number
  vocabSize?: number
  hasVision: boolean
  isMoE: boolean
  totalExperts?: number
  activeExpertsPerToken?: number
  dtype?: string
  architecture?: string
  modelType?: string
}

export interface ModelScores {
  contextScore: number
  widthScore: number
  depthScore: number
  attentionScore: number
  kvEfficiencyScore: number
  moeScore: number
  multimodalScore: number
  deploymentComplexityScore: number
}

export interface ModelEntry {
  slug: string
  displayName: string
  file: string
  sourceUrl?: string
  downloadedAt?: string
  isFallback?: boolean
  metrics: ModelMetrics
  scores: ModelScores
  missingFields: string[]
}

export interface ModelIndex {
  generatedAt: string
  models: ModelEntry[]
}

export interface ExplanationItem {
  wins: string[]
  losses: string[]
  ties: string[]
  missingInfo: string[]
  summary: string
  methodologyWarning: string
}

export interface Explanations {
  generatedAt: string
  baselineSlug: string
  baselineDisplayName: string
  items: Record<string, ExplanationItem>
}
