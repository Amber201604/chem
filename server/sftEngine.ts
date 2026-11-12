import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inferQuestionKey, nextPhase } from '../src/learning/catalog.ts'
import type {
  BarrierCategory,
  QuestionKey,
  SupportLevel,
  TutorOutput,
  TutorRequest,
} from '../src/learning/types.ts'
import { localScaffold } from './fixedScaffold.ts'

export type TrainedDialogue = {
  id: string
  source: string
  curriculum: string
  topic: string
  questionKey: QuestionKey
  barrier: BarrierCategory
  barrierConfidence: 'low' | 'medium' | 'high'
  evidence: string
  whatChanged: string
  remainingDifficulty: string
  nextActivity: string
  sampleQuestion: string
  supportLadder: [string, string, string, string]
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    phase?: string
    supportLevel?: number
  }>
  embedding: number[]
}

type TrainedArtifact = {
  modelName: string
  trainedOnDevice: string
  numDialogues: number
  vocabSize: number
  embeddingDim: number
  barrierLabels: BarrierCategory[]
  trainingMetrics: Array<{
    epoch: number
    loss: number
    dialogue_acc: number
    barrier_acc: number
  }>
  vocab: Record<string, number>
  idf: number[]
  encoderWeight: number[][]
  encoderBias: number[]
  barrierWeight: number[][]
  barrierBias: number[]
  dialogues: TrainedDialogue[]
}

type DatasetSummary = {
  total_sft_dialogues: number
  curated_research_dialogues: number
  hf_socratic_dialogues: number
  hf_chemconcepts_scaffolded: number
  total_dpo_pairs: number
  sources: Array<{
    id: string
    url: string
    type: string
    role: string
  }>
}

let cachedArtifact: TrainedArtifact | null = null
let cachedSummary: DatasetSummary | null = null

export function loadTrainedArtifact(): TrainedArtifact | null {
  if (cachedArtifact) return cachedArtifact
  try {
    const modelPath = resolve(process.cwd(), 'data/sft/trained_scaffold_model.json')
    cachedArtifact = JSON.parse(readFileSync(modelPath, 'utf8')) as TrainedArtifact
    return cachedArtifact
  } catch (error) {
    console.warn('[sftEngine] could not load trained_scaffold_model.json:', error)
    return null
  }
}

export function loadDatasetSummary(): DatasetSummary | null {
  if (cachedSummary) return cachedSummary
  try {
    const summaryPath = resolve(process.cwd(), 'data/sft/dataset_summary.json')
    cachedSummary = JSON.parse(readFileSync(summaryPath, 'utf8')) as DatasetSummary
    return cachedSummary
  } catch {
    return null
  }
}

