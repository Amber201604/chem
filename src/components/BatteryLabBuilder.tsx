import {
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  DEFAULT_DANIELL_STATE,
  METALS,
  solveChemistry,
  type CellSide,
  type ChemistryResult,
  type MetalId,
  type SaltBridgeElectrolyte,
} from '../engine/chemistrySolver'
import { useI18n } from '../i18n/I18nProvider'
import './BatteryLabBuilder.css'

type SolutionId = 'ZnSO4' | 'CuSO4' | 'AgNO3' | 'PbNO3' | 'PbCl2'
type ItemId =
  | 'beaker'
  | 'wire'
  | 'meter'
  | 'sandpaper'
  | `metal:${MetalId}`
  | `solution:${SolutionId}`
  | `bridge:${SaltBridgeElectrolyte}`
type DropTarget =
  | 'left-beaker'
  | 'right-beaker'
  | 'left-electrode'
  | 'right-electrode'
  | 'left-solution'
  | 'right-solution'
  | 'circuit'
  | 'bridge'
type ViewMode = 'macro' | 'micro'
type TutorTab = 'coach' | 'practice'
type Message = { role: 'tutor' | 'student'; text: string }

type Assembly = {
  leftBeaker: boolean
  rightBeaker: boolean
  leftMetal: MetalId | null
  rightMetal: MetalId | null
  leftSolution: SolutionId | null
  rightSolution: SolutionId | null
  wire: boolean
  meter: boolean
  bridge: SaltBridgeElectrolyte | null
  leftPolished: boolean
  rightPolished: boolean
  meterReversed: boolean
}

const EMPTY_ASSEMBLY: Assembly = {
  leftBeaker: false,
  rightBeaker: false,
  leftMetal: null,
  rightMetal: null,
  leftSolution: null,
  rightSolution: null,
  wire: false,
  meter: false,
  bridge: null,
  leftPolished: false,
  rightPolished: false,
  meterReversed: false,
}

const DANIELL_ASSEMBLY: Assembly = {
  leftBeaker: true,
  rightBeaker: true,
  leftMetal: 'Zn',
  rightMetal: 'Cu',
  leftSolution: 'ZnSO4',
  rightSolution: 'CuSO4',
  wire: true,
  meter: true,
  bridge: 'KNO3',
  leftPolished: true,
  rightPolished: true,
  meterReversed: false,
}

const SOLUTIONS: Record<
  SolutionId,
  { formula: string; ionMetal: MetalId; anion: string; color: string; note?: string }
> = {
  ZnSO4: { formula: 'ZnSO₄', ionMetal: 'Zn', anion: 'SO₄²⁻', color: '#9dbbc6' },
  CuSO4: { formula: 'CuSO₄', ionMetal: 'Cu', anion: 'SO₄²⁻', color: '#1599c7' },
  AgNO3: { formula: 'AgNO₃', ionMetal: 'Ag', anion: 'NO₃⁻', color: '#cbdde1' },
  PbNO3: { formula: 'Pb(NO₃)₂', ionMetal: 'Pb', anion: 'NO₃⁻', color: '#b8c9c4' },
  PbCl2: { formula: 'PbCl₂ (sat.)', ionMetal: 'Pb', anion: 'Cl⁻', color: '#c8cfbf', note: 'low-solubility' },
}

const METAL_COLOR: Record<MetalId, string> = {
  Zn: '#aeb9b7',
  Cu: '#b96b43',
  Ag: '#d8e1e4',
  Pb: '#747f83',
}

const METAL_ION: Record<MetalId, string> = {
  Zn: 'Zn²⁺',
  Cu: 'Cu²⁺',
  Ag: 'Ag⁺',
  Pb: 'Pb²⁺',
}

