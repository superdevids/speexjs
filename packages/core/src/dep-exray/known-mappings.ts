

export interface PackageMapping {
  name: string
  size: string
  replacement: string
  confidence: 'high' | 'medium' | 'low'
  autoPrReady: boolean
  reason: string
  detectionPattern: string
}

export const KNOWN_MAPPINGS: PackageMapping[] = [
  {
    name: 'lodash',
    size: '4.2 MB',
    replacement: 'jscore-core',
    confidence: 'high',
    autoPrReady: true,
    reason: 'Most lodash functions have direct replacements in jscore-core with 99% API compatibility',
    detectionPattern: 'from [\'"]lodash[\'"]|require\\([\'"]lodash[\'"]\\)',
  },
  {
    name: 'moment',
    size: '2.5 MB',
    replacement: 'jscore-core/date',
    confidence: 'high',
    autoPrReady: true,
    reason: 'date utilities in jscore-core cover 95% of common moment use cases',
    detectionPattern: 'from [\'"]moment[\'"]|require\\([\'"]moment[\'"]\\)',
  },
  {
    name: 'date-fns',
    size: '1.2 MB (tree-shaked ~50KB)',
    replacement: 'jscore-core/date',
    confidence: 'medium',
    autoPrReady: false,
    reason: 'Partially overlapping — jscore-core covers basic date ops but not all locale support',
    detectionPattern: 'from [\'"]date-fns[\'"]|require\\([\'"]date-fns[\'"]\\)',
  },
  {
    name: 'axios',
    size: '1.6 MB',
    replacement: 'native fetch + jscore-core/async/retry',
    confidence: 'medium',
    autoPrReady: false,
    reason: 'Native fetch covers most use cases; needs manual review for interceptors',
    detectionPattern: 'from [\'"]axios[\'"]|require\\([\'"]axios[\'"]\\)',
  },
  {
    name: 'uuid',
    size: '30 KB',
    replacement: 'crypto.randomUUID() (native)',
    confidence: 'high',
    autoPrReady: true,
    reason: 'crypto.randomUUID() is available in all modern Node.js and browsers',
    detectionPattern: 'from [\'"]uuid[\'"]|require\\([\'"]uuid[\'"]\\)',
  },
  {
    name: 'deepmerge',
    size: '15 KB',
    replacement: 'jscore-core',
    confidence: 'high',
    autoPrReady: true,
    reason: 'jscore-core provides deepMerge out of the box',
    detectionPattern: 'from [\'"]deepmerge[\'"]|require\\([\'"]deepmerge[\'"]\\)',
  },
  {
    name: 'lodash.merge',
    size: '25 KB',
    replacement: 'jscore-core',
    confidence: 'high',
    autoPrReady: true,
    reason: 'jscore-core provides deepMerge out of the box',
    detectionPattern: 'from [\'"]lodash\\.(merge|clone|pick|omit|get|set)[\'"]',
  },
  {
    name: 'chalk',
    size: '45 KB',
    replacement: 'picocolors',
    confidence: 'medium',
    autoPrReady: false,
    reason: "picocolors is 3KB vs chalk's 45KB with same API",
    detectionPattern: 'from [\'"]chalk[\'"]|require\\([\'"]chalk[\'"]\\)',
  },
  {
    name: 'nanoid',
    size: '8 KB',
    replacement: 'jscore-core/string (nanoid)',
    confidence: 'high',
    autoPrReady: true,
    reason: 'jscore-core provides nanoid with same API',
    detectionPattern: 'from [\'"]nanoid[\'"]|require\\([\'"]nanoid[\'"]\\)',
  },
  {
    name: 'dayjs',
    size: '50 KB',
    replacement: 'jscore-core/date',
    confidence: 'medium',
    autoPrReady: false,
    reason: 'Partially overlapping — covers basics but not all plugins',
    detectionPattern: 'from [\'"]dayjs[\'"]|require\\([\'"]dayjs[\'"]\\)',
  },
  {
    name: 'clsx',
    size: '5 KB',
    replacement: 'native template literals',
    confidence: 'high',
    autoPrReady: true,
    reason: 'Can be replaced with simple template literal conditional pattern',
    detectionPattern: 'from [\'"]clsx[\'"]|require\\([\'"]clsx[\'"]\\)',
  },
]

export const KNOWN_CVES: Record<string, { cve: string; severity: string; fix: string }[]> = {
  'ansi-regex': [
    { cve: 'CVE-2021-3807', severity: 'high', fix: 'Update to ansi-regex@6.0.1 or later' },
  ],
  'semver': [
    { cve: 'CVE-2022-25883', severity: 'medium', fix: 'Update to semver@7.5.2 or later' },
  ],
  'json5': [
    { cve: 'CVE-2022-46175', severity: 'high', fix: 'Update to json5@2.2.3 or later' },
  ],
  'lodash': [
    { cve: 'CVE-2020-28502', severity: 'high', fix: 'Update to lodash@4.17.21 or later' },
    { cve: 'CVE-2020-8203', severity: 'medium', fix: 'Update to lodash@4.17.21 or later' },
  ],
}
