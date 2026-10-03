export const MODEL_IDS = {
  terra: 'openai/gpt-5.6-terra',
  flash: 'google/gemini-3.6-flash',
} as const

export type TutorModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS]
export type StudyCondition = 'adaptive' | 'fixed'
export type ScaffoldPhase =
  | 'predict'
  | 'explain'
  | 'inspect'
  | 'diagnose'
  | 'hint'
  | 'revise'
  | 'independent-check'
export type SupportLevel = 0 | 1 | 2 | 3
export type BarrierCategory =
  | 'conceptual-misunderstanding'
  | 'representation-gap'
  | 'missing-prerequisite'
  | 'unsystematic-problem-solving'
  | 'ambiguous-language'
  | 'insufficient-evidence'
export type QuestionKey =
  | 'predict-cell'
  | 'voltage-zero'
  | 'meter-negative'
  | 'salt-bridge'
  | 'charge-carriers'
  | 'electrode-process'
  | 'anode-mass'
  | 'half-equation'
  | 'potential-vs-current'
  | 'electroplating'
  | 'independent-transfer'
  | 'uncategorized'
export type FadeStatus = 'effective' | 'stable' | 'increasing' | 'insufficient'
export type TeacherVerdict = 'accept' | 'correct' | 'reject'
export type LearningEventType = 'ask' | 'reply' | 'inspect' | 'teacher-review' | 'session-start'

export type LabSnapshot = {
  leftMetal: string | null
  rightMetal: string | null
  leftSolution: string | null
  rightSolution: string | null
  bridge: string | null
  wire: boolean
  meter: boolean
  leftPolished: boolean
  rightPolished: boolean
  meterReversed: boolean
  leftConcentration: number
  rightConcentration: number
  running: boolean
  fault: string
  emf: number
  reactionType: string
  electronFlow: string
  anodeMetal: string | null
  cathodeMetal: string | null
  view: 'macro' | 'micro'
}

export type ChatTurn = {
  role: 'student' | 'tutor'
  text: string
}

export type TutorRequest = {
  learnerId: string
  sessionId: string
  condition: StudyCondition
  model: TutorModelId
  locale: 'en' | 'zh' | 'fr'
  message: string
  questionKey?: QuestionKey
  messages: ChatTurn[]
  phase: ScaffoldPhase
  supportLevel: SupportLevel
  lab: LabSnapshot
  teacherMisconception?: string
  teacherLevel?: string
  viewedMicro: boolean
}

export type TutorOutput = {
  reply: string
  phase: ScaffoldPhase
  supportLevel: SupportLevel
  questionKey: QuestionKey
  barrier: BarrierCategory
  barrierConfidence: 'low' | 'medium' | 'high'
  evidence: string
  whatChanged: string
  remainingDifficulty: string
  nextActivity: string
  inspectCue: boolean
  usedModel: TutorModelId | 'local-scaffold'
  fallback: boolean
  fallbackReason?: 'no-key' | 'api-error' | 'fixed'
  errorMessage?: string
}

export type LearningEvent = {
  id: string
  ts: string
  learnerId: string
  sessionId: string
  condition: StudyCondition
  model?: TutorModelId | 'local-scaffold'
  locale: 'en' | 'zh' | 'fr'
  type: LearningEventType
  questionKey: QuestionKey
  phase: ScaffoldPhase
  supportLevel: SupportLevel
  studentText?: string
  tutorText?: string
  barrier?: BarrierCategory
  barrierConfidence?: 'low' | 'medium' | 'high'
  evidence?: string
  whatChanged?: string
  remainingDifficulty?: string
  nextActivity?: string
  labFault?: string
  labEmf?: number
  view?: 'macro' | 'micro'
  teacherVerdict?: TeacherVerdict
  teacherNote?: string
  correctedBarrier?: BarrierCategory
  targetEventId?: string
}

export type QuestionAskStat = {
  questionKey: QuestionKey
  sessions: Array<{ sessionId: string; firstTs: string; askCount: number }>
  totalAsks: number
  fade: FadeStatus
  slope: number | null
}

export type StudentSummary = {
  learnerId: string
  lastActive: string
  condition: StudyCondition
  latestPhase: ScaffoldPhase
  latestBarrier: BarrierCategory | null
  latestExcerpt: string
  remainingDifficulty: string
  nextActivity: string
  asks: QuestionAskStat[]
  fadingCount: number
  teacherOverride: TeacherVerdict | null
}

export type ClassDashboard = {
  store: 'jsonl-file'
  pinRequired: boolean
  learners: StudentSummary[]
  classBarriers: Array<{ barrier: BarrierCategory; count: number }>
  fadingLearners: number
  totalAsks: number
}

export type LearnerProfile = {
  learnerId: string
  sessionId: string
  sessionStartedAt: number
  condition: StudyCondition
  model: TutorModelId
}
