import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { learningApiPlugin } from './server/vitePlugin.ts'

const BULK_WINDOW_MS = 300
const BULK_FILE_COUNT = 6

// Something rewrites a batch of project files about once a minute. Vite treats
// that as real edits, restarts, and reloads the page, which drops in-memory lab state.
function ignoreBulkRewritePlugin(): Plugin {
  return {
    name: 'ignore-bulk-rewrite',
    configureServer(server) {
      const watcher = server.watcher
      const originalEmit = watcher.emit.bind(watcher)
      const batch: Array<{ event: string; args: unknown[] }> = []
      let timer: ReturnType<typeof setTimeout> | undefined

      const flush = () => {
        timer = undefined
        const pending = batch.splice(0, batch.length)
        const files = new Set(pending.map((item) => String(item.args[0] ?? '')).filter(Boolean))
        if (files.size >= BULK_FILE_COUNT) {
          server.config.logger.info(
            `Ignored a bulk rewrite of ${files.size} files. Dev server was left running.`,
            { timestamp: true },
          )
          return
        }
        for (const item of pending) originalEmit(item.event, ...item.args)
      }

      watcher.emit = ((event: string | symbol, ...args: unknown[]) => {
        if (event === 'change' || event === 'add' || event === 'unlink') {
          batch.push({ event: String(event), args })
          clearTimeout(timer)
          timer = setTimeout(flush, BULK_WINDOW_MS)
          return true
        }
        return originalEmit(event, ...args)
      }) as typeof watcher.emit
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)
  return {
    plugins: [ignoreBulkRewritePlugin(), react(), learningApiPlugin()],
  }
})
