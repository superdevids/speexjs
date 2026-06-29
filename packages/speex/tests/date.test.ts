import { describe, it, expect } from 'vitest'
import {
  formatDate,
  parseDate,
  dateDiff,
  addDays,
  addMonths,
  addYears,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWeekend,
  isLeapYear,
  isBefore,
  isAfter,
  isBetween,
  isBusinessDay,
  addBusinessDays,
  calculateAge,
  InvalidDateError,
  timeAgo,
  timeRemaining,
  formatDuration,
  toTimezone,
  formatInTimezone,
  isToday,
  isYesterday,
  isTomorrow,
  isPast,
  isFuture,
  isSameDay,
  daysInMonth,
  dayOfYear,
  weekOfYear,
  quarter,
  maxDate,
  minDate,
  parseDuration,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  lastMonday,
  lastTuesday,
  lastWednesday,
  lastThursday,
  lastFriday,
  lastSaturday,
  lastSunday,
} from '../src/date/index.js'

describe('formatDate', () => {
  const date = new Date(2024, 0, 15, 14, 30, 45, 123)

  it('formats with default YYYY-MM-DD', () => {
    expect(formatDate(date)).toBe('2024-01-15')
  })

  it('formats with DD/MM/YYYY', () => {
    expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2024')
  })

  it('formats with HH:mm:ss', () => {
    expect(formatDate(date, 'HH:mm:ss')).toBe('14:30:45')
  })

  it('formats with full month name', () => {
    expect(formatDate(date, 'DD MMMM YYYY')).toBe('15 January 2024')
  })

  it('formats with abbreviated month name', () => {
    expect(formatDate(date, 'DD MMM YYYY')).toBe('15 Jan 2024')
  })

  it('formats with milliseconds', () => {
    expect(formatDate(date, 'HH:mm:ss.SSS')).toBe('14:30:45.123')
  })
})

describe('parseDate', () => {
  it('parses ISO date string', () => {
    const result = parseDate('2024-01-15')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(15)
  })

  it('parses ISO datetime string', () => {
    const result = parseDate('2024-01-15T14:30:00')
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(30)
  })

  it('parses DD/MM/YYYY format', () => {
    const result = parseDate('15/01/2024')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(15)
  })

  it('parses DD-MM-YYYY format', () => {
    const result = parseDate('15-01-2024')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(15)
  })

  it('parses DD MMM YYYY format', () => {
    const result = parseDate('15 Jan 2024')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(15)
  })

  it('parses timestamp number', () => {
    const ts = new Date(2024, 0, 15).getTime()
    const result = parseDate(ts)
    expect(result.getTime()).toBe(ts)
  })

  it('parses Date object and returns a copy', () => {
    const original = new Date(2024, 0, 15)
    const result = parseDate(original)
    expect(result).toEqual(original)
    expect(result).not.toBe(original)
  })

  it('throws InvalidDateError for invalid input', () => {
    expect(() => parseDate('not-a-date')).toThrow(InvalidDateError)
    expect(() => parseDate('')).toThrow(InvalidDateError)
  })

  it('throws InvalidDateError for invalid Date object', () => {
    expect(() => parseDate(new Date('invalid'))).toThrow(InvalidDateError)
  })
})

describe('dateDiff', () => {
  it('computes difference for same day', () => {
    const d1 = new Date(2024, 0, 15, 10, 0, 0)
    const d2 = new Date(2024, 0, 15, 12, 30, 45)
    const diff = dateDiff(d1, d2)
    expect(diff.years).toBe(0)
    expect(diff.months).toBe(0)
    expect(diff.days).toBe(0)
    expect(diff.hours).toBe(2)
    expect(diff.minutes).toBe(30)
    expect(diff.seconds).toBe(45)
  })

  it('computes difference across months', () => {
    const d1 = new Date(2024, 0, 15)
    const d2 = new Date(2024, 2, 20)
    const diff = dateDiff(d1, d2)
    expect(diff.months).toBe(2)
    expect(diff.days).toBe(5)
  })

  it('computes difference across years', () => {
    const d1 = new Date(2020, 0, 1)
    const d2 = new Date(2024, 0, 1)
    const diff = dateDiff(d1, d2)
    expect(diff.years).toBe(4)
  })

  it('throws InvalidDateError for invalid dates', () => {
    expect(() => dateDiff(new Date('invalid'), new Date())).toThrow(InvalidDateError)
    expect(() => dateDiff(new Date(), new Date('invalid'))).toThrow(InvalidDateError)
  })
})

