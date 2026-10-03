import { createGateway, generateText, Output } from 'ai'
import { z } from 'zod'
import { inferQuestionKey, nextSupport } from '../src/learning/catalog.ts'
import type { QuestionAskStat, TutorOutput, TutorRequest } from '../src/learning/types.ts'
import { gatewayApiKey, gatewayStatus } from './env.ts'
import { localScaffold } from './fixedScaffold.ts'
import { buildTutorSystemPrompt } from './prompt.ts'
import { appendEvent, readEvents } from './store.ts'

const outputSchema = z.object({
  reply: z.string().describe('Student-facing tutor message; one question or cue, never a full solution on early support levels'),
  phase: z.enum(['predict', 'explain', 'inspect', 'diagnose', 'hint', 'revise', 'independent-check']),
  supportLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  questionKey: z.enum([
    'predict-cell',
    'voltage-zero',
    'meter-negative',
    'salt-bridge',
    'charge-carriers',
    'electrode-process',
    'anode-mass',
    'half-equation',
    'potential-vs-current',
    'electroplating',
    'independent-transfer',
    'uncategorized',
  ]),
  barrier: z.enum([
    'conceptual-misunderstanding',
    'representation-gap',
    'missing-prerequisite',
    'unsystematic-problem-solving',
    'ambiguous-language',
    'insufficient-evidence',
  ]),
  barrierConfidence: z.enum(['low', 'medium', 'high']),
  evidence: z.string().describe('Short excerpt or observation that justifies the barrier'),
  whatChanged: z.string().describe('What improved after the previous hint, or empty'),
  remainingDifficulty: z.string(),
  nextActivity: z.string().describe('Suggested teacher follow-up'),
  inspectCue: z.boolean(),
})

function askHistoryFor(learnerId: string, events: Awaited<ReturnType<typeof readEvents>>): QuestionAskStat[] {
  const asks = events.filter((event) => event.learnerId === learnerId && event.type === 'ask')
  const byKey = new Map<string, typeof asks>()
  for (const event of asks) {
    const list = byKey.get(event.questionKey) ?? []
    list.push(event)
    byKey.set(event.questionKey, list)
  }
  return [...byKey.entries()].map(([questionKey, list]) => {
    const sessions: QuestionAskStat['sessions'] = []
    for (const event of list) {
      const row = sessions.find((item) => item.sessionId === event.sessionId)
      if (row) row.askCount += 1
      else sessions.push({ sessionId: event.sessionId, firstTs: event.ts, askCount: 1 })
    }
    const counts = sessions.map((item) => item.askCount)
    const slope = counts.length < 2 ? null : counts[counts.length - 1] - counts[0]
    return {
      questionKey: questionKey as QuestionAskStat['questionKey'],
      sessions,
      totalAsks: list.length,
      fade: slope === null ? 'insufficient' : slope < 0 ? 'effective' : slope === 0 ? 'stable' : 'increasing',
      slope,
    }
  })
}

function sameQuestionSupport(input: TutorRequest, history: QuestionAskStat[]) {
  const key = input.questionKey ?? inferQuestionKey(input.message)
  const row = history.find((item) => item.questionKey === key)
  const asksThisSession = row?.sessions.find((item) => item.sessionId === input.sessionId)?.askCount ?? 0
  if (asksThisSession >= 3) return nextSupport(nextSupport(input.supportLevel))
  if (asksThisSession >= 1) return nextSupport(input.supportLevel)
  return input.supportLevel
}

async function generateAdaptive(input: TutorRequest, history: QuestionAskStat[]): Promise<TutorOutput> {
  const apiKey = gatewayApiKey()
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY was empty after reading .env.local')
  const gateway = createGateway({ apiKey })
  const { output } = await generateText({
    model: gateway(input.model),
    output: Output.object({
      name: 'GuardedElectrochemistryTutor',
      description: 'Diagnostic scaffold reply plus research codes. Never a complete solution on first support.',
      schema: outputSchema,
    }),
    system: buildTutorSystemPrompt(input, history),
    messages: [
      ...input.messages.map((message) => ({
        role: message.role === 'student' ? ('user' as const) : ('assistant' as const),
        content: message.text,
      })),
      { role: 'user', content: input.message },
    ],
  })
  if (!output) throw new Error('Model returned no structured output')
  return { ...output, usedModel: input.model, fallback: false }
}

export async function runTutor(input: TutorRequest): Promise<TutorOutput> {
  const events = await readEvents()
  const history = askHistoryFor(input.learnerId, events)
  const questionKey = input.questionKey ?? inferQuestionKey(input.message)
  const supportLevel = sameQuestionSupport({ ...input, questionKey }, history)
  const status = gatewayStatus()
  console.info('[tutor] gateway', {
    configured: status.configured,
    chars: status.chars,
    prefix: status.prefix,
    cwd: status.cwd,
    loadedFrom: status.loadedFrom,
    condition: input.condition,
  })

  await appendEvent({
    learnerId: input.learnerId,
    sessionId: input.sessionId,
    condition: input.condition,
    model: input.condition === 'adaptive' ? input.model : 'local-scaffold',
    locale: input.locale,
    type: 'ask',
    questionKey,
    phase: input.phase,
    supportLevel,
    studentText: input.message,
    labFault: input.lab.fault,
    labEmf: input.lab.emf,
    view: input.lab.view,
  })

  let result: TutorOutput
  if (input.condition === 'fixed') {
    result = { ...localScaffold({ ...input, questionKey }, supportLevel), fallbackReason: 'fixed' }
  } else if (!status.configured) {
    result = { ...localScaffold({ ...input, questionKey }, supportLevel), fallbackReason: 'no-key' }
  } else {
    try {
      result = await generateAdaptive({ ...input, questionKey, supportLevel }, history)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown gateway error'
      console.error('[tutor] gateway call failed', errorMessage)
      result = {
        ...localScaffold({ ...input, questionKey }, supportLevel),
        fallbackReason: 'api-error',
        errorMessage,
      }
    }
  }

  await appendEvent({
    learnerId: input.learnerId,
    sessionId: input.sessionId,
    condition: input.condition,
    model: result.usedModel,
    locale: input.locale,
    type: 'reply',
    questionKey: result.questionKey,
    phase: result.phase,
    supportLevel: result.supportLevel,
    tutorText: result.reply,
    barrier: result.barrier,
    barrierConfidence: result.barrierConfidence,
    evidence: result.evidence,
    whatChanged: result.whatChanged,
    remainingDifficulty: result.remainingDifficulty,
    nextActivity: result.nextActivity,
    labFault: input.lab.fault,
    labEmf: input.lab.emf,
    view: input.lab.view,
  })

  return result
}
