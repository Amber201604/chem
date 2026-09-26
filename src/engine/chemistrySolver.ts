export type MetalId = 'Zn' | 'Cu' | 'Ag' | 'Pb'
export type CellSide = 'left' | 'right'
export type BridgeStatus = 'connected' | 'missing' | 'clogged'
export type ReactionType = 'Standard' | 'Non-Standard' | 'Open-Circuit'
export type ElectronFlowDirection = 'Left-to-Right' | 'Right-to-Left' | 'None'

export type ElectrodeState = {
  metal: MetalId
  concentrationM: number
  polished: boolean
}

export type LabState = {
  left: ElectrodeState
  right: ElectrodeState
  saltBridge: BridgeStatus
  wireConnected: boolean
  switchClosed: boolean
  temperatureK: number
  currentAmps: number
}

export type MicroState = {
  zincIons: number
  copperIons: number
  silverIons: number
  leadIons: number
  electrons: number
  potassiumIons: number
  nitrateIons: number
}

export type ChemistryResult = {
  EMF: number
  standardEMF: number
  reactionType: ReactionType
  electronFlowDirection: ElectronFlowDirection
  anodeSide: CellSide | null
  cathodeSide: CellSide | null
  anodeMassDelta: number
  cathodeMassDelta: number
  reactionQuotient: number
  electronsTransferred: number
  fault: 'none' | 'incomplete-circuit' | 'salt-bridge' | 'oxide-layer' | 'same-metal'
  microState: MicroState
}

type MetalData = {
  reductionPotential: number
  electronCount: number
  molarMass: number
}

export const METALS: Record<MetalId, MetalData> = {
  Zn: { reductionPotential: -0.76, electronCount: 2, molarMass: 65.38 },
  Cu: { reductionPotential: 0.34, electronCount: 2, molarMass: 63.546 },
  Ag: { reductionPotential: 0.8, electronCount: 1, molarMass: 107.8682 },
  Pb: { reductionPotential: -0.13, electronCount: 2, molarMass: 207.2 },
}

const GAS_CONSTANT = 8.314462618
const FARADAY_CONSTANT = 96485.33212

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const lcm = (a: number, b: number) => Math.abs(a * b) / gcd(a, b)
const clampConcentration = (value: number) => Math.max(1e-6, value)
const rounded = (value: number, digits = 4) => Number(value.toFixed(digits))

function emptyMicroState(): MicroState {
  return {
    zincIons: 0,
    copperIons: 0,
    silverIons: 0,
    leadIons: 0,
    electrons: 0,
    potassiumIons: 0,
    nitrateIons: 0,
  }
}

function addIonCount(state: MicroState, metal: MetalId, count: number) {
  if (metal === 'Zn') state.zincIons += count
  if (metal === 'Cu') state.copperIons += count
  if (metal === 'Ag') state.silverIons += count
  if (metal === 'Pb') state.leadIons += count
}

export function solveChemistry(state: LabState): ChemistryResult {
  const leftData = METALS[state.left.metal]
  const rightData = METALS[state.right.metal]
  const sameMetal = state.left.metal === state.right.metal
  const anodeSide: CellSide | null = sameMetal
    ? null
    : leftData.reductionPotential < rightData.reductionPotential
      ? 'left'
      : 'right'
  const cathodeSide: CellSide | null = anodeSide === null ? null : anodeSide === 'left' ? 'right' : 'left'
  const anode = anodeSide ? state[anodeSide] : null
  const cathode = cathodeSide ? state[cathodeSide] : null
  const anodeData = anode ? METALS[anode.metal] : null
  const cathodeData = cathode ? METALS[cathode.metal] : null
  const standardEMF =
    anodeData && cathodeData
      ? cathodeData.reductionPotential - anodeData.reductionPotential
      : 0

  let fault: ChemistryResult['fault'] = 'none'
  if (sameMetal) fault = 'same-metal'
  else if (!state.wireConnected || !state.switchClosed) fault = 'incomplete-circuit'
  else if (state.saltBridge !== 'connected') fault = 'salt-bridge'
  else if (!state.left.polished || !state.right.polished) fault = 'oxide-layer'

  const electronCount =
    anodeData && cathodeData
      ? lcm(anodeData.electronCount, cathodeData.electronCount)
      : 0
  const anodeCoefficient = anodeData ? electronCount / anodeData.electronCount : 0
  const cathodeCoefficient = cathodeData ? electronCount / cathodeData.electronCount : 0
  const reactionQuotient =
    anode && cathode
      ? Math.pow(clampConcentration(anode.concentrationM), anodeCoefficient) /
        Math.pow(clampConcentration(cathode.concentrationM), cathodeCoefficient)
      : 1
  const nernstEMF =
    electronCount > 0
      ? standardEMF -
        ((GAS_CONSTANT * state.temperatureK) / (electronCount * FARADAY_CONSTANT)) *
          Math.log(reactionQuotient)
      : 0
  const isStandard =
    Math.abs(state.left.concentrationM - 1) < 1e-9 &&
    Math.abs(state.right.concentrationM - 1) < 1e-9 &&
    Math.abs(state.temperatureK - 298.15) < 0.01
  const operating = fault === 'none'
  const emf = operating ? Math.max(0, nernstEMF) : 0

  const anodeMassRate =
    operating && anodeData
      ? -(state.currentAmps * anodeData.molarMass) /
        (anodeData.electronCount * FARADAY_CONSTANT)
      : 0
  const cathodeMassRate =
    operating && cathodeData
      ? (state.currentAmps * cathodeData.molarMass) /
        (cathodeData.electronCount * FARADAY_CONSTANT)
      : 0

  const microState = emptyMicroState()
  addIonCount(microState, state.left.metal, Math.max(2, Math.round(state.left.concentrationM * 6)))
  addIonCount(microState, state.right.metal, Math.max(2, Math.round(state.right.concentrationM * 6)))
  if (operating && anode && cathode) {
    addIonCount(microState, anode.metal, 2)
    addIonCount(microState, cathode.metal, -1)
    microState.electrons = 6
    microState.potassiumIons = 4
    microState.nitrateIons = 4
  }

  return {
    EMF: rounded(emf),
    standardEMF: rounded(standardEMF),
    reactionType: operating ? (isStandard ? 'Standard' : 'Non-Standard') : 'Open-Circuit',
    electronFlowDirection:
      !operating || !anodeSide
        ? 'None'
        : anodeSide === 'left'
          ? 'Left-to-Right'
          : 'Right-to-Left',
    anodeSide,
    cathodeSide,
    anodeMassDelta: rounded(anodeMassRate, 9),
    cathodeMassDelta: rounded(cathodeMassRate, 9),
    reactionQuotient: rounded(reactionQuotient, 6),
    electronsTransferred: electronCount,
    fault,
    microState,
  }
}

export const DEFAULT_DANIELL_STATE: LabState = {
  left: { metal: 'Zn', concentrationM: 1, polished: true },
  right: { metal: 'Cu', concentrationM: 1, polished: true },
  saltBridge: 'connected',
  wireConnected: true,
  switchClosed: false,
  temperatureK: 298.15,
  currentAmps: 0.15,
}