describe('addDays', () => {
  it('adds days', () => {
    const date = new Date(2024, 0, 15)
    const result = addDays(date, 10)
    expect(result.getDate()).toBe(25)
  })

  it('subtracts days with negative', () => {
    const date = new Date(2024, 0, 15)
    const result = addDays(date, -5)
    expect(result.getDate()).toBe(10)
  })

  it('does not mutate the original date', () => {
    const date = new Date(2024, 0, 15)
    const result = addDays(date, 1)
    expect(result).not.toBe(date)
    expect(date.getDate()).toBe(15)
  })
})

describe('addMonths', () => {
  it('adds months', () => {
    const date = new Date(2024, 0, 15)
    const result = addMonths(date, 2)
    expect(result.getMonth()).toBe(2)
  })

  it('handles month-end overflow (Jan 31 + 1 month)', () => {
    const date = new Date(2024, 0, 31)
    const result = addMonths(date, 1)
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(29)
  })

  it('subtracts months', () => {
    const date = new Date(2024, 5, 15)
    const result = addMonths(date, -3)
    expect(result.getMonth()).toBe(2)
  })
})

describe('addYears', () => {
  it('adds years', () => {
    const date = new Date(2024, 0, 15)
    const result = addYears(date, 5)
    expect(result.getFullYear()).toBe(2029)
  })

  it('handles leap year overflow (Feb 29 + 1 year)', () => {
    const date = new Date(2024, 1, 29)
    const result = addYears(date, 1)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(2)
    expect(result.getDate()).toBe(1)
  })

  it('subtracts years', () => {
    const date = new Date(2024, 0, 15)
    const result = addYears(date, -10)
    expect(result.getFullYear()).toBe(2014)
  })
})

describe('startOfDay / endOfDay', () => {
  it('startOfDay sets time to 00:00:00.000', () => {
    const date = new Date(2024, 0, 15, 14, 30, 45, 123)
    const result = startOfDay(date)
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(15)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('endOfDay sets time to 23:59:59.999', () => {
    const date = new Date(2024, 0, 15, 14, 30, 45, 123)
    const result = endOfDay(date)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
    expect(result.getSeconds()).toBe(59)
    expect(result.getMilliseconds()).toBe(999)
  })
})

describe('startOfMonth / endOfMonth', () => {
  it('startOfMonth returns first day', () => {
    const date = new Date(2024, 5, 15)
    const result = startOfMonth(date)
    expect(result.getDate()).toBe(1)
    expect(result.getHours()).toBe(0)
  })

  it('endOfMonth returns last day', () => {
    const date = new Date(2024, 0, 15)
    const result = endOfMonth(date)
    expect(result.getDate()).toBe(31)
    expect(result.getHours()).toBe(23)
  })
})

describe('startOfYear / endOfYear', () => {
  it('startOfYear returns Jan 1', () => {
    const date = new Date(2024, 5, 15)
    const result = startOfYear(date)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(1)
    expect(result.getHours()).toBe(0)
  })

  it('endOfYear returns Dec 31', () => {
    const date = new Date(2024, 5, 15)
    const result = endOfYear(date)
    expect(result.getMonth()).toBe(11)
    expect(result.getDate()).toBe(31)
    expect(result.getHours()).toBe(23)
  })
})

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    expect(isWeekend(new Date(2024, 0, 6))).toBe(true)
  })

  it('returns true for Sunday', () => {
    expect(isWeekend(new Date(2024, 0, 7))).toBe(true)
  })

  it('returns false for Monday', () => {
    expect(isWeekend(new Date(2024, 0, 1))).toBe(false)
  })
})

