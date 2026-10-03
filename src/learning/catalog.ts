import type { FadeStatus, QuestionKey, ScaffoldPhase, SupportLevel } from './types.ts'

export const QUESTION_KEYS: QuestionKey[] = [
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
]

export const PHASE_ORDER: ScaffoldPhase[] = [
  'predict',
  'explain',
  'inspect',
  'diagnose',
  'hint',
  'revise',
  'independent-check',
]

export function nextPhase(phase: ScaffoldPhase): ScaffoldPhase {
  const index = PHASE_ORDER.indexOf(phase)
  return PHASE_ORDER[Math.min(index + 1, PHASE_ORDER.length - 1)]
}

export function computeFade(sessionAskCounts: number[]): { status: FadeStatus; slope: number | null } {
  if (sessionAskCounts.length < 2) return { status: 'insufficient', slope: null }
  const first = sessionAskCounts[0]
  const last = sessionAskCounts[sessionAskCounts.length - 1]
  const slope = last - first
  if (slope < 0) return { status: 'effective', slope }
  if (slope === 0) return { status: 'stable', slope }
  return { status: 'increasing', slope }
}

export function inferQuestionKey(text: string): QuestionKey {
  const value = text.toLowerCase()
  if (/predict|预测|prédis|predis/.test(value)) return 'predict-cell'
  if (/zero|0\.00|零|nulle|nul/.test(value)) return 'voltage-zero'
  if (/negative|负|négatif|negatif/.test(value)) return 'meter-negative'
  if (/bridge|盐桥|pont/.test(value)) return 'salt-bridge'
  if (/electron|ion|charge|电子|离子|电荷|électron/.test(value) && /solution|wire|溶液|导线|fil/.test(value)) {
    return 'charge-carriers'
  }
  if (/electron|ion|charge|电子|离子|电荷|porteur/.test(value)) return 'charge-carriers'
  if (/mass|质量|masse/.test(value)) return 'anode-mass'
  if (/half|equation|半方程|équation|equation/.test(value)) return 'half-equation'
  if (/potential|current|电势|电流|potentiel|courant/.test(value)) return 'potential-vs-current'
  if (/plat|镀|électrolys|electrolys/.test(value)) return 'electroplating'
  if (/independent|another|new example|另一|新例|autre/.test(value)) return 'independent-transfer'
  if (/oxid|reduct|anode|cathode|电极|阳极|阴极|oxyd/.test(value)) return 'electrode-process'
  return 'uncategorized'
}

export function clampSupport(level: number): SupportLevel {
  if (level <= 0) return 0
  if (level === 1) return 1
  if (level === 2) return 2
  return 3
}

export function nextSupport(level: SupportLevel): SupportLevel {
  return clampSupport(level + 1)
}
