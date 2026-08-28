import type { Ion } from '../data/ions'

export function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}

export function deriveCounts(cation: Ion, anion: Ion) {
  const a = Math.abs(cation.valency)
  const b = Math.abs(anion.valency)
  const g = gcd(a, b)
  return {
    cationCount: b / g,
    anionCount: a / g,
    gcd: g,
  }
}

export function chargeSum(
  cation: Ion,
  anion: Ion,
  cationCount: number,
  anionCount: number,
  multiplier = 1,
) {
  return (
    cation.valency * cationCount * multiplier +
    anion.valency * anionCount * multiplier
  )
}

export function isBalanced(
  cation: Ion,
  anion: Ion,
  cationCount: number,
  anionCount: number,
) {
  return chargeSum(cation, anion, cationCount, anionCount) === 0
}

export function isSimplest(
  cation: Ion,
  anion: Ion,
  cationCount: number,
  anionCount: number,
) {
  if (!isBalanced(cation, anion, cationCount, anionCount)) return false
  const derived = deriveCounts(cation, anion)
  return (
    cationCount === derived.cationCount && anionCount === derived.anionCount
  )
}

function sub(n: number): string {
  const map = '₀₁₂₃₄₅₆₇₈₉'
  return String(n)
    .split('')
    .map((d) => map[Number(d)] ?? d)
    .join('')
}

function formatPart(ion: Ion, count: number): string {
  if (count <= 1) return ion.display
  if (ion.polyatomic) return `(${ion.display})${sub(count)}`
  return `${ion.display}${sub(count)}`
}

export function formatFormula(
  cation: Ion,
  anion: Ion,
  cationCount: number,
  anionCount: number,
  multiplier = 1,
): string {
  const body = `${formatPart(cation, cationCount)}${formatPart(anion, anionCount)}`
  return multiplier > 1 ? `${multiplier}${body}` : body
}

export function formatValencyLabel(v: number): string {
  return v > 0 ? `+${v}` : `${v}`
}
