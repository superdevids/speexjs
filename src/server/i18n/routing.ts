const locales = ['en', 'id', 'ja', 'zh', 'ko', 'ar', 'es', 'fr', 'de', 'pt'] as const
export type Locale = typeof locales[number]

export function detectLocale(acceptLanguage?: string): string {
  if (!acceptLanguage) return 'en'
  const preferred = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase() ?? 'en'
  return locales.includes(preferred as any) ? preferred : 'en'
}

export function localizedPath(path: string, locale: string): string {
  return locale === 'en' ? path : `/${locale}${path}`
}
