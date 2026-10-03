import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { gatewayStatus } from './env.ts'
import { handleLearningHttp, handleTutorHttp } from './routes.ts'

function pathOf(req: IncomingMessage) {
  return (req.url ?? '').split('?')[0]
}

export function learningApiPlugin(): Plugin {
  return {
    name: 'learning-api',
    configureServer(server) {
      console.info('[tutor] gateway on boot', gatewayStatus())
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const path = pathOf(req)
        if (path === '/api/tutor') {
          void handleTutorHttp(req, res)
          return
        }
        if (path === '/api/learning') {
          void handleLearningHttp(req, res)
          return
        }
        next()
      })
    },
  }
}
