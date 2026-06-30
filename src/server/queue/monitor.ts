import type { Queue } from './index.js'

export class QueueMonitor {
  private stats = { processed: 0, failed: 0, pending: 0 }

  attach(queue: Queue): void {
    queue.on('pending', () => {
      this.stats.pending++
    })
    queue.on('processed', () => {
      this.stats.pending = Math.max(0, this.stats.pending - 1)
      this.stats.processed++
    })
    queue.on('failed', () => {
      this.stats.pending = Math.max(0, this.stats.pending - 1)
      this.stats.failed++
    })
  }

  getStats() {
    return { ...this.stats }
  }

  getHtml(): string {
    return `<html><body><h1>Queue Monitor</h1>
<p>Processed: ${this.stats.processed}</p>
<p>Failed: ${this.stats.failed}</p>
<p>Pending: ${this.stats.pending}</p></body></html>`
  }

  getDashboardHtml(): string {
    const s = this.stats
    return `<!DOCTYPE html><html><head><title>Queue Dashboard</title>
<style>body{font-family:sans-serif;padding:2rem;background:#1a1a2e;color:#eee}
.card{background:#16213e;padding:1rem;margin:1rem 0;border-radius:8px}
.stat{font-size:2rem;font-weight:bold}</style></head><body>
<h1>Queue Dashboard</h1>
<div class="card"><div class="stat">${s.processed}</div><div>Processed</div></div>
<div class="card"><div class="stat">${s.failed}</div><div>Failed</div></div>
<div class="card"><div class="stat">${s.pending}</div><div>Pending</div></div>
</body></html>`
  }
}
