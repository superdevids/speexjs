type Messages = Record<string, string | ((...args: string[]) => string)>

export class I18n {
  private locales: Map<string, Messages> = new Map()
  private current = 'en'

  constructor() { this.load('en', {}) }

  load(locale: string, messages: Messages): void {
    this.locales.set(locale, messages)
  }

  setLocale(locale: string): void {
    if (!this.locales.has(locale)) throw new Error(`Locale "${locale}" not loaded`)
    this.current = locale
  }

  t(key: string, ...args: string[]): string {
    const msg = this.locales.get(this.current)?.[key]
    if (!msg) return key
    if (typeof msg === 'function') return msg(...args)
    return msg
  }

  getLocale(): string { return this.current }
}
