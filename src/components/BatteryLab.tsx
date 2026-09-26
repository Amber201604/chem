import { useMemo, useState, type FormEvent } from 'react'
import {
  DEFAULT_DANIELL_STATE,
  solveChemistry,
  type BridgeStatus,
  type LabState,
} from '../engine/chemistrySolver'
import { useI18n } from '../i18n/I18nProvider'

type ViewMode = 'macro' | 'micro'
type TutorTab = 'coach' | 'practice'
type Mastery = 'novice' | 'intermediate' | 'exam'
type Message = { role: 'tutor' | 'student'; text: string }

const copy = {
  en: {
    eyebrow: 'AP CHEMISTRY · UNIT 9',
    title: 'Galvanic Cell Investigation',
    subtitle: 'Build a Zn–Cu cell, change one variable, and explain the evidence at particle scale.',
    objective: 'LEARNING OBJECTIVE',
    objectiveText: 'Connect cell potential, electron transfer, ion migration, and electrode mass.',
    macro: 'Macro lab',
    micro: 'Particle lens',
    setup: 'Experimental setup',
    setupHint: 'Manipulate the cell, then close the circuit.',
    bridge: 'Salt bridge',
    connected: 'KNO₃ · clear',
    missing: 'Removed',
    clogged: 'Clogged',
    zincSurface: 'Zinc surface',
    polished: 'Polished',
    oxidized: 'ZnO coating',
    wire: 'Wire + meter',
    installed: 'Connected',
    removed: 'Disconnected',
    concentration: 'concentration',
    close: 'Run experiment',
    open: 'Open circuit',
    reset: 'Reset',
    reading: 'LIVE VOLTMETER',
    standard: 'standard conditions',
    nonstandard: 'Nernst-adjusted',
    openCircuit: 'open circuit',
    evidence: 'Evidence stream',
    anode: 'ANODE',
    cathode: 'CATHODE',
    oxidation: 'Zn(s) → Zn²⁺(aq) + 2e⁻',
    reduction: 'Cu²⁺(aq) + 2e⁻ → Cu(s)',
    massDown: 'mass decreases',
    massUp: 'mass increases',
    noReaction: 'No sustained redox reaction',
    electronCaption: 'Electrons move Zn → Cu through the wire',
    microTitle: 'Microscopic cross-section',
    microNote: 'Representative particles · not to scale',
    zoomHint: 'Watch charge move through two different pathways.',
    tutor: 'AI Lab Coach',
    tutorSub: 'Socratic mode · state-aware',
    coach: 'Coach',
    practice: 'AP Practice',
    input: 'Ask about what you observe…',
    send: 'Send',
    quick1: 'Why is voltage zero?',
    quick2: 'Which electrode loses mass?',
    quick3: 'Why does K⁺ move right?',
    welcome: 'Before we calculate, what evidence would identify the anode: electron direction, ion change, or electrode mass?',
    teacher: 'Teacher controls',
    teacherHint: 'Guide the coach toward a known misconception.',
    misconception: 'Misconception focus',
    misconceptionPlaceholder: 'e.g. Student thinks K⁺ moves because of gravity.',
    mastery: 'Student readiness',
    novice: 'Novice',
    intermediate: 'Intermediate',
    exam: 'AP Exam Prep Ready',
    apply: 'Apply to coach',
    applied: 'Context applied',
    practiceTitle: 'Personalized check',
    generated: 'Generated from this lab state · not an official AP question',
    question: 'A student assembles the cell shown. Which observation best supports the claim that oxidation occurs at the zinc electrode?',
    a: 'A. The zinc electrode gains mass.',
    b: 'B. The concentration of Zn²⁺ increases.',
    c: 'C. K⁺ migrates into the zinc half-cell.',
    d: 'D. Electrons flow from Cu to Zn.',
    check: 'Check answer',
    correct: 'Correct. Zn atoms become Zn²⁺, so [Zn²⁺] rises.',
    tryAgain: 'Revisit the oxidation half-reaction and track where its product appears.',
    frq: 'FRQ extension',
    frqBody: 'Predict how increasing [Zn²⁺] while holding [Cu²⁺] constant changes Ecell. Justify with Q and the Nernst equation.',
    rubric: 'Scoring guideline',
    rubricBody: '1 pt: Q increases. 1 pt: ln Q increases, so Ecell decreases.',
    reveal: 'Reveal scoring',
    official: 'Official released AP Chemistry FRQs ↗',
    model: 'Model boundary',
    modelText: 'Dots show direction and relative change only. A 0.00 V fault means no sustained operation in this model; a real high-impedance meter may briefly detect open-circuit potential.',
    voltageFault: 'Trace both charge pathways. Which one is interrupted in your current setup?',
    massPrompt: 'At the anode, does the half-reaction create solid metal or aqueous ions? What should that do to mass?',
    ionPrompt: 'Cu²⁺ is being removed on the right. What charge imbalance would remain, and which salt-bridge ion can oppose it?',
    genericPrompt: 'Choose one observation on the left and one at particle scale. How could they support the same claim?',
  },
  zh: {
    eyebrow: 'AP 化学 · 第 9 单元',
    title: '原电池探究实验',
    subtitle: '搭建锌—铜原电池，改变一个变量，并从粒子尺度解释证据。',
    objective: '学习目标',
    objectiveText: '建立电池电势、电子转移、离子迁移与电极质量之间的联系。',
    macro: '宏观实验',
    micro: '微观透视',
    setup: '实验设置',
    setupHint: '调整装置，然后闭合电路。',
    bridge: '盐桥',
    connected: 'KNO₃ · 畅通',
    missing: '已移除',
    clogged: '已堵塞',
    zincSurface: '锌片表面',
    polished: '已打磨',
    oxidized: 'ZnO 氧化层',
    wire: '导线与电压表',
    installed: '已连接',
    removed: '已断开',
    concentration: '浓度',
    close: '开始实验',
    open: '断开电路',
    reset: '重置',
    reading: '实时电压',
    standard: '标准状态',
    nonstandard: '能斯特修正',
    openCircuit: '开路',
    evidence: '证据流',
    anode: '负极 / 阳极',
    cathode: '正极 / 阴极',
    oxidation: 'Zn(s) → Zn²⁺(aq) + 2e⁻',
    reduction: 'Cu²⁺(aq) + 2e⁻ → Cu(s)',
    massDown: '质量减小',
    massUp: '质量增加',
    noReaction: '没有持续的氧化还原反应',
    electronCaption: '电子通过导线由 Zn 流向 Cu',
    microTitle: '微观剖面',
    microNote: '代表性粒子 · 非真实比例',
    zoomHint: '观察电荷如何通过两条不同路径移动。',
    tutor: 'AI 实验导师',
    tutorSub: '苏格拉底模式 · 感知实验状态',
    coach: '导师',
    practice: 'AP 练习',
    input: '随时询问你的观察…',
    send: '发送',
    quick1: '为什么电压为零？',
    quick2: '哪个电极质量减小？',
    quick3: '为什么 K⁺ 向右移动？',
    welcome: '先不计算：电子方向、离子变化和电极质量中，哪些证据可以判断阳极？',
    teacher: '教师控制台',
    teacherHint: '把已知易错点注入导师上下文。',
    misconception: '易错点聚焦',
    misconceptionPlaceholder: '例如：学生认为 K⁺ 因重力移动。',
    mastery: '学生程度',
    novice: '初学',
    intermediate: '进阶',
    exam: 'AP 备考',
    apply: '应用到导师',
    applied: '上下文已应用',
    practiceTitle: '个性化检测',
    generated: '基于当前实验状态生成 · 非 AP 官方试题',
    question: '学生搭建图示电池。哪项观察最能支持“锌电极发生氧化”？',
    a: 'A. 锌电极质量增加。',
    b: 'B. Zn²⁺ 浓度增加。',
    c: 'C. K⁺ 迁移到锌半电池。',
    d: 'D. 电子从 Cu 流向 Zn。',
    check: '检查答案',
    correct: '正确。Zn 原子变为 Zn²⁺，所以 [Zn²⁺] 上升。',
    tryAgain: '回到氧化半反应，追踪生成物出现在哪里。',
    frq: 'FRQ 拓展',
    frqBody: '保持 [Cu²⁺] 不变而提高 [Zn²⁺]，预测 Ecell 的变化。用 Q 和能斯特方程说明。',
    rubric: '评分标准',
    rubricBody: '1 分：Q 增大。1 分：ln Q 增大，因此 Ecell 减小。',
    reveal: '显示评分标准',
    official: 'AP 化学官方公开 FRQ ↗',
    model: '模型边界',
    modelText: '圆点只表示方向与相对变化。本模型用 0.00 V 表示无法持续工作；真实高内阻电压表仍可能短暂测到开路电势。',
    voltageFault: '沿两条电荷通路逐一检查：当前装置中哪一条中断了？',
    massPrompt: '阳极半反应生成固体金属还是水合离子？这会怎样改变质量？',
    ionPrompt: '右侧 Cu²⁺ 正被消耗，会留下怎样的电荷失衡？盐桥中哪种离子可以抵消？',
    genericPrompt: '选择一个宏观观察和一个微观观察：它们如何支持同一个结论？',
  },
  fr: {
    eyebrow: 'CHIMIE AP · UNITÉ 9',
    title: 'Étude d’une pile galvanique',
    subtitle: 'Construisez une pile Zn–Cu, modifiez une variable et expliquez les preuves à l’échelle particulaire.',
    objective: 'OBJECTIF',
    objectiveText: 'Relier potentiel, transfert d’électrons, migration ionique et masse des électrodes.',
    macro: 'Labo macro',
    micro: 'Vue particulaire',
    setup: 'Montage expérimental',
    setupHint: 'Modifiez la pile, puis fermez le circuit.',
    bridge: 'Pont salin',
    connected: 'KNO₃ · libre',
    missing: 'Retiré',
    clogged: 'Bouché',
    zincSurface: 'Surface du zinc',
    polished: 'Polie',
    oxidized: 'Couche de ZnO',
    wire: 'Fil + voltmètre',
    installed: 'Connecté',
    removed: 'Déconnecté',
    concentration: 'concentration',
    close: 'Lancer',
    open: 'Ouvrir le circuit',
    reset: 'Réinitialiser',
    reading: 'VOLTMÈTRE EN DIRECT',
    standard: 'conditions standard',
    nonstandard: 'corrigé par Nernst',
    openCircuit: 'circuit ouvert',
    evidence: 'Flux de preuves',
    anode: 'ANODE',
    cathode: 'CATHODE',
    oxidation: 'Zn(s) → Zn²⁺(aq) + 2e⁻',
    reduction: 'Cu²⁺(aq) + 2e⁻ → Cu(s)',
    massDown: 'masse diminue',
    massUp: 'masse augmente',
    noReaction: 'Pas de réaction rédox soutenue',
    electronCaption: 'Les électrons vont de Zn vers Cu dans le fil',
    microTitle: 'Coupe microscopique',
    microNote: 'Particules représentatives · pas à l’échelle',
    zoomHint: 'Observez les deux voies de déplacement de charge.',
    tutor: 'Coach IA',
    tutorSub: 'Mode socratique · conscient de l’état',
    coach: 'Coach',
    practice: 'Exercice AP',
    input: 'Posez une question sur vos observations…',
    send: 'Envoyer',
    quick1: 'Pourquoi la tension est-elle nulle ?',
    quick2: 'Quelle électrode perd de la masse ?',
    quick3: 'Pourquoi K⁺ va-t-il à droite ?',
    welcome: 'Avant de calculer, quelle preuve identifie l’anode : direction des électrons, ions ou masse ?',
    teacher: 'Contrôles enseignant',
    teacherHint: 'Orientez le coach vers une difficulté connue.',
    misconception: 'Idée fausse ciblée',
    misconceptionPlaceholder: 'ex. K⁺ se déplacerait à cause de la gravité.',
    mastery: 'Niveau de l’élève',
    novice: 'Débutant',
    intermediate: 'Intermédiaire',
    exam: 'Prêt pour AP',
    apply: 'Appliquer au coach',
    applied: 'Contexte appliqué',
    practiceTitle: 'Vérification personnalisée',
    generated: 'Généré depuis cet état · question AP non officielle',
    question: 'Quelle observation soutient le mieux que le zinc subit une oxydation ?',
    a: 'A. L’électrode de zinc gagne de la masse.',
    b: 'B. La concentration de Zn²⁺ augmente.',
    c: 'C. K⁺ migre vers la demi-pile au zinc.',
    d: 'D. Les électrons vont de Cu vers Zn.',
    check: 'Vérifier',
    correct: 'Correct. Zn devient Zn²⁺, donc [Zn²⁺] augmente.',
    tryAgain: 'Reprenez la demi-équation d’oxydation et suivez son produit.',
    frq: 'Extension FRQ',
    frqBody: 'Prédisez l’effet d’une hausse de [Zn²⁺] sur Ecell. Justifiez avec Q et Nernst.',
    rubric: 'Barème',
    rubricBody: '1 pt : Q augmente. 1 pt : ln Q augmente, donc Ecell diminue.',
    reveal: 'Afficher le barème',
    official: 'FRQ officielles publiées par AP Chemistry ↗',
    model: 'Limites du modèle',
    modelText: 'Les points indiquent direction et variation relative. Ici 0,00 V signifie aucun fonctionnement soutenu ; un vrai voltmètre peut brièvement détecter un potentiel à circuit ouvert.',
    voltageFault: 'Suivez les deux voies de charge. Laquelle est interrompue dans ce montage ?',
    massPrompt: 'À l’anode, forme-t-on un solide ou des ions aqueux ? Quel effet sur la masse ?',
    ionPrompt: 'Cu²⁺ disparaît à droite. Quel déséquilibre reste, et quel ion du pont peut le compenser ?',
    genericPrompt: 'Choisissez une observation macro et une observation particulaire. Comment soutiennent-elles la même conclusion ?',
  },
} as const