describe('isLeapYear', () => {
  it('returns true for leap year', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2000)).toBe(true)
  })

  it('returns false for non-leap year', () => {
    expect(isLeapYear(2023)).toBe(false)
    expect(isLeapYear(1900)).toBe(false)
  })
})

describe('isBefore / isAfter / isBetween', () => {
  it('isBefore returns true when date1 < date2', () => {
    expect(isBefore(new Date(2024, 0, 1), new Date(2024, 0, 15))).toBe(true)
  })

  it('isBefore returns false when date1 >= date2', () => {
    expect(isBefore(new Date(2024, 0, 15), new Date(2024, 0, 1))).toBe(false)
  })

  it('isAfter returns true when date1 > date2', () => {
    expect(isAfter(new Date(2024, 0, 15), new Date(2024, 0, 1))).toBe(true)
  })

  it('isBetween returns true when date is in range', () => {
    expect(isBetween(
      new Date(2024, 0, 10),
      new Date(2024, 0, 1),
      new Date(2024, 0, 31)
    )).toBe(true)
  })

  it('isBetween includes start and end', () => {
    expect(isBetween(
      new Date(2024, 0, 1),
      new Date(2024, 0, 1),
      new Date(2024, 0, 31)
    )).toBe(true)
    expect(isBetween(
      new Date(2024, 0, 31),
      new Date(2024, 0, 1),
      new Date(2024, 0, 31)
    )).toBe(true)
  })

  it('isBetween returns false when date is outside', () => {
    expect(isBetween(
      new Date(2023, 11, 31),
      new Date(2024, 0, 1),
      new Date(2024, 0, 31)
    )).toBe(false)
  })
})

describe('isBusinessDay', () => {
  it('returns true for Monday-Friday', () => {
    expect(isBusinessDay(new Date(2024, 0, 1))).toBe(true)
    expect(isBusinessDay(new Date(2024, 0, 5))).toBe(true)
  })

  it('returns false for weekend', () => {
    expect(isBusinessDay(new Date(2024, 0, 6))).toBe(false)
    expect(isBusinessDay(new Date(2024, 0, 7))).toBe(false)
  })
})

describe('addBusinessDays', () => {
  it('adds business days skipping weekends', () => {
    const date = new Date(2024, 0, 4)
    const result = addBusinessDays(date, 1)
    expect(result.getDay()).toBe(5)
    expect(result.getDate()).toBe(5)
  })

  it('handles negative business days', () => {
    const date = new Date(2024, 0, 8)
    const result = addBusinessDays(date, -1)
    expect(result.getDay()).toBe(5)
  })
})

describe('calculateAge', () => {
  it('calculates age from birth date', () => {
    const birthDate = new Date(1990, 5, 15)
    const age = calculateAge(birthDate)
    expect(age).toBeGreaterThanOrEqual(34)
  })

  it('throws InvalidDateError for invalid date', () => {
    expect(() => calculateAge(new Date('invalid'))).toThrow(InvalidDateError)
  })
})

describe('formatDate (additional tokens)', () => {
  const d = new Date(2024, 0, 15, 14, 30, 45, 123)

  it('formats YY token', () => {
    expect(formatDate(d, 'YY')).toBe('24')
  })

  it('formats SSS token', () => {
    expect(formatDate(d, 'SSS')).toBe('123')
  })
})

describe('isBefore / isAfter (edge cases)', () => {
  it('isBefore returns false when dates are equal', () => {
    const d = new Date(2024, 0, 15)
    expect(isBefore(d, d)).toBe(false)
  })

  it('isAfter returns false when dates are equal', () => {
    const d = new Date(2024, 0, 15)
    expect(isAfter(d, d)).toBe(false)
  })
})

describe('isBetween (exclusive)', () => {
  it('returns true when date is strictly between', () => {
    expect(isBetween(
      new Date(2024, 0, 10),
      new Date(2024, 0, 1),
      new Date(2024, 0, 31)
    )).toBe(true)
  })
})

describe('isBusinessDay (additional)', () => {
  it('Monday returns true', () => {
    // 2024-01-01 is a Monday
    expect(isBusinessDay(new Date(2024, 0, 1))).toBe(true)
  })
})

