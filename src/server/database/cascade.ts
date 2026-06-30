const cascades = new Map<string, { relation: string; foreignKey: string }[]>()

export function cascadeDelete(modelName: string, relation: string, foreignKey: string): void {
  const deletes = cascades.get(modelName) ?? []
  deletes.push({ relation, foreignKey })
  cascades.set(modelName, deletes)
}

export function getCascades(modelName: string): { relation: string; foreignKey: string }[] {
  return cascades.get(modelName) ?? []
}