const bridgeCycle: BridgeStatus[] = ['connected', 'missing', 'clogged']

function nextBridge(current: BridgeStatus) {
  return bridgeCycle[(bridgeCycle.indexOf(current) + 1) % bridgeCycle.length]
}

export function BatteryLab() {
  const { locale } = useI18n()
  const c = copy[locale]
  const [lab, setLab] = useState<LabState>(DEFAULT_DANIELL_STATE)
  const [view, setView] = useState<ViewMode>('macro')
  const [tab, setTab] = useState<TutorTab>('coach')
  const [messages, setMessages] = useState<Message[]>([{ role: 'tutor', text: c.welcome }])
  const [draft, setDraft] = useState('')
  const [teacherOpen, setTeacherOpen] = useState(false)
  const [misconception, setMisconception] = useState('')
  const [mastery, setMastery] = useState<Mastery>('intermediate')
  const [applied, setApplied] = useState(false)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [rubricOpen, setRubricOpen] = useState(false)
  const result = useMemo(() => solveChemistry(lab), [lab])
  const operating = result.reactionType !== 'Open-Circuit'

  const updateConcentration = (side: 'left' | 'right', value: number) => {
    setLab((current) => ({
      ...current,
      [side]: { ...current[side], concentrationM: value },
    }))
  }

  const askTutor = (question: string) => {
    const normalized = question.toLowerCase()
    let response = c.genericPrompt
    if (normalized.includes('zero') || normalized.includes('零') || normalized.includes('nulle')) response = c.voltageFault
    else if (normalized.includes('mass') || normalized.includes('质量') || normalized.includes('masse')) response = c.massPrompt
    else if (normalized.includes('k+') || normalized.includes('ion') || normalized.includes('移动')) response = c.ionPrompt
    if (misconception.trim()) response = `${response} (${c.misconception}: ${misconception.trim()})`
    setMessages((current) => [...current, { role: 'student', text: question }, { role: 'tutor', text: response }])
    setDraft('')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (draft.trim()) askTutor(draft.trim())
  }

  const statusLabel =
    result.reactionType === 'Open-Circuit'
      ? c.openCircuit
      : result.reactionType === 'Standard'
        ? c.standard
        : c.nonstandard

  return (
    <section className="ap-cell-lab">
      <header className="ap-cell-hero">
        <div>
          <span className="eyebrow">{c.eyebrow}</span>
          <h2>{c.title}</h2>
          <p>{c.subtitle}</p>
        </div>
        <div className="ap-objective">
          <span>{c.objective}</span>
          <strong>{c.objectiveText}</strong>
        </div>
      </header>

      <div className="ap-cell-grid">
        <main className="ap-sandbox panel">
          <div className="ap-sandbox__bar">
            <div className="ap-view-switch" role="tablist">
              <button className={view === 'macro' ? 'is-active' : ''} onClick={() => setView('macro')} type="button">◫ {c.macro}</button>
              <button className={view === 'micro' ? 'is-active' : ''} onClick={() => setView('micro')} type="button">⌬ {c.micro}</button>
            </div>
            <div className={`ap-meter ${operating ? 'is-live' : ''}`}>
              <span>{c.reading}</span>
              <strong>{result.EMF.toFixed(2)} <small>V</small></strong>
              <em>{statusLabel}</em>
            </div>
          </div>

          <div className="ap-lab-stage">
            {view === 'macro' ? (
              <MacroCell running={operating} emf={result.EMF} bridge={lab.saltBridge} polished={lab.left.polished} wire={lab.wireConnected} caption={c.electronCaption} />
            ) : (
              <MicroCell running={operating} bridge={lab.saltBridge} title={c.microTitle} note={c.microNote} hint={c.zoomHint} />
            )}
          </div>

          <div className="ap-controls">
            <div className="ap-controls__head">
              <div><strong>{c.setup}</strong><span>{c.setupHint}</span></div>
              <button type="button" className="ap-reset" onClick={() => setLab(DEFAULT_DANIELL_STATE)}>↻ {c.reset}</button>
            </div>
            <div className="ap-control-grid">
              <label className="ap-slider">
                <span>Zn²⁺ {c.concentration}<b>{lab.left.concentrationM.toFixed(1)} M</b></span>
                <input type="range" min="0.1" max="2" step="0.1" value={lab.left.concentrationM} onChange={(e) => updateConcentration('left', Number(e.target.value))} />
              </label>
              <label className="ap-slider">
                <span>Cu²⁺ {c.concentration}<b>{lab.right.concentrationM.toFixed(1)} M</b></span>
                <input type="range" min="0.1" max="2" step="0.1" value={lab.right.concentrationM} onChange={(e) => updateConcentration('right', Number(e.target.value))} />
              </label>
              <button type="button" className={`ap-toggle ${lab.saltBridge === 'connected' ? 'is-on' : 'is-fault'}`} onClick={() => setLab((x) => ({ ...x, saltBridge: nextBridge(x.saltBridge), switchClosed: false }))}>
                <span>⌁</span><div><small>{c.bridge}</small><strong>{lab.saltBridge === 'connected' ? c.connected : lab.saltBridge === 'missing' ? c.missing : c.clogged}</strong></div>
              </button>
              <button type="button" className={`ap-toggle ${lab.left.polished ? 'is-on' : 'is-fault'}`} onClick={() => setLab((x) => ({ ...x, left: { ...x.left, polished: !x.left.polished }, switchClosed: false }))}>
                <span>◇</span><div><small>{c.zincSurface}</small><strong>{lab.left.polished ? c.polished : c.oxidized}</strong></div>
              </button>
              <button type="button" className={`ap-toggle ${lab.wireConnected ? 'is-on' : 'is-fault'}`} onClick={() => setLab((x) => ({ ...x, wireConnected: !x.wireConnected, switchClosed: false }))}>
                <span>⌁</span><div><small>{c.wire}</small><strong>{lab.wireConnected ? c.installed : c.removed}</strong></div>
              </button>
              <button type="button" className={`ap-run ${operating ? 'is-running' : ''}`} onClick={() => setLab((x) => ({ ...x, switchClosed: !x.switchClosed }))}>
                <span>{operating ? '■' : '▶'}</span>{operating ? c.open : c.close}
              </button>
            </div>
          </div>

          <div className="ap-evidence">
            <span>{c.evidence}</span>
            <article className={operating ? 'is-active' : ''}><i>Zn</i><div><small>{c.anode}</small><strong>{operating ? c.oxidation : c.noReaction}</strong><em>{operating ? `↓ ${c.massDown}` : '—'}</em></div></article>
            <b>e⁻ →</b>
            <article className={operating ? 'is-active ap-copper' : 'ap-copper'}><i>Cu</i><div><small>{c.cathode}</small><strong>{operating ? c.reduction : c.noReaction}</strong><em>{operating ? `↑ ${c.massUp}` : '—'}</em></div></article>
          </div>
          <div className="ap-model-note"><strong>{c.model}</strong><span>{c.modelText}</span></div>
        </main>

        <aside className="ap-tutor panel">
          <header className="ap-tutor__head">
            <div className="ap-avatar">AI</div>
            <div><h3>{c.tutor}</h3><p><i /> {c.tutorSub}</p></div>
            <button type="button" onClick={() => setTeacherOpen((x) => !x)} aria-expanded={teacherOpen} title={c.teacher}>⚙</button>
          </header>

          {teacherOpen && (
            <div className="ap-teacher">
              <div><strong>{c.teacher}</strong><span>{c.teacherHint}</span></div>
              <label>{c.misconception}<textarea value={misconception} placeholder={c.misconceptionPlaceholder} onChange={(e) => { setMisconception(e.target.value); setApplied(false) }} /></label>
              <label>{c.mastery}<select value={mastery} onChange={(e) => { setMastery(e.target.value as Mastery); setApplied(false) }}><option value="novice">{c.novice}</option><option value="intermediate">{c.intermediate}</option><option value="exam">{c.exam}</option></select></label>
              <button type="button" onClick={() => setApplied(true)}>{applied ? `✓ ${c.applied}` : c.apply}</button>
            </div>
          )}

          <div className="ap-tutor__tabs">
            <button className={tab === 'coach' ? 'is-active' : ''} type="button" onClick={() => setTab('coach')}>{c.coach}</button>
            <button className={tab === 'practice' ? 'is-active' : ''} type="button" onClick={() => setTab('practice')}>{c.practice}</button>
          </div>

          {tab === 'coach' ? (
            <>
              <div className="ap-chat">
                {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`ap-message is-${message.role}`}>{message.role === 'tutor' && <b>AI</b>}<p>{message.text}</p></div>)}
              </div>
              <div className="ap-quick">
                {[c.quick1, c.quick2, c.quick3].map((question) => <button type="button" key={question} onClick={() => askTutor(question)}>{question}</button>)}
              </div>
              <form className="ap-chatbox" onSubmit={submit}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={c.input} aria-label={c.input} />
                <button type="submit" disabled={!draft.trim()} aria-label={c.send}>↑</button>
              </form>
            </>
          ) : (
            <div className="ap-practice">
              <span className="ap-generated">{c.generated}</span>
              <h3>{c.practiceTitle}</h3>
              <p>{c.question}</p>
              <div className="ap-options">
                {(['a', 'b', 'c', 'd'] as const).map((key) => <button type="button" className={answer === key ? 'is-selected' : ''} onClick={() => { setAnswer(key); setChecked(false) }} key={key}>{c[key]}</button>)}
              </div>
              <button className="ap-check" type="button" disabled={!answer} onClick={() => setChecked(true)}>{c.check}</button>
              {checked && <div className={`ap-feedback ${answer === 'b' ? 'is-correct' : ''}`}>{answer === 'b' ? c.correct : c.tryAgain}</div>}
              <div className="ap-frq"><span>{c.frq}</span><p>{c.frqBody}</p><button type="button" onClick={() => setRubricOpen((x) => !x)}>{c.reveal}</button>{rubricOpen && <div><strong>{c.rubric}</strong><p>{c.rubricBody}</p></div>}</div>
              <a className="ap-official" href="https://apcentral.collegeboard.org/courses/ap-chemistry/exam/past-exam-questions" target="_blank" rel="noreferrer">{c.official}</a>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

function MacroCell({ running, emf, bridge, polished, wire, caption }: { running: boolean; emf: number; bridge: BridgeStatus; polished: boolean; wire: boolean; caption: string }) {
  return (
    <div className="macro-cell">
      <svg viewBox="0 0 820 470" role="img" aria-label="Interactive zinc copper galvanic cell">
        <defs>
          <linearGradient id="bench" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#182c3e" /><stop offset="1" stopColor="#09131e" /></linearGradient>
          <linearGradient id="znSolution" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#dcebf2" stopOpacity=".44" /><stop offset="1" stopColor="#7f9aa8" stopOpacity=".48" /></linearGradient>
          <linearGradient id="cuSolution" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#51c8f1" stopOpacity=".6" /><stop offset="1" stopColor="#0879aa" stopOpacity=".72" /></linearGradient>
          <filter id="electronGlow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path className="bench-line" d="M34 413H786" />
        {wire && <path className={`cell-wire ${running ? 'is-live' : ''}`} d="M230 148V58Q230 40 248 40H365M455 40H574Q592 40 592 58V148" />}
        <g className="lab-meter"><rect x="362" y="16" width="96" height="66" rx="12" /><circle cx="378" cy="67" r="5" /><circle cx="442" cy="67" r="5" /><text x="410" y="43" textAnchor="middle">{emf.toFixed(2)} V</text><path d="M385 58h50" /></g>
        {running && [0, 1, 2, 3].map((i) => <circle className="macro-electron" key={i} r="6" filter="url(#electronGlow)"><animateMotion dur="2.6s" begin={`${i * .65}s`} repeatCount="indefinite" path="M230 148V58Q230 40 248 40H574Q592 40 592 58V148" /></circle>)}
        <g className="macro-beaker"><path d="M92 174V384Q92 411 119 411H322Q349 411 349 384V174" /><path fill="url(#znSolution)" d="M101 241H340V381Q340 401 320 401H121Q101 401 101 381Z" /><ellipse cx="220" cy="241" rx="119" ry="12" /><text x="220" y="444" textAnchor="middle">ZnSO₄(aq)</text></g>
        <g className="macro-beaker"><path d="M471 174V384Q471 411 498 411H701Q728 411 728 384V174" /><path fill="url(#cuSolution)" d="M480 241H719V381Q719 401 699 401H500Q480 401 480 381Z" /><ellipse className="cu-surface" cx="599" cy="241" rx="119" ry="12" /><text x="599" y="444" textAnchor="middle">CuSO₄(aq)</text></g>
        <g className={`macro-electrode zinc ${polished ? '' : 'is-oxidized'}`}><path d="M204 126h53v243h-53z" /><text x="230" y="203" textAnchor="middle">Zn</text><text x="230" y="222" textAnchor="middle">ANODE (−)</text></g>
        <g className="macro-electrode copper"><path d="M566 126h53v243h-53z" /><text x="592" y="203" textAnchor="middle">Cu</text><text x="592" y="222" textAnchor="middle">CATHODE (+)</text></g>
        {bridge !== 'missing' && <g className={`macro-bridge ${bridge === 'clogged' ? 'is-clogged' : ''}`}><path d="M307 287Q410 154 513 287" /><text x="410" y="182" textAnchor="middle">KNO₃</text>{bridge === 'clogged' && <text className="bridge-block" x="410" y="220" textAnchor="middle">×</text>}</g>}
        {running && <><g className="macro-ion zn-ion"><circle cx="176" cy="307" r="19" /><text x="176" y="312" textAnchor="middle">Zn²⁺</text></g><g className="macro-ion cu-ion"><circle cx="662" cy="308" r="19" /><text x="662" y="313" textAnchor="middle">Cu²⁺</text></g><path className="deposit" d="M563 292l-7 48M555 302l-6 30" /></>}
      </svg>
      {running && <div className="macro-caption"><span>e⁻</span>{caption}</div>}
    </div>
  )
}

function MicroCell({ running, bridge, title, note, hint }: { running: boolean; bridge: BridgeStatus; title: string; note: string; hint: string }) {
  const ions = Array.from({ length: 10 }, (_, i) => i)
  return (
    <div className="micro-cell">
      <div className="micro-head"><div><strong>{title}</strong><span>{note}</span></div><em>{hint}</em></div>
      <div className="micro-wire"><span>Zn metal</span><div>{running && [0, 1, 2, 3].map((i) => <i style={{ animationDelay: `${i * .55}s` }} key={i}>e⁻</i>)}</div><span>Cu metal</span></div>
      <div className="micro-solutions">
        <section className="micro-half is-zinc"><header>OXIDATION</header>{ions.slice(0, 7).map((i) => <i key={i} style={{ left: `${12 + (i * 29) % 76}%`, top: `${18 + (i * 37) % 67}%` }}>{i % 2 ? 'SO₄²⁻' : 'Zn²⁺'}</i>)}{running && <b className="atom-release">Zn → Zn²⁺ + 2e⁻</b>}<div className="micro-metal">Zn(s)</div></section>
        <div className={`micro-bridge ${bridge !== 'connected' ? 'is-blocked' : ''}`}><strong>KNO₃ salt bridge</strong>{running && bridge === 'connected' && <><i className="k-ion">K⁺ →</i><i className="nitrate-ion">← NO₃⁻</i></>}</div>
        <section className="micro-half is-copper"><header>REDUCTION</header>{ions.slice(0, 8).map((i) => <i key={i} style={{ left: `${10 + (i * 31) % 78}%`, top: `${16 + (i * 41) % 68}%` }}>{i % 2 ? 'SO₄²⁻' : 'Cu²⁺'}</i>)}{running && <b className="atom-capture">Cu²⁺ + 2e⁻ → Cu</b>}<div className="micro-metal">Cu(s)</div></section>
      </div>
    </div>
  )
}
