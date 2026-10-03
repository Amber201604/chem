import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleTutorHttp } from '../server/routes.ts'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  void handleTutorHttp(req, res)
}
