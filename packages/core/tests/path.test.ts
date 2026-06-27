import { describe, it, expect } from 'vitest'
import {
  join,
  resolve,
  basename,
  dirname,
  extname,
  normalize,
  isAbsolute,
  relative,
  parse,
  format,
} from '../src/path/index.js'

describe('join', () => {
  it('joins normal segments', () => {
    expect(join('a', 'b', 'c')).toBe('a/b/c')
  })

  it('handles empty segments', () => {
    expect(join('a', '', 'b')).toBe('a/b')
  })

  it('handles absolute paths', () => {
    expect(join('/a', 'b', 'c')).toBe('/a/b/c')
  })

  it('handles .. traversal', () => {
    expect(join('a', 'b', '..', 'c')).toBe('a/c')
  })

  it('handles single segment', () => {
    expect(join('a')).toBe('a')
  })

  it('handles no arguments', () => {
    expect(join()).toBe('.')
  })

  it('handles trailing slash segments', () => {
    expect(join('a/', 'b/')).toBe('a/b')
  })
})

describe('resolve', () => {
  it('resolves to absolute path', () => {
    expect(resolve('/a', 'b')).toBe('/a/b')
  })

  it('resolves from multiple segments', () => {
    expect(resolve('/a', 'b', 'c')).toBe('/a/b/c')
  })
})

describe('basename', () => {
  it('gets filename from path', () => {
    expect(basename('/path/to/file.txt')).toBe('file.txt')
  })

  it('strips extension when provided', () => {
    expect(basename('/path/to/file.txt', '.txt')).toBe('file')
  })

  it('handles root path', () => {
    expect(basename('/')).toBe('')
  })

  it('handles simple filename', () => {
    expect(basename('file.txt')).toBe('file.txt')
  })

  it('handles path with no extension', () => {
    expect(basename('/path/to/file')).toBe('file')
  })
})

describe('dirname', () => {
  it('returns directory from path', () => {
    expect(dirname('/path/to/file.txt')).toBe('/path/to')
  })

  it('handles root path', () => {
    expect(dirname('/')).toBe('/')
  })

  it('handles single file', () => {
    expect(dirname('file.txt')).toBe('.')
  })

  it('handles nested directory', () => {
    expect(dirname('/a/b/c')).toBe('/a/b')
  })

  it('handles top-level file', () => {
    expect(dirname('/file.txt')).toBe('/')
  })
})

describe('extname', () => {
  it('returns extension from filename', () => {
    expect(extname('file.txt')).toBe('.txt')
  })

  it('returns extension from path', () => {
    expect(extname('/path/to/file.html')).toBe('.html')
  })

  it('returns empty string for no extension', () => {
    expect(extname('file')).toBe('')
  })

  it('returns empty string for dotfiles', () => {
    expect(extname('.gitignore')).toBe('')
  })

  it('handles multiple dots', () => {
    expect(extname('file.min.js')).toBe('.js')
  })
})

describe('normalize', () => {
  it('resolves .. segments', () => {
    expect(normalize('a/b/c/../d')).toBe('a/b/d')
  })

  it('removes . segments', () => {
    expect(normalize('a/./b')).toBe('a/b')
  })

  it('removes double slashes', () => {
    expect(normalize('a//b///c')).toBe('a/b/c')
  })

  it('handles absolute paths', () => {
    expect(normalize('/a/b/c/../d')).toBe('/a/b/d')
  })

  it('returns . for empty normalization', () => {
    expect(normalize('.')).toBe('.')
  })

  it('handles leading .. for relative paths', () => {
    expect(normalize('a/../../b')).toBe('../b')
  })
})

describe('isAbsolute', () => {
  it('returns true for absolute paths', () => {
    expect(isAbsolute('/path/to/file')).toBe(true)
  })

  it('returns false for relative paths', () => {
    expect(isAbsolute('path/to/file')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isAbsolute('')).toBe(false)
  })
})

describe('relative', () => {
  it('computes relative path', () => {
    expect(relative('/a/b/c', '/a/b/d')).toBe('../d')
  })

  it('returns . for same path', () => {
    expect(relative('/a/b', '/a/b')).toBe('.')
  })

  it('handles nested target', () => {
    expect(relative('/a/b', '/a/b/c/d')).toBe('c/d')
  })

  it('handles going up multiple levels', () => {
    expect(relative('/a/b/c/d', '/a/b')).toBe('../..')
  })
})

describe('parse / format', () => {
  it('parses a path into components', () => {
    const parsed = parse('/path/to/file.txt')
    expect(parsed.root).toBe('/')
    expect(parsed.dir).toBe('/path/to')
    expect(parsed.base).toBe('file.txt')
    expect(parsed.name).toBe('file')
    expect(parsed.ext).toBe('.txt')
  })

  it('roundtrips through format', () => {
    const path = '/path/to/file.txt'
    expect(format(parse(path))).toBe(path)
  })

  it('parses relative path', () => {
    const parsed = parse('file.txt')
    expect(parsed.root).toBe('')
    expect(parsed.dir).toBe('')
    expect(parsed.base).toBe('file.txt')
    expect(parsed.name).toBe('file')
    expect(parsed.ext).toBe('.txt')
  })

  it('formats from partial components', () => {
    expect(format({ root: '/', name: 'file', ext: '.txt' })).toBe('/file.txt')
  })

  it('handles path with no extension', () => {
    const parsed = parse('/a/b/readme')
    expect(parsed.ext).toBe('')
    expect(parsed.name).toBe('readme')
  })
})
