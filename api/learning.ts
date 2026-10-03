import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleLearningHttp } from '../server/routes.ts'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  void handleLearningHttp(req, res)
}
