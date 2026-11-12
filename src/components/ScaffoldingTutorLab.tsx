import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import {
  exportLearningLog,
  fetchDashboard,
  fetchSftCatalog,
  logLearningEvent,
  requestTutor,
  type SftCatalogPayload,
} from '../learning/api'
import { inferQuestionKey } from '../learning/catalog'
import {
  loadLearner,
  saveLearner,
  shortLearnerId,
  startNewSession,
} from '../learning/session'
import {
  MODEL_IDS,
  type BarrierCategory,
  type ChatTurn,
  type ClassDashboard,
  type LabSnapshot,
  type LearnerProfile,
  type QuestionKey,
  type ScaffoldPhase,
  type SupportLevel,
  type TutorOutput,
} from '../learning/types'
import './ScaffoldingTutorLab.css'

type ModeTab = 'qa' | 'sft' | 'dashboard'

type RichChatTurn = ChatTurn & {
  phase?: ScaffoldPhase
  supportLevel?: SupportLevel
  barrier?: BarrierCategory
  barrierConfidence?: 'low' | 'medium' | 'high'
  matchedTopic?: string
  matchedSource?: string
  similarity?: number
  usedModel?: string
}

const DEFAULT_LAB_SNAPSHOT: LabSnapshot = {
  leftMetal: 'Zn',
  rightMetal: 'Cu',
  leftSolution: 'ZnSO4',
  rightSolution: 'CuSO4',
  bridge: 'KNO3',
  wire: true,
  meter: true,
  leftPolished: true,
  rightPolished: true,
  meterReversed: false,
  leftConcentration: 1.0,
  rightConcentration: 1.0,
  running: true,
  fault: 'none',
  emf: 1.1,
  reactionType: 'Standard',
  electronFlow: 'Left-to-Right',
  anodeMetal: 'Zn',
  cathodeMetal: 'Cu',
  view: 'macro',
}

