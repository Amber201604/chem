import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { computeFade } from '../src/learning/catalog.ts'
import type {
  BarrierCategory,
  ClassDashboard,
  LearningEvent,
  QuestionAskStat,
  QuestionKey,
  StudentSummary,
} from '../src/learning/types.ts'

const dataDir = resolve(process.env.LEARNING_DATA_DIR ?? 'data/learning')
const eventsPath = resolve(dataDir, 'events.jsonl')

function createId() {
  return randomUUID()
}

export async function appendEvent(partial: Omit<LearningEvent, 'id' | 'ts'> & { id?: string; ts?: string }) {
  const event: LearningEvent = {
    ...partial,
    id: partial.id ?? createId(),
    ts: partial.ts ?? new Date().toISOString(),
  }
  await mkdir(dirname(eventsPath), { recursive: true })
  await appendFile(eventsPath, `${JSON.stringify(event)}\n`, 'utf8')
  return event
}

export async function readEvents(): Promise<LearningEvent[]> {
  try {
    const raw = await readFile(eventsPath, 'utf8')
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as LearningEvent)
  } catch {
    return []
  }
}

export async function readJsonl() {
  try {
    return await readFile(eventsPath, 'utf8')
  } catch {
    return ''
  }
}

function latestOf(events: LearningEvent[]) {
  return events[events.length - 1]
}

function askStats(events: LearningEvent[]): QuestionAskStat[] {
  const asks = events.filter((event) => event.type === 'ask')
  const byKey = new Map<QuestionKey, LearningEvent[]>()
  for (const event of asks) {
    const list = byKey.get(event.questionKey) ?? []
    list.push(event)
    byKey.set(event.questionKey, list)
  }
  return [...byKey.entries()].map(([questionKey, list]) => {
    const sessions: QuestionAskStat['sessions'] = []
    for (const event of list) {
      const current = sessions.find((item) => item.sessionId === event.sessionId)
      if (current) current.askCount += 1
      else sessions.push({ sessionId: event.sessionId, firstTs: event.ts, askCount: 1 })
    }
    const fade = computeFade(sessions.map((item) => item.askCount))
    return {
      questionKey,
      sessions,
      totalAsks: list.length,
      fade: fade.status,
      slope: fade.slope,
    }
  })
}

function summarizeLearner(learnerId: string, events: LearningEvent[]): StudentSummary {
  const replies = events.filter((event) => event.type === 'reply')
  const reviews = events.filter((event) => event.type === 'teacher-review')
  const latestReply = latestOf(replies)
  const latest = latestOf(events)
  const asks = askStats(events)
  return {
    learnerId,
    lastActive: latest?.ts ?? '',
    condition: latest?.condition ?? 'adaptive',
    latestPhase: latestReply?.phase ?? latest?.phase ?? 'predict',
    latestBarrier: latestReply?.barrier ?? null,
    latestExcerpt: latestReply?.evidence || events.find((event) => event.studentText)?.studentText || '',
    remainingDifficulty: latestReply?.remainingDifficulty ?? '',
    nextActivity: latestReply?.nextActivity ?? '',
    asks,
    fadingCount: asks.filter((item) => item.fade === 'effective').length,
    teacherOverride: latestOf(reviews)?.teacherVerdict ?? null,
  }
}

export async function buildDashboard(): Promise<ClassDashboard> {
  const events = await readEvents()
  const grouped = new Map<string, LearningEvent[]>()
  for (const event of events) {
    const list = grouped.get(event.learnerId) ?? []
    list.push(event)
    grouped.set(event.learnerId, list)
  }
  const learners = [...grouped.entries()]
    .map(([learnerId, list]) => summarizeLearner(learnerId, list))
    .sort((a, b) => b.lastActive.localeCompare(a.lastActive))

  const barrierCounts = new Map<BarrierCategory, number>()
  for (const event of events) {
    if (event.type !== 'reply' || !event.barrier || event.barrier === 'insufficient-evidence') continue
    barrierCounts.set(event.barrier, (barrierCounts.get(event.barrier) ?? 0) + 1)
  }

  return {
    store: 'jsonl-file',
    pinRequired: false,
    learners,
    classBarriers: [...barrierCounts.entries()]
      .map(([barrier, count]) => ({ barrier, count }))
      .sort((a, b) => b.count - a.count),
    fadingLearners: learners.filter((learner) => learner.fadingCount > 0).length,
    totalAsks: events.filter((event) => event.type === 'ask').length,
  }
}
