/**
 * Converts a hex color string to RGB values.
 *
 * @example hexToRgb('#ff0000') // { r: 255, g: 0, b: 0 }
 * @example hexToRgb('#f00')   // { r: 255, g: 0, b: 0 }
 * @example hexToRgb('#FF8800') // { r: 255, g: 136, b: 0 }
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h[0]! + h[0] + h[1]! + h[1] + h[2]! + h[2]
  if (h.length !== 6) return null
  const num = Number.parseInt(h, 16)
  if (isNaN(num)) return null
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * Converts RGB values to a hex color string.
 *
 * @example rgbToHex(255, 0, 0) // "#ff0000"
 * @example rgbToHex(255, 136, 0) // "#ff8800"
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

/**
 * Lightens a hex color by a given percentage (0-100).
 *
 * @example lighten('#ff0000', 20) // "#ff3333"
 * @example lighten('#0000ff', 50) // "#7f7fff"
 */
export function lighten(hex: string, percent: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const factor = percent / 100
  return rgbToHex(
    rgb.r + (255 - rgb.r) * factor,
    rgb.g + (255 - rgb.g) * factor,
    rgb.b + (255 - rgb.b) * factor,
  )
}

/**
 * Darkens a hex color by a given percentage (0-100).
 *
 * @example darken('#ff0000', 20) // "#cc0000"
 * @example darken('#00ff00', 50) // "#008000"
 */
export function darken(hex: string, percent: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const factor = percent / 100
  return rgbToHex(
    rgb.r * (1 - factor),
    rgb.g * (1 - factor),
    rgb.b * (1 - factor),
  )
}

/**
 * Checks the WCAG contrast ratio between two hex colors.
 * Returns the ratio as a number (1-21). WCAG AA requires 4.5:1 for normal text.
 *
 * @example contrastRatio('#000000', '#ffffff') // 21
 * @example contrastRatio('#ff0000', '#ffffff') // 3.99
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(hex1)
  const lum2 = relativeLuminance(hex2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2))
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const vals = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * vals[0]! + 0.7152 * vals[1]! + 0.0722 * vals[2]!
}

/**
 * Checks if a hex color meets WCAG AA contrast ratio (4.5:1) against another color.
 *
 * @example meetsWCAG('#000000', '#ffffff') // true (black on white)
 * @example meetsWCAG('#999999', '#ffffff') // false (gray on white)
 */
export function meetsWCAG(hex1: string, hex2: string, level?: 'AA' | 'AAA'): boolean {
  const ratio = contrastRatio(hex1, hex2)
  const threshold = level === 'AAA' ? 7 : 4.5
  return ratio >= threshold
}
