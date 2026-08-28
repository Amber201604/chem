import type { TranslationKey } from '../i18n/translations'

export type Ion = {
  id: string
  symbol: string
  /** Display symbol with Unicode subscripts where needed */
  display: string
  /** Signed valency / charge magnitude with sign */
  valency: number
  polyatomic: boolean
  nameKey: TranslationKey
}

export const CATIONS: Ion[] = [
  { id: 'Na', symbol: 'Na', display: 'Na', valency: 1, polyatomic: false, nameKey: 'ion.Na' },
  { id: 'Mg', symbol: 'Mg', display: 'Mg', valency: 2, polyatomic: false, nameKey: 'ion.Mg' },
  { id: 'Al', symbol: 'Al', display: 'Al', valency: 3, polyatomic: false, nameKey: 'ion.Al' },
  { id: 'Ca', symbol: 'Ca', display: 'Ca', valency: 2, polyatomic: false, nameKey: 'ion.Ca' },
  { id: 'NH4', symbol: 'NH4', display: 'NH₄', valency: 1, polyatomic: true, nameKey: 'ion.NH4' },
  { id: 'Fe', symbol: 'Fe', display: 'Fe', valency: 3, polyatomic: false, nameKey: 'ion.Fe' },
]

export const ANIONS: Ion[] = [
  { id: 'Cl', symbol: 'Cl', display: 'Cl', valency: -1, polyatomic: false, nameKey: 'ion.Cl' },
  { id: 'O', symbol: 'O', display: 'O', valency: -2, polyatomic: false, nameKey: 'ion.O' },
  { id: 'OH', symbol: 'OH', display: 'OH', valency: -1, polyatomic: true, nameKey: 'ion.OH' },
  { id: 'SO4', symbol: 'SO4', display: 'SO₄', valency: -2, polyatomic: true, nameKey: 'ion.SO4' },
  { id: 'NO3', symbol: 'NO3', display: 'NO₃', valency: -1, polyatomic: true, nameKey: 'ion.NO3' },
]

export type Sample = {
  id: string
  cationId: string
  anionId: string
  label: string
}

export const SAMPLES: Sample[] = [
  { id: 'NaCl', cationId: 'Na', anionId: 'Cl', label: 'NaCl' },
  { id: 'MgO', cationId: 'Mg', anionId: 'O', label: 'MgO' },
  { id: 'Al2O3', cationId: 'Al', anionId: 'O', label: 'Al₂O₃' },
  { id: 'CaCl2', cationId: 'Ca', anionId: 'Cl', label: 'CaCl₂' },
  { id: 'Al2(SO4)3', cationId: 'Al', anionId: 'SO4', label: 'Al₂(SO₄)₃' },
  { id: 'NH4NO3', cationId: 'NH4', anionId: 'NO3', label: 'NH₄NO₃' },
  { id: 'Fe(OH)3', cationId: 'Fe', anionId: 'OH', label: 'Fe(OH)₃' },
  { id: 'Ca(OH)2', cationId: 'Ca', anionId: 'OH', label: 'Ca(OH)₂' },
]

export const STEP_IDS = [
  'mark',
  'cross',
  'subscript',
  'simplify',
  'verify',
] as const

export type StepId = (typeof STEP_IDS)[number]
