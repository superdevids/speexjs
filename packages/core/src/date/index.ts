/**
 * Error thrown when a date value is invalid.
 */
export class InvalidDateError extends Error {
  constructor(input: unknown) {
    super(`Invalid date: ${String(input)}`)
    this.name = 'InvalidDateError'
  }
}

export interface DateDiff {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

/**
 * Formats a Date to a string using the given format pattern.
 *
 * Supported tokens:
 * - `YYYY` — 4-digit year
 * - `YY` — 2-digit year
 * - `MMMM` — full month name
 * - `MMM` — abbreviated month name
 * - `MM` — 2-digit month (01–12)
 * - `DD` — 2-digit day (01–31)
 * - `HH` — 2-digit hours (00–23)
 * - `mm` — 2-digit minutes
 * - `ss` — 2-digit seconds
 * - `SSS` — milliseconds
 *
 * @param date - The date to format.
 * @param format - The format string (default `'YYYY-MM-DD'`).
 * @returns The formatted date string.
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const ms = date.getMilliseconds()

  const pad = (n: number, len: number = 2): string => String(n).padStart(len, '0')

  return format
    .replace(/YYYY/g, String(year))
    .replace(/YY/g, String(year).slice(-2))
    .replace(/MMMM/g, MONTH_NAMES_FULL[month]!)
    .replace(/MMM/g, MONTH_NAMES_SHORT[month]!)
    .replace(/MM/g, pad(month + 1))
    .replace(/DD/g, pad(day))
    .replace(/HH/g, pad(hours))
    .replace(/mm/g, pad(minutes))
    .replace(/ss/g, pad(seconds))
    .replace(/SSS/g, pad(ms, 3))
}

/**
 * Parses a date from a string, number (timestamp in ms), or Date object.
 *
 * Supported string formats:
 * - ISO (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ss`)
 * - `DD/MM/YYYY` or `DD-MM-YYYY`
 * - `DD MMM YYYY` or `DD MMMM YYYY`
 * - Unix timestamp (milliseconds)
 *
 * @param input - The value to parse.
 * @returns A valid Date object.
 * @throws {InvalidDateError} If the input cannot be parsed.
 */
export function parseDate(input: string | number | Date): Date {
  if (input instanceof Date) {
    if (isNaN(input.getTime())) throw new InvalidDateError(input)
    return new Date(input.getTime())
  }

  if (typeof input === 'number') {
    const d = new Date(input)
    if (isNaN(d.getTime())) throw new InvalidDateError(input)
    return d
  }

  const trimmed = input.trim()

  // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?(?:Z|[+-]\d{2}:?\d{2})?$/)
  if (isoMatch) {
    const d = new Date(
      parseInt(isoMatch[1]!, 10),
      parseInt(isoMatch[2]!, 10) - 1,
      parseInt(isoMatch[3]!, 10),
      isoMatch[4] ? parseInt(isoMatch[4]!, 10) : 0,
      isoMatch[5] ? parseInt(isoMatch[5]!, 10) : 0,
      isoMatch[6] ? parseInt(isoMatch[6]!, 10) : 0,
      isoMatch[7] ? parseInt(isoMatch[7]!.padEnd(3, '0'), 10) : 0
    )
    if (!isNaN(d.getTime())) return d
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (dmyMatch) {
    const year = parseInt(dmyMatch[3]!, 10)
    const month = parseInt(dmyMatch[2]!, 10) - 1
    const day = parseInt(dmyMatch[1]!, 10)
    const d = new Date(year, month, day)
    // Validate that the date didn't overflow (e.g. Feb 29 in non-leap year)
    if (!isNaN(d.getTime()) && d.getMonth() === month && d.getDate() === day) return d
  }

  // DD MMM YYYY or DD MMMM YYYY
  const textMatch = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/)
  if (textMatch) {
    const monthIndex = MONTH_MAP[textMatch[2]!.toLowerCase()]
    if (monthIndex !== undefined) {
      const year = parseInt(textMatch[3]!, 10)
      const day = parseInt(textMatch[1]!, 10)
      const d = new Date(year, monthIndex, day)
      if (!isNaN(d.getTime()) && d.getMonth() === monthIndex && d.getDate() === day) return d
    }
  }

  // Unix timestamp (milliseconds) as string
  const numMatch = trimmed.match(/^-?\d+$/)
  if (numMatch) {
    const d = new Date(parseInt(numMatch[0], 10))
    if (!isNaN(d.getTime())) return d
  }

  // Fallback: let Date.parse try
  const fallback = new Date(trimmed)
  if (!isNaN(fallback.getTime())) return fallback

  throw new InvalidDateError(input)
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime())
}

