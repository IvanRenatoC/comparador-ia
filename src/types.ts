export interface ModelMetrics {
  architectures?: string[]
  architecture?: string
  modelType?: string
  torchDtype?: string
  dtype?: string
  transformersVersion?: string
  hiddenSize?: number
  numHiddenLayers?: number
  numAttentionHeads?: number
  numKeyValueHeads?: number
  headDim?: number
  intermediateSize?: number
  vocabSize?: number
  maxPositionEmbeddings?: number
  ropeTheta?: number
  ropeScaling?: unknown
  numLocalExperts?: number
  numExpertsPerTok?: number
  routerAuxLoss?: number
  hasVision: boolean
  isMoE: boolean
  // Convenience aliases
  contextWindowTokens?: number
  layers?: number
  attentionHeads?: number
  kvHeads?: number
  totalExperts?: number
  activeExpertsPerToken?: number
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

export type CollectionType = 'contrast' | 'test' | 'custom'

export interface ModelEntry {
  slug: string
  displayName: string
  file: string
  collection: CollectionType
  availableIn: CollectionType[]
  sourceUrl?: string
  downloadedAt?: string
  isFallback?: boolean
  fallbackNote?: string
  metrics: ModelMetrics
  scores: ModelScores
  missingFields: string[]
}

export interface ModelIndex {
  generatedAt: string
  models: ModelEntry[]
}

export interface ModelProfile {
  highlights: string[]
  notes: string[]
  collection: string
  availableIn: string[]
  methodologyWarning: string
}

export interface ExplanationsFile {
  generatedAt: string
  note: string
  profiles: Record<string, ModelProfile>
}

export interface PairExplanation {
  summary: string
  wins: string[]
  losses: string[]
  ties: string[]
  missingInfo: string[]
  onPremiseNotes: string[]
  methodologyWarning: string
}
