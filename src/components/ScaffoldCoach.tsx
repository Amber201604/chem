import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { inferQuestionKey } from '../learning/catalog.ts'
import { exportLearningLog, fetchDashboard, logLearningEvent, requestTutor } from '../learning/api.ts'
import { loadLearner, saveLearner, shortLearnerId, startNewSession } from '../learning/session.ts'
import {
  MODEL_IDS,
  type BarrierCategory,
  type ChatTurn,
  type ClassDashboard,
  type LabSnapshot,
  type LearnerProfile,
  type QuestionKey,
  type ScaffoldPhase,
  type StudentSummary,
  type SupportLevel,
  type TutorOutput,
} from '../learning/types.ts'

type Locale = 'en' | 'zh' | 'fr'
type TutorTab = 'coach' | 'practice' | 'evidence'
type BuilderCopy = {
  tutor: string
  tutorSub: string
  coach: string
  practice: string
  welcome: string
  input: string
  send: string
  quickZero: string
  quickSign: string
  quickBridge: string
  teacher: string
  misconception: string
  misconceptionPlaceholder: string
  level: string
  novice: string
  intermediate: string
  exam: string
  apply: string
  applied: string
}

const ui = {
  en: {
    evidence: 'Evidence',
    predict: 'I predict…',
    carriers: 'How do charges move?',
    mass: 'Which electrode loses mass?',
    independent: 'Explain a new example',
    phase: 'Sequence',
    phases: {
      predict: 'Predict',
      explain: 'Explain',
      inspect: 'Inspect',
      diagnose: 'Diagnose',
      hint: 'Hint',
      revise: 'Revise',
      'independent-check': 'Check',
    } satisfies Record<ScaffoldPhase, string>,
    support: 'Support',
    supports: ['Question', 'Cue', 'Explicit', 'Unaided'] as const,
    model: 'Model',
    terra: 'GPT-5.6 Terra',
    flash: 'Gemini 3.6 Flash',
    condition: 'Study condition',
    adaptive: 'Adaptive AI',
    fixed: 'Fixed prompts',
    learner: 'Learner ID',
    newSession: 'New session',
    inspect: 'Open particle view',
    thinking: 'Reading this setup…',
    fallback: 'AI Gateway is not configured, so a guarded local scaffold is used. Add AI_GATEWAY_API_KEY to .env.local and restart npm run dev.',
    apiError: 'The gateway key was read, but the model call failed:',
    fadeTitle: 'Same-question ask counts',
    fadeHint: 'Fewer asks of the same question across sessions is the planned signal that support is fading.',
    effective: 'Fading — guidance looks effective',
    stable: 'Ask count unchanged',
    increasing: 'Asks rising — may still need a different cue',
    insufficient: 'Need another session to judge fading',
    asks: 'asks',
    classTitle: 'Class dashboard',
    exportLog: 'Export JSONL',
    pin: 'Teacher PIN',
    pinGo: 'Unlock',
    accept: 'Accept',
    correct: 'Correct',
    reject: 'Reject',
    remaining: 'Still unresolved',
    next: 'Suggested next lesson',
    barrier: 'Tentative barrier',
    none: 'No learner events yet. Use the coach so the dashboard can collect evidence.',
  },
  zh: {
    evidence: '证据',
    predict: '我预测…',
    carriers: '电荷怎样移动？',
    mass: '哪一支电极质量减小？',
    independent: '解释一个新例子',
    phase: '脚手架顺序',
    phases: {
      predict: '预测',
      explain: '解释',
      inspect: '观察',
      diagnose: '诊断',
      hint: '提示',
      revise: '修正',
      'independent-check': '自检',
    } satisfies Record<ScaffoldPhase, string>,
    support: '支持层级',
    supports: ['提问', '线索', '更明确', '独立'] as const,
    model: '模型',
    terra: 'GPT-5.6 Terra',
    flash: 'Gemini 3.6 Flash',
    condition: '实验条件',
    adaptive: '自适应 AI',
    fixed: '固定提示',
    learner: '匿名学号',
    newSession: '新课时',
    inspect: '打开微观视图',
    thinking: '正在读取当前装置…',
    fallback: '未配置 AI Gateway，已改用本地脚手架。请把 AI_GATEWAY_API_KEY 写进 .env.local 并重新运行 npm run dev。',
    apiError: '已读到 Gateway 密钥，但模型调用失败：',
    fadeTitle: '同一问题的提问次数',
    fadeHint: '跨课时同一问题提问次数下降，是“指导在消退、学生更独立”的预定信号。',
    effective: '正在消退 — 指导看起来有效',
    stable: '提问次数没有变化',
    increasing: '提问在增加 — 可能需要换一种线索',
    insufficient: '还需要另一次课时才能判断消退',
    asks: '次提问',
    classTitle: '全班仪表板',
    exportLog: '导出 JSONL',
    pin: '教师 PIN',
    pinGo: '解锁',
    accept: '接受',
    correct: '更正',
    reject: '驳回',
    remaining: '仍未解决',
    next: '建议后续活动',
    barrier: '暂定困难类型',
    none: '还没有学习事件。先使用导师，仪表板才会收集证据。',
  },
  fr: {
    evidence: 'Preuves',
    predict: 'Je prédis…',
    carriers: 'Comment les charges se déplacent-elles ?',
    mass: 'Quelle électrode perd de la masse ?',
    independent: 'Expliquer un nouvel exemple',
    phase: 'Séquence',
    phases: {
      predict: 'Prédire',
      explain: 'Expliquer',
      inspect: 'Observer',
      diagnose: 'Diagnostiquer',
      hint: 'Indice',
      revise: 'Réviser',
      'independent-check': 'Vérifier',
    } satisfies Record<ScaffoldPhase, string>,
    support: 'Soutien',
    supports: ['Question', 'Indice', 'Explicite', 'Autonome'] as const,
    model: 'Modèle',
    terra: 'GPT-5.6 Terra',
    flash: 'Gemini 3.6 Flash',
    condition: 'Condition',
    adaptive: 'IA adaptative',
    fixed: 'Consigne fixe',
    learner: 'Identifiant',
    newSession: 'Nouvelle séance',
    inspect: 'Ouvrir la vue particulaire',
    thinking: 'Lecture de ce montage…',
    fallback: 'Passerelle IA absente. Ajoutez AI_GATEWAY_API_KEY dans .env.local puis relancez npm run dev.',
    apiError: 'La clé a été lue, mais l’appel au modèle a échoué :',
    fadeTitle: 'Nombre de questions identiques',
    fadeHint: 'Moins de questions identiques d’une séance à l’autre est le signal prévu que le soutien s’efface.',
    effective: 'Effacement — le guidage semble efficace',
    stable: 'Fréquence inchangée',
    increasing: 'Questions en hausse — autre indice peut-être nécessaire',
    insufficient: 'Une autre séance est nécessaire pour juger',
    asks: 'questions',
    classTitle: 'Tableau de classe',
    exportLog: 'Exporter JSONL',
    pin: 'PIN enseignant',
    pinGo: 'Ouvrir',
    accept: 'Accepter',
    correct: 'Corriger',
    reject: 'Rejeter',
    remaining: 'Encore non résolu',
    next: 'Activité suivante',
    barrier: 'Obstacle provisoire',
    none: 'Aucun événement. Utilisez le coach pour collecter des preuves.',
  },
} as const