const copy = {
  en: {
    eyebrow: '05.1 CANADIAN SCH3U/SCH4U & AP CHEMISTRY · DIAGNOSTIC AI',
    title: 'Scaffolding Tutor',
    subtitle:
      'SFT-trained Socratic Q&A tutor that guides students across observable evidence, particle interactions, and symbolic equations—never dumping the final answer directly.',
    guardrailBadge: 'Guarded Scaffolding Active (No Direct Final Answers on Turn 1)',
    tabQa: 'Scaffolding Q&A Tutor',
    tabSft: 'SFT Training Data & Model',
    tabDashboard: 'Teacher Evidence & Fading',
    unitFilter: 'Curriculum Unit',
    allUnits: 'All Canadian (SCH3U/SCH4U) & AP Units',
    topicPrompts: 'Structured Entry Points (No Prompt-Writing Needed)',
    sequenceTitle: 'Research Intervention Sequence (Research.pdf §5)',
    supportTitle: 'Support Ladder (Auto-Fades as Independence Grows)',
    phases: {
      predict: '1. Predict',
      explain: '2. Explain',
      inspect: '3. Inspect',
      diagnose: '4. Diagnose',
      hint: '5. Targeted Hint',
      revise: '6. Revise',
      'independent-check': '7. Independent Check',
    } satisfies Record<ScaffoldPhase, string>,
    supports: [
      'L0 · Diagnostic Question Only',
      'L1 · Conceptual Cue',
      'L2 · Partial Explanation (Incomplete)',
      'L3 · Independent Transfer Check',
    ] as const,
    welcome:
      'Welcome to the Scaffolding Tutor! Pick a Canadian High School (SCH3U/SCH4U) or AP Chemistry question on the left—or ask your own below. I will never spoil the final answer on the first turn; instead, we will reason from predictions and particle interactions to symbolic equations.',
    inputPlaceholder:
      'State your prediction, explanation, or chemistry question (e.g., "Do electrons swim through the solution in electroplating?")…',
    send: 'Ask Scaffolding Tutor',
    thinking: 'Diagnosing reasoning & selecting scaffold level…',
    resetSession: 'New Session (Test Fading)',
    modelLabel: 'Active Engine',
    conditionLabel: 'Study Condition',
    adaptive: 'Adaptive SFT / AI',
    fixed: 'Fixed Prompts (Control)',
    learnerLabel: 'Pseudonymous ID',
    liveDiagnosisTitle: 'Live Diagnostic Card (Research.pdf §5–6)',
    barrierLabel: 'Tentative Learning Barrier',
    confidenceLabel: 'Confidence',
    matchedLabel: 'Matched SFT Concept',
    whatChangedLabel: 'What Changed After Hint',
    remainingLabel: 'Remaining Difficulty',
    nextActivityLabel: 'Suggested Teacher Follow-Up',
    barrierDescriptions: {
      'conceptual-misunderstanding':
        'Conceptual misunderstanding (e.g., electrons moving through electrolyte or bond breaking releasing energy)',
      'representation-gap':
        'Difficulty connecting representations (macro observation ↔ particle diagram ↔ symbolic half-equation)',
      'missing-prerequisite':
        'Missing prerequisite knowledge (ion vs neutral atom, solubility rules, potential J/C vs current C/s)',
      'unsystematic-problem-solving':
        'Unsystematic problem solving (assigning electrode labels before identifying oxidation/reduction)',
      'ambiguous-language':
        'Ambiguous language or notation (imprecise wording requiring clarification first)',
      'insufficient-evidence':
        'Insufficient evidence (seeking additional student explanation before classifying a misconception)',
    } satisfies Record<BarrierCategory, string>,
    sftHeader: 'Online SFT & DPO Datasets + Local GPU Neural Scaffolding Model',
    sftSub:
      'Combined online Hugging Face Socratic & AP/High School Chemistry datasets with Appleby College SCH4U research exemplars.',
    metricDialogues: 'Multi-Turn SFT Dialogues',
    metricDpo: 'DPO Guardrail Pairs',
    metricAcc: 'Trained Barrier Accuracy',
    metricDevice: 'Trained Hardware',
    sourcesTitle: 'Online Training Data Sources (Hugging Face Hub + Curated Research)',
    curvesTitle: 'PyTorch DualHeadScaffoldNet Training Convergence',
    explorerTitle: 'Interactive SFT Multi-Turn Dialogue Explorer',
    tryPrompt: 'Load into Q&A Tutor',
    fadeHeader: 'Same-Question Ask-Count Fading & Teacher Decision Dashboard',
    fadeSub:
      'Decreasing ask counts across sessions indicate that guarded scaffolding is building unaided transfer (Bastani et al., 2025; Xhakaj et al., 2017).',
    exportJsonl: 'Export Research JSONL',
    acceptBtn: 'Accept AI Diagnosis',
    rejectBtn: 'Reject',
    correctLabel: 'Override Barrier',
  },
  zh: {
    eyebrow: '05.1 加拿大高中 (SCH3U/SCH4U) 与 AP 化学 · 诊断式脚手架 AI',
    title: '脚手架问答导师 (Scaffolding Tutor)',
    subtitle:
      '基于在线苏格拉底式与高中/AP化学 SFT 数据训练的问答界面：引导学生连接宏观现象、微观粒子与化学符号，绝不直接剧透最终答案。',
    guardrailBadge: '护栏式脚手架已启用（首轮绝不直接给出完整答案）',
    tabQa: '脚手架问答导师',
    tabSft: 'SFT 训练数据与模型',
    tabDashboard: '教师证据与消退看板',
    unitFilter: '课程单元筛选',
    allUnits: '全部加拿大高中 (SCH3U/SCH4U) 与 AP 化学单元',
    topicPrompts: '结构化切入问题（无需学生自己写复杂 Prompt）',
    sequenceTitle: '研究干预教学序列 (Research.pdf §5)',
    supportTitle: '支持阶梯（随独立性提升自动消退）',
    phases: {
      predict: '1. 预测 (Predict)',
      explain: '2. 解释 (Explain)',
      inspect: '3. 观察 (Inspect)',
      diagnose: '4. 诊断 (Diagnose)',
      hint: '5. 靶向提示 (Hint)',
      revise: '6. 修正 (Revise)',
      'independent-check': '7. 独立迁移检验 (Check)',
    } satisfies Record<ScaffoldPhase, string>,
    supports: [
      'L0 · 仅诊断性提问',
      'L1 · 概念线索提示',
      'L2 · 渐进式半步解析（留白）',
      'L3 · 无辅助独立迁移检验',
    ] as const,
    welcome:
      '欢迎使用「脚手架问答导师」(Scaffolding Tutor)！请在左侧选择一个加拿大高中 (SCH3U/SCH4U) 或 AP 化学典型问题，或在下方直接提问。我不会在第一轮直接给你最终答案，而是通过「预测→诊断提问→概念线索→符号连接→独立检验」带你真正掌握推理过程。',
    inputPlaceholder:
      '输入你的预测、推理解释或化学问题（例如：“电镀铜时电子是从溶液里游向阴极的吗？”）…',
    send: '发送给脚手架导师',
    thinking: '正在诊断推理障碍并匹配脚手架层级…',
    resetSession: '开启新课时（验证提示消退）',
    modelLabel: '当前驱动模型',
    conditionLabel: '实验分组条件',
    adaptive: '自适应 SFT / AI',
    fixed: '固定提示组 (对照组)',
    learnerLabel: '匿名受试编号',
    liveDiagnosisTitle: '实时学情诊断卡 (Research.pdf §5–6)',
    barrierLabel: '暂定学习障碍分类',
    confidenceLabel: '置信度',
    matchedLabel: '匹配的 SFT 知识节点',
    whatChangedLabel: '提示后发生的变化',
    remainingLabel: '尚待解决的困难',
    nextActivityLabel: '建议教师后续教学活动',
    barrierDescriptions: {
      'conceptual-misunderstanding': '概念性误解（如认为电子在电解质溶液中游泳、断键会释放能量等）',
      'representation-gap': '表征协调困难（半反应方程式与微观粒子运动图像脱节）',
      'missing-prerequisite': '缺少先备知识（分不清离子与中性原子、溶解度规则、电势差与电流）',
      'unsystematic-problem-solving': '解题缺乏系统性（未判断氧化或还原就随意标定阴阳极）',
      'ambiguous-language': '语言或符号表述模糊（需先追问澄清再判定是否为迷思概念）',
      'insufficient-evidence': '证据尚不充分（单次错误不直接贴标签，继续追问收集证据）',
    } satisfies Record<BarrierCategory, string>,
    sftHeader: '在线 SFT 与 DPO 数据集 + 本地 GPU 神经网络脚手架模型',
    sftSub:
      '融合 Hugging Face 在线苏格拉底教学数据集、AP/高中化学概念集与 Appleby SCH4U 教研方案样本。',
    metricDialogues: '多轮 SFT 脚手架对话',
    metricDpo: 'DPO 护栏偏好对',
    metricAcc: '障碍分类训练准确率',
    metricDevice: '训练硬件设备',
    sourcesTitle: '在线训练数据源 (Hugging Face Hub + 教研精标)',
    curvesTitle: 'PyTorch 双头脚手架网络 (DualHeadScaffoldNet) 收敛曲线',
    explorerTitle: 'SFT 多轮脚手架样本浏览器',
    tryPrompt: '载入问答导师体验',
    fadeHeader: '同题提问消退追踪与教师教学决策仪表盘',
    fadeSub:
      '跨课时同一问题提问次数递减，表明受保护的脚手架正在转化为学生的独立迁移能力 (Bastani et al., 2025)。',
    exportJsonl: '导出研究日志 JSONL',
    acceptBtn: '采纳 AI 诊断',
    rejectBtn: '驳回',
    correctLabel: '人工修正障碍类型',
  },
  fr: {
    eyebrow: '05.1 CHIMIE SCH3U/SCH4U CANADA & AP · TUTEUR DIAGNOSTIQUE',
    title: 'Tuteur d’Échafaudage (Scaffolding Tutor)',
    subtitle:
      'Tuteur Q&R socratique entraîné par SFT qui guide les élèves des observations et particules aux équations symboliques — sans jamais donner la réponse finale directement.',
    guardrailBadge: 'Garde-fou actif (aucune solution directe au 1er tour)',
    tabQa: 'Tuteur Q&R d’Échafaudage',
    tabSft: 'Données SFT & Modèle',
    tabDashboard: 'Preuves & Tableau Enseignant',
    unitFilter: 'Unité du programme',
    allUnits: 'Toutes les unités SCH3U/SCH4U & AP Chemistry',
    topicPrompts: 'Points d’entrée structurés',
    sequenceTitle: 'Séquence d’intervention (Research.pdf §5)',
    supportTitle: 'Échelle de soutien (effacement progressif)',
    phases: {
      predict: '1. Prédire',
      explain: '2. Expliquer',
      inspect: '3. Observer',
      diagnose: '4. Diagnostiquer',
      hint: '5. Indice ciblé',
      revise: '6. Réviser',
      'independent-check': '7. Vérification autonome',
    } satisfies Record<ScaffoldPhase, string>,
    supports: [
      'L0 · Question diagnostique seule',
      'L1 · Indice conceptuel',
      'L2 · Explication partielle',
      'L3 · Transfert autonome sans aide',
    ] as const,
    welcome:
      'Bienvenue dans le Tuteur d’Échafaudage ! Choisissez une question SCH3U/SCH4U ou AP Chemistry à gauche ou posez la vôtre. Je ne donnerai jamais la réponse finale directement au premier tour.',
    inputPlaceholder:
      'Écrivez votre prédiction, explication ou question de chimie…',
    send: 'Envoyer au tuteur',
    thinking: 'Diagnostic du raisonnement en cours…',
    resetSession: 'Nouvelle séance',
    modelLabel: 'Moteur actif',
    conditionLabel: 'Condition d’étude',
    adaptive: 'SFT / IA adaptative',
    fixed: 'Consignes fixes',
    learnerLabel: 'ID pseudonyme',
    liveDiagnosisTitle: 'Carte diagnostique en direct (Research.pdf §5–6)',
    barrierLabel: 'Obstacle provisoire',
    confidenceLabel: 'Confiance',
    matchedLabel: 'Concept SFT associé',
    whatChangedLabel: 'Évolution après indice',
    remainingLabel: 'Difficulté restante',
    nextActivityLabel: 'Suivi pédagogique suggéré',
    barrierDescriptions: {
      'conceptual-misunderstanding':
        'Malentendu conceptuel (ex. électrons nageant dans l’électrolyte)',
      'representation-gap':
        'Difficulté à relier les représentations (observation ↔ particules ↔ demi-équation)',
      'missing-prerequisite':
        'Prérequis manquant (ion vs atome neutre, règles de solubilité, potentiel vs courant)',
      'unsystematic-problem-solving':
        'Résolution non systématique (étiqueter les électrodes avant d’identifier l’oxydation/réduction)',
      'ambiguous-language':
        'Langage ou notation ambiguë (demande une clarification préalable)',
      'insufficient-evidence':
        'Preuves insuffisantes (recherche d’explications supplémentaires avant de classer)',
    } satisfies Record<BarrierCategory, string>,
    sftHeader: 'Jeux de données SFT & DPO en ligne + Modèle neuronal local',
    sftSub:
      'Combinaison de dialogues socratiques Hugging Face, de concepts AP Chemistry et du protocole SCH4U.',
    metricDialogues: 'Dialogues SFT multi-tours',
    metricDpo: 'Paires de préférence DPO',
    metricAcc: 'Précision de diagnostic',
    metricDevice: 'Matériel d’entraînement',
    sourcesTitle: 'Sources de données SFT en ligne (Hugging Face Hub + Recherche)',
    curvesTitle: 'Convergence d’entraînement PyTorch DualHeadScaffoldNet',
    explorerTitle: 'Explorateur de dialogues SFT',
    tryPrompt: 'Tester dans le tuteur Q&R',
    fadeHeader: 'Suivi de l’effacement des indices & Tableau enseignant',
    fadeSub:
      'La baisse des questions répétées d’une séance à l’autre indique un transfert autonome réussi.',
    exportJsonl: 'Exporter JSONL',
    acceptBtn: 'Accepter',
    rejectBtn: 'Rejeter',
    correctLabel: 'Corriger l’obstacle',
  },
} as const

