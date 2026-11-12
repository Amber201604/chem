import type { ClassDashboard, LearningEvent, TutorOutput, TutorRequest } from './types.ts'

export async function requestTutor(payload: TutorRequest): Promise<TutorOutput> {
  const response = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Tutor request failed (${response.status})`)
  }
  return (await response.json()) as TutorOutput
}

export async function logLearningEvent(event: Omit<LearningEvent, 'id' | 'ts'> & { id?: string; ts?: string }) {
  const response = await fetch('/api/learning', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
  if (!response.ok) throw new Error('Could not store learning event')
  return (await response.json()) as { event: LearningEvent }
}

export async function fetchDashboard(pin?: string): Promise<ClassDashboard> {
  const response = await fetch('/api/learning', {
    headers: pin ? { 'x-teacher-pin': pin } : undefined,
  })
  if (response.status === 401) {
    return { store: 'jsonl-file', pinRequired: true, learners: [], classBarriers: [], fadingLearners: 0, totalAsks: 0 }
  }
  if (!response.ok) throw new Error('Could not load dashboard')
  return (await response.json()) as ClassDashboard
}

export async function exportLearningLog(pin?: string) {
  const response = await fetch('/api/learning?format=jsonl', {
    headers: pin ? { 'x-teacher-pin': pin } : undefined,
  })
  if (!response.ok) throw new Error('Could not export log')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'learning-events.jsonl'
  link.click()
  URL.revokeObjectURL(url)
}

export type SftCatalogPayload = {
  modelName: string
  trainedOnDevice: string
  numDialogues: number
  vocabSize: number
  embeddingDim: number
  trainingMetrics: Array<{
    epoch: number
    loss: number
    dialogue_acc: number
    barrier_acc: number
  }>
  summary: {
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
  } | null
  exemplars: Array<{
    id: string
    source: string
    curriculum: string
    topic: string
    questionKey: string
    barrier: string
    sampleQuestion: string
    supportLadder: [string, string, string, string]
    messages: Array<{
      role: 'user' | 'assistant'
      content: string
      phase?: string
      supportLevel?: number
    }>
  }>
}

export async function fetchSftCatalog(): Promise<SftCatalogPayload> {
  const response = await fetch('/api/learning?format=sft')
  if (!response.ok) throw new Error('Could not load SFT catalog')
  return (await response.json()) as SftCatalogPayload
}
