export type MetalId = 'Zn' | 'Cu' | 'Ag' | 'Pb'
export type CellSide = 'left' | 'right'
export type BridgeStatus = 'connected' | 'missing' | 'clogged'
export type SaltBridgeElectrolyte = 'KNO3' | 'KCl' | 'NaCl'
export type MeterPolarity = 'correct' | 'reversed'
export type ReactionType = 'Standard' | 'Non-Standard' | 'Open-Circuit'
export type ElectronFlowDirection = 'Left-to-Right' | 'Right-to-Left' | 'None'

export type ElectrodeState = {
  metal: MetalId
  ionMetal?: MetalId
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
  halfCellsReady?: boolean
  saltBridgeElectrolyte?: SaltBridgeElectrolyte
  meterPolarity?: MeterPolarity
}

export type MicroState = {
  zincIons: number
  copperIons: number
  silverIons: number
  leadIons: number
  electrons: number
  potassiumIons: number
  nitrateIons: number
  sodiumIons: number
  chlorideIons: number
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
  fault:
    | 'none'
    | 'incomplete-circuit'
    | 'salt-bridge'
    | 'salt-bridge-precipitate'
    | 'oxide-layer'
    | 'same-metal'
    | 'incompatible-half-cell'
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
    sodiumIons: 0,
    chlorideIons: 0,
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
  const leftIonMetal = state.left.ionMetal ?? state.left.metal
  const rightIonMetal = state.right.ionMetal ?? state.right.metal
  const compatibleHalfCells =
    leftIonMetal === state.left.metal && rightIonMetal === state.right.metal
  const sameMetal = state.left.metal === state.right.metal
  const concentrationCell =
    sameMetal &&
    Math.abs(state.left.concentrationM - state.right.concentrationM) > 1e-9
  const anodeSide: CellSide | null = sameMetal
    ? concentrationCell
      ? state.left.concentrationM < state.right.concentrationM
        ? 'left'
        : 'right'
      : null
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
  const chlorideBridge =
    state.saltBridgeElectrolyte === 'KCl' ||
    state.saltBridgeElectrolyte === 'NaCl'
  const chloridePrecipitate =
    chlorideBridge &&
    ([leftIonMetal, rightIonMetal] as MetalId[]).some(
      (metal) => metal === 'Ag' || metal === 'Pb',
    )
  if (state.halfCellsReady === false) fault = 'incomplete-circuit'
  else if (!compatibleHalfCells) fault = 'incompatible-half-cell'
  else if (sameMetal && !concentrationCell) fault = 'same-metal'
  else if (!state.wireConnected || !state.switchClosed) fault = 'incomplete-circuit'
  else if (state.saltBridge !== 'connected') fault = 'salt-bridge'
  else if (chloridePrecipitate) fault = 'salt-bridge-precipitate'
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
  addIonCount(microState, leftIonMetal, Math.max(2, Math.round(state.left.concentrationM * 6)))
  addIonCount(microState, rightIonMetal, Math.max(2, Math.round(state.right.concentrationM * 6)))
  if (operating && anode && cathode) {
    addIonCount(microState, anode.metal, 2)
    addIonCount(microState, cathode.metal, -1)
    microState.electrons = 6
    if (state.saltBridgeElectrolyte === 'NaCl') microState.sodiumIons = 4
    else microState.potassiumIons = 4
    if (
      state.saltBridgeElectrolyte === 'KCl' ||
      state.saltBridgeElectrolyte === 'NaCl'
    ) microState.chlorideIons = 4
    else microState.nitrateIons = 4
  }

  return {
    EMF: rounded(state.meterPolarity === 'reversed' ? -emf : emf),
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
  saltBridgeElectrolyte: 'KNO3',
  wireConnected: true,
  switchClosed: false,
  temperatureK: 298.15,
  currentAmps: 0.15,
  halfCellsReady: true,
  meterPolarity: 'correct',
}
