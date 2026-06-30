import cluster from 'node:cluster'
import { cpus } from 'node:os'

export interface ClusterOptions {
  count?: number
  onWorker?: (workerId: number) => void
}

export function runInCluster(options: ClusterOptions = {}): boolean {
  const workerCount = options.count ?? cpus().length

  if (cluster.isPrimary) {
    console.log(`🚀 Primary ${process.pid} spawning ${workerCount} workers`)
    for (let i = 0; i < workerCount; i++) {
      const worker = cluster.fork()
      worker.on('message', (msg) => {
        if (msg === 'ready' && options.onWorker) options.onWorker(i)
      })
    }
    cluster.on('exit', (worker, code) => {
      console.log(`⚠️ Worker ${worker.process.pid} died (code: ${code}). Restarting...`)
      cluster.fork()
    })
    return true
  }
  return false
}
