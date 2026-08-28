export type AtomModel = {
  id: string
  symbol: string
  display: string
  /** Atomic number Z = proton count */
  protons: number
  neutrons: number
  /** Electron shells from inside out (Bohr model for junior chem) */
  shells: number[]
  /** Electrons lost (+) or gained (−) to form the common ion */
  transfer: number
  /** Hint key suffix for why this valency */
  whyKey: 'lose' | 'gain'
}

/** Single-atom models that support electron fly-away / fly-in */
export const ATOM_MODELS: Record<string, AtomModel> = {
  Na: {
    id: 'Na',
    symbol: 'Na',
    display: 'Na',
    protons: 11,
    neutrons: 12,
    shells: [2, 8, 1],
    transfer: 1,
    whyKey: 'lose',
  },
  Mg: {
    id: 'Mg',
    symbol: 'Mg',
    display: 'Mg',
    protons: 12,
    neutrons: 12,
    shells: [2, 8, 2],
    transfer: 2,
    whyKey: 'lose',
  },
  Al: {
    id: 'Al',
    symbol: 'Al',
    display: 'Al',
    protons: 13,
    neutrons: 14,
    shells: [2, 8, 3],
    transfer: 3,
    whyKey: 'lose',
  },
  Ca: {
    id: 'Ca',
    symbol: 'Ca',
    display: 'Ca',
    protons: 20,
    neutrons: 20,
    shells: [2, 8, 8, 2],
    transfer: 2,
    whyKey: 'lose',
  },
  Fe: {
    id: 'Fe',
    symbol: 'Fe',
    display: 'Fe',
    protons: 26,
    neutrons: 30,
    // Simplified junior-chem shells emphasizing Fe³⁺ (lose 3)
    shells: [2, 8, 13, 3],
    transfer: 3,
    whyKey: 'lose',
  },
  Cl: {
    id: 'Cl',
    symbol: 'Cl',
    display: 'Cl',
    protons: 17,
    neutrons: 18,
    shells: [2, 8, 7],
    transfer: -1,
    whyKey: 'gain',
  },
  O: {
    id: 'O',
    symbol: 'O',
    display: 'O',
    protons: 8,
    neutrons: 8,
    shells: [2, 6],
    transfer: -2,
    whyKey: 'gain',
  },
}

export function getAtomModel(ionId: string): AtomModel | null {
  return ATOM_MODELS[ionId] ?? null
}

export function shellLabel(shells: number[]): string {
  return shells.join(', ')
}

export function ionElectronCount(atom: AtomModel, ionized: boolean): number {
  const neutral = atom.shells.reduce((a, b) => a + b, 0)
  if (!ionized) return neutral
  return neutral - atom.transfer
}

export function ionShells(atom: AtomModel, ionized: boolean): number[] {
  if (!ionized) return [...atom.shells]
  const next = [...atom.shells]
  let remaining = Math.abs(atom.transfer)
  if (atom.transfer > 0) {
    // lose from outermost
    for (let i = next.length - 1; i >= 0 && remaining > 0; i--) {
      const take = Math.min(next[i], remaining)
      next[i] -= take
      remaining -= take
    }
    while (next.length > 1 && next[next.length - 1] === 0) next.pop()
  } else {
    // gain onto outermost
    next[next.length - 1] += remaining
  }
  return next
}
