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
 * - `YYYY` â€” 4-digit year
 * - `YY` â€” 2-digit year
 * - `MMMM` â€” full month name
 * - `MMM` â€” abbreviated month name
 * - `MM` â€” 2-digit month (01â€“12)
 * - `DD` â€” 2-digit day (01â€“31)
 * - `HH` â€” 2-digit hours (00â€“23)
 * - `mm` â€” 2-digit minutes
 * - `ss` â€” 2-digit seconds
 * - `SSS` â€” milliseconds
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

// â”€â”€â”€ Time Ago & Time Remaining â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    return locale === 'id' ? 'yang lalu' : 'ago'
  }
  if (kind === 'remaining') {
    return locale === 'id' ? 'lagi' : 'remaining'
  }
  return locale === 'id' ? 'yang lalu' : 'ago'
}

function formatRelativeTime(absDiffMs: number, suffix: string, locale: string): string {
  const labels = LOCALE_LABELS[locale] ?? LOCALE_LABELS.en!

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
 * Returns a human-readable relative time string (e.g. "5 minutes ago").
 *
 * @param date - The past date.
 * @param options - Options with locale ('en' by default, 'id' supported).
 * @returns A relative time string.
 */
export function timeAgo(date: Date, options?: { locale?: string }): string {
  const diff = Date.now() - date.getTime()
  const locale = options?.locale ?? 'en'
  const suffix = getSuffix(diff, 'ago', locale)
  return formatRelativeTime(Math.abs(diff), suffix, locale)
}

/**
 * Shows the time remaining until a future date.
 *
 * @param target - The target future date.
 * @param options - Options with locale ('en' by default, 'id' supported).
 * @returns A relative time string.
 */
export function timeRemaining(target: Date, options?: { locale?: string }): string {
  const diff = target.getTime() - Date.now()
  const locale = options?.locale ?? 'en'
  const suffix = getSuffix(diff, 'remaining', locale)
  return formatRelativeTime(Math.abs(diff), suffix, locale)
}

// â”€â”€â”€ Duration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
 * formatDuration({ hours: 2, minutes: 30, seconds: 15 }) // "2 hours 30 minutes 15 seconds"
 * formatDuration({ hours: 2, minutes: 30 }, { locale: 'id' }) // "2 jam 30 menit"
 *
 * @param duration - The duration to format.
 * @param options - Options with locale ('en' by default, 'id' supported).
 * @returns A formatted duration string.
 */
export function formatDuration(duration: Duration, options?: { locale?: string }): string {
  const locale = options?.locale ?? 'en'
  const labels = LOCALE_LABELS[locale] ?? LOCALE_LABELS.en!

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

// â”€â”€â”€ Timezone Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Comparison Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Checks if a date is today.
 *
 * @param date - The date to check.
 * @returns Whether the date is today.
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * isToday(new Date()) // true
 */
export function isToday(date: Date): boolean {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

/**
 * Checks if a date is yesterday.
 *
 * @param date - The date to check.
 * @returns Whether the date is yesterday.
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * isYesterday(new Date(Date.now() - 86400000)) // true
 */
export function isYesterday(date: Date): boolean {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  )
}

/**
 * Checks if a date is tomorrow.
 *
 * @param date - The date to check.
 * @returns Whether the date is tomorrow.
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * isTomorrow(new Date(Date.now() + 86400000)) // true
 */
export function isTomorrow(date: Date): boolean {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  )
}

/**
 * Checks if a date is in the past (before now).
 *
 * @param date - The date to check.
 * @returns Whether the date is in the past.
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * isPast(new Date('2020-01-01')) // true
 */
export function isPast(date: Date): boolean {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  return date.getTime() < Date.now()
}

/**
 * Checks if a date is in the future (after now).
 *
 * @param date - The date to check.
 * @returns Whether the date is in the future.
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * isFuture(new Date('2099-01-01')) // true
 */
export function isFuture(date: Date): boolean {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  return date.getTime() > Date.now()
}

/**
 * Checks if two dates fall on the same calendar day.
 *
 * @param date1 - First date.
 * @param date2 - Second date.
 * @returns Whether the dates are the same day.
 * @throws {InvalidDateError} If either date is invalid.
 *
 * @example
 * isSameDay(new Date('2024-01-01'), new Date('2024-01-01')) // true
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  if (!isValidDate(date1) || !isValidDate(date2)) {
    throw new InvalidDateError('Invalid date provided to isSameDay')
  }
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Returns the number of days in the month of the given date.
 *
 * @param date - The date.
 * @returns Number of days in the month (28â€“31).
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * daysInMonth(new Date('2024-02-01')) // 29 (leap year)
 */
export function daysInMonth(date: Date): number {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * Returns the day of the year (1â€“366).
 *
 * @param date - The date.
 * @returns Day of the year (1-indexed).
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * dayOfYear(new Date('2024-01-01')) // 1
 */
export function dayOfYear(date: Date): number {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / MS_IN_DAY)
}

/**
 * Returns the ISO week number (1â€“53).
 *
 * The algorithm uses the Thursday of the same week as the reference
 * to determine which year the week belongs to, per ISO 8601.
 *
 * @param date - The date.
 * @returns The ISO week number.
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * weekOfYear(new Date('2024-01-01')) // 1
 */
export function weekOfYear(date: Date): number {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return weekNum
}

/**
 * Returns the quarter of the year (1â€“4).
 *
 * @param date - The date.
 * @returns The quarter (1 for Janâ€“Mar, 2 for Aprâ€“Jun, etc.).
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * quarter(new Date('2024-04-01')) // 2
 */
export function quarter(date: Date): number {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  return Math.floor(date.getMonth() / 3) + 1
}

/**
 * Returns the latest (maximum) date from an array of dates.
 *
 * @param dates - Array of Date objects.
 * @returns The latest date.
 * @throws {Error} If the array is empty.
 * @throws {InvalidDateError} If any date is invalid.
 *
 * @example
 * maxDate([new Date('2024-01-01'), new Date('2025-01-01')]) // 2025-01-01
 */
export function maxDate(dates: Date[]): Date {
  if (dates.length === 0) throw new Error('maxDate requires at least one date')
  const ms = Math.max(...dates.map(d => {
    if (!isValidDate(d)) throw new InvalidDateError(d)
    return d.getTime()
  }))
  return new Date(ms)
}

/**
 * Returns the earliest (minimum) date from an array of dates.
 *
 * @param dates - Array of Date objects.
 * @returns The earliest date.
 * @throws {Error} If the array is empty.
 * @throws {InvalidDateError} If any date is invalid.
 *
 * @example
 * minDate([new Date('2024-01-01'), new Date('2025-01-01')]) // 2024-01-01
 */
export function minDate(dates: Date[]): Date {
  if (dates.length === 0) throw new Error('minDate requires at least one date')
  const ms = Math.min(...dates.map(d => {
    if (!isValidDate(d)) throw new InvalidDateError(d)
    return d.getTime()
  }))
  return new Date(ms)
}

// â”€â”€â”€ Weekday Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getNextWeekday(date: Date, targetDay: number): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const result = new Date(date)
  const currentDay = result.getDay()
  let diff = targetDay - currentDay
  if (diff <= 0) diff += 7
  result.setDate(result.getDate() + diff)
  return result
}

