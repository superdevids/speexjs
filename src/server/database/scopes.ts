import type { QueryBuilder } from './query.js'

type ScopeCallback = (query: QueryBuilder) => void

const globalScopes = new Map<string, ScopeCallback[]>()

export function addGlobalScope(modelName: string, callback: ScopeCallback): void {
  const scopes = globalScopes.get(modelName) ?? []
  scopes.push(callback)
  globalScopes.set(modelName, scopes)
}

export function getGlobalScopes(modelName: string): ScopeCallback[] {
  return globalScopes.get(modelName) ?? []
}

export function removeGlobalScope(modelName: string, callback: ScopeCallback): void {
  const scopes = globalScopes.get(modelName) ?? []
  globalScopes.set(modelName, scopes.filter(s => s !== callback))
}