const MS_IN_SECOND = 1000
const MS_IN_MINUTE = 60 * MS_IN_SECOND
const MS_IN_HOUR = 60 * MS_IN_MINUTE
const MS_IN_DAY = 24 * MS_IN_HOUR

/**
 * Computes the difference between two dates.
 *
 * @param date1 - Start date.
 * @param date2 - End date.
 * @returns An object with years, months, days, hours, minutes, seconds.
 * @throws {InvalidDateError} If either date is invalid.
 */
export function dateDiff(date1: Date, date2: Date): DateDiff {
  if (!isValidDate(date1) || !isValidDate(date2)) {
    throw new InvalidDateError('Invalid date provided to dateDiff')
  }

  let years = date2.getFullYear() - date1.getFullYear()
  let months = date2.getMonth() - date1.getMonth()
  let days = date2.getDate() - date1.getDate()

  if (days < 0) {
    months -= 1
    const prevMonth = new Date(date2.getFullYear(), date2.getMonth(), 0)
    days += prevMonth.getDate()
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  const msDiff = Math.abs(date2.getTime() - date1.getTime())
  const totalSeconds = Math.floor(msDiff / MS_IN_SECOND)
  const hours = Math.floor((msDiff % MS_IN_DAY) / MS_IN_HOUR)
  const minutes = Math.floor((msDiff % MS_IN_HOUR) / MS_IN_MINUTE)
  const seconds = totalSeconds % 60

  return { years, months, days, hours, minutes, seconds }
}

/**
 * Adds days to a date.
 *
 * @param date - The original date.
 * @param days - Number of days to add (negative to subtract).
 * @returns A new Date.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function addDays(date: Date, days: number): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const result = new Date(date.getTime())
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Adds months to a date. Handles month-end overflow (e.g., Jan 31 + 1 month
 * becomes Feb 28).
 *
 * @param date - The original date.
 * @param months - Number of months to add (negative to subtract).
 * @returns A new Date.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function addMonths(date: Date, months: number): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const result = new Date(date.getTime())
  const targetMonth = result.getMonth() + months
  result.setMonth(targetMonth)

  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0)
  }

  return result
}

/**
 * Adds years to a date. Handles leap-year overflow (e.g., Feb 29 + 1 year
 * becomes Feb 28).
 *
 * @param date - The original date.
 * @param years - Number of years to add (negative to subtract).
 * @returns A new Date.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function addYears(date: Date, years: number): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const result = new Date(date.getTime())
  const targetYear = result.getFullYear() + years
  result.setFullYear(targetYear)

  if (result.getFullYear() !== targetYear) {
    result.setDate(0)
  }

  return result
}

/**
 * Returns the start of the day (00:00:00.000) for the given date.
 *
 * @param date - The date.
 * @returns A new Date set to midnight.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function startOfDay(date: Date): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

/**
 * Returns the end of the day (23:59:59.999) for the given date.
 *
 * @param date - The date.
 * @returns A new Date set to the last millisecond of the day.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function endOfDay(date: Date): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

/**
 * Returns the first moment of the month for the given date.
 *
 * @param date - The date.
 * @returns A new Date set to the start of the month.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function startOfMonth(date: Date): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

/**
 * Returns the last moment of the month for the given date.
 *
 * @param date - The date.
 * @returns A new Date set to the end of the month.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function endOfMonth(date: Date): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

/**
 * Returns the first moment of the year for the given date.
 *
 * @param date - The date.
 * @returns A new Date set to Jan 1 00:00:00.000.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function startOfYear(date: Date): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0)
}

/**
 * Returns the last moment of the year for the given date.
 *
 * @param date - The date.
 * @returns A new Date set to Dec 31 23:59:59.999.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function endOfYear(date: Date): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  return new Date(date.getFullYear(), 12, 0, 23, 59, 59, 999)
}

/**
 * Checks if the date falls on a weekend (Saturday or Sunday).
 *
 * @param date - The date to check.
 * @returns Whether the date is a weekend.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function isWeekend(date: Date): boolean {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * Checks if a year is a leap year.
 *
 * @param year - The year to check.
 * @returns Whether the year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Checks if `date1` is before `date2`.
 *
 * @param date1 - First date.
 * @param date2 - Second date.
 * @returns Whether `date1` is before `date2`.
 * @throws {InvalidDateError} If either date is invalid.
 */
export function isBefore(date1: Date, date2: Date): boolean {
  if (!isValidDate(date1) || !isValidDate(date2)) {
    throw new InvalidDateError('Invalid date provided to isBefore')
  }
  return date1.getTime() < date2.getTime()
}

/**
 * Checks if `date1` is after `date2`.
 *
 * @param date1 - First date.
 * @param date2 - Second date.
 * @returns Whether `date1` is after `date2`.
 * @throws {InvalidDateError} If either date is invalid.
 */
export function isAfter(date1: Date, date2: Date): boolean {
  if (!isValidDate(date1) || !isValidDate(date2)) {
    throw new InvalidDateError('Invalid date provided to isAfter')
  }
  return date1.getTime() > date2.getTime()
}

/**
 * Checks if a date is within the inclusive range [start, end].
 *
 * @param date - The date to check.
 * @param start - Start of the range.
 * @param end - End of the range.
 * @returns Whether the date is between start and end.
 * @throws {InvalidDateError} If any date is invalid.
 */
export function isBetween(date: Date, start: Date, end: Date): boolean {
  if (!isValidDate(date) || !isValidDate(start) || !isValidDate(end)) {
    throw new InvalidDateError('Invalid date provided to isBetween')
  }
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
}

/**
 * Checks if a date is a business day (Monday to Friday).
 *
 * @param date - The date to check.
 * @returns Whether the date is a business day.
 */
export function isBusinessDay(date: Date): boolean {
  return isValidDate(date) && !isWeekend(date)
}

/**
 * Adds business days (skipping weekends) to a date.
 *
 * @param date - The starting date.
 * @param days - Number of business days to add (negative to subtract).
 * @returns A new Date.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function addBusinessDays(date: Date, days: number): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)

  const result = new Date(date.getTime())
  let remaining = Math.abs(days)
  const step = days >= 0 ? 1 : -1

  while (remaining > 0) {
    result.setDate(result.getDate() + step)
    const day = result.getDay()
    if (day !== 0 && day !== 6) {
      remaining--
    }
  }

  return result
}

/**
 * Calculates age in years from a birth date.
 *
 * @param birthDate - The date of birth.
 * @returns The age in years.
 * @throws {InvalidDateError} If the birth date is invalid.
 */
export function calculateAge(birthDate: Date): number {
  if (!isValidDate(birthDate)) throw new InvalidDateError(birthDate)

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

// ─── Time Ago & Time Remaining ───────────────────────────────────────────────

interface LocaleLabels {
  years: { single: string; plural: string }
  months: { single: string; plural: string }
  weeks: { single: string; plural: string }
  days: { single: string; plural: string }
  hours: { single: string; plural: string }
  minutes: { single: string; plural: string }
  seconds: { single: string; plural: string }
}

const LOCALE_LABELS: Record<string, LocaleLabels> = {
  id: {
    years: { single: 'tahun', plural: 'tahun' },
    months: { single: 'bulan', plural: 'bulan' },
    weeks: { single: 'minggu', plural: 'minggu' },
    days: { single: 'hari', plural: 'hari' },
    hours: { single: 'jam', plural: 'jam' },
    minutes: { single: 'menit', plural: 'menit' },
    seconds: { single: 'detik', plural: 'detik' },
  },
  en: {
    years: { single: 'year', plural: 'years' },
    months: { single: 'month', plural: 'months' },
    weeks: { single: 'week', plural: 'weeks' },
    days: { single: 'day', plural: 'days' },
    hours: { single: 'hour', plural: 'hours' },
    minutes: { single: 'minute', plural: 'minutes' },
    seconds: { single: 'second', plural: 'seconds' },
  },
}

function getSuffix(diffMs: number, kind: 'ago' | 'remaining', locale: string): string {
  if (diffMs < 0) {
    return locale === 'en' ? 'ago' : 'yang lalu'
  }
  if (kind === 'remaining') {
    return locale === 'en' ? 'remaining' : 'lagi'
  }
  return locale === 'en' ? 'ago' : 'yang lalu'
}

function formatRelativeTime(absDiffMs: number, suffix: string, locale: string): string {
  const labels = LOCALE_LABELS[locale] ?? LOCALE_LABELS.id!

  const seconds = Math.floor(absDiffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30.4375)
  const years = Math.floor(days / 365.25)

  let count: number
  let unit: keyof LocaleLabels

  if (years >= 1) { count = years; unit = 'years' }
  else if (months >= 1) { count = months; unit = 'months' }
  else if (weeks >= 1) { count = weeks; unit = 'weeks' }
  else if (days >= 1) { count = days; unit = 'days' }
  else if (hours >= 1) { count = hours; unit = 'hours' }
  else if (minutes >= 1) { count = minutes; unit = 'minutes' }
  else { count = Math.max(1, seconds); unit = 'seconds' }

  const label = count === 1 ? labels[unit].single : labels[unit].plural
  return `${count} ${label} ${suffix}`
}

/**
 * Returns a human-readable relative time string (e.g. "5 menit yang lalu").
 *
 * @param date - The past date.
 * @param options - Options with locale ('id' by default, 'en' supported).
 * @returns A relative time string.
 */
export function timeAgo(date: Date, options?: { locale?: string }): string {
  const diff = Date.now() - date.getTime()
  const locale = options?.locale ?? 'id'
  const suffix = getSuffix(diff, 'ago', locale)
  return formatRelativeTime(Math.abs(diff), suffix, locale)
}

/**
 * Shows the time remaining until a future date.
 *
 * @param target - The target future date.
 * @param options - Options with locale ('id' by default, 'en' supported).
 * @returns A relative time string.
 */
export function timeRemaining(target: Date, options?: { locale?: string }): string {
  const diff = target.getTime() - Date.now()
  const locale = options?.locale ?? 'id'
  const suffix = getSuffix(diff, 'remaining', locale)
  return formatRelativeTime(Math.abs(diff), suffix, locale)
}

// ─── Duration ────────────────────────────────────────────────────────────────

/**
 * Represents a duration split into calendar and time components.
 */
export interface Duration {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

/**
 * Formats a Duration object into a human-readable string.
 *
 * @example
 * formatDuration({ hours: 2, minutes: 30, seconds: 15 }) // "2 jam 30 menit 15 detik"
 * formatDuration({ hours: 2, minutes: 30 }, { locale: 'en' }) // "2 hours 30 minutes"
 *
 * @param duration - The duration to format.
 * @param options - Options with locale ('id' by default, 'en' supported).
 * @returns A formatted duration string.
 */
export function formatDuration(duration: Duration, options?: { locale?: string }): string {
  const locale = options?.locale ?? 'id'
  const labels = LOCALE_LABELS[locale] ?? LOCALE_LABELS.id!

  const parts: string[] = []
  const entries: [keyof Duration, number][] = [
    ['years', duration.years],
    ['months', duration.months],
    ['days', duration.days],
    ['hours', duration.hours],
    ['minutes', duration.minutes],
    ['seconds', duration.seconds],
  ]

  for (const [key, value] of entries) {
    if (value > 0) {
      const label = value === 1 ? labels[key].single : labels[key].plural
      parts.push(`${value} ${label}`)
    }
  }

  if (parts.length === 0) {
    const label = labels.seconds.plural
    return `0 ${label}`
  }

  return parts.join(' ')
}

// ─── Timezone Helpers ────────────────────────────────────────────────────────

/** UTC+7 — Western Indonesia Time (WIB). */
export const TIMEZONE_WIB = 7

/** UTC+8 — Central Indonesia Time (WITA). */
export const TIMEZONE_WITA = 8

/** UTC+9 — Eastern Indonesia Time (WIT). */
export const TIMEZONE_WIT = 9

/**
 * Converts a date to a specific timezone offset by returning a new Date whose
 * local-time getters (getHours, getMinutes etc.) reflect the target timezone.
 *
 * @param date - The source date.
 * @param offsetHours - The timezone offset in hours (e.g. 7 for WIB).
 * @returns A new Date adjusted to the target timezone.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function toTimezone(date: Date, offsetHours: number): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000
  return new Date(utcMs + offsetHours * 3600000)
}

/**
 * Formats a date in a specific timezone using `formatDate` tokens.
 *
 * @param date - The source date.
 * @param format - The format string (see `formatDate` for supported tokens).
 * @param offsetHours - The timezone offset in hours.
 * @returns The formatted date string.
 */
export function formatInTimezone(date: Date, format: string, offsetHours: number): string {
  return formatDate(toTimezone(date, offsetHours), format)
}
