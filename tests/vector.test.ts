import { describe, it, expect, vi, beforeEach } from 'vitest'

const { VectorStore, cosineSimilarity, chunkText } = await import('../src/server/search/vector.js')

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 10)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10)
  })

  it('computes correct cosine for parallel vectors', () => {
    expect(cosineSimilarity([2, 0], [4, 0])).toBeCloseTo(1, 10)
  })

  it('computes values between -1 and 1', () => {
    const result = cosineSimilarity([1, 2, 3], [4, 5, 6])
    expect(result).toBeGreaterThan(-1.01)
    expect(result).toBeLessThan(1.01)
  })

  it('returns 0 when magnitude is 0', () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0)
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0)
  })

  it('throws for unequal length vectors', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('same length')
  })
})

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    expect(chunkText('Hello world')).toEqual(['Hello world'])
  })

  it('splits text into chunks of specified size', () => {
    const text = 'A'.repeat(100)
    const chunks = chunkText(text, 30, 0)
    expect(chunks).toHaveLength(4)
    expect(chunks[0]).toHaveLength(30)
    expect(chunks[1]).toHaveLength(30)
    expect(chunks[2]).toHaveLength(30)
    expect(chunks[3]).toHaveLength(10)
  })

  it('applies overlap between chunks', () => {
    const text = 'The quick brown fox jumps over the lazy dog'
    const chunks = chunkText(text, 10, 4)
    expect(chunks.length).toBeGreaterThanOrEqual(4)
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(10)
    }
  })

  it('chunkSize must be positive', () => {
    expect(() => chunkText('text', 0)).toThrow('chunkSize must be positive')
    expect(() => chunkText('text', -1)).toThrow('chunkSize must be positive')
  })

  it('overlap must be non-negative', () => {
    expect(() => chunkText('text', 10, -1)).toThrow('overlap must be non-negative')
  })

  it('overlap must be less than chunkSize', () => {
    expect(() => chunkText('text', 10, 10)).toThrow('overlap must be less than chunkSize')
    expect(() => chunkText('text', 10, 15)).toThrow('overlap must be less than chunkSize')
  })

  it('uses default chunkSize 512 and overlap 64', () => {
    const text = 'A'.repeat(600)
    const chunks = chunkText(text)
    expect(chunks.length).toBe(2)
    expect(chunks[0]).toHaveLength(512)
    expect((chunks[1] ?? '').length).toBeGreaterThan(0)
  })
})

describe('VectorStore', () => {
  let store: VectorStore

  beforeEach(() => {
    store = new VectorStore()
  })

  describe('add', () => {
    it('stores a vector with id', () => {
      store.add('doc-1', [1, 0, 0])
      expect(store.size).toBe(1)
    })

    it('stores a vector with metadata', () => {
      store.add('doc-1', [1, 0, 0], { title: 'Document 1' })
      expect(store.size).toBe(1)
    })

    it('throws when adding duplicate id', () => {
      store.add('dup', [1, 0])
      expect(() => store.add('dup', [0, 1])).toThrow('already exists')
    })
  })

  describe('search', () => {
    beforeEach(() => {
      store.add('vec-a', [1, 0, 0], { label: 'A' })
      store.add('vec-b', [0, 1, 0], { label: 'B' })
      store.add('vec-c', [0, 0, 1], { label: 'C' })
    })

    it('returns nearest neighbors sorted by score', () => {
      const results = store.search([1, 0, 0])
      expect(results[0].id).toBe('vec-a')
      expect(results[0].score).toBeCloseTo(1, 5)
    })

    it('returns correct topK results', () => {
      const results = store.search([1, 0.1, 0])
      expect(results).toHaveLength(3)
      expect(results[0].id).toBe('vec-a')
    })

    it('respects topK parameter', () => {
      const results = store.search([1, 0, 0], 1)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('vec-a')
    })

    it('returns empty for topK <= 0', () => {
      expect(store.search([1, 0, 0], 0)).toEqual([])
      expect(store.search([1, 0, 0], -1)).toEqual([])
    })

    it('includes metadata in results', () => {
      const results = store.search([1, 0, 0])
      expect(results[0].metadata).toEqual({ label: 'A' })
    })
  })

  describe('remove', () => {
    it('removes existing entry', () => {
      store.add('remove-me', [1, 0])
      store.remove('remove-me')
      expect(store.size).toBe(0)
    })

    it('throws when removing non-existent entry', () => {
      expect(() => store.remove('ghost')).toThrow('not found')
    })
  })

  describe('clear', () => {
    it('removes all entries', () => {
      store.add('a', [1, 0])
      store.add('b', [0, 1])
      store.clear()
      expect(store.size).toBe(0)
    })
  })

  describe('size', () => {
    it('reports correct count', () => {
      expect(store.size).toBe(0)
      store.add('x', [1])
      expect(store.size).toBe(1)
      store.add('y', [2])
      expect(store.size).toBe(2)
    })
  })
})
