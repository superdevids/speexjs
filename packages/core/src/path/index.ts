const SEP = '/'

/**
 * Joins path segments with the proper separator.
 *
 * @param segments - Path segments to join.
 * @returns The joined path.
 */
export function join(...segments: string[]): string {
  const parts: string[] = []
  for (const seg of segments) {
    if (seg === '') continue
    const split = seg.split(/[\\/]/)
    for (const part of split) {
      if (part === '' || part === '.') continue
      if (part === '..') {
        if (parts.length > 0 && parts[parts.length - 1] !== '..') {
          parts.pop()
        } else {
          parts.push('..')
        }
      } else {
        parts.push(part)
      }
    }
  }
  if (parts.length === 0) return '.'
  const result = parts.join(SEP)
  if (segments.length > 0 && segments[0]!.startsWith('/')) {
    return SEP + result
  }
  return result
}

/**
 * Resolves path segments to an absolute path.
 *
 * @param segments - Path segments to resolve.
 * @returns The resolved absolute path.
 */
export function resolve(...segments: string[]): string {
  let resolved = ''
  let isAbs = false

  for (const seg of segments) {
    if (seg.startsWith('/')) {
      resolved = seg
      isAbs = true
    } else if (isAbs) {
      resolved = join(resolved, seg)
    } else {
      resolved = resolved ? join(resolved, seg) : seg
    }
  }

  if (!isAbs) {
    resolved = join(SEP, resolved)
  }

  return normalize(resolved)
}

/**
 * Returns the filename from a path.
 *
 * @param p - The path.
 * @param ext - Optional extension to strip.
 * @returns The filename.
 */
export function basename(p: string, ext?: string): string {
  const normalized = p.replace(/[\\/]+$/, '')
  const idx = normalized.lastIndexOf(SEP)
  let base = idx === -1 ? normalized : normalized.slice(idx + 1)
  if (ext && base.endsWith(ext)) {
    base = base.slice(0, -ext.length)
  }
  return base
}

/**
 * Returns the directory portion of a path.
 *
 * @param p - The path.
 * @returns The directory path.
 */
export function dirname(p: string): string {
  if (p === SEP) return SEP
  const normalized = p.replace(/[\\/]+$/, '')
  if (normalized === '') return '.'
  const idx = normalized.lastIndexOf(SEP)
  if (idx === -1) return '.'
  if (idx === 0) return SEP
  return normalized.slice(0, idx)
}

/**
 * Returns the file extension from a path.
 *
 * @param p - The path.
 * @returns The extension including the dot, or empty string.
 */
export function extname(p: string): string {
  const base = basename(p)
  const idx = base.lastIndexOf('.')
  if (idx === -1 || idx === 0) return ''
  return base.slice(idx)
}

/**
 * Normalizes a path, resolving '..' and '.' segments.
 *
 * @param p - The path to normalize.
 * @returns The normalized path.
 */
export function normalize(p: string): string {
  const parts = p.split(/[\\/]+/)
  const stack: string[] = []
  let isAbs = p.startsWith('/')

  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (stack.length > 0 && stack[stack.length - 1] !== '..') {
        stack.pop()
      } else if (!isAbs) {
        stack.push('..')
      }
    } else {
      stack.push(part)
    }
  }

  const result = stack.join(SEP)
  if (isAbs) return SEP + result
  if (result === '') return '.'
  return result
}

/**
 * Checks if a path is absolute.
 *
 * @param p - The path to check.
 * @returns Whether the path is absolute.
 */
export function isAbsolute(p: string): boolean {
  return p.startsWith('/')
}

/**
 * Computes the relative path from `from` to `to`.
 *
 * @param from - The base path.
 * @param to - The target path.
 * @returns The relative path.
 */
export function relative(from: string, to: string): string {
  const fromParts = normalize(from).split(SEP)
  const toParts = normalize(to).split(SEP)

  let i = 0
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++
  }

  const up = fromParts.slice(i).map(() => '..')
  const down = toParts.slice(i)
  const result = [...up, ...down].join(SEP)

  return result || '.'
}

export interface ParsedPath {
  root: string
  dir: string
  base: string
  name: string
  ext: string
}

/**
 * Parses a path into its components.
 *
 * @param p - The path to parse.
 * @returns An object with root, dir, base, name, and ext.
 */
export function parse(p: string): ParsedPath {
  const root = p.startsWith(SEP) ? SEP : ''
  const base = basename(p)
  const ext = extname(base)
  const name = ext ? base.slice(0, -ext.length) : base
  const dir = root ? dirname(p) : (dirname(p) === '.' ? '' : dirname(p))

  return { root, dir, base, name, ext }
}

/**
 * Formats a parsed path object back into a path string.
 *
 * @param parsed - The parsed path components.
 * @returns The formatted path string.
 */
export function format(parsed: Partial<ParsedPath>): string {
  const { root = '', dir = '', base = '', name = '', ext = '' } = parsed
  const baseName = base || name + ext
  if (dir) {
    return dir + SEP + baseName
  }
  return root + baseName
}