describe('addBusinessDays (additional)', () => {
  it('negative days go backward skipping weekends', () => {
    // Fri Jan 5 - 1 business day = Thu Jan 4
    const date = new Date(2024, 0, 5)
    const result = addBusinessDays(date, -1)
    expect(result.getDay()).toBe(4)
    expect(result.getDate()).toBe(4)
  })
})

describe('timeAgo / timeRemaining', () => {
  it('timeAgo returns seconds for recent past', () => {
    const result = timeAgo(new Date(Date.now() - 5000), { locale: 'en' })
    expect(result).toMatch(/5 seconds? ago/)
  })

  it('timeAgo returns hours', () => {
    const result = timeAgo(new Date(Date.now() - 3600000), { locale: 'en' })
    expect(result).toMatch(/1 hour ago/)
  })

  it('timeRemaining with locale en', () => {
    const result = timeRemaining(new Date(Date.now() + 60000), { locale: 'en' })
    expect(result).toMatch(/1 minute remaining/)
  })
})

describe('formatDuration', () => {
  it('formats with all units', () => {
    const result = formatDuration({ years: 1, months: 2, days: 3, hours: 4, minutes: 5, seconds: 6 })
    expect(result).toBe('1 year 2 months 3 days 4 hours 5 minutes 6 seconds')
  })

  it('returns 0 seconds for empty duration', () => {
    const result = formatDuration({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })
    expect(result).toBe('0 seconds')
  })

  it('formats with locale id', () => {
    const result = formatDuration({ hours: 2, minutes: 30 }, { locale: 'id' })
    expect(result).toBe('2 jam 30 menit')
  })
})

describe('toTimezone / formatInTimezone', () => {
  it('toTimezone converts to different timezone', () => {
    const d = new Date('2024-01-15T12:00:00Z')
    // UTC+7 (WIB)
    const converted = toTimezone(d, 7)
    expect(converted.getHours()).toBe(19)
  })

  it('formatInTimezone formats in timezone', () => {
    const d = new Date('2024-01-15T12:00:00Z')
    const formatted = formatInTimezone(d, 'HH:mm', 7)
    expect(formatted).toBe('19:00')
  })
})

describe('isToday / isYesterday / isTomorrow', () => {
  it('isToday returns true for today', () => {
    expect(isToday(new Date())).toBe(true)
  })

  it('isToday returns false for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isToday(yesterday)).toBe(false)
  })

  it('isYesterday returns true for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isYesterday(yesterday)).toBe(true)
  })

  it('isTomorrow returns true for tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isTomorrow(tomorrow)).toBe(true)
  })
})

describe('isPast / isFuture', () => {
  it('isPast returns true for past date', () => {
    expect(isPast(new Date('2020-01-01'))).toBe(true)
  })

  it('isFuture returns true for future date', () => {
    expect(isFuture(new Date('2099-01-01'))).toBe(true)
  })
})

describe('isSameDay', () => {
  it('same day returns true', () => {
    expect(isSameDay(new Date('2024-01-15'), new Date('2024-01-15'))).toBe(true)
  })

  it('different day returns false', () => {
    expect(isSameDay(new Date('2024-01-15'), new Date('2024-01-16'))).toBe(false)
  })
})

describe('daysInMonth', () => {
  it('February in leap year returns 29', () => {
    expect(daysInMonth(new Date('2024-02-01'))).toBe(29)
  })

  it('February in non-leap year returns 28', () => {
    expect(daysInMonth(new Date('2023-02-01'))).toBe(28)
  })
})

describe('dayOfYear', () => {
  it('Jan 1 returns 1', () => {
    expect(dayOfYear(new Date('2024-01-01'))).toBe(1)
  })

  it('Feb 1 returns 32', () => {
    expect(dayOfYear(new Date('2024-02-01'))).toBe(32)
  })
})

describe('weekOfYear', () => {
  it('returns correct week number', () => {
    // 2024-01-01 is ISO week 1
    const w = weekOfYear(new Date('2024-01-01'))
    expect(w).toBeGreaterThanOrEqual(1)
    expect(w).toBeLessThanOrEqual(53)
  })
})

