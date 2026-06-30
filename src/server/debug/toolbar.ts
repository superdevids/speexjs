export class DebugToolbar {
  private queries: { sql: string; duration: number }[] = []
  private startTime = 0

  enable(): void {
    this.startTime = Date.now()
  }

  addQuery(sql: string, duration: number): void {
    if (this.queries.length < 100) this.queries.push({ sql, duration })
  }

  getHtml(): string {
    const elapsed = Date.now() - this.startTime
    return `<html style="background:#1a1a2e;color:#eee;font-family:monospace;padding:1rem;">
<body><h1>SpeexJS Debug Toolbar</h1>
<p>Request time: ${elapsed}ms</p>
<p>Queries: ${this.queries.length}</p>
<ul>${this.queries.map(q => `<li>${q.sql} (${q.duration}ms)</li>`).join('')}</ul>
</body></html>`
  }
}
