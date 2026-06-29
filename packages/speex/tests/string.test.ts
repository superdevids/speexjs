import { describe, it, expect } from 'vitest'
import {
  capitalize,
  camelCase,
  kebabCase,
  snakeCase,
  pascalCase,
  truncate,
  template,
  uuid,
  nanoid,
  escapeHtml,
  unescapeHtml,
  trim,
  trimStart,
  trimEnd,
  pad,
  padStart,
  padEnd,
  reverse,
  words,
  slugify,
  countOccurrences,
  escapeRegExp,
  maskString,
  similarity,
  dedent,
  wordCount,
  swapCase,
  toCobolCase,
  charCount,
  stripHtml,
  truncateWords,
  isPalindrome,
  isAnagram,
  levenshtein,
  fuzzyMatch,
} from '../src/string/index.js'

describe('capitalize', () => {
  it('capitalizes first character and lowercases the rest', () => {
    expect(capitalize('hello')).toBe('Hello')
    expect(capitalize('HELLO')).toBe('Hello')
  })

  it('returns empty string for empty input', () => {
    expect(capitalize('')).toBe('')
  })
})

describe('camelCase', () => {
  it('converts to camelCase', () => {
    expect(camelCase('hello world')).toBe('helloWorld')
    expect(camelCase('Hello-World')).toBe('helloWorld')
    expect(camelCase('hello_world')).toBe('helloWorld')
    expect(camelCase('helloWorld')).toBe('helloWorld')
    expect(camelCase('HELLO WORLD')).toBe('helloWorld')
  })

  it('returns empty string for empty input', () => {
    expect(camelCase('')).toBe('')
  })
})

describe('kebabCase', () => {
  it('converts to kebab-case', () => {
    expect(kebabCase('hello world')).toBe('hello-world')
    expect(kebabCase('HelloWorld')).toBe('hello-world')
    expect(kebabCase('hello_world')).toBe('hello-world')
  })
})

describe('snakeCase', () => {
  it('converts to snake_case', () => {
    expect(snakeCase('hello world')).toBe('hello_world')
    expect(snakeCase('HelloWorld')).toBe('hello_world')
    expect(snakeCase('hello-world')).toBe('hello_world')
  })
})

describe('pascalCase', () => {
  it('converts to PascalCase', () => {
    expect(pascalCase('hello world')).toBe('HelloWorld')
    expect(pascalCase('hello-world')).toBe('HelloWorld')
    expect(pascalCase('hello_world')).toBe('HelloWorld')
    expect(pascalCase('HelloWorld')).toBe('HelloWorld')
  })
})

describe('truncate', () => {
  it('returns original string when shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates with default suffix', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })

  it('truncates with custom suffix', () => {
    expect(truncate('hello world', 7, '--')).toBe('hello--')
  })

  it('handles maxLength smaller than suffix', () => {
    expect(truncate('hello', 2, '...')).toBe('...')
  })
})

describe('template', () => {
  it('interpolates values using {{key}} syntax', () => {
    expect(template('Hello {{name}}', { name: 'world' })).toBe('Hello world')
  })

  it('handles multiple placeholders', () => {
    expect(template('{{a}} + {{b}} = {{c}}', { a: 1, b: 2, c: 3 })).toBe('1 + 2 = 3')
  })

  it('leaves unknown placeholders unchanged', () => {
    expect(template('Hello {{name}}', {})).toBe('Hello {{name}}')
  })
})

describe('uuid', () => {
  it('generates a string in UUID v4 format', () => {
    const id = uuid()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuid()))
    expect(ids.size).toBe(100)
  })
})

describe('nanoid', () => {
  it('generates an ID with default size', () => {
    expect(nanoid()).toHaveLength(21)
  })

  it('generates ID with custom size', () => {
    expect(nanoid(10)).toHaveLength(10)
  })

  it('uses custom alphabet', () => {
    const id = nanoid(10, 'ABC')
    expect(id).toHaveLength(10)
    expect(id).toMatch(/^[ABC]+$/)
  })

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => nanoid()))
    expect(ids.size).toBe(100)
  })
})

describe('escapeHtml / unescapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;')
  })

  it('unescapes HTML entities', () => {
    expect(unescapeHtml('&amp;&lt;&gt;&quot;&#39;')).toBe('&<>"\'')
  })

  it('leaves normal text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
    expect(unescapeHtml('hello world')).toBe('hello world')
  })

  it('round-trips correctly', () => {
    const original = '<p class="test">Hello & goodbye</p>'
    expect(unescapeHtml(escapeHtml(original))).toBe(original)
  })
})

describe('trim / trimStart / trimEnd', () => {
  it('trims whitespace from both ends', () => {
    expect(trim('  hello  ')).toBe('hello')
  })

  it('trims leading whitespace', () => {
    expect(trimStart('  hello  ')).toBe('hello  ')
  })

  it('trims trailing whitespace', () => {
    expect(trimEnd('  hello  ')).toBe('  hello')
  })

  it('handles empty string', () => {
    expect(trim('')).toBe('')
  })
})

