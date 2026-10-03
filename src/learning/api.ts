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
