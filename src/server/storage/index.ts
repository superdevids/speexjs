import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { S3Disk } from './s3.js'
import type { S3Config } from './s3.js'

export interface Disk {
  put(filePath: string, content: string | Buffer): Promise<string>
  get(filePath: string): Promise<Buffer>
  exists(filePath: string): Promise<boolean>
  delete(filePath: string): Promise<boolean>
  copy(from: string, to: string): Promise<boolean>
  move(from: string, to: string): Promise<boolean>
  url(filePath: string): string
  size(filePath: string): Promise<number>
  lastModified(filePath: string): Promise<Date>
  files(directory?: string): Promise<string[]>
  directories(directory?: string): Promise<string[]>
  makeDirectory(dirPath: string): Promise<void>
  deleteDirectory(dirPath: string): Promise<void>
  readStream(filePath: string): Promise<fs.ReadStream | import('node:stream').Readable>
  writeStream(filePath: string): Promise<fs.WriteStream | import('node:stream').Writable>
  getRoot(): string
  getUrl(): string | undefined
}

export interface DiskConfigLocal {
  driver: 'local'
  root: string
  url?: string
  permissions?: number
}

export interface DiskConfigS3 {
  driver: 's3'
  bucket: string
  region: string
  key: string
  secret: string
  url?: string
}

export type DiskConfig = DiskConfigLocal | DiskConfigS3

export interface StorageConfig {
  defaultDisk?: string
  disks: {
    [name: string]: DiskConfig
  }
}

export interface FileOptions {
  name?: string
  disk?: string
  overwrite?: boolean
}

export class LocalDisk implements Disk {
  private root: string
  private baseUrl?: string

  constructor(root: string, baseUrl?: string) {
    this.root = path.resolve(root)
    this.baseUrl = baseUrl
  }

  async put(filePath: string, content: string | Buffer): Promise<string> {
    const fullPath = this.resolvePath(filePath)
    const dir = path.dirname(fullPath)
    try {
      await fsp.access(dir)
    } catch {
      await fsp.mkdir(dir, { recursive: true })
    }
    await fsp.writeFile(fullPath, content)
    return filePath
  }

  async get(filePath: string): Promise<Buffer> {
    const fullPath = this.resolvePath(filePath)
    try {
      await fsp.access(fullPath)
    } catch {
      throw new Error(`File not found: ${filePath}`)
    }
    return fsp.readFile(fullPath)
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath)
    try {
      await fsp.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  async delete(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath)
    try {
      await fsp.access(fullPath)
    } catch {
      return false
    }
    await fsp.unlink(fullPath)
    return true
  }

  async copy(from: string, to: string): Promise<boolean> {
    const fromPath = this.resolvePath(from)
    const toPath = this.resolvePath(to)
    try {
      await fsp.access(fromPath)
    } catch {
      return false
    }
    const dir = path.dirname(toPath)
    try {
      await fsp.access(dir)
    } catch {
      await fsp.mkdir(dir, { recursive: true })
    }
    await fsp.copyFile(fromPath, toPath)
    return true
  }

  async move(from: string, to: string): Promise<boolean> {
    const fromPath = this.resolvePath(from)
    const toPath = this.resolvePath(to)
    try {
      await fsp.access(fromPath)
    } catch {
      return false
    }
    const dir = path.dirname(toPath)
    try {
      await fsp.access(dir)
    } catch {
      await fsp.mkdir(dir, { recursive: true })
    }
    await fsp.rename(fromPath, toPath)
    return true
  }

  url(filePath: string): string {
    if (this.baseUrl === undefined) {
      throw new Error('Base URL not configured for this disk')
    }
    const normalized = filePath.replace(/\\/g, '/')
    return `${this.baseUrl.replace(/\/$/, '')}/${normalized.replace(/^\//, '')}`
  }

  async size(filePath: string): Promise<number> {
    const fullPath = this.resolvePath(filePath)
    try {
      await fsp.access(fullPath)
    } catch {
      throw new Error(`File not found: ${filePath}`)
    }
    const stat = await fsp.stat(fullPath)
    return stat.size
  }

  async lastModified(filePath: string): Promise<Date> {
    const fullPath = this.resolvePath(filePath)
    try {
      await fsp.access(fullPath)
    } catch {
      throw new Error(`File not found: ${filePath}`)
    }
    const stat = await fsp.stat(fullPath)
    return stat.mtime
  }

  async files(directory: string = ''): Promise<string[]> {
    const fullPath = this.resolvePath(directory)
    try {
      await fsp.access(fullPath)
    } catch {
      return []
    }
    const entries = await fsp.readdir(fullPath, { withFileTypes: true })
    return entries.filter((entry) => entry.isFile()).map((entry) => path.join(directory, entry.name).replace(/\\/g, '/'))
  }

  async directories(directory: string = ''): Promise<string[]> {
    const fullPath = this.resolvePath(directory)
    try {
      await fsp.access(fullPath)
    } catch {
      return []
    }
    const entries = await fsp.readdir(fullPath, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(directory, entry.name).replace(/\\/g, '/'))
  }

