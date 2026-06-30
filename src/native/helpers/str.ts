import * as crypto from 'node:crypto'

export class Str {
  static camelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toLowerCase())
  }

  static snakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .replace(/[-_\s]+/g, '_')
      .toLowerCase()
      .replace(/^_/, '')
  }

  static kebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .replace(/[_\s]+/g, '-')
      .toLowerCase()
      .replace(/^-/, '')
  }

  static pascalCase(str: string): string {
    const camel = Str.camelCase(str)
    return camel.charAt(0).toUpperCase() + camel.slice(1)
  }

  static titleCase(str: string): string {
    return str
      .toLowerCase()
      .split(/(?=[A-Z])|[-_\s]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  static slug(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  static uuid(): string {
    return crypto.randomUUID()
  }

  static nanoid(size: number = 21): string {
    const alphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'
    const bytes = crypto.randomBytes(size)
    let id = ''
    for (let i = 0; i < size; i++) {
      id += alphabet[(bytes[i] ?? 0) & 63]
    }
    return id
  }

  static random(length: number = 16): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const bytes = crypto.randomBytes(length)
    let result = ''
    for (let i = 0; i < length; i++) {
      result += alphabet[(bytes[i] ?? 0) % alphabet.length]
    }
    return result
  }

  static limit(str: string, limit: number): string {
    return str.slice(0, limit)
  }

  static words(str: string): string[] {
    return str.trim().split(/\s+/).filter(Boolean)
  }

  static plural(str: string): string {
    const irregular: Record<string, string> = {
      child: 'children',
      person: 'people',
      man: 'men',
      woman: 'women',
      tooth: 'teeth',
      foot: 'feet',
      mouse: 'mice',
      goose: 'geese',
      ox: 'oxen',
      sheep: 'sheep',
      fish: 'fish',
      deer: 'deer',
      series: 'series',
      species: 'species',
      index: 'indices',
      axis: 'axes',
      crisis: 'crises',
      thesis: 'theses',
      phenomenon: 'phenomena',
      datum: 'data',
      cactus: 'cacti',
      focus: 'foci',
      nucleus: 'nuclei',
      syllabus: 'syllabi',
      analysis: 'analyses',
      diagnosis: 'diagnoses',
      parenthesis: 'parentheses',
      stimulus: 'stimuli',
    }

    const lower = str.toLowerCase()
    if (irregular[lower]) return irregular[lower]!

    if (str.endsWith('y') && !/[aeiou]y$/i.test(str)) {
      return str.slice(0, -1) + 'ies'
    }

    if (str.endsWith('s') || str.endsWith('x') || str.endsWith('z') || str.endsWith('ch') || str.endsWith('sh')) {
      return str + 'es'
    }

    if (str.endsWith('fe')) {
      return str.slice(0, -2) + 'ves'
    }

    if (str.endsWith('f')) {
      return str.slice(0, -1) + 'ves'
    }

    if (str.endsWith('o')) {
      return str + 'es'
    }

    return str + 's'
  }

  static singular(str: string): string {
    const irregular: Record<string, string> = {
      children: 'child',
      people: 'person',
      men: 'man',
      women: 'woman',
      teeth: 'tooth',
      feet: 'foot',
      mice: 'mouse',
      geese: 'goose',
      oxen: 'ox',
      indices: 'index',
      axes: 'axis',
      crises: 'crisis',
      theses: 'thesis',
      phenomena: 'phenomenon',
      data: 'datum',
      cacti: 'cactus',
      foci: 'focus',
      nuclei: 'nucleus',
      syllabi: 'syllabus',
      analyses: 'analysis',
      diagnoses: 'diagnosis',
      parentheses: 'parenthesis',
      stimuli: 'stimulus',
    }

    const lower = str.toLowerCase()
    if (irregular[lower]) return irregular[lower]!

    if (str.endsWith('ives')) {
      return str.slice(0, -4) + 'ife'
    }

    if (str.endsWith('ves')) {
      return str.slice(0, -3) + 'f'
    }

    if (str.endsWith('ies') && str.length > 3) {
      return str.slice(0, -3) + 'y'
    }

    if (str.endsWith('ses') || str.endsWith('xes') || str.endsWith('zes') || str.endsWith('ches') || str.endsWith('shes')) {
      return str.slice(0, -2)
    }

    if (str.endsWith('oes')) {
      return str.slice(0, -2)
    }

    if (str.endsWith('ss')) {
      return str
    }

    if (str.endsWith('s') && str.length > 1) {
      return str.slice(0, -1)
    }

    return str
  }

  static contains(str: string, search: string): boolean {
    return str.includes(search)
  }

  static startsWith(str: string, search: string): boolean {
    return str.startsWith(search)
  }

  static endsWith(str: string, search: string): boolean {
    return str.endsWith(search)
  }

  static replace(str: string, search: string, replace: string): string {
    return str.split(search).join(replace)
  }

  static mask(str: string, chars: number, mask: string = '*'): string {
    if (chars >= str.length) return str
    const visible = str.slice(-chars)
    return mask.repeat(str.length - chars) + visible
  }

  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str
    return str.slice(0, length).replace(/\s+\S*$/, '') + suffix
  }
}