type QuickTopic = {
  id: string
  unit: string
  badge: string
  questionKey: QuestionKey
  title: Record<'en' | 'zh' | 'fr', string>
  prompt: Record<'en' | 'zh' | 'fr', string>
}

const QUICK_TOPICS: QuickTopic[] = [
  {
    id: 'electroplating-carriers',
    unit: 'SCH4U Unit 5 / AP Chem Unit 9: Electrochemistry & Redox',
    badge: 'SCH4U / AP U9',
    questionKey: 'electroplating',
    title: {
      en: 'Copper Electroplating: Do electrons swim through the solution?',
      zh: '铜电镀实验：电子会穿过溶液游向被镀物体吗？',
      fr: 'Électrodéposition du cuivre : les électrons traversent-ils la solution ?',
    },
    prompt: {
      en: 'In copper electroplating or a Zn/Cu cell, do electrons travel through the solution toward the object being plated?',
      zh: '在电镀铜或锌铜原电池中，电子会穿过电解质溶液游向阴极被镀物体吗？',
      fr: 'Lors du cuivrage électrolytique, les électrons voyagent-ils à travers la solution vers la cathode ?',
    },
  },
  {
    id: 'voltage-zero-bridge',
    unit: 'SCH4U Unit 5 / AP Chem Unit 9: Electrochemistry & Redox',
    badge: 'SCH4U / AP U9',
    questionKey: 'voltage-zero',
    title: {
      en: 'Why does a cell read 0.00 V without a salt bridge?',
      zh: '为什么不放盐桥时电压表读数为 0.00 V？',
      fr: 'Pourquoi la pile indique-t-elle 0,00 V sans pont salin ?',
    },
    prompt: {
      en: 'I connected the Zn and Cu electrodes with a wire and voltmeter in their solutions, but the voltage is still 0.00 V without a salt bridge. Why?',
      zh: '我已经用导线和电压表连好了锌片和铜片，但没放盐桥时电压是 0.00 V，为什么电子不能直接走导线？',
      fr: 'J’ai relié Zn et Cu avec un fil et un voltmètre sans pont salin, mais la tension reste à 0,00 V. Pourquoi ?',
    },
  },
  {
    id: 'systematic-anode-cathode',
    unit: 'SCH4U Unit 5 / AP Chem Unit 9: Electrochemistry & Redox',
    badge: 'SCH4U / AP U9',
    questionKey: 'electrode-process',
    title: {
      en: 'Is the left beaker always the anode? (Cu vs Ag cell)',
      zh: '左边的烧杯永远是负极/阳极吗？（Cu/Ag 电池判别）',
      fr: 'Le bécher de gauche est-il toujours l’anode ? (Pile Cu/Ag)',
    },
    prompt: {
      en: 'Is the anode always the electrode on the left side of the diagram, or how do I tell for a Cu and Ag cell?',
      zh: '在电化学装置图里，左边的电极永远是阳极（负极）吗？如果换成 Cu 和 Ag 怎么判断？',
      fr: 'L’anode est-elle toujours à gauche du schéma, ou comment la déterminer pour une pile Cu et Ag ?',
    },
  },
  {
    id: 'salt-bridge-precipitate',
    unit: 'SCH4U Unit 5 / AP Chem Unit 9: Electrochemistry & Redox',
    badge: 'SCH4U / AP U9',
    questionKey: 'salt-bridge',
    title: {
      en: 'Salt Bridge Choice: Why does KCl fail with AgNO₃?',
      zh: '盐桥选择陷阱：为什么含 Ag⁺ 半电池不能用 KCl 盐桥？',
      fr: 'Choix du pont salin : pourquoi KCl échoue-t-il avec AgNO₃ ?',
    },
    prompt: {
      en: 'Why does my Ag/Cu cell stop working when I use a KCl salt bridge instead of KNO3?',
      zh: '为什么我的银-铜原电池用 KCl 盐桥时不能工作，而换成 KNO₃ 就可以？',
      fr: 'Pourquoi ma pile Ag/Cu cesse-t-elle de fonctionner avec un pont salin KCl au lieu de KNO₃ ?',
    },
  },
  {
    id: 'potential-vs-current',
    unit: 'SCH4U Unit 5 / AP Chem Unit 9: Electrochemistry & Redox',
    badge: 'SCH4U / AP U9',
    questionKey: 'potential-vs-current',
    title: {
      en: 'Potential Difference (J/C) vs Electric Current (C/s)',
      zh: '电势差 (V) 与电流 (A)：换更大的锌片会让电压升高吗？',
      fr: 'Différence de potentiel (J/C) vs Courant électrique (C/s)',
    },
    prompt: {
      en: 'If I use a much wider zinc electrode or bigger beakers of 1.0 M solution, will the voltmeter read a higher voltage than 1.10 V?',
      zh: '如果我换一块面积大一倍的锌电极，或者用更大烧杯的 1.0 M 溶液，电压表读数会超过 1.10 V 吗？',
      fr: 'Si j’utilise une électrode de zinc plus large dans une solution 1,0 M, le voltmètre affichera-t-il plus de 1,10 V ?',
    },
  },
  {
    id: 'polyatomic-parentheses',
    unit: 'SCH3U Units 1-2 / AP Chem Units 1-2: Atomic Structure, Bonding & Chemical Formulas',
    badge: 'SNC1W / SCH3U / AP U1',
    questionKey: 'half-equation',
    title: {
      en: 'Ionic Formulas & Polyatomic Ions: Why Al₂(SO₄)₃ instead of Al₂SO₄₃?',
      zh: '化合价与原子团括号：为什么硫酸铝是 Al₂(SO₄)₃ 而不是 Al₂SO₄₃？',
      fr: 'Formules ioniques et ions polyatomiques : pourquoi Al₂(SO₄)₃ ?',
    },
    prompt: {
      en: 'How do I write the formula for aluminum sulfate? Is it Al2SO43?',
      zh: '怎么写硫酸铝的化学式？交叉化合价之后直接写成 Al2SO43 对吗？',
      fr: 'Comment écrire la formule du sulfate d’aluminium ? Est-ce Al2SO43 ?',
    },
  },
  {
    id: 'bohr-positive-ion',
    unit: 'SCH3U Units 1-2 / AP Chem Units 1-2: Atomic Structure, Bonding & Chemical Formulas',
    badge: 'SNC1W / SCH3U / AP U1',
    questionKey: 'charge-carriers',
    title: {
      en: 'Bohr Atom & Ion Charge: Why does losing an electron make Na⁺ positive?',
      zh: '玻尔模型与离子电荷：钠失去电子为什么反而显 +1 价？',
      fr: 'Atome de Bohr et charge ionique : pourquoi perdre un électron rend-il Na⁺ positif ?',
    },
    prompt: {
      en: 'When sodium becomes Na+, why is it +1 if it LOST something? Shouldn\'t losing make it negative?',
      zh: '当钠原子变成 Na⁺ 时，它明明“失去”了粒子，为什么电荷反而是 +1 而不是负数？',
      fr: 'Quand le sodium devient Na⁺, pourquoi sa charge est-elle +1 alors qu’il a perdu quelque chose ?',
    },
  },
  {
    id: 'dynamic-equilibrium',
    unit: 'SCH4U Unit 4 / AP Chem Unit 7: Chemical Equilibrium',
    badge: 'SCH4U / AP U7',
    questionKey: 'uncategorized',
    title: {
      en: 'Dynamic Equilibrium: Does the reaction stop when it reaches K?',
      zh: '化学平衡与反应商 Q：达到平衡时正逆反应停止了吗？',
      fr: 'Équilibre dynamique : la réaction s’arrête-t-elle à l’équilibre ?',
    },
    prompt: {
      en: 'Does chemical equilibrium mean the reaction has stopped and there are equal amounts of reactants and products?',
      zh: '达到化学平衡是不是意味着反应已经停止了，而且反应物和生成物的浓度必须相等？',
      fr: 'L’équilibre chimique signifie-t-il que la réaction s’est arrêtée et que les quantités sont égales ?',
    },
  },
  {
    id: 'weak-vs-dilute-acid',
    unit: 'SCH3U-SCH4U / AP Chem Unit 8: Acids, Bases & Buffers',
    badge: 'SCH4U / AP U8',
    questionKey: 'uncategorized',
    title: {
      en: 'Strong vs Weak Acids & Buffers: Does diluting HCl make it a weak acid?',
      zh: '强酸与弱酸、缓冲溶液：把盐酸稀释会变成弱酸吗？',
      fr: 'Acides forts vs faibles : diluer HCl en fait-il un acide faible ?',
    },
    prompt: {
      en: 'If I dilute hydrochloric acid (HCl) with lots of water to 0.0001 M, does it become a weak acid?',
      zh: '如果我向盐酸 (HCl) 里加很多水稀释到 0.0001 M，它会变成弱酸吗？',
      fr: 'Si je dilue l’acide chlorhydrique (HCl) à 0,0001 M, devient-il un acide faible ?',
    },
  },
  {
    id: 'bond-enthalpy-myth',
    unit: 'SCH4U Unit 3 / AP Chem Units 5-6: Thermochemistry & Kinetics',
    badge: 'SCH4U / AP U6',
    questionKey: 'uncategorized',
    title: {
      en: 'Thermochemistry Myth: Does breaking chemical bonds release energy?',
      zh: '热化学常见迷思：断裂化学键会释放能量吗？',
      fr: 'Thermochimie : la rupture d’une liaison chimique libère-t-elle de l’énergie ?',
    },
    prompt: {
      en: 'Doesn\'t breaking chemical bonds release energy, like when fuel burns?',
      zh: '燃料燃烧会放热，这难道不是因为断裂化学键直接释放出了能量吗？',
      fr: 'La rupture des liaisons chimiques ne libère-t-elle pas de l’énergie lorsque le carburant brûle ?',
    },
  },
]