  async makeDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolvePath(dirPath)
    await fsp.mkdir(fullPath, { recursive: true })
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolvePath(dirPath)
    try {
      await fsp.access(fullPath)
    } catch {
      return
    }
    await fsp.rm(fullPath, { recursive: true, force: true })
  }

  async append(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath)
    const dir = path.dirname(fullPath)
    try {
      await fsp.access(dir)
    } catch {
      await fsp.mkdir(dir, { recursive: true })
    }
    await fsp.appendFile(fullPath, content, 'utf-8')
  }

  async prepend(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath)
    const dir = path.dirname(fullPath)
    try {
      await fsp.access(dir)
    } catch {
      await fsp.mkdir(dir, { recursive: true })
    }
    let existing = ''
    try {
      existing = await fsp.readFile(fullPath, 'utf-8')
    } catch {
      /* file doesn't exist */
    }
    await fsp.writeFile(fullPath, content + existing, 'utf-8')
  }

  async readStream(filePath: string): Promise<fs.ReadStream> {
    const fullPath = this.resolvePath(filePath)
    try {
      await fsp.access(fullPath)
    } catch {
      throw new Error(`File not found: ${filePath}`)
    }
    return fs.createReadStream(fullPath)
  }

  async writeStream(filePath: string): Promise<fs.WriteStream> {
    const fullPath = this.resolvePath(filePath)
    const dir = path.dirname(fullPath)
    try {
      await fsp.access(dir)
    } catch {
      await fsp.mkdir(dir, { recursive: true })
    }
    return fs.createWriteStream(fullPath)
  }

  getRoot(): string {
    return this.root
  }

  getUrl(): string | undefined {
    return this.baseUrl
  }

  private resolvePath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/')
    const resolved = path.resolve(this.root, normalized)
    const resolvedRoot = path.resolve(this.root)

    if (!resolved.startsWith(resolvedRoot)) {
      throw new Error(`Path traversal detected: ${filePath}`)
    }

    return resolved
  }
}

export class Storage {
  private config: StorageConfig
  private diskInstances: Map<string, Disk>

  constructor(config: StorageConfig) {
    this.config = config
    this.diskInstances = new Map()
  }

  disk(name?: string): Disk {
    const diskName = name ?? this.config.defaultDisk ?? 'local'
    const existing = this.diskInstances.get(diskName)
    if (existing !== undefined) {
      return existing
    }

    const diskConfig = this.config.disks[diskName]
    if (diskConfig === undefined) {
      throw new Error(`Disk not configured: ${diskName}`)
    }

    const instance = this.createDisk(diskConfig)
    this.diskInstances.set(diskName, instance)
    return instance
  }

  private createDisk(config: DiskConfig): Disk {
    if (config.driver === 'local') {
      return new LocalDisk(config.root, config.url)
    }
    if (config.driver === 's3') {
      const s3Cfg: S3Config = {
        bucket: config.bucket,
        region: config.region,
        accessKeyId: config.key,
        secretAccessKey: config.secret,
        baseUrl: config.url,
      }
      return new S3Disk(s3Cfg)
    }
    throw new Error(`Unknown disk driver: ${(config as DiskConfig).driver}`)
  }

  async put(filePath: string, content: string | Buffer, options?: FileOptions): Promise<string> {
    return this.disk(options?.disk).put(filePath, content)
  }

  async get(filePath: string, disk?: string): Promise<Buffer> {
    return this.disk(disk).get(filePath)
  }

  async exists(filePath: string, disk?: string): Promise<boolean> {
    return this.disk(disk).exists(filePath)
  }

  async delete(filePath: string, disk?: string): Promise<boolean> {
    return this.disk(disk).delete(filePath)
  }

  async copy(from: string, to: string, disk?: string): Promise<boolean> {
    return this.disk(disk).copy(from, to)
  }

  async move(from: string, to: string, disk?: string): Promise<boolean> {
    return this.disk(disk).move(from, to)
  }

  async url(filePath: string, disk?: string): Promise<string> {
    return this.disk(disk).url(filePath)
  }

  async size(filePath: string, disk?: string): Promise<number> {
    return this.disk(disk).size(filePath)
  }

  async lastModified(filePath: string, disk?: string): Promise<Date> {
    return this.disk(disk).lastModified(filePath)
  }

  async files(directory?: string, disk?: string): Promise<string[]> {
    return this.disk(disk).files(directory)
  }

  async directories(directory?: string, disk?: string): Promise<string[]> {
    return this.disk(disk).directories(directory)
  }

  async makeDirectory(dirPath: string, disk?: string): Promise<void> {
    return this.disk(disk).makeDirectory(dirPath)
  }

  async deleteDirectory(dirPath: string, disk?: string): Promise<void> {
    return this.disk(disk).deleteDirectory(dirPath)
  }

  async readStream(filePath: string, disk?: string): Promise<fs.ReadStream | import('node:stream').Readable> {
    return this.disk(disk).readStream(filePath)
  }

  async writeStream(filePath: string, disk?: string): Promise<fs.WriteStream | import('node:stream').Writable> {
    return this.disk(disk).writeStream(filePath)
  }
}

let defaultInstance: Storage | null = null

export function createStorage(config: StorageConfig): Storage {
  defaultInstance = new Storage(config)
  return defaultInstance
}

export function storage(): Storage {
  if (defaultInstance === null) {
    throw new Error('Storage not initialized. Call createStorage(config) first.')
  }
  return defaultInstance
}