function getLastWeekday(date: Date, targetDay: number): Date {
  if (!isValidDate(date)) throw new InvalidDateError(date)
  const result = new Date(date)
  const currentDay = result.getDay()
  let diff = currentDay - targetDay
  if (diff <= 0) diff += 7
  result.setDate(result.getDate() - diff)
  return result
}

/**
 * Returns the next Monday from the given date.
 *
 * @param date - Reference date.
 * @returns The next Monday.
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * nextMonday(new Date('2024-01-01')) // 2024-01-08 (Monday)
 */
export function nextMonday(date: Date): Date { return getNextWeekday(date, 1) }

/**
 * Returns the next Tuesday from the given date.
 *
 * @param date - Reference date.
 * @returns The next Tuesday.
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * nextTuesday(new Date('2024-01-01')) // 2024-01-02 (Tuesday)
 */
export function nextTuesday(date: Date): Date { return getNextWeekday(date, 2) }

/**
 * Returns the next Wednesday from the given date.
 *
 * @param date - Reference date.
 * @returns The next Wednesday.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function nextWednesday(date: Date): Date { return getNextWeekday(date, 3) }

/**
 * Returns the next Thursday from the given date.
 *
 * @param date - Reference date.
 * @returns The next Thursday.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function nextThursday(date: Date): Date { return getNextWeekday(date, 4) }

/**
 * Returns the next Friday from the given date.
 *
 * @param date - Reference date.
 * @returns The next Friday.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function nextFriday(date: Date): Date { return getNextWeekday(date, 5) }

/**
 * Returns the next Saturday from the given date.
 *
 * @param date - Reference date.
 * @returns The next Saturday.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function nextSaturday(date: Date): Date { return getNextWeekday(date, 6) }

/**
 * Returns the next Sunday from the given date.
 *
 * @param date - Reference date.
 * @returns The next Sunday.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function nextSunday(date: Date): Date { return getNextWeekday(date, 0) }

/**
 * Returns the last (previous) Monday from the given date.
 *
 * @param date - Reference date.
 * @returns The last Monday.
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * lastMonday(new Date('2024-01-03')) // 2024-01-01 (Monday)
 */
