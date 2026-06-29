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

/**
 * Checks if a string is a valid hex color.
 * Supports 3-digit (#rgb), 6-digit (#rrggbb), with or without leading `#`.
 *
 * @example isValidHex('#ff0000') // true
 * @example isValidHex('#f00')    // true
 * @example isValidHex('ff0000')  // true
 * @example isValidHex('#xyz')    // false
 */
export function isValidHex(value: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

/**
 * Converts a hex color to an HSL object.
 * Returns `null` for invalid input.
 *
 * @example hexToHsl('#ff0000') // { h: 0, s: 100, l: 50 }
 * @example hexToHsl('#00ff00') // { h: 120, s: 100, l: 50 }
 * @example hexToHsl('#0000ff') // { h: 240, s: 100, l: 50 }
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    case b: h = ((r - g) / d + 4) / 6; break
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Converts HSL values to a hex color string.
 *
 * @example hslToHex(0, 100, 50)   // '#ff0000'
 * @example hslToHex(120, 100, 50) // '#00ff00'
 * @example hslToHex(240, 100, 50) // '#0000ff'
 */
export function hslToHex(h: number, s: number, l: number): string {
  const hue = h / 360
  const sat = s / 100
  const lig = l / 100
  if (sat === 0) {
    const val = Math.round(lig * 255)
    return rgbToHex(val, val, val)
  }
  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat
  const p = 2 * lig - q
  return rgbToHex(
    Math.round(hue2rgb(p, q, hue + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hue) * 255),
    Math.round(hue2rgb(p, q, hue - 1 / 3) * 255),
  )
}

/**
 * Blends two hex colors together with a weight factor.
 * Weight 0 = fully color1, weight 1 = fully color2. Default 0.5.
 *
 * @example mix('#ff0000', '#0000ff')    // '#7f007f'
 * @example mix('#ff0000', '#0000ff', 0) // '#ff0000'
 * @example mix('#ff0000', '#0000ff', 1) // '#0000ff'
 */
export function mix(color1: string, color2: string, weight: number = 0.5): string {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  if (!rgb1 || !rgb2) return color1
  const w = Math.max(0, Math.min(1, weight))
  const lerp = (a: number, b: number) => Math.floor(a + (b - a) * w)
  return rgbToHex(lerp(rgb1.r, rgb2.r), lerp(rgb1.g, rgb2.g), lerp(rgb1.b, rgb2.b))
}

/**
 * Generates a random hex color.
 *
 * @example randomColor() // '#a3f07b'
 */
export function randomColor(): string {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  return rgbToHex(r, g, b)
}

/**
 * Checks if a hex color is perceived as light (useful for text contrast decisions).
 *
 * @example isLight('#ffffff') // true
 * @example isLight('#000000') // false
 * @example isLight('#ff0000') // false
 */
export function isLight(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 > 0.5
}

/**
 * Checks if a hex color is perceived as dark.
 *
 * @example isDark('#000000') // true
 * @example isDark('#ffffff') // false
 */
export function isDark(hex: string): boolean {
  return !isLight(hex)
}

/**
 * Returns the complementary color (180° hue rotation).
 *
 * @example complementary('#ff0000') // '#00ffff'
 * @example complementary('#00ff00') // '#ff00ff'
 * @example complementary('#0000ff') // '#ffff00'
 */
export function complementary(hex: string): string {
  const hsl = hexToHsl(hex)
  if (!hsl) return hex
  return hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l)
}

/**
 * Sets opacity on a hex color, returning an 8-digit hex (#rrggbbaa).
 * Opacity is clamped to 0-1.
 *
 * @example alpha('#ff0000', 0.5) // '#ff000080'
 * @example alpha('#00ff00', 1)   // '#00ff00ff'
 * @example alpha('#0000ff', 0)   // '#0000ff00'
 */
export function alpha(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const a = Math.max(0, Math.min(1, opacity))
  const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0')
  return rgbToHex(rgb.r, rgb.g, rgb.b) + alphaHex
}

export function rgbToHsl(r:number,g:number,b:number):{h:number;s:number;l:number}{
  const rn=Math.max(0,Math.min(255,r))/255,gn=Math.max(0,Math.min(255,g))/255,bn=Math.max(0,Math.min(255,b))/255
  const max=Math.max(rn,gn,bn),min=Math.min(rn,gn,bn),l=(max+min)/2
  if(max===min)return{h:0,s:0,l:Math.round(l*100)}
  const d=max-min,s=l>0.5?d/(2-max-min):d/(max+min)
  let h=0
  switch(max){case rn:h=((gn-bn)/d+(gn<bn?6:0))/6;break;case gn:h=((bn-rn)/d+2)/6;break;case bn:h=((rn-gn)/d+4)/6;break}
  return{h:Math.round(((h*360)%360+360)%360),s:Math.round(s*100),l:Math.round(l*100)}
}
export function hslToRgb(h:number,s:number,l:number):{r:number;g:number;b:number}{
  const hue=((h%360)+360)%360/360,sat=Math.max(0,Math.min(100,s))/100,lig=Math.max(0,Math.min(100,l))/100
  if(sat===0){const v=Math.round(lig*255);return{r:v,g:v,b:v}}
  const hue2rgb=(p:number,q:number,t:number):number=>{let tt=t;if(tt<0)tt+=1;if(tt>1)tt-=1;if(tt<1/6)return p+(q-p)*6*tt;if(tt<1/2)return q;if(tt<2/3)return p+(q-p)*(2/3-tt)*6;return p}
  const q=lig<0.5?lig*(1+sat):lig+sat-lig*sat,p=2*lig-q
  return{r:Math.round(hue2rgb(p,q,hue+1/3)*255),g:Math.round(hue2rgb(p,q,hue)*255),b:Math.round(hue2rgb(p,q,hue-1/3)*255)}
}
export function saturate(hex:string,amount:number):string{const h=hexToHsl(hex);if(!h)return hex;const s=Math.min(100,Math.max(0,h.s+amount));return hslToHex(h.h,s,h.l)}
export function desaturate(hex:string,amount:number):string{const h=hexToHsl(hex);if(!h)return hex;const s=Math.min(100,Math.max(0,h.s-amount));return hslToHex(h.h,s,h.l)}
export function adjustHue(hex:string,degrees:number):string{const h=hexToHsl(hex);if(!h)return hex;const hue=(((h.h+degrees)%360)+360)%360;return hslToHex(hue,h.s,h.l)}
export function rgba(r:number,g:number,b:number,a:number=1):string{return 'rgba('+Math.max(0,Math.min(255,Math.round(r)))+', '+Math.max(0,Math.min(255,Math.round(g)))+', '+Math.max(0,Math.min(255,Math.round(b)))+', '+Math.max(0,Math.min(1,a))+')'}
