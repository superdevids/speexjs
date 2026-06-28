const SATUAN = [
  '',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
]

function _terbilang(value: number): string {
  if (value === 0) return 'nol'
  if (value < 0) return `minus ${_terbilang(-value)}`

  const puluhan = Math.floor(value / 10) % 10
  const satuan = value % 10

  if (value < 10) return SATUAN[value] ?? ''
  if (value < 20) {
    if (value === 10) return 'sepuluh'
    if (value === 11) return 'sebelas'
    return `${SATUAN[satuan] ?? ''} belas`
  }
  if (value < 100) {
    const depan = puluhan === 1 ? 'se' : `${SATUAN[puluhan] ?? ''} `
    return `${depan}puluh ${satuan > 0 ? SATUAN[satuan] ?? '' : ''}`.trim()
  }
  if (value < 1000) {
    const ratusan = Math.floor(value / 100)
    const sisa = value % 100
    const depan = ratusan === 1 ? 'se' : `${SATUAN[ratusan] ?? ''} `
    const tengah = sisa > 0 ? ` ${_terbilang(sisa)}` : ''
    return `${depan}ratus${tengah}`
  }
  if (value < 1000000) {
    const ribuan = Math.floor(value / 1000)
    const sisa = value % 1000
    const depan = ribuan === 1 ? 'se' : `${_terbilang(ribuan)} `
    const tengah = sisa > 0 ? ` ${_terbilang(sisa)}` : ''
    return `${depan}ribu${tengah}`
  }
  if (value < 1000000000) {
    const jutaan = Math.floor(value / 1000000)
    const sisa = value % 1000000
    const tengah = sisa > 0 ? ` ${_terbilang(sisa)}` : ''
    return `${_terbilang(jutaan)} juta${tengah}`
  }
  if (value < 1000000000000) {
    const milyaran = Math.floor(value / 1000000000)
    const sisa = value % 1000000000
    const tengah = sisa > 0 ? ` ${_terbilang(sisa)}` : ''
    return `${_terbilang(milyaran)} milyar${tengah}`
  }

  const triliunan = Math.floor(value / 1000000000000)
  const sisa = value % 1000000000000
  const tengah = sisa > 0 ? ` ${_terbilang(sisa)}` : ''
  return `${_terbilang(triliunan)} triliun${tengah}`
}

export class SuperNumber {
  static format(
    value: number,
    options?: { locale?: string; currency?: string; decimals?: number },
  ): string {
    const locale = options?.locale ?? 'id-ID'
    const decimals = options?.decimals ?? 0

    if (options?.currency) {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: options.currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value)
      } catch {
        return SuperNumber.format(value, { locale, decimals })
      }
    }

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
  }

  static inRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  static sum(values: number[]): number {
    return values.reduce((acc, v) => acc + v, 0)
  }

  static average(values: number[]): number {
    if (values.length === 0) return 0
    return SuperNumber.sum(values) / values.length
  }

  static median(values: number[]): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!
  }

  static round(value: number, precision: number = 0): number {
    const factor = Math.pow(10, precision)
    return Math.round(value * factor) / factor
  }

  static floor(value: number, precision: number = 0): number {
    const factor = Math.pow(10, precision)
    return Math.floor(value * factor) / factor
  }

  static ceil(value: number, precision: number = 0): number {
    const factor = Math.pow(10, precision)
    return Math.ceil(value * factor) / factor
  }

  static isEven(value: number): boolean {
    return value % 2 === 0
  }

  static isOdd(value: number): boolean {
    return value % 2 !== 0
  }

  static formatRupiah(value: number): string {
    return SuperNumber.format(value, {
      locale: 'id-ID',
      currency: 'IDR',
      decimals: 0,
    })
  }

  static terbilang(value: number): string {
    if (!Number.isFinite(value)) return ''
    if (value < 0) return `minus ${_terbilang(-value)}`
    if (value === 0) return 'nol'

    const integer = Math.floor(value)
    const fraction = Math.round((value - integer) * 100)

    let result = _terbilang(integer)
    if (fraction > 0) {
      result += ` koma ${_terbilang(fraction)}`
    }

    return result
  }
}