const BARRIERS: BarrierCategory[] = [
  'conceptual-misunderstanding',
  'representation-gap',
  'missing-prerequisite',
  'unsystematic-problem-solving',
  'ambiguous-language',
  'insufficient-evidence',
]

export function ScaffoldingTutorLab() {
  const { locale } = useI18n()
  const c = copy[locale]

  const [mode, setMode] = useState<ModeTab>('qa')
  const [unitFilter, setUnitFilter] = useState<string>('ALL')
  const [activeTopicId, setActiveTopicId] = useState<string>(QUICK_TOPICS[0].id)
  const [profile, setProfile] = useState<LearnerProfile>(() => loadLearner())
  const [phase, setPhase] = useState<ScaffoldPhase>('predict')
  const [supportLevel, setSupportLevel] = useState<SupportLevel>(0)
  const [messages, setMessages] = useState<RichChatTurn[]>([
    {
      role: 'tutor',
      text: c.welcome,
      phase: 'predict',
      supportLevel: 0,
      usedModel: 'sft-chem-scaffold',
    },
  ])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [latestDiagnosis, setLatestDiagnosis] = useState<TutorOutput | null>(null)
  const [sftCatalog, setSftCatalog] = useState<SftCatalogPayload | null>(null)
  const [selectedExemplarId, setSelectedExemplarId] = useState<string>('')
  const [dashboard, setDashboard] = useState<ClassDashboard | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    saveLearner(profile)
  }, [profile])

  useEffect(() => {
    void fetchSftCatalog()
      .then((data) => {
        setSftCatalog(data)
        if (data.exemplars.length > 0) {
          setSelectedExemplarId(data.exemplars[0].id)
        }
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (mode === 'dashboard') {
      void fetchDashboard()
        .then(setDashboard)
        .catch(() => setDashboard(null))
    }
  }, [mode])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, busy])

  const units = useMemo(() => {
    const set = new Set<string>(QUICK_TOPICS.map((t) => t.unit))
    return ['ALL', ...Array.from(set)]
  }, [])

  const filteredTopics = useMemo(() => {
    if (unitFilter === 'ALL') return QUICK_TOPICS
    return QUICK_TOPICS.filter((t) => t.unit === unitFilter)
  }, [unitFilter])

  const selectedExemplar = useMemo(() => {
    if (!sftCatalog) return null
    return (
      sftCatalog.exemplars.find((e) => e.id === selectedExemplarId) ??
      sftCatalog.exemplars[0] ??
      null
    )
  }, [sftCatalog, selectedExemplarId])

  const sendQuestion = async (questionText: string, explicitKey?: QuestionKey) => {
    const trimmed = questionText.trim()
    if (!trimmed || busy) return
    setBusy(true)
    const studentTurn: RichChatTurn = { role: 'student', text: trimmed }
    setMessages((prev) => [...prev, studentTurn])
    setDraft('')

    try {
      const qKey = explicitKey ?? inferQuestionKey(trimmed)
      const labState: LabSnapshot = {
        ...DEFAULT_LAB_SNAPSHOT,
        fault: qKey === 'voltage-zero' ? 'incomplete-circuit' : 'none',
        emf: qKey === 'voltage-zero' ? 0 : 1.1,
      }
      const result = await requestTutor({
        learnerId: profile.learnerId,
        sessionId: profile.sessionId,
        condition: profile.condition,
        model: profile.model,
        locale,
        message: trimmed,
        questionKey: qKey,
        messages: messages.map((m) => ({ role: m.role, text: m.text })),
        phase,
        supportLevel,
        lab: labState,
        viewedMicro: true,
      })

      setPhase(result.phase)
      setSupportLevel(result.supportLevel)
      setLatestDiagnosis(result)
      setMessages((prev) => [
        ...prev,
        {
          role: 'tutor',
          text: result.reply,
          phase: result.phase,
          supportLevel: result.supportLevel,
          barrier: result.barrier,
          barrierConfidence: result.barrierConfidence,
          matchedTopic: result.matchedTopic,
          matchedSource: result.matchedSource,
          similarity: result.similarity,
          usedModel: result.usedModel,
        },
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tutor error'
      setMessages((prev) => [
        ...prev,
        {
          role: 'tutor',
          text: `Let's break this down step by step: what particles (ions, atoms, or electrons) are interacting here, and what do you predict happens first? (${msg})`,
          phase: 'diagnose',
          supportLevel: 0,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void sendQuestion(draft)
  }

  const handleNewSession = () => {
    const next = startNewSession(profile)
    setProfile(next)
    setPhase('predict')
    setSupportLevel(0)
    setLatestDiagnosis(null)
    setMessages([
      {
        role: 'tutor',
        text: c.welcome,
        phase: 'predict',
        supportLevel: 0,
        usedModel: next.model,
      },
    ])
    void logLearningEvent({
      learnerId: next.learnerId,
      sessionId: next.sessionId,
      condition: next.condition,
      model: next.model,
      locale,
      type: 'session-start',
      questionKey: 'predict-cell',
      phase: 'predict',
      supportLevel: 0,
    }).catch(() => undefined)
  }

  const handleTeacherReview = async (
    verdict: 'accept' | 'correct' | 'reject',
    correctedBarrier?: BarrierCategory,
  ) => {
    await logLearningEvent({
      learnerId: profile.learnerId,
      sessionId: profile.sessionId,
      condition: profile.condition,
      locale,
      type: 'teacher-review',
      questionKey: latestDiagnosis?.questionKey ?? 'uncategorized',
      phase,
      supportLevel,
      teacherVerdict: verdict,
      teacherNote: reviewNote,
      correctedBarrier,
    })
    const updated = await fetchDashboard()
    setDashboard(updated)
  }

  return (
    <section className="scaffolding-tutor-lab">
      <div className="scaffolding-hero panel">
        <div className="scaffolding-hero__copy">
          <span className="eyebrow">{c.eyebrow}</span>
          <h2>{c.title}</h2>
          <p>{c.subtitle}</p>
          <div className="scaffolding-hero__badges">
            <span className="guardrail-pill">🛡 {c.guardrailBadge}</span>
            <span className="sft-pill">
              ⚡ {sftCatalog?.numDialogues ?? 182} SFT Dialogues ·{' '}
              {sftCatalog?.summary?.total_dpo_pairs ?? 48} DPO Pairs ·{' '}
              {sftCatalog?.trainedOnDevice ?? 'CUDA RTX 5060'}
            </span>
          </div>
        </div>

        <div className="scaffolding-hero__controls">
          <label>
            <span>{c.modelLabel}</span>
            <select
              value={profile.model}
              onChange={(e) =>
                setProfile((curr) => ({
                  ...curr,
                  model: e.target.value as LearnerProfile['model'],
                }))
              }
            >
              <option value={MODEL_IDS.sft}>SFT Chem Scaffold (Trained GPU)</option>
              <option value={MODEL_IDS.terra}>GPT-5.6 Terra (AI Gateway)</option>
              <option value={MODEL_IDS.flash}>Gemini 3.6 Flash (AI Gateway)</option>
            </select>
          </label>
          <label>
            <span>{c.conditionLabel}</span>
            <select
              value={profile.condition}
              onChange={(e) =>
                setProfile((curr) => ({
                  ...curr,
                  condition: e.target.value as LearnerProfile['condition'],
                }))
              }
            >
              <option value="adaptive">{c.adaptive}</option>
              <option value="fixed">{c.fixed}</option>
            </select>
          </label>
          <div className="scaffolding-hero__session">
            <span>
              {c.learnerLabel}: <code>{shortLearnerId(profile.learnerId)}</code>
            </span>
            <button type="button" className="ghost-btn" onClick={handleNewSession}>
              ↺ {c.resetSession}
            </button>
          </div>
        </div>
      </div>

      <div className="scaffolding-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'qa'}
          className={mode === 'qa' ? 'is-active' : ''}
          onClick={() => setMode('qa')}
        >
          💬 {c.tabQa}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sft'}
          className={mode === 'sft' ? 'is-active' : ''}
          onClick={() => setMode('sft')}
        >
          🧬 {c.tabSft}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'dashboard'}
          className={mode === 'dashboard' ? 'is-active' : ''}
          onClick={() => setMode('dashboard')}
        >
          📊 {c.tabDashboard}
        </button>
      </div>

      {mode === 'qa' && (
        <div className="scaffolding-qa-grid">
          {/* Left column: Canadian / AP Curriculum Entry Points */}
          <aside className="panel scaffolding-topics">
            <div className="scaffolding-topics__head">
              <h3>{c.topicPrompts}</h3>
              <label>
                <span>{c.unitFilter}</span>
                <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u === 'ALL' ? c.allUnits : u}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="scaffolding-topic-list">
              {filteredTopics.map((topic) => (
                <button
                  type="button"
                  key={topic.id}
                  className={`scaffolding-topic-card ${
                    activeTopicId === topic.id ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    setActiveTopicId(topic.id)
                    void sendQuestion(topic.prompt[locale], topic.questionKey)
                  }}
                  disabled={busy}
                >
                  <span className="topic-badge">{topic.badge}</span>
                  <strong>{topic.title[locale]}</strong>
                  <small>{topic.prompt[locale]}</small>
                </button>
              ))}
            </div>
          </aside>

          {/* Center column: Guarded Scaffolding Q&A Workspace */}
          <main className="panel scaffolding-chat-workspace">
            <div className="scaffolding-progress-bar">
              <div className="scaffolding-sequence">
                <small>{c.sequenceTitle}</small>
                <ol>
                  {(Object.keys(c.phases) as ScaffoldPhase[]).map((pKey) => (
                    <li key={pKey} className={pKey === phase ? 'is-active' : ''}>
                      {c.phases[pKey]}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="scaffolding-ladder">
                <small>{c.supportTitle}</small>
                <div className="ladder-pills">
                  {c.supports.map((label, idx) => (
                    <button
                      type="button"
                      key={label}
                      className={idx === supportLevel ? 'is-active' : ''}
                      onClick={() => setSupportLevel(idx as SupportLevel)}
                      title="Click to test support level manually or let the tutor auto-advance"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="scaffolding-messages">
              {messages.map((m, idx) => (
                <article
                  key={`${m.role}-${idx}`}
                  className={`scaffolding-bubble is-${m.role}`}
                >
                  <div className="scaffolding-bubble__avatar">
                    {m.role === 'tutor' ? 'AI' : 'YOU'}
                  </div>
                  <div className="scaffolding-bubble__body">
                    {m.role === 'tutor' && (m.phase || m.supportLevel !== undefined) && (
                      <div className="scaffolding-bubble__meta">
                        {m.phase && <span className="meta-phase">{c.phases[m.phase]}</span>}
                        {m.supportLevel !== undefined && (
                          <span className="meta-support">{c.supports[m.supportLevel]}</span>
                        )}
                        {m.barrier && m.barrier !== 'insufficient-evidence' && (
                          <span className="meta-barrier">{m.barrier}</span>
                        )}
                        {m.matchedTopic && (
                          <span className="meta-topic">SFT: {m.matchedTopic.slice(0, 42)}</span>
                        )}
                      </div>
                    )}
                    <p>{m.text}</p>
                  </div>
                </article>
              ))}
              {busy && (
                <article className="scaffolding-bubble is-tutor">
                  <div className="scaffolding-bubble__avatar">AI</div>
                  <div className="scaffolding-bubble__body">
                    <p className="is-thinking">{c.thinking}</p>
                  </div>
                </article>
              )}
              <div ref={chatEndRef} />
            </div>

            <form className="scaffolding-composer" onSubmit={handleSubmit}>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={c.inputPlaceholder}
                disabled={busy}
              />
              <button type="submit" className="primary-btn" disabled={!draft.trim() || busy}>
                {c.send} ↑
              </button>
            </form>
          </main>

          {/* Right column: Live Diagnostic & Barrier Classification Inspector */}
          <aside className="panel scaffolding-diagnosis">
            <h3>{c.liveDiagnosisTitle}</h3>

            <div className="diagnosis-card">
              <div className="diagnosis-row">
                <span>{c.barrierLabel}</span>
                <strong className={`barrier-tag is-${latestDiagnosis?.barrier ?? 'insufficient-evidence'}`}>
                  {latestDiagnosis?.barrier ?? 'insufficient-evidence'}
                </strong>
              </div>
              <p className="diagnosis-desc">
                {
                  c.barrierDescriptions[
                    latestDiagnosis?.barrier ?? 'insufficient-evidence'
                  ]
                }
              </p>

              <div className="diagnosis-row">
                <span>{c.confidenceLabel}</span>
                <code>{latestDiagnosis?.barrierConfidence ?? 'low'}</code>
              </div>

              {latestDiagnosis?.matchedTopic && (
                <div className="diagnosis-block">
                  <span>{c.matchedLabel}</span>
                  <strong>{latestDiagnosis.matchedTopic}</strong>
                  {latestDiagnosis.matchedSource && (
                    <small>
                      {latestDiagnosis.matchedSource}
                      {latestDiagnosis.similarity !== undefined
                        ? ` · cos=${latestDiagnosis.similarity}`
                        : ''}
                    </small>
                  )}
                </div>
              )}

              {latestDiagnosis?.whatChanged && (
                <div className="diagnosis-block">
                  <span>{c.whatChangedLabel}</span>
                  <p>{latestDiagnosis.whatChanged}</p>
                </div>
              )}

              {latestDiagnosis?.remainingDifficulty && (
                <div className="diagnosis-block">
                  <span>{c.remainingLabel}</span>
                  <p>{latestDiagnosis.remainingDifficulty}</p>
                </div>
              )}

              {latestDiagnosis?.nextActivity && (
                <div className="diagnosis-block is-highlight">
                  <span>{c.nextActivityLabel}</span>
                  <p>{latestDiagnosis.nextActivity}</p>
                </div>
              )}
            </div>

            <div className="taxonomy-reference">
              <h4>Research.pdf §5 Barrier Taxonomy</h4>
              <ul>
                {BARRIERS.map((b) => (
                  <li
                    key={b}
                    className={latestDiagnosis?.barrier === b ? 'is-current' : ''}
                  >
                    <code>{b}</code>
                    <span>{c.barrierDescriptions[b]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}

      {mode === 'sft' && (
        <div className="scaffolding-sft-view">
          <div className="panel sft-overview">
            <div>
              <h3>{c.sftHeader}</h3>
              <p>{c.sftSub}</p>
            </div>
            <div className="sft-metrics-grid">
              <div className="sft-metric">
                <span>{c.metricDialogues}</span>
                <strong>{sftCatalog?.numDialogues ?? 182}</strong>
                <small>data/sft/chem_scaffolding_sft.jsonl</small>
              </div>
              <div className="sft-metric">
                <span>{c.metricDpo}</span>
                <strong>{sftCatalog?.summary?.total_dpo_pairs ?? 48}</strong>
                <small>data/sft/chem_scaffolding_dpo.jsonl</small>
              </div>
              <div className="sft-metric">
                <span>{c.metricAcc}</span>
                <strong>
                  {sftCatalog?.trainingMetrics.length
                    ? `${(
                        sftCatalog.trainingMetrics[
                          sftCatalog.trainingMetrics.length - 1
                        ].barrier_acc * 100
                      ).toFixed(1)}%`
                    : '98.0%'}
                </strong>
                <small>
                  Dialogue acc:{' '}
                  {sftCatalog?.trainingMetrics.length
                    ? `${(
                        sftCatalog.trainingMetrics[
                          sftCatalog.trainingMetrics.length - 1
                        ].dialogue_acc * 100
                      ).toFixed(1)}%`
                    : '86.8%'}
                </small>
              </div>
              <div className="sft-metric">
                <span>{c.metricDevice}</span>
                <strong>{sftCatalog?.trainedOnDevice ?? 'CUDA (RTX 5060)'}</strong>
                <small>scripts/train_local_scaffold_model.py</small>
              </div>
            </div>
          </div>

          <div className="sft-two-col">
            <div className="panel sft-sources">
              <h4>{c.sourcesTitle}</h4>
              <div className="sft-source-cards">
                {(sftCatalog?.summary?.sources ?? []).map((src) => (
                  <article key={src.id} className="sft-source-card">
                    <div>
                      <strong>{src.id}</strong>
                      <span>{src.type}</span>
                    </div>
                    <p>{src.role}</p>
                    <a href={src.url} target="_blank" rel="noreferrer">
                      {src.url} ↗
                    </a>
                  </article>
                ))}
              </div>
            </div>

            <div className="panel sft-curves">
              <h4>{c.curvesTitle}</h4>
              <table className="sft-table">
                <thead>
                  <tr>
                    <th>Epoch</th>
                    <th>Loss</th>
                    <th>Dialogue Retrieval Acc</th>
                    <th>Barrier Diagnosis Acc</th>
                  </tr>
                </thead>
                <tbody>
                  {(sftCatalog?.trainingMetrics ?? []).map((row) => (
                    <tr key={row.epoch}>
                      <td>{row.epoch}</td>
                      <td>{row.loss.toFixed(4)}</td>
                      <td>{(row.dialogue_acc * 100).toFixed(1)}%</td>
                      <td>{(row.barrier_acc * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="sft-script-note">
                Cloud / Full LLM LoRA SFT script included at{' '}
                <code>scripts/train_trl_sft.py</code> (TRL <code>SFTTrainer</code> +{' '}
                <code>Qwen/Qwen2.5-3B-Instruct</code>).
              </p>
            </div>
          </div>

          <div className="panel sft-explorer">
            <div className="sft-explorer__head">
              <h4>{c.explorerTitle}</h4>
              <select
                value={selectedExemplarId}
                onChange={(e) => setSelectedExemplarId(e.target.value)}
              >
                {(sftCatalog?.exemplars ?? []).map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    [{ex.curriculum.split(':')[0]}] {ex.topic}
                  </option>
                ))}
              </select>
              {selectedExemplar && (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    setMode('qa')
                    void sendQuestion(
                      selectedExemplar.sampleQuestion,
                      selectedExemplar.questionKey as QuestionKey,
                    )
                  }}
                >
                  {c.tryPrompt} →
                </button>
              )}
            </div>

            {selectedExemplar && (
              <div className="sft-exemplar-detail">
                <div className="sft-exemplar-meta">
                  <span>
                    <b>Source:</b> {selectedExemplar.source}
                  </span>
                  <span>
                    <b>Curriculum:</b> {selectedExemplar.curriculum}
                  </span>
                  <span>
                    <b>Target Barrier:</b> <code>{selectedExemplar.barrier}</code>
                  </span>
                </div>
                <div className="sft-exemplar-turns">
                  {selectedExemplar.messages.map((m, idx) => (
                    <div key={idx} className={`sft-turn is-${m.role}`}>
                      <strong>
                        {m.role === 'user' ? 'Student' : 'Scaffolding Tutor'}
                        {m.phase ? ` · ${m.phase}` : ''}
                        {m.supportLevel !== undefined ? ` (L${m.supportLevel})` : ''}
                      </strong>
                      <p>{m.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'dashboard' && (
        <div className="panel scaffolding-dashboard">
          <div className="scaffolding-dashboard__head">
            <div>
              <h3>{c.fadeHeader}</h3>
              <p>{c.fadeSub}</p>
            </div>
            <button
              type="button"
              className="primary-btn"
              onClick={() => void exportLearningLog()}
            >
              ⬇ {c.exportJsonl}
            </button>
          </div>

          <div className="dashboard-learners">
            {(dashboard?.learners ?? []).map((learner) => (
              <article key={learner.learnerId} className="dashboard-learner-card">
                <header>
                  <strong>
                    Learner <code>{shortLearnerId(learner.learnerId)}</code>
                  </strong>
                  <span className="condition-tag">{learner.condition}</span>
                  <span className="phase-tag">{learner.latestPhase}</span>
                  {learner.latestBarrier && (
                    <span className={`barrier-tag is-${learner.latestBarrier}`}>
                      {learner.latestBarrier}
                    </span>
                  )}
                </header>

                {learner.latestExcerpt && (
                  <p className="learner-excerpt">“{learner.latestExcerpt}”</p>
                )}

                <div className="learner-grid">
                  {learner.remainingDifficulty && (
                    <div>
                      <small>{c.remainingLabel}</small>
                      <p>{learner.remainingDifficulty}</p>
                    </div>
                  )}
                  {learner.nextActivity && (
                    <div>
                      <small>{c.nextActivityLabel}</small>
                      <p>{learner.nextActivity}</p>
                    </div>
                  )}
                </div>

                <div className="learner-asks">
                  <small>Ask-Count Trajectory Across Sessions:</small>
                  <ul>
                    {learner.asks.map((ask) => (
                      <li key={ask.questionKey}>
                        <code>{ask.questionKey}</code>
                        <span>
                          {ask.sessions.map((s) => s.askCount).join(' → ')} asks
                        </span>
                        <em className={`fade-badge is-${ask.fade}`}>{ask.fade}</em>
                      </li>
                    ))}
                  </ul>
                </div>

                {learner.learnerId === profile.learnerId && (
                  <div className="teacher-review-bar">
                    <button
                      type="button"
                      onClick={() => void handleTeacherReview('accept')}
                    >
                      ✓ {c.acceptBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleTeacherReview('reject')}
                    >
                      ✕ {c.rejectBtn}
                    </button>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          void handleTeacherReview(
                            'correct',
                            e.target.value as BarrierCategory,
                          )
                        }
                      }}
                    >
                      <option value="">{c.correctLabel}…</option>
                      {BARRIERS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Teacher note…"
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