const text = {
  en: {
    eyebrow: 'AP CHEMISTRY · UNIT 9 · OPEN LAB',
    title: 'Build Your Own Galvanic Cell',
    subtitle: 'Drag every component onto the bench. The rule engine evaluates the cell you actually build.',
    objective: 'AP SKILLS',
    objectiveText: 'Design a cell, predict polarity, calculate Ecell, and diagnose non-working configurations.',
    inventory: 'Apparatus shelf',
    inventoryHint: 'Drag, or select then tap a target',
    glassware: 'Glassware',
    metals: 'Metal electrodes',
    solutions: 'Half-cell solutions',
    circuit: 'Circuit & preparation',
    bridges: 'Salt bridges',
    beaker: '250 mL beaker',
    wire: 'Connecting wire',
    meter: 'Digital voltmeter',
    sandpaper: 'Sandpaper',
    clear: 'Clear bench',
    preset: 'Load Zn/Cu example',
    macro: 'Build view',
    micro: 'Particle view',
    live: 'MEASURED VOLTAGE',
    open: 'open circuit',
    standard: 'standard',
    nonstandard: 'Nernst-adjusted',
    bench: 'Assembly bench',
    dropCircuit: 'Drop wire + voltmeter here',
    dropBeaker: 'Drop a beaker',
    dropMetal: 'Drop metal electrode',
    dropSolution: 'Pour a solution',
    dropBridge: 'Drop salt bridge',
    unpolished: 'oxidized surface',
    polished: 'polished',
    sandHint: 'Drop sandpaper on each electrode before running.',
    normalLeads: 'Red lead → cathode',
    reverseLeads: 'Leads reversed',
    reverse: 'Reverse meter leads',
    remove: 'Remove',
    concentration: 'Concentration',
    run: 'Run experiment',
    stop: 'Open switch',
    progress: 'assembly complete',
    evidence: 'Rule-engine diagnosis',
    ready: 'Cell ready. Close the switch and compare your prediction with the meter.',
    incomplete: 'The circuit is incomplete. Check every dashed drop zone.',
    mismatch: 'A metal electrode is not immersed in a solution containing its own ions.',
    oxide: 'An oxide layer blocks effective electrical contact. Polish both electrodes.',
    precipitate: 'Cl⁻ forms a precipitate with Ag⁺ or Pb²⁺ and blocks the ionic pathway.',
    saltFault: 'The ionic pathway is missing or blocked.',
    same: 'Identical half-cells have no driving force. Try different concentrations for a concentration cell.',
    reversed: 'The negative sign is a meter-lead convention; the spontaneous reaction direction has not reversed.',
    anode: 'ANODE · OXIDATION',
    cathode: 'CATHODE · REDUCTION',
    massDown: 'electrode mass decreases',
    massUp: 'electrode mass increases',
    particleTitle: 'Microscopic charge map',
    particleNote: 'Representative particles only · not count, path, speed, or scale',
    returnBuild: 'Return to Build view to change apparatus.',
    tutor: 'AI Lab Coach',
    tutorSub: 'Socratic · reads this exact setup',
    coach: 'Coach',
    practice: 'AP Practice',
    welcome: 'Build a cell first. Which two independent charge pathways must both be complete?',
    quickZero: 'Why is my voltage zero?',
    quickSign: 'Why is the reading negative?',
    quickBridge: 'Is this salt bridge suitable?',
    input: 'Ask about your setup…',
    send: 'Send',
    missingPrompt: 'Name the path for electrons and the path for ions. Which path is incomplete on your bench?',
    mismatchPrompt: 'Compare each metal label with the cation in its solution. Do both half-cells represent a valid Mⁿ⁺/M couple?',
    oxidePrompt: 'What must electrons cross at the metal surface? How might a dull oxide coating affect that transfer?',
    precipPrompt: 'Check the solubility rules: what happens when Cl⁻ meets Ag⁺ or Pb²⁺?',
    reversePrompt: 'Did the chemistry reverse, or did the reference direction of the voltmeter change?',
    genericPrompt: 'Use reduction potentials to identify the cathode. Which half-reaction has the more positive E°red?',
    teacher: 'Teacher controls',
    misconception: 'Misconception to target',
    misconceptionPlaceholder: 'e.g. Student chooses anode from physical left/right position.',
    level: 'Student readiness',
    novice: 'Novice',
    intermediate: 'Intermediate',
    exam: 'AP Exam Prep',
    apply: 'Apply context',
    applied: 'Context applied',
    generated: 'Generated from the assembled cell · not an official AP question',
    practiceTitle: 'State-based checkpoint',
    check: 'Check answer',
    retry: 'Not yet. Trace the evidence in your assembled cell and try again.',
    official: 'Official released AP Chemistry FRQs ↗',
    model: 'Reality check',
    modelText: 'A 0.00 V fault represents no sustained operation in this teaching model. A high-impedance real meter may briefly detect open-circuit potential.',
  },
  zh: {
    eyebrow: 'AP 化学 · 第 9 单元 · 开放实验',
    title: '自由搭建原电池',
    subtitle: '把每件器材拖到实验台；规则引擎只评估你实际搭出的装置。',
    objective: 'AP 核心技能',
    objectiveText: '设计原电池、预测正负极、计算 Ecell，并诊断不能工作的装置。',
    inventory: '器材架',
    inventoryHint: '拖拽；也可先选中再点击投放区',
    glassware: '玻璃仪器',
    metals: '金属电极',
    solutions: '半电池溶液',
    circuit: '电路与预处理',
    bridges: '盐桥',
    beaker: '250 mL 烧杯',
    wire: '连接导线',
    meter: '数字电压表',
    sandpaper: '砂纸',
    clear: '清空实验台',
    preset: '载入 Zn/Cu 示例',
    macro: '搭建视图',
    micro: '微观视图',
    live: '电压表实测值',
    open: '开路',
    standard: '标准状态',
    nonstandard: '能斯特修正',
    bench: '实验搭建台',
    dropCircuit: '把导线和电压表拖到这里',
    dropBeaker: '放置烧杯',
    dropMetal: '放入金属电极',
    dropSolution: '倒入溶液',
    dropBridge: '放置盐桥',
    unpolished: '表面有氧化层',
    polished: '已打磨',
    sandHint: '实验前把砂纸拖到两个电极上。',
    normalLeads: '红表笔 → 阴极',
    reverseLeads: '正负表笔接反',
    reverse: '调换电压表表笔',
    remove: '移除',
    concentration: '浓度',
    run: '开始实验',
    stop: '断开开关',
    progress: '装置完成度',
    evidence: '规则引擎诊断',
    ready: '装置已完整。闭合开关，把预测值和电压表读数比较。',
    incomplete: '电路不完整，请检查所有虚线投放区。',
    mismatch: '金属电极没有浸在含有其自身离子的溶液中。',
    oxide: '氧化层妨碍有效电接触，请先打磨两个电极。',
    precipitate: 'Cl⁻ 与 Ag⁺ 或 Pb²⁺ 形成沉淀，堵塞内部离子通路。',
    saltFault: '内部离子通路缺失或堵塞。',
    same: '完全相同的半电池没有驱动力；可改变浓度搭建浓差电池。',
    reversed: '负号来自电压表参考方向；自发反应方向并没有反转。',
    anode: '阳极 · 氧化',
    cathode: '阴极 · 还原',
    massDown: '电极质量减小',
    massUp: '电极质量增加',
    particleTitle: '微观电荷图',
    particleNote: '仅为代表性粒子 · 不表示真实数量、路径、速度或尺度',
    returnBuild: '返回搭建视图可以更换器材。',
    tutor: 'AI 实验导师',
    tutorSub: '苏格拉底式 · 读取当前装置',
    coach: '导师',
    practice: 'AP 练习',
    welcome: '先搭建电池：哪两条彼此独立的电荷通路必须同时完整？',
    quickZero: '为什么电压为零？',
    quickSign: '为什么读数是负数？',
    quickBridge: '这个盐桥合适吗？',
    input: '询问当前装置…',
    send: '发送',
    missingPrompt: '分别说出电子和离子的通路。当前实验台上哪条通路没有完整接通？',
    mismatchPrompt: '比较金属标签和溶液中的阳离子。两个半电池都是有效的 Mⁿ⁺/M 电对吗？',
    oxidePrompt: '电子在金属表面必须经过什么？暗淡的氧化层会怎样影响转移？',
    precipPrompt: '查溶解性规则：Cl⁻ 遇到 Ag⁺ 或 Pb²⁺ 会发生什么？',
    reversePrompt: '是化学反应反向了，还是电压表的参考方向改变了？',
    genericPrompt: '用标准还原电势判断阴极：哪一个半反应的 E°red 更正？',
    teacher: '教师控制台',
    misconception: '本次聚焦的易错点',
    misconceptionPlaceholder: '例如：学生按物理左右位置判断阳极。',
    level: '学生程度',
    novice: '初学',
    intermediate: '进阶',
    exam: 'AP 备考',
    apply: '应用上下文',
    applied: '上下文已应用',
    generated: '根据当前装置生成 · 非 AP 官方试题',
    practiceTitle: '装置状态检测题',
    check: '检查答案',
    retry: '还不对。沿当前装置中的证据链再推一次。',
    official: 'AP 化学官方公开 FRQ ↗',
    model: '真实世界边界',
    modelText: '本教学模型用 0.00 V 表示不能持续工作；真实高内阻电压表仍可能短暂测到开路电势。',
  },
  fr: {
    eyebrow: 'CHIMIE AP · UNITÉ 9 · LABO OUVERT',
    title: 'Construire une pile galvanique',
    subtitle: 'Glissez chaque appareil sur le banc ; le moteur évalue le montage réellement construit.',
    objective: 'COMPÉTENCES AP',
    objectiveText: 'Concevoir une pile, prévoir la polarité, calculer Ecell et diagnostiquer les pannes.',
    inventory: 'Étagère de matériel',
    inventoryHint: 'Glisser, ou sélectionner puis toucher une cible',
    glassware: 'Verrerie',
    metals: 'Électrodes métalliques',
    solutions: 'Solutions de demi-pile',
    circuit: 'Circuit et préparation',
    bridges: 'Ponts salins',
    beaker: 'Bécher 250 mL',
    wire: 'Fil conducteur',
    meter: 'Voltmètre numérique',
    sandpaper: 'Papier abrasif',
    clear: 'Vider le banc',
    preset: 'Charger Zn/Cu',
    macro: 'Vue montage',
    micro: 'Vue particulaire',
    live: 'TENSION MESURÉE',
    open: 'circuit ouvert',
    standard: 'standard',
    nonstandard: 'corrigé par Nernst',
    bench: 'Banc de montage',
    dropCircuit: 'Déposer fil + voltmètre',
    dropBeaker: 'Déposer un bécher',
    dropMetal: 'Déposer une électrode',
    dropSolution: 'Verser une solution',
    dropBridge: 'Déposer un pont salin',
    unpolished: 'surface oxydée',
    polished: 'polie',
    sandHint: 'Glissez le papier abrasif sur chaque électrode.',
    normalLeads: 'Fil rouge → cathode',
    reverseLeads: 'Fils inversés',
    reverse: 'Inverser les fils',
    remove: 'Retirer',
    concentration: 'Concentration',
    run: 'Lancer',
    stop: 'Ouvrir le circuit',
    progress: 'montage complet',
    evidence: 'Diagnostic du moteur',
    ready: 'Pile prête. Fermez le circuit et comparez votre prévision à la mesure.',
    incomplete: 'Circuit incomplet. Vérifiez chaque zone en pointillés.',
    mismatch: 'Une électrode ne baigne pas dans une solution contenant ses propres ions.',
    oxide: 'Une couche d’oxyde gêne le contact. Polissez les deux électrodes.',
    precipitate: 'Cl⁻ précipite avec Ag⁺ ou Pb²⁺ et bloque la voie ionique.',
    saltFault: 'La voie ionique est absente ou bloquée.',
    same: 'Deux demi-piles identiques n’ont aucune force motrice. Changez les concentrations.',
    reversed: 'Le signe négatif vient des fils du voltmètre ; la réaction spontanée ne s’est pas inversée.',
    anode: 'ANODE · OXYDATION',
    cathode: 'CATHODE · RÉDUCTION',
    massDown: 'la masse diminue',
    massUp: 'la masse augmente',
    particleTitle: 'Carte microscopique des charges',
    particleNote: 'Particules représentatives · ni quantité, trajet, vitesse ou échelle réels',
    returnBuild: 'Revenez à la vue montage pour changer le matériel.',
    tutor: 'Coach IA',
    tutorSub: 'Socratique · lit ce montage exact',
    coach: 'Coach',
    practice: 'Exercice AP',
    welcome: 'Construisez une pile. Quelles deux voies de charge doivent être complètes ?',
    quickZero: 'Pourquoi la tension est-elle nulle ?',
    quickSign: 'Pourquoi la mesure est-elle négative ?',
    quickBridge: 'Ce pont salin convient-il ?',
    input: 'Question sur ce montage…',
    send: 'Envoyer',
    missingPrompt: 'Nommez la voie des électrons et celle des ions. Laquelle est incomplète ?',
    mismatchPrompt: 'Comparez chaque métal au cation de sa solution. Les deux couples Mⁿ⁺/M sont-ils valides ?',
    oxidePrompt: 'Que doivent franchir les électrons à la surface ? Quel effet a une couche d’oxyde ?',
    precipPrompt: 'Règles de solubilité : que se passe-t-il entre Cl⁻ et Ag⁺ ou Pb²⁺ ?',
    reversePrompt: 'La chimie s’est-elle inversée, ou seulement la référence du voltmètre ?',
    genericPrompt: 'Utilisez les potentiels de réduction : quelle demi-réaction a le E°red le plus positif ?',
    teacher: 'Contrôles enseignant',
    misconception: 'Idée fausse ciblée',
    misconceptionPlaceholder: 'ex. L’élève choisit l’anode selon sa position gauche/droite.',
    level: 'Niveau',
    novice: 'Débutant',
    intermediate: 'Intermédiaire',
    exam: 'Préparation AP',
    apply: 'Appliquer',
    applied: 'Contexte appliqué',
    generated: 'Généré depuis ce montage · question AP non officielle',
    practiceTitle: 'Vérification selon le montage',
    check: 'Vérifier',
    retry: 'Pas encore. Suivez les preuves dans votre montage.',
    official: 'FRQ officielles publiées par AP Chemistry ↗',
    model: 'Limite du modèle',
    modelText: 'Ici 0,00 V signifie aucun fonctionnement soutenu ; un vrai voltmètre peut brièvement détecter un potentiel ouvert.',
  },
} as const

