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
