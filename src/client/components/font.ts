export function fontFamily(names: string[], fallback = 'sans-serif'): string {
  return names.map(n => `"${n}"`).join(', ') + `, ${fallback}`
}

export const systemFont = fontFamily(['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'])
