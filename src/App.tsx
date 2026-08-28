import { useMemo, useState } from 'react'
import { ANIONS, CATIONS, SAMPLES, type Ion, type StepId } from './data/ions'
import { InputConsole } from './components/InputConsole'
import { BalanceChamber } from './components/BalanceChamber'
import { BatteryLab } from './components/BatteryLab'
import {
  CourseSidebar,
  type CourseId,
} from './components/CourseSidebar'
import { ElectronTransferLab } from './components/ElectronTransferLab'
import { NotationGuide } from './components/NotationGuide'
import { I18nProvider, useI18n } from './i18n/I18nProvider'
import {
  chargeSum,
  deriveCounts,
  isBalanced,
  isSimplest,
} from './lib/formula'
import './App.css'

function FormulaCourse() {
  const { t } = useI18n()
  const [cation, setCation] = useState<Ion>(CATIONS[2])
  const [anion, setAnion] = useState<Ion>(ANIONS[3])
  const [cationCount, setCationCount] = useState(2)
  const [anionCount, setAnionCount] = useState(3)
  const [multiplier, setMultiplier] = useState(1)
  const [step, setStep] = useState<StepId>('mark')
  const [sampleIndex, setSampleIndex] = useState(4)

  const balanced = isBalanced(cation, anion, cationCount, anionCount)
  const simplest = isSimplest(cation, anion, cationCount, anionCount)
  const total = chargeSum(cation, anion, cationCount, anionCount, multiplier)

  const status = useMemo(() => {
    if (balanced && simplest) {
      return { label: t('console.balanced'), tone: 'ok' as const }
    }
    if (balanced) {
      return { label: t('console.notSimple'), tone: 'warn' as const }
    }
    return { label: t('console.unbalanced'), tone: 'bad' as const }
  }, [balanced, simplest, t])

  const applyPair = (nextCation: Ion, nextAnion: Ion) => {
    setCation(nextCation)
    setAnion(nextAnion)
    const derived = deriveCounts(nextCation, nextAnion)
    setCationCount(derived.cationCount)
    setAnionCount(derived.anionCount)
    setMultiplier(1)
  }

  const loadSample = (cationId: string, anionId: string) => {
    const c = CATIONS.find((x) => x.id === cationId)
    const a = ANIONS.find((x) => x.id === anionId)
    if (!c || !a) return
    const idx = SAMPLES.findIndex(
      (s) => s.cationId === cationId && s.anionId === anionId,
    )
    if (idx >= 0) setSampleIndex(idx)
    applyPair(c, a)
  }

  const autoDerive = () => {
    const derived = deriveCounts(cation, anion)
    setCationCount(derived.cationCount)
    setAnionCount(derived.anionCount)
    setStep('verify')
  }

  const shiftSample = (delta: number) => {
    const next = (sampleIndex + delta + SAMPLES.length) % SAMPLES.length
    setSampleIndex(next)
    const s = SAMPLES[next]
    loadSample(s.cationId, s.anionId)
  }

  return (
    <>
      <main className="workspace">
        <InputConsole
          cation={cation}
          anion={anion}
          cationCount={cationCount}
          anionCount={anionCount}
          multiplier={multiplier}
          statusLabel={status.label}
          statusTone={status.tone}
          onSelectCation={(ion) => {
            setCation(ion)
            const derived = deriveCounts(ion, anion)
            setCationCount(derived.cationCount)
            setAnionCount(derived.anionCount)
          }}
          onSelectAnion={(ion) => {
            setAnion(ion)
            const derived = deriveCounts(cation, ion)
            setCationCount(derived.cationCount)
            setAnionCount(derived.anionCount)
          }}
          onCationCount={setCationCount}
          onAnionCount={setAnionCount}
          onMultiplier={setMultiplier}
          onSample={loadSample}
          onAuto={autoDerive}
          onPrev={() => shiftSample(-1)}
          onNext={() => shiftSample(1)}
        />
        <BalanceChamber
          cation={cation}
          anion={anion}
          cationCount={cationCount}
          anionCount={anionCount}
          multiplier={multiplier}
          step={step}
          onStep={setStep}
          balanced={balanced}
          chargeTotal={total}
        />
      </main>

      <ElectronTransferLab cation={cation} anion={anion} />

      <NotationGuide />
    </>
  )
}

function AppShell() {
  const { t, locale, setLocale } = useI18n()
  const [activeCourse, setActiveCourse] = useState<CourseId>('formula')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isFormula = activeCourse === 'formula'

  return (
    <div className={`course-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <CourseSidebar
        activeCourse={activeCourse}
        collapsed={sidebarCollapsed}
        onSelect={setActiveCourse}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="app">
        <header className="topbar">
          <div className="topbar__brand">
            <h1>{isFormula ? t('app.title') : t('battery.title')}</h1>
            <p>{isFormula ? t('app.subtitle') : t('battery.eyebrow')}</p>
          </div>
          <p className="topbar__question">
            {isFormula ? t('app.coreQuestion') : t('battery.intro')}
          </p>
          <div className="topbar__actions">
            <span className="live-pill">
              <i />
              {t('app.liveLink')}
            </span>
            <div className="lang-switch" role="group" aria-label="Language">
              <button
                type="button"
                className={locale === 'en' ? 'is-active' : ''}
                onClick={() => setLocale('en')}
              >
                {t('lang.en')}
              </button>
              <button
                type="button"
                className={locale === 'zh' ? 'is-active' : ''}
                onClick={() => setLocale('zh')}
              >
                {t('lang.zh')}
              </button>
            </div>
          </div>
        </header>

        {isFormula ? <FormulaCourse /> : <BatteryLab />}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  )
}