function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2)
  const bigrams: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`)
  }
  return [...words, ...bigrams]
}

function encodeQuery(text: string, artifact: TrainedArtifact): {
  embedding: number[]
  barrier: BarrierCategory
  barrierConfidence: 'low' | 'medium' | 'high'
  nonZeroTerms: number
} {
  const tokens = tokenize(text)
  const counts = new Map<number, number>()
  for (const tok of tokens) {
    const idx = artifact.vocab[tok]
    if (idx !== undefined) {
      counts.set(idx, (counts.get(idx) ?? 0) + 1)
    }
  }

  const x = new Float64Array(artifact.idf.length)
  let normSq = 0
  for (const [idx, count] of counts.entries()) {
    // sublinear_tf: (1 + ln(tf)) * idf
    const val = (1 + Math.log(count)) * (artifact.idf[idx] ?? 1)
    x[idx] = val
    normSq += val * val
  }
  const norm = Math.sqrt(normSq) || 1
  for (const idx of counts.keys()) {
    x[idx] /= norm
  }

  // Forward pass through Encoder: ReLU(W_enc * x + b_enc) then L2 normalize
  const hidDim = artifact.embeddingDim
  const h = new Array<number>(hidDim).fill(0)
  let hNormSq = 0
  for (let i = 0; i < hidDim; i++) {
    const row = artifact.encoderWeight[i]
    let sum = artifact.encoderBias[i] ?? 0
    for (const [idx] of counts.entries()) {
      sum += (row[idx] ?? 0) * x[idx]
    }
    const activated = sum > 0 ? sum : 0
    h[i] = activated
    hNormSq += activated * activated
  }
  const hNorm = Math.sqrt(hNormSq) || 1
  for (let i = 0; i < hidDim; i++) {
    h[i] /= hNorm
  }

  // Forward pass through Barrier classification head
  const numBarriers = artifact.barrierLabels.length
  const logits = new Array<number>(numBarriers).fill(0)
  for (let b = 0; b < numBarriers; b++) {
    const row = artifact.barrierWeight[b]
    let sum = artifact.barrierBias[b] ?? 0
    for (let i = 0; i < hidDim; i++) {
      sum += (row[i] ?? 0) * h[i]
    }
    logits[b] = sum
  }

  const maxLogit = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - maxLogit))
  const sumExp = exps.reduce((a, b) => a + b, 0) || 1
  const probs = exps.map((e) => e / sumExp)

  let bestIdx = 0
  for (let b = 1; b < numBarriers; b++) {
    if (probs[b] > probs[bestIdx]) bestIdx = b
  }
  const bestProb = probs[bestIdx]
  const barrierConfidence =
    counts.size === 0 || bestProb < 0.45
      ? 'low'
      : bestProb >= 0.72
        ? 'high'
        : 'medium'

  return {
    embedding: h,
    barrier: counts.size === 0 ? 'insufficient-evidence' : artifact.barrierLabels[bestIdx],
    barrierConfidence,
    nonZeroTerms: counts.size,
  }
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
  }
  return dot
}

export function runTrainedSftTutor(
  input: TutorRequest,
  supportLevel: SupportLevel,
): TutorOutput & { matchedTopic?: string; matchedSource?: string; similarity?: number } {
  const artifact = loadTrainedArtifact()
  if (!artifact || artifact.dialogues.length === 0) {
    return localScaffold(input, supportLevel)
  }

  // If user is asking in non-English and matches a fixed electrochem key, blend fixed localized copy with SFT diagnosis
  const inferredKey = input.questionKey ?? inferQuestionKey(input.message)
  const contextText = [
    input.message,
    input.teacherMisconception ?? '',
    ...input.messages.slice(-2).map((m) => m.text),
  ].join(' ')

  const encoded = encodeQuery(contextText, artifact)

  let bestDialogue = artifact.dialogues[0]
  let bestScore = -1
  for (const d of artifact.dialogues) {
    let score = cosineSim(encoded.embedding, d.embedding)
    // Boost curated research dialogues when questionKey matches
    if (inferredKey !== 'uncategorized' && d.questionKey === inferredKey) {
      score += 0.25
    }
    if (score > bestScore) {
      bestScore = score
      bestDialogue = d
    }
  }

  // If locale is zh or fr and we have a high-precision localized electrochemistry scaffold, use localized text if query isn't English-specific
  if (input.locale !== 'en' && inferredKey !== 'uncategorized') {
    const localized = localScaffold({ ...input, questionKey: inferredKey }, supportLevel)
    return {
      ...localized,
      usedModel: 'sft-chem-scaffold',
      fallback: false,
      matchedTopic: bestDialogue.topic,
      matchedSource: bestDialogue.source,
      similarity: Number(bestScore.toFixed(3)),
    }
  }

  const reply = bestDialogue.supportLadder[supportLevel] ?? bestDialogue.supportLadder[0]
  const questionKey =
    inferredKey !== 'uncategorized' ? inferredKey : bestDialogue.questionKey

  const barrier: BarrierCategory =
    encoded.nonZeroTerms >= 2 ? bestDialogue.barrier || encoded.barrier : 'insufficient-evidence'

  const inspectCue =
    questionKey === 'charge-carriers' ||
    questionKey === 'half-equation' ||
    questionKey === 'electroplating'

  return {
    reply,
    phase: supportLevel >= 3 ? 'independent-check' : nextPhase(input.phase),
    supportLevel,
    questionKey,
    barrier,
    barrierConfidence: supportLevel === 0 ? 'low' : encoded.barrierConfidence,
    evidence: `${input.message.slice(0, 140)} [Matched SFT: ${bestDialogue.topic.slice(0, 50)}]`,
    whatChanged:
      supportLevel === 0
        ? ''
        : bestDialogue.whatChanged || `Advanced to scaffold support level ${supportLevel} on ${bestDialogue.topic}.`,
    remainingDifficulty:
      supportLevel < 3
        ? bestDialogue.remainingDifficulty || `Still scaffolding ${bestDialogue.topic}.`
        : '',
    nextActivity:
      bestDialogue.nextActivity ||
      'Ask the student to explain a parallel Canadian/AP chemistry example with reduced support.',
    inspectCue: inspectCue && input.lab.view !== 'micro',
    usedModel: 'sft-chem-scaffold',
    fallback: false,
    matchedTopic: bestDialogue.topic,
    matchedSource: bestDialogue.source,
    similarity: Number(bestScore.toFixed(3)),
  }
}

export function getSftCatalogPayload() {
  const artifact = loadTrainedArtifact()
  const summary = loadDatasetSummary()
  return {
    modelName: artifact?.modelName ?? 'sft-chem-scaffold-v1',
    trainedOnDevice: artifact?.trainedOnDevice ?? 'GPU',
    numDialogues: artifact?.numDialogues ?? 0,
    vocabSize: artifact?.vocabSize ?? 0,
    embeddingDim: artifact?.embeddingDim ?? 128,
    trainingMetrics: artifact?.trainingMetrics ?? [],
    summary,
    exemplars: (artifact?.dialogues ?? []).slice(0, 40).map((d) => ({
      id: d.id,
      source: d.source,
      curriculum: d.curriculum,
      topic: d.topic,
      questionKey: d.questionKey,
      barrier: d.barrier,
      sampleQuestion: d.sampleQuestion,
      supportLadder: d.supportLadder,
      messages: d.messages,
    })),
  }
}