describe('quarter', () => {
  it('Q1 returns 1', () => expect(quarter(new Date('2024-02-01'))).toBe(1))
  it('Q2 returns 2', () => expect(quarter(new Date('2024-05-01'))).toBe(2))
  it('Q3 returns 3', () => expect(quarter(new Date('2024-08-01'))).toBe(3))
  it('Q4 returns 4', () => expect(quarter(new Date('2024-11-01'))).toBe(4))
})

describe('maxDate / minDate', () => {
  it('maxDate returns the latest date', () => {
    const d1 = new Date('2024-01-01')
    const d2 = new Date('2025-01-01')
    expect(maxDate([d1, d2]).getFullYear()).toBe(2025)
  })

  it('minDate returns the earliest date', () => {
    const d1 = new Date('2024-01-01')
    const d2 = new Date('2025-01-01')
    expect(minDate([d1, d2]).getFullYear()).toBe(2024)
  })

  it('maxDate throws on empty array', () => {
    expect(() => maxDate([])).toThrow('requires at least one date')
  })

  it('minDate throws on empty array', () => {
    expect(() => minDate([])).toThrow('requires at least one date')
  })
})

describe('parseDuration', () => {
  it('parses 1h30m', () => {
    expect(parseDuration('1h30m')).toBe(5400000)
  })

  it('parses 2d', () => {
    expect(parseDuration('2d')).toBe(172800000)
  })

  it('parses 1w', () => {
    expect(parseDuration('1w')).toBe(604800000)
  })

  it('returns 0 for empty string', () => {
    expect(parseDuration('')).toBe(0)
  })
})

describe('nextMonday through nextSunday', () => {
  const wed = new Date('2024-01-03') // Wednesday

  it('nextMonday', () => {
    const d = nextMonday(wed)
    expect(d.getDay()).toBe(1)
    expect(d.getDate()).toBe(8)
  })

  it('nextTuesday', () => {
    const d = nextTuesday(wed)
    expect(d.getDay()).toBe(2)
    expect(d.getDate()).toBe(9)
  })

  it('nextWednesday', () => {
    const d = nextWednesday(wed)
    expect(d.getDay()).toBe(3)
    expect(d.getDate()).toBe(10)
  })

  it('nextThursday', () => {
    const d = nextThursday(wed)
    expect(d.getDay()).toBe(4)
    expect(d.getDate()).toBe(4)
  })

  it('nextFriday', () => {
    const d = nextFriday(wed)
    expect(d.getDay()).toBe(5)
    expect(d.getDate()).toBe(5)
  })

  it('nextSaturday', () => {
    const d = nextSaturday(wed)
    expect(d.getDay()).toBe(6)
    expect(d.getDate()).toBe(6)
  })

  it('nextSunday', () => {
    const d = nextSunday(wed)
    expect(d.getDay()).toBe(0)
    expect(d.getDate()).toBe(7)
  })
})

describe('lastMonday through lastSunday', () => {
  const wed = new Date('2024-01-03') // Wednesday

  it('lastMonday', () => {
    const d = lastMonday(wed)
    expect(d.getDay()).toBe(1)
    expect(d.getDate()).toBe(1)
  })

  it('lastTuesday', () => {
    const d = lastTuesday(wed)
    expect(d.getDay()).toBe(2)
    expect(d.getDate()).toBe(2)
  })

  it('lastWednesday', () => {
    const d = lastWednesday(wed)
    expect(d.getDay()).toBe(3)
    expect(d.getDate()).toBe(27)
  })

  it('lastThursday', () => {
    const d = lastThursday(wed)
    expect(d.getDay()).toBe(4)
    expect(d.getDate()).toBe(28)
  })

  it('lastFriday', () => {
    const d = lastFriday(wed)
    expect(d.getDay()).toBe(5)
    expect(d.getDate()).toBe(29)
  })

  it('lastSaturday', () => {
    const d = lastSaturday(wed)
    expect(d.getDay()).toBe(6)
    expect(d.getDate()).toBe(30)
  })

  it('lastSunday', () => {
    const d = lastSunday(wed)
    expect(d.getDay()).toBe(0)
    expect(d.getDate()).toBe(31)
  })
})
