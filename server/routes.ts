import type { IncomingMessage, ServerResponse } from 'node:http'
import type { LearningEvent, TutorRequest } from '../src/learning/types.ts'
import { gatewayStatus } from './env.ts'
import { readJson, sendJson, sendText, teacherPinFrom } from './http.ts'
import { appendEvent, buildDashboard, readJsonl } from './store.ts'
import { runTutor } from './tutor.ts'

function pinOk(req: IncomingMessage) {
  const expected = process.env.TEACHER_PIN
  if (!expected) return true
  return teacherPinFrom(req) === expected
}

export async function handleTutorHttp(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'GET') {
    sendJson(res, 200, gatewayStatus())
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'GET or POST' })
    return
  }
  try {
    const body = (await readJson(req)) as TutorRequest
    if (!body?.learnerId || !body.message?.trim()) {
      sendJson(res, 400, { error: 'learnerId and message are required' })
      return
    }
    const result = await runTutor(body)
    sendJson(res, 200, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tutor failed'
    sendJson(res, 500, { error: message })
  }
}

export async function handleLearningHttp(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/api/learning', 'http://local')
  if (req.method === 'GET') {
    if (!pinOk(req)) {
      sendJson(res, 401, { pinRequired: true, store: 'jsonl-file', learners: [], classBarriers: [], fadingLearners: 0, totalAsks: 0 })
      return
    }
    if (url.searchParams.get('format') === 'jsonl') {
      sendText(res, 200, await readJsonl(), 'application/x-ndjson; charset=utf-8')
      return
    }
    const dashboard = await buildDashboard()
    dashboard.pinRequired = Boolean(process.env.TEACHER_PIN)
    sendJson(res, 200, dashboard)
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'GET or POST' })
    return
  }
  try {
    const body = (await readJson(req)) as Omit<LearningEvent, 'id' | 'ts'>
    if (!body?.learnerId || !body.type) {
      sendJson(res, 400, { error: 'learnerId and type are required' })
      return
    }
    if (body.type === 'teacher-review' && !pinOk(req)) {
      sendJson(res, 401, { error: 'Teacher PIN required' })
      return
    }
    const event = await appendEvent(body)
    sendJson(res, 200, { event })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Store failed'
    sendJson(res, 500, { error: message })
  }
}
