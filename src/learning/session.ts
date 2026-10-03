import { MODEL_IDS, type LearnerProfile, type TutorModelId } from './types.ts'

const STORAGE_KEY = 'vfl.learner'
const SESSION_IDLE_MS = 4 * 60 * 60 * 1000

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function isModelId(value: string): value is TutorModelId {
  return value === MODEL_IDS.terra || value === MODEL_IDS.flash
}

export function loadLearner(): LearnerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LearnerProfile
      const stale = Date.now() - parsed.sessionStartedAt > SESSION_IDLE_MS
      if (parsed.learnerId) {
        return {
          learnerId: parsed.learnerId,
          sessionId: stale ? createId() : parsed.sessionId,
          sessionStartedAt: stale ? Date.now() : parsed.sessionStartedAt,
          condition: parsed.condition === 'fixed' ? 'fixed' : 'adaptive',
          model: isModelId(parsed.model) ? parsed.model : MODEL_IDS.terra,
        }
      }
    }
  } catch {
    // keep a new anonymous profile
  }
  return {
    learnerId: createId(),
    sessionId: createId(),
    sessionStartedAt: Date.now(),
    condition: 'adaptive',
    model: MODEL_IDS.terra,
  }
}

export function saveLearner(profile: LearnerProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function startNewSession(profile: LearnerProfile): LearnerProfile {
  return {
    ...profile,
    sessionId: createId(),
    sessionStartedAt: Date.now(),
  }
}

export function shortLearnerId(learnerId: string) {
  return learnerId.slice(-6).toUpperCase()
}
