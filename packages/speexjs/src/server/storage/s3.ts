export class S3Disk {
  constructor(private config: { bucket: string; region: string; accessKeyId: string; secretAccessKey: string; baseUrl?: string }) {}

  async put(filePath: string, content: string | Buffer): Promise<string> {
    const url = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${filePath}`
    await fetch(url, {
      method: 'PUT',
      body: content,
      headers: { 'x-amz-acl': 'public-read' }
    })
    return filePath
  }

  url(filePath: string): string {
    return this.config.baseUrl ?? `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${filePath}`
  }

  async exists(filePath: string): Promise<boolean> {
    const url = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${filePath}`
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok
  }

  async delete(filePath: string): Promise<boolean> {
    const url = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${filePath}`
    const res = await fetch(url, { method: 'DELETE' })
    return res.ok
  }
}
