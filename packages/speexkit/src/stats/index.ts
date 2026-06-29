export function gammaLn(x: number): number {
  if (x <= 0) return NaN
  if (x < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * x)) - gammaLn(1 - x)
  x -= 1
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  let s = c[0]!
  for (let i = 1; i <= g + 1; i++) s += c[i]! / (x + i)
  const t = x + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s)
}
export function erf(x: number): number {
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429]
  const s = x >= 0 ? 1 : -1; x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  let y = 0
  for (let i = a.length - 1; i >= 0; i--) y = t * (y + a[i]!)
  return s * (1 - y * Math.exp(-x * x))
}
export function normalPDF(x: number, mean = 0, std = 1): number {
  if (std <= 0) return NaN
  const z = (x - mean) / std
  return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI))
}
export function normalCDF(x: number, mean = 0, std = 1): number {
  if (std <= 0) return NaN
  return 0.5 * (1 + erf((x - mean) / (std * Math.SQRT2)))
}
export function binomialPMF(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0; if (p === 0) return k === 0 ? 1 : 0; if (p === 1) return k === n ? 1 : 0
  return Math.exp(gammaLn(n + 1) - gammaLn(k + 1) - gammaLn(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p))
}
export function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0 || k < 0) return NaN
  return Math.exp(k * Math.log(lambda) - lambda - gammaLn(k + 1))
}
export function skewness(data: number[]): number {
  const n = data.length; if (n < 3) return NaN
  const m = data.reduce((s, v) => s + v, 0) / n
  let m2 = 0, m3 = 0
  for (const v of data) { const d = v - m; m2 += d * d; m3 += d * d * d }
  if (m2 === 0) return NaN
  return (m3 / (n * Math.sqrt(m2 / n) * (m2 / n))) * Math.sqrt(n * (n - 1)) / (n - 2)
}
export function kurtosis(data: number[]): number {
  const n = data.length; if (n < 4) return NaN
  const m = data.reduce((s, v) => s + v, 0) / n
  let m2 = 0, m4 = 0
  for (const v of data) { const d = v - m; m2 += d * d; m4 += d * d * d * d }
  if (m2 === 0) return NaN
  return m4 / (n * (m2 / n) * (m2 / n)) - 3
}
export function quantile(data: number[], q: number): number {
  if (!data.length) throw new Error('empty')
  const s = [...data].sort((a, b) => a - b)
  const idx = q * (s.length - 1)
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  if (lo === hi) return s[lo]!
  return s[lo]! + (s[hi]! - s[lo]!) * (idx - lo)
}
export function iqr(data: number[]): number { return quantile(data, 0.75) - quantile(data, 0.25) }
export function covariance(x: number[], y: number[]): number {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n
  let c = 0; for (let i = 0; i < n; i++) c += (x[i]! - mx) * (y[i]! - my); return c / (n - 1)
}
export function ttestInd(a: number[], b: number[]): { statistic: number; pValue: number } {
  const na = a.length, nb = b.length
  const ma = a.reduce((s, v) => s + v, 0) / na, mb = b.reduce((s, v) => s + v, 0) / nb
  let va = 0, vb = 0
  for (const v of a) va += (v - ma) ** 2; for (const v of b) vb += (v - mb) ** 2
  va /= (na - 1); vb /= (nb - 1)
  const se = Math.sqrt(va / na + vb / nb)
  if (se === 0) return { statistic: 0, pValue: 1 }
  const t = (ma - mb) / se
  const num = (va / na + vb / nb) ** 2, den = ((va / na) ** 2) / (na - 1) + ((vb / nb) ** 2) / (nb - 1)
  const dof = den === 0 ? 1 : num / den
  return { statistic: t, pValue: 2 * (1 - tCDF(Math.abs(t), dof)) }
}
function tCDF(x: number, dof: number): number {
  if (dof <= 0 || !isFinite(x)) return x > 0 ? 1 : 0
  return 1 - 0.5 * regularizedIncompleteBeta(dof / 2, 0.5, dof / (dof + x * x))
}
function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x < 0 || x > 1) return NaN; if (x === 0 || x === 1) return x
  if (x > (a + 1) / (a + b + 2)) return 1 - regularizedIncompleteBeta(b, a, 1 - x)
  const gln = gammaLn(a) + gammaLn(b) - gammaLn(a + b)
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - gln)
  let f = 1, C = 1, D = 0
  for (let m = 1; m <= 200; m++) {
    let am: number
    if (m > 1) { const k = m - 1; am = k % 2 === 1 ? -((a + (k - 1) / 2) * (a + b + (k - 1) / 2) * x) / ((a + 2 * ((k - 1) / 2)) * (a + 2 * ((k - 1) / 2) + 1)) : ((k / 2) * (b - k / 2) * x) / ((a + 2 * (k / 2) - 1) * (a + 2 * (k / 2))) } else { am = 1 }
    const bm = 1
    D = bm + am * D; if (Math.abs(D) < 1e-30) D = 1e-30
    C = bm + am / C; if (Math.abs(C) < 1e-30) C = 1e-30
    D = 1 / D; f *= C * D
    if (Math.abs(C * D - 1) < 1e-14) break
  }
  return bt * f / a
}
export function pearsonCorrelation(x: number[], y: number[]): { statistic: number; pValue: number } {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) { const dx = x[i]! - mx, dy = y[i]! - my; num += dx * dy; dx2 += dx * dx; dy2 += dy * dy }
  if (dx2 === 0 || dy2 === 0) return { statistic: 0, pValue: 1 }
  const r = num / Math.sqrt(dx2 * dy2), t = r * Math.sqrt((n - 2) / (1 - r * r))
  return { statistic: Math.max(-1, Math.min(1, r)), pValue: 2 * (1 - tCDF(Math.abs(t), n - 2)) }
}
export function spearmanCorrelation(x: number[], y: number[]): { statistic: number; pValue: number } {
  const rank = (v: number[]): number[] => {
    const n = v.length, idx = Array.from({ length: n }, (_, i) => i)
    idx.sort((a, b) => v[a]! - v[b]!)
    const r = new Array(n)
    let i = 0
    while (i < n) {
      let j = i
      while (j < n && v[idx[j]!] === v[idx[i]!]) j++
      const avg = (i + j + 1) / 2
      for (let k = i; k < j; k++) r[idx[k]!] = avg
      i = j
    }
    return r
  }
  return pearsonCorrelation(rank(x), rank(y))
}
