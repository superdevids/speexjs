export function sturgesBins(data: number[]): number {
  return Math.ceil(1 + Math.log2(data.length))
}
export function freedmanDiaconisBins(data: number[]): number {
  const n = data.length; if (n < 2) throw new Error('need 2')
  const s = [...data].sort((a, b) => a - b)
  const iqrVal = s[Math.floor(n * 0.75)]! - s[Math.floor(n * 0.25)]!
  if (iqrVal === 0) return 1
  return Math.max(1, Math.ceil((s[n - 1]! - s[0]!) / (2 * iqrVal / Math.cbrt(n))))
}
export function histogram(data: number[], o?: { bins?: number | 'sturges' | 'fd' | 'sqrt'; range?: [number, number] }): { counts: number[]; binEdges: number[]; binWidth: number } {
  if (!data.length) throw new Error('empty')
  const d = o?.range ? data.filter(v => v >= o.range![0] && v <= o.range![1]) : [...data]
  const mn = Math.min(...d), mx = Math.max(...d)
  if (mn === mx) return { counts: [d.length], binEdges: [mn, mn + 1], binWidth: 1 }
  const nb = typeof o?.bins === 'number' ? o.bins : o?.bins === 'fd' ? freedmanDiaconisBins(d) : o?.bins === 'sqrt' ? Math.ceil(Math.sqrt(d.length)) : sturgesBins(d)
  const bw = (mx - mn) / nb
  const be: number[] = []; for (let i = 0; i <= nb; i++) be.push(mn + i * bw)
  const c: number[] = new Array(nb).fill(0)
  for (const v of d) {
    if (v === mx) { c[nb - 1]!++ } else { const idx = Math.floor((v - mn) / bw); if (idx >= 0 && idx < nb) c[idx]!++ }
  }
  return { counts: c, binEdges: be, binWidth: bw }
}
export function kde(data: number[], bandwidth?: number, gridPoints = 512): { x: number[]; density: number[] } {
  const n = data.length; if (n < 2) throw new Error('need 2')
  const s = [...data].sort((a, b) => a - b)
  const iqrVal = s[Math.floor(n * 0.75)]! - s[Math.floor(n * 0.25)]!
  let std = 0; const m = data.reduce((a, b) => a + b, 0) / n
  for (const v of data) std += (v - m) ** 2; std = Math.sqrt(std / (n - 1))
  const sigma = Math.min(std, iqrVal / 1.34)
  let h = bandwidth ?? sigma * Math.pow(4 / (3 * n), 1 / 5); if (h <= 0) h = 0.1
  const pad = h * 3, gMin = s[0]! - pad, gMax = s[n - 1]! + pad, step = (gMax - gMin) / (gridPoints - 1)
  const x: number[] = [], density: number[] = []
  const scale = 1 / (n * h * Math.sqrt(2 * Math.PI))
  for (let i = 0; i < gridPoints; i++) {
    x.push(gMin + i * step); let sum = 0
    for (let j = 0; j < n; j++) { const z = (x[i]! - data[j]!) / h; sum += Math.exp(-0.5 * z * z) }
    density.push(sum * scale)
  }
  return { x, density }
}
export function boxPlotData(data: number[]): { min: number; q1: number; median: number; q3: number; max: number; outliers: number[] } {
  const s = [...data].sort((a, b) => a - b); const n = s.length
  const q1 = s[Math.floor(n * 0.25)]!, q3 = s[Math.floor(n * 0.75)]!, med = s[Math.floor(n * 0.5)]!
  const iqrVal = q3 - q1, lf = q1 - 1.5 * iqrVal, uf = q3 + 1.5 * iqrVal
  let wl = s[0]!, wh = s[n - 1]!; const out: number[] = []
  for (let i = 0; i < n; i++) { if (s[i]! < lf) out.push(s[i]!); else { wl = s[i]!; break } }
  for (let i = n - 1; i >= 0; i--) { if (s[i]! > uf) out.push(s[i]!); else { wh = s[i]!; break } }
  return { min: wl, q1, median: med, q3, max: wh, outliers: out }
}
export function ecdf(data: number[]): { x: number[]; y: number[] } {
  const s = [...data].sort((a, b) => a - b); const n = s.length
  const x: number[] = [s[0]!], y: number[] = [0]
  for (let i = 1; i <= n; i++) { x.push(s[i - 1]!); y.push(i / n) }
  return { x, y }
}
export function colorMap(name: string, n = 256): string[] {
  const maps: Record<string, string[]> = {
    viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
    plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636'],
    inferno: ['#000004', '#320a5e', '#781c6d', '#bb3654', '#fcffa4'],
    magma: ['#000004', '#2c115f', '#711a77', '#b63679', '#fcfdbf'],
    blues: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'],
  }
  const stops = maps[name] ?? maps.viridis!
  if (n <= 5) return stops.slice(0, n)
  const result: string[] = []
  for (let i = 0; i < n; i++) {
    const pos = i / (n - 1), idx = pos * 4
    const lo = Math.floor(idx), hi = Math.ceil(idx)
    if (lo === hi) { result.push(stops[lo]!) } else {
      const t = idx - lo
      const interp = (c1: string, c2: string, o: number) => Math.round(parseInt(c1.substr(o, 2), 16) * (1 - t) + parseInt(c2.substr(o, 2), 16) * t)
      result.push('#' + [1, 3, 5].map(o => Math.min(255, Math.max(0, interp(stops[lo]!, stops[hi]!, o))).toString(16).padStart(2, '0')).join(''))
    }
  }
  return result
}
