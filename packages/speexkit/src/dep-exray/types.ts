export interface DependencyInfo {
  name: string
  version: string
  isDirect: boolean
  estimatedSize: number
  isUnused: boolean
  cveCount: number
}

export interface ReplacementSuggestion {
  packageName: string
  reason: string
  replacement: string
  estimatedSizeReduction: string
  confidence: 'high' | 'medium' | 'low'
  autoPrReady: boolean
}

export interface ScanResult {
  projectName: string
  directDeps: number
  transitiveDeps: number
  totalEstimatedSize: string
  highImpactReplacements: ReplacementSuggestion[]
  mediumImpactReplacements: ReplacementSuggestion[]
  securityIssues: SecurityIssue[]
}

export interface SecurityIssue {
  packageName: string
  cveId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  fix: string
}

export interface ScannerConfig {
  path?: string
  verbose?: boolean
  jsonOutput?: boolean
}
