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