describe('pad / padStart / padEnd', () => {
  it('pads both sides', () => {
    expect(pad('hi', 6)).toBe('  hi  ')
  })

  it('pads with custom character', () => {
    expect(pad('hi', 6, '*')).toBe('**hi**')
  })

  it('does not pad when string is already at length', () => {
    expect(pad('hello', 5)).toBe('hello')
  })

  it('padStart pads the start', () => {
    expect(padStart('hi', 4)).toBe('  hi')
  })

  it('padEnd pads the end', () => {
    expect(padEnd('hi', 4)).toBe('hi  ')
  })
})

describe('reverse', () => {
  it('reverses a string', () => {
    expect(reverse('hello')).toBe('olleh')
  })

  it('handles empty string', () => {
    expect(reverse('')).toBe('')
  })

  it('handles unicode characters', () => {
    expect(reverse('abc')).toBe('cba')
  })
})

describe('words', () => {
  it('splits a string into words', () => {
    expect(words('helloWorld')).toEqual(['hello', 'World'])
    expect(words('hello-world')).toEqual(['hello', 'world'])
    expect(words('hello_world')).toEqual(['hello', 'world'])
    expect(words('HelloWorld')).toEqual(['Hello', 'World'])
  })

  it('returns empty array for empty string', () => {
    expect(words('')).toEqual([])
  })
})

describe('slugify', () => {
  it('converts to URL-friendly slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
    expect(slugify('Hello  World')).toBe('hello-world')
    expect(slugify('Hello_World')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify(' -hello world- ')).toBe('hello-world')
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })
})

describe('countOccurrences', () => {
  it('counts occurrences of a substring', () => {
    expect(countOccurrences('hello hello world', 'hello')).toBe(2)
  })

  it('returns 0 for substring not found', () => {
    expect(countOccurrences('hello', 'xyz')).toBe(0)
  })

  it('returns 0 for empty string or empty substring', () => {
    expect(countOccurrences('', 'a')).toBe(0)
    expect(countOccurrences('hello', '')).toBe(0)
  })

  it('counts non-overlapping occurrences', () => {
    expect(countOccurrences('aaaa', 'aa')).toBe(2)
  })
})