export function lastMonday(date: Date): Date { return getLastWeekday(date, 1) }

/**
 * Returns the last (previous) Tuesday from the given date.
 *
 * @param date - Reference date.
 * @returns The last Tuesday.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function lastTuesday(date: Date): Date { return getLastWeekday(date, 2) }

/**
 * Returns the last (previous) Wednesday from the given date.
 *
 * @param date - Reference date.
 * @returns The last Wednesday.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function lastWednesday(date: Date): Date { return getLastWeekday(date, 3) }

/**
 * Returns the last (previous) Thursday from the given date.
 *
 * @param date - Reference date.
 * @returns The last Thursday.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function lastThursday(date: Date): Date { return getLastWeekday(date, 4) }

/**
 * Returns the last (previous) Friday from the given date.
 *
 * @param date - Reference date.
 * @returns The last Friday.
 * @throws {InvalidDateError} If the input date is invalid.
 *
 * @example
 * lastFriday(new Date('2024-01-03')) // 2023-12-29 (Friday)
 */
export function lastFriday(date: Date): Date { return getLastWeekday(date, 5) }

/**
 * Returns the last (previous) Saturday from the given date.
 *
 * @param date - Reference date.
 * @returns The last Saturday.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function lastSaturday(date: Date): Date { return getLastWeekday(date, 6) }

/**
 * Returns the last (previous) Sunday from the given date.
 *
 * @param date - Reference date.
 * @returns The last Sunday.
 * @throws {InvalidDateError} If the input date is invalid.
 */
export function lastSunday(date: Date): Date { return getLastWeekday(date, 0) }

// â”€â”€â”€ Duration Parsing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Parses a human-readable duration string into milliseconds.
 *
 * Supported units:
 * - `w` â€” weeks
 * - `d` â€” days
 * - `h` â€” hours
 * - `m` â€” minutes
 * - `s` â€” seconds
 *
 * @param input - Duration string (e.g. `"1h30m"`, `"2d"`, `"1w2d6h"`).
 * @returns Total milliseconds.
 *
 * @example
 * parseDuration('1h30m') // 5400000
 * parseDuration('2d') // 172800000
 * parseDuration('1w') // 604800000
 */
export function parseDuration(input: string): number {
  const regex = /(\d+)\s*([wdhms])/g
  let ms = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(input)) !== null) {
    const val = parseInt(match[1]!, 10)
    switch (match[2]) {
      case 'w': ms += val * 7 * MS_IN_DAY; break
      case 'd': ms += val * MS_IN_DAY; break
      case 'h': ms += val * MS_IN_HOUR; break
      case 'm': ms += val * MS_IN_MINUTE; break
      case 's': ms += val * MS_IN_SECOND; break
    }
  }
  return ms
}

export function addHours(date:Date,hours:number):Date{if(!isValidDate(date))throw new InvalidDateError(date);const r=new Date(date.getTime());r.setHours(r.getHours()+hours);return r}
export function addMinutes(date:Date,minutes:number):Date{if(!isValidDate(date))throw new InvalidDateError(date);const r=new Date(date.getTime());r.setMinutes(r.getMinutes()+minutes);return r}
export function addSeconds(date:Date,seconds:number):Date{if(!isValidDate(date))throw new InvalidDateError(date);const r=new Date(date.getTime());r.setSeconds(r.getSeconds()+seconds);return r}
export function subDays(date:Date,days:number):Date{return addDays(date,-days)}
export function subMonths(date:Date,months:number):Date{return addMonths(date,-months)}
export function subYears(date:Date,years:number):Date{return addYears(date,-years)}
export function isEqual(date1:Date,date2:Date):boolean{if(!isValidDate(date1)||!isValidDate(date2))throw new InvalidDateError("isEqual");return date1.getTime()===date2.getTime()}
export function unix(date:Date):number{if(!isValidDate(date))throw new InvalidDateError(date);return Math.floor(date.getTime()/1000)}
export function fromUnix(timestamp:number):Date{return new Date(timestamp*1000)}
export function startOfWeek(date:Date,options?:{weekStartsOn?:number}):Date{if(!isValidDate(date))throw new InvalidDateError(date);const ws=options?.weekStartsOn??0;const d=date.getDay();const diff=(d-ws+7)%7;const r=new Date(date.getTime());r.setDate(r.getDate()-diff);return startOfDay(r)}
export function endOfWeek(date:Date,options?:{weekStartsOn?:number}):Date{if(!isValidDate(date))throw new InvalidDateError(date);const ws=options?.weekStartsOn??0;const d=date.getDay();const diff=(ws-d+6)%7;const r=new Date(date.getTime());r.setDate(r.getDate()+diff);return endOfDay(r)}

