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

}