describe('escapeRegExp', () => {
  it('escapes dots, parens, slashes', () => {
    expect(escapeRegExp('hello.world')).toBe('hello\\.world')
    expect(escapeRegExp('(test)')).toBe('\\(test\\)')
    expect(escapeRegExp('foo/bar')).toBe('foo\/bar')
  })

  it('escapes all special regex characters', () => {
    expect(escapeRegExp('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\')
  })

  it('leaves normal strings unchanged', () => {
    expect(escapeRegExp('hello123')).toBe('hello123')
  })

  it('handles empty string', () => {
    expect(escapeRegExp('')).toBe('')
  })
})

describe('truncate (additional)', () => {
  it('handles maxLength < suffix length', () => {
    expect(truncate('hello', 2, '...')).toBe('...')
  })

  it('returns original when shorter', () => {
    expect(truncate('hi', 10, '...')).toBe('hi')
  })
})

describe('maskString', () => {
  it('masks with default options', () => {
    expect(maskString('08123456789')).toBe('081*****789')
  })

  it('masks with custom start/end/char', () => {
    expect(maskString('1234567890', { start: 0, end: 4, char: '#' })).toBe('####567890')
  })

  it('returns original when start >= end', () => {
    expect(maskString('hello', { start: 3, end: 2 })).toBe('hello')
  })

  it('returns original when start < 0', () => {
    expect(maskString('hello', { start: -1, end: 2 })).toBe('hello')
  })

  it('handles empty string', () => {
    expect(maskString('')).toBe('')
  })
})

describe('similarity', () => {
  it('identical strings return 1', () => {
    expect(similarity('hello', 'hello')).toBe(1)
  })

  it('completely different strings return 0', () => {
    expect(similarity('abc', 'xyz')).toBe(0)
  })

  it('partially similar strings', () => {
    const s = similarity('hello', 'hallo')
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThan(1)
  })

  it('returns 0 when either string has length < 2', () => {
    expect(similarity('a', 'hello')).toBe(0)
    expect(similarity('hello', 'a')).toBe(0)
    expect(similarity('', 'hello')).toBe(0)
  })

  it('returns 0 for two empty strings', () => {
    expect(similarity('', '')).toBe(1)
  })
})

describe('dedent', () => {
  it('removes common leading whitespace', () => {
    expect(dedent('  hello\n  world')).toBe('hello\nworld')
  })

  it('handles strings with no indent', () => {
    expect(dedent('hello\nworld')).toBe('hello\nworld')
  })

  it('preserves relative indentation', () => {
    expect(dedent('    foo\n      bar')).toBe('foo\n  bar')
  })

  it('handles empty string', () => {
    expect(dedent('')).toBe('')
  })

  it('ignores blank lines', () => {
    expect(dedent('  hello\n\n  world')).toBe('hello\n\nworld')
  })
})

describe('wordCount', () => {
  it('counts words in a string', () => {
    expect(wordCount('hello world')).toBe(2)
  })

  it('handles punctuation', () => {
    expect(wordCount('  hello   world! ')).toBe(2)
  })

  it('returns 0 for empty string', () => {
    expect(wordCount('')).toBe(0)
  })
})

describe('swapCase', () => {
  it('swaps case of mixed characters', () => {
    expect(swapCase('Hello World')).toBe('hELLO wORLD')
  })

  it('leaves numbers unchanged', () => {
    expect(swapCase('ABC123')).toBe('abc123')
  })

  it('handles empty string', () => {
    expect(swapCase('')).toBe('')
  })
})

describe('toCobolCase', () => {
  it('converts to COBOL case', () => {
    expect(toCobolCase('helloWorld')).toBe('HELLO_WORLD')
    expect(toCobolCase('getUserByID')).toBe('GET_USER_BY_ID')
    expect(toCobolCase('hello world')).toBe('HELLO_WORLD')
  })

  it('handles empty string', () => {
    expect(toCobolCase('')).toBe('')
  })
})

describe('charCount', () => {
  it('counts characters', () => {
    expect(charCount('hello')).toEqual({ h: 1, e: 1, l: 2, o: 1 })
  })

  it('returns empty object for empty string', () => {
    expect(charCount('')).toEqual({})
  })

  it('handles unicode characters', () => {
    const result = charCount('café')
    expect(result.c).toBe(1)
    expect(result.a).toBe(1)
    expect(result.f).toBe(1)
    expect(result['é']).toBe(1)
  })
})

describe('slugify (additional)', () => {
  it('removes unicode characters', () => {
    expect(slugify('héllo wörld')).toBe('hllo-wrld')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify(' -hello- ')).toBe('hello')
  })
})

describe('template (additional)', () => {
  it('protects __proto__ key', () => {
    expect(template('{{__proto__}}', { __proto__: 'danger' })).toBe('{{__proto__}}')
  })

  it('protects constructor key', () => {
    expect(template('{{constructor}}', { constructor: 'danger' })).toBe('{{constructor}}')
  })

  it('protects prototype key', () => {
    expect(template('{{prototype}}', { prototype: 'danger' })).toBe('{{prototype}}')
  })
})

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
  })

  it('removes script tag content', () => {
    expect(stripHtml('<script>alert(\"x\")</script>hi')).toBe('alert(\"x\")hi')
  })

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('')
  })
})

describe('truncateWords', () => {
  it('truncates by word count', () => {
    expect(truncateWords('hello world foo bar', 2)).toBe('hello world...')
  })

  it('uses custom suffix', () => {
    expect(truncateWords('hello world foo bar', 2, '…')).toBe('hello world…')
  })

  it('returns original when within word count', () => {
    expect(truncateWords('hello world', 5)).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(truncateWords('', 5)).toBe('')
  })
})

describe('isPalindrome', () => {
  it('detects palindromes', () => {
    expect(isPalindrome('A man, a plan, a canal: Panama')).toBe(true)
    expect(isPalindrome('racecar')).toBe(true)
  })

  it('returns false for non-palindromes', () => {
    expect(isPalindrome('race a car')).toBe(false)
  })

  it('handles empty and single chars', () => {
    expect(isPalindrome('')).toBe(true)
    expect(isPalindrome('a')).toBe(true)
  })
})

describe('isAnagram', () => {
  it('detects anagrams', () => {
    expect(isAnagram('listen', 'silent')).toBe(true)
    expect(isAnagram('hello', 'world')).toBe(false)
  })

  it('handles spaces', () => {
    expect(isAnagram('conversation', 'voices rant on')).toBe(true)
  })
})

describe('levenshtein', () => {
  it('computes Levenshtein distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('hello', 'hello')).toBe(0)
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
    expect(levenshtein('', '')).toBe(0)
  })
})

describe('fuzzyMatch', () => {
  it('matches characters in order', () => {
    expect(fuzzyMatch('hello world', 'hwd')).toBe(true)
    expect(fuzzyMatch('hello world', 'hwq')).toBe(false)
  })

  it('empty query matches anything', () => {
    expect(fuzzyMatch('hello', '')).toBe(true)
  })

  it('empty string with non-empty query returns false', () => {
    expect(fuzzyMatch('', 'a')).toBe(false)
  })

  it('is case insensitive', () => {
    expect(fuzzyMatch('Hello World', 'hw')).toBe(true)
  })
})
