import { randomUUID } from 'node:crypto'
import { writeFile, readFile, unlink, mkdir } from 'node:fs/promises'
import { join, extname, basename, dirname } from 'node:path'
import { tmpdir } from 'node:os'

export interface UploadedFile {
  readonly fieldName: string
  readonly originalName: string
  readonly mimeType: string
  readonly size: number
  readonly path: string
  readonly extension: string
  move(destination: string, filename?: string): Promise<string>
  toBuffer(): Promise<Buffer>
  toBase64(): string
  isImage(): boolean
  isVideo(): boolean
}

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/avif',
])

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
])

export class SuperUploadedFile implements UploadedFile {
  readonly fieldName: string
  readonly originalName: string
  readonly mimeType: string
  readonly size: number
  readonly path: string
  readonly extension: string
  private buffer: Buffer | null

  constructor(opts: {
    fieldName: string
    originalName: string
    mimeType: string
    size: number
    path: string
    buffer?: Buffer
  }) {
    this.fieldName = opts.fieldName
    this.originalName = opts.originalName
    this.mimeType = opts.mimeType
    this.size = opts.size
    this.path = opts.path
    this.extension = extname(opts.originalName).toLowerCase()
    this.buffer = opts.buffer ?? null
  }

  async move(destination: string, filename?: string): Promise<string> {
    const destName = filename ?? basename(this.path)
    const destPath = join(destination, destName)

    await mkdir(dirname(destPath), { recursive: true })

    const buf = await this.toBuffer()
    await writeFile(destPath, buf)

    return destPath
  }

  async toBuffer(): Promise<Buffer> {
    if (this.buffer !== null) return this.buffer
    this.buffer = await readFile(this.path)
    return this.buffer
  }

  toBase64(): string {
    if (this.buffer === null) {
      throw new Error(
        'Buffer not loaded. Call toBuffer() first or read the file into memory.',
      )
    }
    return this.buffer.toString('base64')
  }

  isImage(): boolean {
    return IMAGE_MIME_TYPES.has(this.mimeType)
  }

  isVideo(): boolean {
    return VIDEO_MIME_TYPES.has(this.mimeType)
  }

  static async createFromBuffer(
    fieldName: string,
    originalName: string,
    mimeType: string,
    buffer: Buffer,
    tempDir?: string,
  ): Promise<SuperUploadedFile> {
    const tmp = tempDir ?? tmpdir()
    const fileName = `${randomUUID()}${extname(originalName)}`
    const filePath = join(tmp, fileName)

    await writeFile(filePath, buffer)

    return new SuperUploadedFile({
      fieldName,
      originalName,
      mimeType: mimeType || 'application/octet-stream',
      size: buffer.length,
      path: filePath,
      buffer,
    })
  }

  async cleanup(): Promise<void> {
    try {
      await unlink(this.path)
    } catch {
      // File may have been moved or already deleted
    }
  }
}