const fadeLabel: Record<Locale, Record<StudentSummary['asks'][number]['fade'], string>> = {
  en: {
    effective: ui.en.effective,
    stable: ui.en.stable,
    increasing: ui.en.increasing,
    insufficient: ui.en.insufficient,
  },
  zh: {
    effective: ui.zh.effective,
    stable: ui.zh.stable,
    increasing: ui.zh.increasing,
    insufficient: ui.zh.insufficient,
  },
  fr: {
    effective: ui.fr.effective,
    stable: ui.fr.stable,
    increasing: ui.fr.increasing,
    insufficient: ui.fr.insufficient,
  },
}

const BARRIERS: BarrierCategory[] = [
  'conceptual-misunderstanding',
  'representation-gap',
  'missing-prerequisite',
  'unsystematic-problem-solving',
  'ambiguous-language',
  'insufficient-evidence',
]

type Props = {
  locale: Locale
  c: BuilderCopy
  lab: LabSnapshot
  view: 'macro' | 'micro'
  practice: ReactNode
  onInspect: () => void
}

export function ScaffoldCoach({ locale, c, lab, view, practice, onInspect }: Props) {
  const labels = ui[locale]
  const [profile, setProfile] = useState<LearnerProfile>(() => loadLearner())
  const [tab, setTab] = useState<TutorTab>('coach')
  const [teacherOpen, setTeacherOpen] = useState(false)
  const [misconception, setMisconception] = useState('')
  const [level, setLevel] = useState('intermediate')
  const [contextApplied, setContextApplied] = useState(false)
  const [messages, setMessages] = useState<ChatTurn[]>([{ role: 'tutor', text: c.welcome }])
  const [draft, setDraft] = useState('')
  const [phase, setPhase] = useState<ScaffoldPhase>('predict')
  const [supportLevel, setSupportLevel] = useState<SupportLevel>(0)
  const [busy, setBusy] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [fallbackNote, setFallbackNote] = useState('')
  const [inspectCue, setInspectCue] = useState(false)
  const [viewedMicro, setViewedMicro] = useState(view === 'micro')
  const [dashboard, setDashboard] = useState<ClassDashboard | null>(null)
  const [pin, setPin] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)
  const lastView = useRef(view)

  useEffect(() => {
    saveLearner(profile)
  }, [profile])

  useEffect(() => {
    if (lastView.current !== 'micro' && view === 'micro') {
      setViewedMicro(true)
      void logLearningEvent({
        learnerId: profile.learnerId,
        sessionId: profile.sessionId,
        condition: profile.condition,
        model: profile.model,
        locale,
        type: 'inspect',
        questionKey: 'charge-carriers',
        phase: 'inspect',
        supportLevel,
        view: 'micro',
        labFault: lab.fault,
        labEmf: lab.emf,
      }).catch(() => undefined)
    }
    lastView.current = view
  }, [lab.emf, lab.fault, locale, profile, supportLevel, view])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const mine = useMemo(
    () => dashboard?.learners.find((learner) => learner.learnerId === profile.learnerId) ?? null,
    [dashboard, profile.learnerId],
  )

  const ask = async (question: string, questionKey?: QuestionKey) => {
    if (!question.trim() || busy) return
    setBusy(true)
    setMessages((current) => [...current, { role: 'student', text: question }])
    setDraft('')
    try {
      const result: TutorOutput = await requestTutor({
        learnerId: profile.learnerId,
        sessionId: profile.sessionId,
        condition: profile.condition,
        model: profile.model,
        locale,
        message: question,
        questionKey: questionKey ?? inferQuestionKey(question),
        messages,
        phase,
        supportLevel,
        lab,
        teacherMisconception: contextApplied ? misconception : '',
        teacherLevel: contextApplied ? level : '',
        viewedMicro,
      })
      setMessages((current) => [...current, { role: 'tutor', text: result.reply }])
      setPhase(result.phase)
      setSupportLevel(result.supportLevel)
      setInspectCue(result.inspectCue)
      setFallback(result.fallback)
      setFallbackNote(
        result.fallbackReason === 'api-error' && result.errorMessage
          ? `${labels.apiError} ${result.errorMessage}`
          : result.fallback
            ? labels.fallback
            : '',
      )
    } catch {
      setMessages((current) => [...current, { role: 'tutor', text: labels.fallback }])
      setFallback(true)
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void ask(draft.trim())
  }

  const refreshDashboard = async (nextPin = pin) => {
    try {
      setDashboard(await fetchDashboard(nextPin || undefined))
    } catch {
      setDashboard(null)
    }
  }

  useEffect(() => {
    if (tab !== 'evidence') return
    void fetchDashboard(pin || undefined)
      .then(setDashboard)
      .catch(() => setDashboard(null))
  }, [pin, tab])

  const review = async (verdict: 'accept' | 'correct' | 'reject', barrier?: BarrierCategory) => {
    await logLearningEvent({
      learnerId: profile.learnerId,
      sessionId: profile.sessionId,
      condition: profile.condition,
      locale,
      type: 'teacher-review',
      questionKey: mine?.asks[0]?.questionKey ?? 'uncategorized',
      phase,
      supportLevel,
      teacherVerdict: verdict,
      teacherNote: reviewNote,
      correctedBarrier: barrier,
    })
    await refreshDashboard()
  }

  const entries: Array<{ key: QuestionKey; label: string }> = [
    { key: 'predict-cell', label: labels.predict },
    { key: 'voltage-zero', label: c.quickZero },
    { key: 'meter-negative', label: c.quickSign },
    { key: 'salt-bridge', label: c.quickBridge },
    { key: 'charge-carriers', label: labels.carriers },
    { key: 'anode-mass', label: labels.mass },
    { key: 'independent-transfer', label: labels.independent },
  ]

  return (
    <aside className="builder-tutor panel">
      <header>
        <div className="builder-ai">AI</div>
        <div>
          <h3>{c.tutor}</h3>
          <p>
            <i />
            {c.tutorSub}
          </p>
        </div>
        <button type="button" onClick={() => setTeacherOpen((value) => !value)}>
          ⚙
        </button>
      </header>

      {teacherOpen && (
        <div className="builder-teacher">
          <strong>{c.teacher}</strong>
          <label>
            {labels.learner}
            <code>{shortLearnerId(profile.learnerId)}</code>
          </label>
          <label>
            {labels.condition}
            <select
              value={profile.condition}
              onChange={(event) =>
                setProfile((current) => ({ ...current, condition: event.target.value as LearnerProfile['condition'] }))
              }
            >
              <option value="adaptive">{labels.adaptive}</option>
              <option value="fixed">{labels.fixed}</option>
            </select>
          </label>
          <label>
            {labels.model}
            <select
              value={profile.model}
              onChange={(event) =>
                setProfile((current) => ({ ...current, model: event.target.value as LearnerProfile['model'] }))
              }
            >
              <option value={MODEL_IDS.terra}>{labels.terra}</option>
              <option value={MODEL_IDS.flash}>{labels.flash}</option>
            </select>
          </label>
          <label>
            {c.misconception}
            <textarea
              value={misconception}
              placeholder={c.misconceptionPlaceholder}
              onChange={(event) => {
                setMisconception(event.target.value)
                setContextApplied(false)
              }}
            />
          </label>
          <label>
            {c.level}
            <select
              value={level}
              onChange={(event) => {
                setLevel(event.target.value)
                setContextApplied(false)
              }}
            >
              <option value="novice">{c.novice}</option>
              <option value="intermediate">{c.intermediate}</option>
              <option value="exam">{c.exam}</option>
            </select>
          </label>
          <button type="button" onClick={() => setContextApplied(true)}>
            {contextApplied ? `✓ ${c.applied}` : c.apply}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = startNewSession(profile)
              setProfile(next)
              setPhase('predict')
              setSupportLevel(0)
              setMessages([{ role: 'tutor', text: c.welcome }])
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
            }}
          >
            {labels.newSession}
          </button>
        </div>
      )}

      <div className="scaffold-meter">
        <span>
          {labels.phase}
          <b>{labels.phases[phase]}</b>
        </span>
        <span>
          {labels.support}
          <b>{labels.supports[supportLevel]}</b>
        </span>
      </div>
      <ol className="scaffold-steps">
        {(Object.keys(labels.phases) as ScaffoldPhase[]).map((item) => (
          <li key={item} className={item === phase ? 'is-active' : ''}>
            {labels.phases[item]}
          </li>
        ))}
      </ol>

      <nav>
        <button type="button" className={tab === 'coach' ? 'is-active' : ''} onClick={() => setTab('coach')}>
          {c.coach}
        </button>
        <button type="button" className={tab === 'practice' ? 'is-active' : ''} onClick={() => setTab('practice')}>
          {c.practice}
        </button>
        <button type="button" className={tab === 'evidence' ? 'is-active' : ''} onClick={() => setTab('evidence')}>
          {labels.evidence}
        </button>
      </nav>

      {tab === 'coach' ? (
        <>
          <div className="builder-chat" ref={chatRef}>
            {fallback && <aside className="scaffold-fallback">{fallbackNote || labels.fallback}</aside>}
            {messages.map((message, index) => (
              <div className={`builder-message is-${message.role}`} key={`${message.role}-${index}`}>
                {message.role === 'tutor' && <b>AI</b>}
                <p>{message.text}</p>
              </div>
            ))}
            {busy && (
              <div className="builder-message is-tutor">
                <b>AI</b>
                <p>{labels.thinking}</p>
              </div>
            )}
          </div>
          {inspectCue && (
            <button
              type="button"
              className="scaffold-inspect"
              onClick={() => {
                onInspect()
                setInspectCue(false)
                setPhase('inspect')
              }}
            >
              {labels.inspect}
            </button>
          )}
          <div className="builder-quick">
            {entries.map((entry) => (
              <button type="button" key={entry.key} disabled={busy} onClick={() => void ask(entry.label, entry.key)}>
                {entry.label}
              </button>
            ))}
          </div>
          <form className="builder-chatbox" onSubmit={submit}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={c.input} disabled={busy} />
            <button type="submit" disabled={!draft.trim() || busy} aria-label={c.send}>
              ↑
            </button>
          </form>
        </>
      ) : tab === 'practice' ? (
        practice
      ) : (
        <div className="scaffold-evidence">
          <strong>{labels.fadeTitle}</strong>
          <p>{labels.fadeHint}</p>
          {dashboard === null ? (
            <p>{labels.thinking}</p>
          ) : mine ? (
            <ul>
              {mine.asks.map((item) => (
                <li key={item.questionKey}>
                  <b>{item.questionKey}</b>
                  <span>
                    {item.sessions.map((session) => session.askCount).join(' → ') || '0'} {labels.asks}
                  </span>
                  <em className={`fade-${item.fade}`}>{fadeLabel[locale][item.fade]}</em>
                </li>
              ))}
            </ul>
          ) : (
            <p>{labels.none}</p>
          )}

          <header>
            <strong>{labels.classTitle}</strong>
            <button type="button" onClick={() => void exportLearningLog(pin || undefined)}>
              {labels.exportLog}
            </button>
          </header>
          {dashboard?.pinRequired && dashboard.learners.length === 0 && (
            <form
              className="scaffold-pin"
              onSubmit={(event) => {
                event.preventDefault()
                void refreshDashboard()
              }}
            >
              <input value={pin} onChange={(event) => setPin(event.target.value)} placeholder={labels.pin} />
              <button type="submit">{labels.pinGo}</button>
            </form>
          )}
          <div className="scaffold-class">
            {dashboard?.learners.map((learner) => (
              <article key={learner.learnerId}>
                <strong>{shortLearnerId(learner.learnerId)}</strong>
                <span>
                  {labels.barrier}: {learner.latestBarrier ?? '—'}
                </span>
                {learner.latestExcerpt && <p>“{learner.latestExcerpt}”</p>}
                {learner.remainingDifficulty && (
                  <p>
                    {labels.remaining}: {learner.remainingDifficulty}
                  </p>
                )}
                {learner.nextActivity && (
                  <p>
                    {labels.next}: {learner.nextActivity}
                  </p>
                )}
                <small>
                  {learner.fadingCount} / {learner.asks.length} fading
                </small>
                {learner.learnerId === profile.learnerId && (
                  <div className="scaffold-review">
                    <button type="button" onClick={() => void review('accept')}>
                      {labels.accept}
                    </button>
                    <button type="button" onClick={() => void review('reject')}>
                      {labels.reject}
                    </button>
                    <select onChange={(event) => event.target.value && void review('correct', event.target.value as BarrierCategory)}>
                      <option value="">{labels.correct}</option>
                      {BARRIERS.map((barrier) => (
                        <option key={barrier} value={barrier}>
                          {barrier}
                        </option>
                      ))}
                    </select>
                    <input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="note" />
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
