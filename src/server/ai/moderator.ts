export type ModerationAction = 'flag' | 'block' | 'mask' | 'review'

export type PiiType = 'email' | 'phone' | 'ssn' | 'credit-card' | 'ip-address'

export interface ModerationFlag {
  type: 'pii' | 'spam' | 'toxicity' | 'custom'
  subtype: string
  value: string
  action: ModerationAction
  label?: string
  position?: { start: number; end: number }
}

export interface ModerationResult {
  safe: boolean
  flags: ModerationFlag[]
  actions: ModerationAction[]
  score: number
}

export interface CustomRule {
  pattern: RegExp
  action: ModerationAction
  label: string
}

export interface ModeratorOptions {
  rules?: {
    pii?: boolean
    spam?: boolean
    toxicity?: boolean
    custom?: CustomRule[]
  }
  llm?: {
    classify(text: string): Promise<{ toxic: boolean; score: number; categories: string[] }>
  }
  maskMode?: 'partial' | 'full'
}

interface PiiPattern {
  type: PiiType
  pattern: RegExp
  action: ModerationAction
}

const PII_PATTERNS: PiiPattern[] = [
  {
    type: 'email',
    pattern: /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}/g,
    action: 'mask',
  },
  {
    type: 'phone',
    pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}(?:\s*(?:ext|extension|x)\s*\d{1,5})?/g,
    action: 'mask',
  },
  {
    type: 'ssn',
    pattern: /\b(?!000|666|9\d{2})\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g,
    action: 'block',
  },
  {
    type: 'credit-card',
    pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
    action: 'mask',
  },
  {
    type: 'ip-address',
    pattern: /(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b|(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b|(?:[A-Fa-f0-9]{1,4}:){1,7}:|:(?::[A-Fa-f0-9]{1,4}){1,7}\b/g,
    action: 'flag',
  },
]

const SPAM_PATTERNS: Array<{ pattern: RegExp; label: string; action: ModerationAction }> = [
  { pattern: /https?:\/\/[^\s]{3,}\.(?:xyz|tk|ml|ga|cf|gq|click|download|review|top|bid)\b/gi, label: 'suspicious-tld', action: 'flag' },
  { pattern: /(?:https?:\/\/)?(?:www\.)?(?:bit\.ly|tinyurl\.com|ow\.ly|is\.gd|buff\.ly|shortlink\.co|t\.co|rb\.gy)\/[a-zA-Z0-9]+\b/gi, label: 'url-shortener', action: 'flag' },
  { pattern: /(?:buy\s+now|click\s+here|act\s+now|limited\s+time|offer\s+expires|don't\s+miss\s+out|exclusive\s+deal|congratulations\s+you'?ve?\s+won|you\s+are\s+a\s+winner|claim\s+your\s+prize|free\s+membership|earn\s+money\s+fast|work\s+from\s+home\s+no\s+experience|double\s+your\s+income|extra\s+cash\s+from\s+home|make\s+{\$}{3,}|urgent\s+response\s+required|immediate\s+action\s+required|you\s+have\s+been\s+selected|guaranteed\s+approval|no\s+credit\s+check|pre[-]?approved|risk[- ]?free|satisfaction\s+guaranteed|act\s+now\s+supplies\s+are\s+limited|this\s+is\s+not\s+spam)\b/gi, label: 'spam-phrase', action: 'block' },
  { pattern: /(.)\1{5,}/g, label: 'repetitive-content', action: 'flag' },
  { pattern: /(?:https?:\/\/[^\s]+){3,}/gi, label: 'excessive-urls', action: 'block' },
  { pattern: /(?:[!?]){4,}/g, label: 'excessive-punctuation', action: 'flag' },
  { pattern: /[A-Z\s]{20,}/g, label: 'excessive-caps', action: 'flag' },
]

const PII_MASK_REPLACEMENTS: Record<PiiType, string> = {
  email: '[EMAIL]',
  phone: '[PHONE]',
  ssn: '[SSN]',
  'credit-card': '[CREDIT_CARD]',
  'ip-address': '[IP_ADDRESS]',
}

function luhnCheck(digits: string): boolean {
  const cleaned = digits.replace(/\D/g, '')
  let sum = 0
  let alternate = false
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let n = parseInt(cleaned[i]!, 10)
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}

function isValidIPv4(octets: string[]): boolean {
  if (octets.length !== 4) return false
  for (const octet of octets) {
    const n = parseInt(octet, 10)
    if (isNaN(n) || n < 0 || n > 255) return false
    if (octet.length > 1 && octet[0] === '0') return false
  }
  const first = parseInt(octets[0]!, 10)
  if (first === 0 || first === 10 || first === 127) return false
  if (first === 169 && parseInt(octets[1]!, 10) === 254) return false
  if (first === 172 && parseInt(octets[1]!, 10) >= 16 && parseInt(octets[1]!, 10) <= 31) return false
  if (first === 192 && parseInt(octets[1]!, 10) === 168) return false
  return true
}

function extractMatches(text: string, pattern: RegExp): Array<{ value: string; start: number; end: number }> {
  const matches: Array<{ value: string; start: number; end: number }> = []
  const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
  let match: RegExpExecArray | null = regex.exec(text)
  while (match !== null) {
    matches.push({ value: match[0], start: match.index, end: match.index + match[0].length })
    if (match.index === regex.lastIndex) regex.lastIndex++
    match = regex.exec(text)
  }
  return matches
}

function scoreFromFlags(flags: ModerationFlag[]): number {
  if (flags.length === 0) return 0
  const weights: Record<ModerationAction, number> = { flag: 0.2, review: 0.4, mask: 0.6, block: 1.0 }
  const total = flags.reduce((sum, f) => sum + (weights[f.action] ?? 0.3), 0)
  return Math.min(Math.round((total / flags.length) * 100) / 100, 1)
}

export class Moderator {
  private readonly piiEnabled: boolean
  private readonly spamEnabled: boolean
  private readonly toxicityEnabled: boolean
  private readonly customRules: CustomRule[]
  private readonly llm?: ModeratorOptions['llm']
  private readonly maskMode: 'partial' | 'full'

  constructor(options: ModeratorOptions = {}) {
    this.piiEnabled = options.rules?.pii ?? true
    this.spamEnabled = options.rules?.spam ?? true
    this.toxicityEnabled = options.rules?.toxicity ?? false
    this.customRules = options.rules?.custom ?? []
    this.llm = options.llm
    this.maskMode = options.maskMode ?? 'full'
  }

  async check(text: string): Promise<ModerationResult> {
    const flags: ModerationFlag[] = []

    if (this.piiEnabled) {
      const piiFlags = this.detectPii(text)
      flags.push(...piiFlags)
    }

    if (this.spamEnabled) {
      const spamFlags = this.detectSpam(text)
      flags.push(...spamFlags)
    }

    if (this.customRules.length > 0) {
      const customFlags = this.detectCustom(text)
      flags.push(...customFlags)
    }

    if (this.toxicityEnabled && this.llm) {
      try {
        const toxicityResult = await this.llm.classify(text)
        if (toxicityResult.toxic) {
          flags.push({
            type: 'toxicity',
            subtype: toxicityResult.categories.join(',') || 'toxic',
            value: text,
            action: 'review',
          })
        }
      } catch {
        /* toxicity detection failed, skip */
      }
    }

    const actions = this.deduplicateActions(flags.map((f) => f.action))
    const score = scoreFromFlags(flags)

    return {
      safe: flags.length === 0,
      flags,
      actions,
      score,
    }
  }

  async checkBatch(texts: string[]): Promise<ModerationResult[]> {
    return Promise.all(texts.map((t) => this.check(t)))
  }

  mask(text: string): string {
    if (!this.piiEnabled) return text

    let result = text

    for (const pii of PII_PATTERNS) {
      if (pii.type === 'credit-card') {
        const matches = extractMatches(result, pii.pattern)
        for (const match of matches) {
          const raw = match.value.replace(/[\s-]/g, '')
          if (raw.length === 16 && luhnCheck(raw)) {
            result = result.slice(0, match.start) + PII_MASK_REPLACEMENTS['credit-card'] + result.slice(match.end)
          }
        }
      } else if (pii.type === 'ssn') {
        const matches = extractMatches(result, pii.pattern)
        for (const match of matches) {
          const raw = match.value.replace(/-/g, '')
          if (raw.length === 9) {
            result = result.slice(0, match.start) + PII_MASK_REPLACEMENTS.ssn + result.slice(match.end)
          }
        }
      } else if (pii.type === 'ip-address') {
        const matches = extractMatches(result, pii.pattern)
        for (const match of matches) {
          const octets = match.value.split('.')
          if (octets.length === 4 && isValidIPv4(octets)) {
            result = result.slice(0, match.start) + PII_MASK_REPLACEMENTS['ip-address'] + result.slice(match.end)
          }
        }
      } else if (pii.type === 'email') {
        const matches = extractMatches(result, pii.pattern)
        for (const match of matches) {
          result = result.slice(0, match.start) + PII_MASK_REPLACEMENTS.email + result.slice(match.end)
        }
      } else if (pii.type === 'phone') {
        const matches = extractMatches(result, pii.pattern)
        for (const match of matches) {
          const digits = match.value.replace(/\D/g, '')
          if (digits.length >= 7 && digits.length <= 15) {
            result = result.slice(0, match.start) + PII_MASK_REPLACEMENTS.phone + result.slice(match.end)
          }
        }
      }
    }

    return result
  }

  private detectPii(text: string): ModerationFlag[] {
    const flags: ModerationFlag[] = []

    for (const pii of PII_PATTERNS) {
      const matches = extractMatches(text, pii.pattern)

      for (const match of matches) {
        const raw = match.value.replace(/[\s-]/g, '')

        if (pii.type === 'credit-card' && raw.length === 16) {
          if (!luhnCheck(raw)) continue
        }

        if (pii.type === 'ssn' && raw.length !== 9) continue

        if (pii.type === 'ip-address') {
          const octets = match.value.split('.')
          if (octets.length === 4) {
            if (!isValidIPv4(octets)) continue
          }
        }

        if (pii.type === 'phone') {
          if (raw.length < 7 || raw.length > 15) continue
        }

        flags.push({
          type: 'pii',
          subtype: pii.type,
          value: match.value,
          action: pii.action,
          position: { start: match.start, end: match.end },
        })
      }
    }

    return flags
  }

  private detectSpam(text: string): ModerationFlag[] {
    const flags: ModerationFlag[] = []
    const seen = new Set<string>()

    for (const spam of SPAM_PATTERNS) {
      const matches = extractMatches(text, spam.pattern)

      for (const match of matches) {
        const key = `${spam.label}:${match.value}`
        if (seen.has(key)) continue
        seen.add(key)

        flags.push({
          type: 'spam',
          subtype: spam.label,
          value: match.value,
          action: spam.action,
          position: { start: match.start, end: match.end },
        })
      }
    }

    return flags
  }

  private detectCustom(text: string): ModerationFlag[] {
    const flags: ModerationFlag[] = []
    const seen = new Set<string>()

    for (const rule of this.customRules) {
      const matches = extractMatches(text, rule.pattern)

      for (const match of matches) {
        const key = `${rule.label}:${match.value}`
        if (seen.has(key)) continue
        seen.add(key)

        flags.push({
          type: 'custom',
          subtype: rule.label,
          value: match.value,
          action: rule.action,
          label: rule.label,
          position: { start: match.start, end: match.end },
        })
      }
    }

    return flags
  }

  private deduplicateActions(actions: ModerationAction[]): ModerationAction[] {
    const order: ModerationAction[] = ['flag', 'review', 'mask', 'block']
    const seen = new Set<ModerationAction>()
    const result: ModerationAction[] = []

    for (const action of order) {
      if (actions.includes(action) && !seen.has(action)) {
        seen.add(action)
        result.push(action)
      }
    }

    return result
  }
}