function charge(metal: MetalId) {
  return METALS[metal].electronCount
}

function halfEquation(metal: MetalId, oxidation: boolean) {
  const ion = METAL_ION[metal]
  const electrons = `${charge(metal)}e⁻`
  return oxidation
    ? `${metal}(s) → ${ion}(aq) + ${electrons}`
    : `${ion}(aq) + ${electrons} → ${metal}(s)`
}

export function BatteryLabBuilder() {
  const { locale } = useI18n()
  const c = text[locale]
  const [assembly, setAssembly] = useState<Assembly>(EMPTY_ASSEMBLY)
  const [selectedItem, setSelectedItem] = useState<ItemId | null>(null)
  const [leftConcentration, setLeftConcentration] = useState(1)
  const [rightConcentration, setRightConcentration] = useState(1)
  const [running, setRunning] = useState(false)
  const [view, setView] = useState<ViewMode>('macro')
  const [tab, setTab] = useState<TutorTab>('coach')
  const [messages, setMessages] = useState<Message[]>([{ role: 'tutor', text: c.welcome }])
  const [draft, setDraft] = useState('')
  const [teacherOpen, setTeacherOpen] = useState(false)
  const [misconception, setMisconception] = useState('')
  const [level, setLevel] = useState('intermediate')
  const [contextApplied, setContextApplied] = useState(false)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)

  const leftSolution = assembly.leftSolution ? SOLUTIONS[assembly.leftSolution] : null
  const rightSolution = assembly.rightSolution ? SOLUTIONS[assembly.rightSolution] : null
  const readyParts = [
    assembly.leftBeaker,
    assembly.rightBeaker,
    assembly.leftMetal,
    assembly.rightMetal,
    assembly.leftSolution,
    assembly.rightSolution,
    assembly.wire,
    assembly.meter,
    assembly.bridge,
  ].filter(Boolean).length
  const apparatusReady = readyParts === 9

  const labState = useMemo(
    () => ({
      ...DEFAULT_DANIELL_STATE,
      left: {
        metal: assembly.leftMetal ?? 'Zn',
        ionMetal: leftSolution?.ionMetal ?? 'Zn',
        concentrationM: leftConcentration,
        polished: assembly.leftPolished,
      },
      right: {
        metal: assembly.rightMetal ?? 'Cu',
        ionMetal: rightSolution?.ionMetal ?? 'Cu',
        concentrationM: rightConcentration,
        polished: assembly.rightPolished,
      },
      halfCellsReady: apparatusReady,
      wireConnected: assembly.wire && assembly.meter,
      saltBridge: assembly.bridge ? ('connected' as const) : ('missing' as const),
      saltBridgeElectrolyte: assembly.bridge ?? 'KNO3',
      meterPolarity: assembly.meterReversed ? ('reversed' as const) : ('correct' as const),
      switchClosed: running,
    }),
    [
      apparatusReady,
      assembly,
      leftConcentration,
      leftSolution,
      rightConcentration,
      rightSolution,
      running,
    ],
  )
  const result = useMemo(() => solveChemistry(labState), [labState])
  const operating = result.reactionType !== 'Open-Circuit'
  const anodeMetal = result.anodeSide ? labState[result.anodeSide].metal : null
  const cathodeMetal = result.cathodeSide ? labState[result.cathodeSide].metal : null

  const diagnosis = useMemo(() => {
    if (result.fault === 'incomplete-circuit') return c.incomplete
    if (result.fault === 'incompatible-half-cell') return c.mismatch
    if (result.fault === 'oxide-layer') return c.oxide
    if (result.fault === 'salt-bridge-precipitate') return c.precipitate
    if (result.fault === 'salt-bridge') return c.saltFault
    if (result.fault === 'same-metal') return c.same
    if (operating && assembly.meterReversed) return c.reversed
    return c.ready
  }, [assembly.meterReversed, c, operating, result.fault])

  const practice = useMemo(
    () => makePractice(locale, result, assembly, anodeMetal, cathodeMetal),
    [anodeMetal, assembly, cathodeMetal, locale, result],
  )

  const resetQuestion = () => {
    setAnswer('')
    setChecked(false)
  }

  const placeItem = (item: ItemId, target: DropTarget) => {
    setRunning(false)
    resetQuestion()
    const side = target.startsWith('left-')
      ? 'left'
      : target.startsWith('right-')
        ? 'right'
        : null
    const routedTarget: DropTarget =
      item === 'beaker' && side
        ? `${side}-beaker`
        : item.startsWith('metal:') && side
          ? `${side}-electrode`
          : item.startsWith('solution:') && side
            ? `${side}-solution`
            : item === 'sandpaper' && side
              ? `${side}-electrode`
              : target
    setAssembly((current) => {
      const next = { ...current }
      if (item === 'beaker' && routedTarget === 'left-beaker') next.leftBeaker = true
      else if (item === 'beaker' && routedTarget === 'right-beaker') next.rightBeaker = true
      else if (item.startsWith('metal:') && routedTarget === 'left-electrode') {
        next.leftMetal = item.slice(6) as MetalId
        next.leftPolished = false
      } else if (item.startsWith('metal:') && routedTarget === 'right-electrode') {
        next.rightMetal = item.slice(6) as MetalId
        next.rightPolished = false
      } else if (item.startsWith('solution:') && routedTarget === 'left-solution' && next.leftBeaker) {
        next.leftSolution = item.slice(9) as SolutionId
      } else if (item.startsWith('solution:') && routedTarget === 'right-solution' && next.rightBeaker) {
        next.rightSolution = item.slice(9) as SolutionId
      } else if (item === 'wire' && routedTarget === 'circuit') next.wire = true
      else if (item === 'meter' && routedTarget === 'circuit') next.meter = true
      else if (item.startsWith('bridge:') && routedTarget === 'bridge') {
        next.bridge = item.slice(7) as SaltBridgeElectrolyte
      } else if (item === 'sandpaper' && routedTarget === 'left-electrode' && next.leftMetal) {
        next.leftPolished = true
      } else if (item === 'sandpaper' && routedTarget === 'right-electrode' && next.rightMetal) {
        next.rightPolished = true
      }
      return next
    })
    setSelectedItem(null)
  }

  const drop = (event: DragEvent, target: DropTarget) => {
    event.preventDefault()
    const item = event.dataTransfer.getData('text/plain') as ItemId
    if (item) placeItem(item, target)
  }

  const clickTarget = (target: DropTarget) => {
    if (selectedItem) placeItem(selectedItem, target)
  }

  const clearBench = () => {
    setAssembly(EMPTY_ASSEMBLY)
    setRunning(false)
    setAnswer('')
    setChecked(false)
  }

  const askTutor = (question: string) => {
    let response: string = c.genericPrompt
    if (result.fault === 'incomplete-circuit') response = c.missingPrompt
    else if (result.fault === 'incompatible-half-cell') response = c.mismatchPrompt
    else if (result.fault === 'oxide-layer') response = c.oxidePrompt
    else if (result.fault === 'salt-bridge-precipitate') response = c.precipPrompt
    else if (assembly.meterReversed || question.toLowerCase().includes('negative') || question.includes('负')) response = c.reversePrompt
    if (contextApplied && misconception.trim()) response = `${response} (${c.misconception}: ${misconception.trim()})`
    setMessages((current) => [...current, { role: 'student', text: question }, { role: 'tutor', text: response }])
    setDraft('')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (draft.trim()) askTutor(draft.trim())
  }

  return (
    <section className="builder-lab">
      <header className="builder-hero">
        <div><span>{c.eyebrow}</span><h2>{c.title}</h2><p>{c.subtitle}</p></div>
        <aside><small>{c.objective}</small><strong>{c.objectiveText}</strong></aside>
      </header>

      <div className="builder-page">
        <main className="builder-sandbox panel">
          <div className="builder-toolbar">
            <div className="builder-view-tabs">
              <button type="button" className={view === 'macro' ? 'is-active' : ''} onClick={() => setView('macro')}>◫ {c.macro}</button>
              <button type="button" className={view === 'micro' ? 'is-active' : ''} onClick={() => setView('micro')}>⌬ {c.micro}</button>
            </div>
            <div className={`builder-meter-readout ${operating ? 'is-live' : ''}`}>
              <small>{c.live}</small><strong>{result.EMF.toFixed(2)} <i>V</i></strong><span>{result.reactionType === 'Standard' ? c.standard : result.reactionType === 'Non-Standard' ? c.nonstandard : c.open}</span>
            </div>
          </div>

          <div className="builder-main">
            <ApparatusShelf c={c} selected={selectedItem} onSelect={setSelectedItem} onClear={clearBench} onPreset={() => { setAssembly(DANIELL_ASSEMBLY); setRunning(false); resetQuestion() }} />
            <div className="builder-workspace">
              {view === 'macro' ? (
                <Workbench
                  c={c}
                  assembly={assembly}
                  result={result}
                  running={operating}
                  leftSolution={leftSolution}
                  rightSolution={rightSolution}
                  selectedItem={selectedItem}
                  onDrop={drop}
                  onTarget={clickTarget}
                  onRemove={(key) => { setAssembly((x) => ({ ...x, [key]: key.includes('Polished') || key.includes('Beaker') || key === 'wire' || key === 'meter' ? false : null })); setRunning(false) }}
                />
              ) : (
                <ParticleView c={c} assembly={assembly} result={result} leftSolution={leftSolution} rightSolution={rightSolution} running={operating} />
              )}

              <div className="builder-config">
                <div className="builder-config__head"><strong>{c.bench}</strong><span>{readyParts}/9 {c.progress}</span></div>
                <div className="builder-sliders">
                  <label><span>{leftSolution?.formula ?? '—'} {c.concentration}<b>{leftConcentration.toFixed(1)} M</b></span><input type="range" min=".1" max="2" step=".1" value={leftConcentration} onChange={(event) => { setLeftConcentration(Number(event.target.value)); setRunning(false) }} /></label>
                  <label><span>{rightSolution?.formula ?? '—'} {c.concentration}<b>{rightConcentration.toFixed(1)} M</b></span><input type="range" min=".1" max="2" step=".1" value={rightConcentration} onChange={(event) => { setRightConcentration(Number(event.target.value)); setRunning(false) }} /></label>
                  <button type="button" className={assembly.meterReversed ? 'is-reversed' : ''} disabled={!assembly.meter} onClick={() => { setAssembly((x) => ({ ...x, meterReversed: !x.meterReversed })); setRunning(false); resetQuestion() }}>± {assembly.meterReversed ? c.reverseLeads : c.normalLeads}<small>{c.reverse}</small></button>
                  <button type="button" className={`builder-run ${operating ? 'is-running' : ''}`} onClick={() => setRunning((x) => !x)}>{operating ? `■ ${c.stop}` : `▶ ${c.run}`}</button>
                </div>
              </div>

              <div className={`builder-diagnosis fault-${result.fault}`}>
                <span>{c.evidence}</span><strong>{diagnosis}</strong>
                {anodeMetal && cathodeMetal && <div><code>{c.anode}: {halfEquation(anodeMetal, true)}</code><b>e⁻ {result.electronFlowDirection === 'Right-to-Left' ? '←' : '→'}</b><code>{c.cathode}: {halfEquation(cathodeMetal, false)}</code></div>}
              </div>
              <div className="builder-model-note"><strong>{c.model}</strong><span>{c.modelText}</span></div>
            </div>
          </div>
        </main>

        <aside className="builder-tutor panel">
          <header><div className="builder-ai">AI</div><div><h3>{c.tutor}</h3><p><i /> {c.tutorSub}</p></div><button type="button" onClick={() => setTeacherOpen((x) => !x)}>⚙</button></header>
          {teacherOpen && <div className="builder-teacher"><strong>{c.teacher}</strong><label>{c.misconception}<textarea value={misconception} placeholder={c.misconceptionPlaceholder} onChange={(event) => { setMisconception(event.target.value); setContextApplied(false) }} /></label><label>{c.level}<select value={level} onChange={(event) => { setLevel(event.target.value); setContextApplied(false) }}><option value="novice">{c.novice}</option><option value="intermediate">{c.intermediate}</option><option value="exam">{c.exam}</option></select></label><button type="button" onClick={() => setContextApplied(true)}>{contextApplied ? `✓ ${c.applied}` : c.apply}</button></div>}
          <nav><button type="button" className={tab === 'coach' ? 'is-active' : ''} onClick={() => setTab('coach')}>{c.coach}</button><button type="button" className={tab === 'practice' ? 'is-active' : ''} onClick={() => setTab('practice')}>{c.practice}</button></nav>
          {tab === 'coach' ? (
            <>
              <div className="builder-chat">{messages.map((message, index) => <div className={`builder-message is-${message.role}`} key={`${message.role}-${index}`}>{message.role === 'tutor' && <b>AI</b>}<p>{message.text}</p></div>)}</div>
              <div className="builder-quick">{[c.quickZero, c.quickSign, c.quickBridge].map((question) => <button type="button" key={question} onClick={() => askTutor(question)}>{question}</button>)}</div>
              <form className="builder-chatbox" onSubmit={submit}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={c.input} /><button type="submit" disabled={!draft.trim()} aria-label={c.send}>↑</button></form>
            </>
          ) : (
            <div className="builder-practice">
              <span>{c.generated}</span><h3>{c.practiceTitle}</h3><p>{practice.question}</p>
              <div>{practice.options.map((option, index) => { const key = String.fromCharCode(97 + index); return <button type="button" className={answer === key ? 'is-selected' : ''} onClick={() => { setAnswer(key); setChecked(false) }} key={key}>{String.fromCharCode(65 + index)}. {option}</button> })}</div>
              <button type="button" className="builder-check" disabled={!answer} onClick={() => setChecked(true)}>{c.check}</button>
              {checked && <aside className={answer === practice.correct ? 'is-correct' : ''}>{answer === practice.correct ? practice.feedback : c.retry}</aside>}
              <a href="https://apcentral.collegeboard.org/courses/ap-chemistry/exam/past-exam-questions" target="_blank" rel="noreferrer">{c.official}</a>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

type ShelfCopy = (typeof text)[keyof typeof text]

function ApparatusShelf({ c, selected, onSelect, onClear, onPreset }: { c: ShelfCopy; selected: ItemId | null; onSelect: (item: ItemId) => void; onClear: () => void; onPreset: () => void }) {
  const item = (id: ItemId, icon: string, label: string, sub?: string) => (
    <button
      type="button"
      draggable
      className={`shelf-item ${selected === id ? 'is-selected' : ''}`}
      onDragStart={(event) => event.dataTransfer.setData('text/plain', id)}
      onClick={() => onSelect(id)}
      key={id}
    ><i>{icon}</i><span><strong>{label}</strong>{sub && <small>{sub}</small>}</span><em>⋮⋮</em></button>
  )
  return (
    <aside className="apparatus-shelf">
      <header><strong>{c.inventory}</strong><span>{c.inventoryHint}</span></header>
      <section><h3>{c.glassware}</h3>{item('beaker', '▱', c.beaker)}</section>
      <section><h3>{c.metals}</h3><div className="shelf-metal-grid">{(['Zn', 'Cu', 'Ag', 'Pb'] as MetalId[]).map((metal) => item(`metal:${metal}`, metal, `${metal}(s)`, `E° ${METALS[metal].reductionPotential > 0 ? '+' : ''}${METALS[metal].reductionPotential.toFixed(2)} V`))}</div></section>
      <section><h3>{c.solutions}</h3>{(Object.entries(SOLUTIONS) as [SolutionId, (typeof SOLUTIONS)[SolutionId]][]).map(([id, solution]) => item(`solution:${id}`, '◒', `${solution.formula}(aq)`, solution.note))}</section>
      <section><h3>{c.circuit}</h3>{item('wire', '⌁', c.wire)}{item('meter', 'V', c.meter)}{item('sandpaper', '▧', c.sandpaper)}</section>
      <section><h3>{c.bridges}</h3>{(['KNO3', 'KCl', 'NaCl'] as SaltBridgeElectrolyte[]).map((bridge) => item(`bridge:${bridge}`, '∩', bridge.replace('3', '₃')))}</section>
      <footer><button type="button" onClick={onPreset}>⚗ {c.preset}</button><button type="button" onClick={onClear}>↺ {c.clear}</button></footer>
    </aside>
  )
}

function DropZone({ target, label, selected, className = '', onDrop, onTarget, children }: { target: DropTarget; label: string; selected: ItemId | null; className?: string; onDrop: (event: DragEvent, target: DropTarget) => void; onTarget: (target: DropTarget) => void; children?: ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`builder-drop-zone ${children ? 'has-item' : ''} ${selected ? 'is-awaiting' : ''} ${className}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, target)}
      onClick={() => onTarget(target)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onTarget(target)
      }}
    >
      {children ?? <span>＋<small>{label}</small></span>}
    </div>
  )
}

function Workbench({ c, assembly, result, running, leftSolution, rightSolution, selectedItem, onDrop, onTarget, onRemove }: { c: ShelfCopy; assembly: Assembly; result: ChemistryResult; running: boolean; leftSolution: (typeof SOLUTIONS)[SolutionId] | null; rightSolution: (typeof SOLUTIONS)[SolutionId] | null; selectedItem: ItemId | null; onDrop: (event: DragEvent, target: DropTarget) => void; onTarget: (target: DropTarget) => void; onRemove: (key: keyof Assembly) => void }) {
  const half = (side: CellSide, beaker: boolean, metal: MetalId | null, solution: (typeof SOLUTIONS)[SolutionId] | null, polished: boolean) => (
    <div className={`builder-half-cell side-${side}`}>
      <DropZone target={`${side}-beaker`} label={c.dropBeaker} selected={selectedItem} onDrop={onDrop} onTarget={onTarget} className="beaker-drop">
        {beaker ? <div className="builder-beaker"><button type="button" onClick={(event) => { event.stopPropagation(); onRemove(`${side}Beaker` as keyof Assembly) }}>×</button>{solution && <div className="builder-liquid" style={{ backgroundColor: solution.color }}><span>{solution.formula}(aq)</span></div>}</div> : undefined}
      </DropZone>
      <DropZone target={`${side}-solution`} label={c.dropSolution} selected={selectedItem} onDrop={onDrop} onTarget={onTarget} className="solution-drop">{solution ? <strong>{solution.formula}<button type="button" onClick={(event) => { event.stopPropagation(); onRemove(`${side}Solution` as keyof Assembly) }}>×</button></strong> : undefined}</DropZone>
      <DropZone target={`${side}-electrode`} label={metal ? c.sandHint : c.dropMetal} selected={selectedItem} onDrop={onDrop} onTarget={onTarget} className="electrode-drop">
        {metal ? <div className={`builder-electrode ${polished ? 'is-polished' : 'is-oxidized'}`} style={{ '--metal-color': METAL_COLOR[metal] } as CSSProperties}><b>{metal}</b><small>{polished ? `✓ ${c.polished}` : `! ${c.unpolished}`}</small><button type="button" onClick={(event) => { event.stopPropagation(); onRemove(`${side}Metal` as keyof Assembly) }}>×</button></div> : undefined}
      </DropZone>
    </div>
  )
  return (
    <div className="assembly-stage">
      <DropZone target="circuit" label={c.dropCircuit} selected={selectedItem} onDrop={onDrop} onTarget={onTarget} className="circuit-drop">
        {assembly.wire || assembly.meter ? <div className={`builder-circuit ${running ? 'is-live' : ''}`}><span>{assembly.wire ? '⌁ wire' : '+ wire'}</span><strong>{assembly.meter ? `${result.EMF.toFixed(2)} V` : '+ meter'}</strong>{assembly.meter && <i>{assembly.meterReversed ? '− / +' : '+ / −'}</i>}</div> : undefined}
      </DropZone>
      <div className="half-cell-row">
        {half('left', assembly.leftBeaker, assembly.leftMetal, leftSolution, assembly.leftPolished)}
        <DropZone target="bridge" label={c.dropBridge} selected={selectedItem} onDrop={onDrop} onTarget={onTarget} className="bridge-drop">{assembly.bridge ? <div className={`builder-bridge ${result.fault === 'salt-bridge-precipitate' ? 'is-precipitated' : ''}`}><strong>{assembly.bridge.replace('3', '₃')}</strong><button type="button" onClick={(event) => { event.stopPropagation(); onRemove('bridge') }}>×</button></div> : undefined}</DropZone>
        {half('right', assembly.rightBeaker, assembly.rightMetal, rightSolution, assembly.rightPolished)}
      </div>
      {running && <div className={`electron-flow flow-${result.electronFlowDirection}`}><i>e⁻</i><i>e⁻</i><i>e⁻</i></div>}
    </div>
  )
}

function ParticleView({ c, assembly, result, leftSolution, rightSolution, running }: { c: ShelfCopy; assembly: Assembly; result: ChemistryResult; leftSolution: (typeof SOLUTIONS)[SolutionId] | null; rightSolution: (typeof SOLUTIONS)[SolutionId] | null; running: boolean }) {
  const particles = Array.from({ length: 8 }, (_, index) => index)
  const bridgeCation = assembly.bridge === 'NaCl' ? 'Na⁺' : 'K⁺'
  const bridgeAnion = assembly.bridge === 'KNO3' ? 'NO₃⁻' : 'Cl⁻'
  return (
    <div className="builder-particle-view">
      <header><div><strong>{c.particleTitle}</strong><span>{c.particleNote}</span></div><em>{c.returnBuild}</em></header>
      <div className="particle-wire"><b>{assembly.leftMetal ?? '—'}</b><span>{running && 'e⁻  ·  e⁻  ·  e⁻'}</span><b>{assembly.rightMetal ?? '—'}</b></div>
      <div className="particle-cells">
        <section>{particles.map((index) => <i key={index} style={{ left: `${10 + (index * 31) % 78}%`, top: `${15 + (index * 39) % 70}%` }}>{index % 2 ? leftSolution?.anion ?? '?' : leftSolution ? METAL_ION[leftSolution.ionMetal] : '?'}</i>)}<div>{assembly.leftMetal ?? '—'}(s)</div></section>
        <aside className={result.fault === 'salt-bridge-precipitate' ? 'is-blocked' : ''}><strong>{assembly.bridge ?? '—'}</strong>{running && <><i>← {bridgeAnion}</i><i>{bridgeCation} →</i></>}</aside>
        <section>{particles.map((index) => <i key={index} style={{ left: `${10 + (index * 29) % 78}%`, top: `${18 + (index * 43) % 67}%` }}>{index % 2 ? rightSolution?.anion ?? '?' : rightSolution ? METAL_ION[rightSolution.ionMetal] : '?'}</i>)}<div>{assembly.rightMetal ?? '—'}(s)</div></section>
      </div>
    </div>
  )
}

function makePractice(locale: 'en' | 'zh' | 'fr', result: ChemistryResult, assembly: Assembly, anode: MetalId | null, cathode: MetalId | null) {
  if (result.fault === 'salt-bridge-precipitate') {
    if (locale === 'zh') return { question: '当前盐桥产生沉淀。哪一种替换最可能恢复离子通路？', options: ['改用 KNO₃ 盐桥', '把电压表接反', '增大导线长度', '加入更多 Cl⁻'], correct: 'a', feedback: '正确。NO₃⁻ 通常不与这些金属阳离子形成难溶盐。' }
    if (locale === 'fr') return { question: 'Le pont forme un précipité. Quel remplacement rétablit le mieux la voie ionique ?', options: ['Un pont KNO₃', 'Inverser le voltmètre', 'Allonger le fil', 'Ajouter Cl⁻'], correct: 'a', feedback: 'Correct. NO₃⁻ ne forme généralement pas de sel insoluble avec ces cations.' }
    return { question: 'The selected bridge forms a precipitate. Which replacement is most likely to restore the ionic pathway?', options: ['A KNO₃ salt bridge', 'Reverse the voltmeter leads', 'Use a longer wire', 'Add more Cl⁻'], correct: 'a', feedback: 'Correct. Nitrate is generally a spectator ion that avoids these insoluble metal chlorides.' }
  }
  if (assembly.meterReversed && result.reactionType !== 'Open-Circuit') {
    if (locale === 'zh') return { question: `电压表显示 ${result.EMF.toFixed(2)} V。负号最合理的解释是？`, options: ['反应不自发', '电压表表笔接反', '电子停止移动', '盐桥变成导线'], correct: 'b', feedback: '正确。调换表笔改变读数符号，但不改变自发反应方向。' }
    if (locale === 'fr') return { question: `Le voltmètre indique ${result.EMF.toFixed(2)} V. Que signifie le signe négatif ?`, options: ['Réaction non spontanée', 'Fils du voltmètre inversés', 'Électrons immobiles', 'Pont devenu métallique'], correct: 'b', feedback: 'Correct. Inverser les fils change le signe mesuré, pas la réaction.' }
    return { question: `The meter reads ${result.EMF.toFixed(2)} V. What best explains the negative sign?`, options: ['The reaction is nonspontaneous', 'The voltmeter leads are reversed', 'Electrons stopped moving', 'The bridge became metallic'], correct: 'b', feedback: 'Correct. Reversing the leads changes the measured sign, not the spontaneous reaction.' }
  }
  if (result.fault === 'oxide-layer') {
    if (locale === 'zh') return { question: '装置完整但金属表面暗淡。实验前最合适的操作是？', options: ['用砂纸打磨电极', '移除盐桥', '反接电压表', '稀释所有溶液'], correct: 'a', feedback: '正确。打磨可去除妨碍有效接触的表面氧化层。' }
    if (locale === 'fr') return { question: 'Le montage est complet mais les métaux sont ternes. Que faire ?', options: ['Polir les électrodes', 'Retirer le pont', 'Inverser le voltmètre', 'Diluer tout'], correct: 'a', feedback: 'Correct. Le polissage retire la couche d’oxyde.' }
    return { question: 'The apparatus is complete, but the metal surfaces are dull. What should the student do first?', options: ['Polish the electrodes', 'Remove the salt bridge', 'Reverse the meter', 'Dilute every solution'], correct: 'a', feedback: 'Correct. Sanding removes the surface oxide that impedes effective contact.' }
  }
  if (result.fault === 'incompatible-half-cell') {
    if (locale === 'zh') return { question: '哪项修改可得到定义清楚的金属/金属离子半电池？', options: ['让每个金属浸入含自身离子的溶液', '去掉一个烧杯', '把两种溶液混合', '用盐桥代替导线'], correct: 'a', feedback: '正确。基础半电池应构成 Mⁿ⁺(aq)/M(s) 电对。' }
    if (locale === 'fr') return { question: 'Comment obtenir des demi-piles métal/ion bien définies ?', options: ['Chaque métal dans ses propres ions', 'Retirer un bécher', 'Mélanger les solutions', 'Remplacer le fil par le pont'], correct: 'a', feedback: 'Correct. Chaque demi-pile doit former le couple Mⁿ⁺/M.' }
    return { question: 'Which change creates well-defined metal/metal-ion half-cells?', options: ['Immerse each metal in a solution of its own ions', 'Remove one beaker', 'Mix both solutions', 'Replace the wire with a salt bridge'], correct: 'a', feedback: 'Correct. Each basic half-cell should form an Mⁿ⁺(aq)/M(s) redox couple.' }
  }
  if (!anode || !cathode) {
    if (locale === 'zh') return { question: '一个能持续工作的原电池必须同时具有哪两条通路？', options: ['电子外电路与离子内电路', '两条电子导线', '两座盐桥', '两只电压表'], correct: 'a', feedback: '正确。电子走外电路，离子迁移维持半电池电中性。' }
    if (locale === 'fr') return { question: 'Quelles deux voies sont nécessaires au fonctionnement soutenu ?', options: ['Voie électronique et voie ionique', 'Deux fils électroniques', 'Deux ponts', 'Deux voltmètres'], correct: 'a', feedback: 'Correct. Les électrons circulent à l’extérieur et les ions maintiennent la neutralité.' }
    return { question: 'Which two pathways are required for sustained galvanic-cell operation?', options: ['An external electron path and an internal ion path', 'Two electron wires', 'Two salt bridges', 'Two voltmeters'], correct: 'a', feedback: 'Correct. Electrons use the external circuit while ion migration maintains charge balance.' }
  }
  const anodePotential = METALS[anode].reductionPotential
  const cathodePotential = METALS[cathode].reductionPotential
  if (locale === 'zh') return { question: `当前 ${anode}/${cathode} 电池中，为什么 ${cathode} 是阴极？`, options: [`${cathode} 的 E°red 更正（${cathodePotential.toFixed(2)} V）`, `${cathode} 在右侧`, `${cathode} 质量一定更小`, `${anode} 的 E°red 更正（${anodePotential.toFixed(2)} V）`], correct: 'a', feedback: `正确。较正的标准还原电势在阴极发生还原。` }
  if (locale === 'fr') return { question: `Dans la pile ${anode}/${cathode}, pourquoi ${cathode} est-elle la cathode ?`, options: [`Son E°red est plus positif (${cathodePotential.toFixed(2)} V)`, 'Elle est à droite', 'Sa masse est toujours plus petite', `Le E°red de ${anode} est plus positif`], correct: 'a', feedback: 'Correct. La réduction a lieu au couple de potentiel de réduction le plus positif.' }
  return { question: `In the assembled ${anode}/${cathode} cell, why is ${cathode} the cathode?`, options: [`Its E°red is more positive (${cathodePotential.toFixed(2)} V)`, 'It is physically on the right', 'Its electrode always has less mass', `${anode} has the more positive E°red (${anodePotential.toFixed(2)} V)`], correct: 'a', feedback: 'Correct. Reduction occurs at the half-cell with the more positive standard reduction potential.' }
}
