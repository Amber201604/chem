import type { Ion, StepId } from '../data/ions'
import { STEP_IDS } from '../data/ions'
import { useI18n } from '../i18n/I18nProvider'
import type { TranslationKey } from '../i18n/translations'
import {
  formatFormula,
  formatValencyLabel,
  gcd,
} from '../lib/formula'
import { BalanceScene } from './BalanceScene'

const STEP_LABEL: Record<StepId, TranslationKey> = {
  mark: 'step.mark',
  cross: 'step.cross',
  subscript: 'step.subscript',
  simplify: 'step.simplify',
  verify: 'step.verify',
}

const STEP_HINT: Record<StepId, TranslationKey> = {
  mark: 'step.markHint',
  cross: 'step.crossHint',
  subscript: 'step.subscriptHint',
  simplify: 'step.simplifyHint',
  verify: 'step.verifyHint',
}

type Props = {
  cation: Ion
  anion: Ion
  cationCount: number
  anionCount: number
  multiplier: number
  step: StepId
  onStep: (step: StepId) => void
  balanced: boolean
  chargeTotal: number
}

export function BalanceChamber({
  cation,
  anion,
  cationCount,
  anionCount,
  multiplier,
  step,
  onStep,
  balanced,
  chargeTotal,
}: Props) {
  const { t } = useI18n()
  const a = Math.abs(cation.valency)
  const b = Math.abs(anion.valency)
  const g = gcd(a, b)
  const formula = formatFormula(cation, anion, cationCount, anionCount, multiplier)

  return (
    <section className="panel chamber">
      <header className="panel__head chamber__head">
        <div>
          <h2>{t('chamber.title')}</h2>
          <p>{t('chamber.subtitle')}</p>
        </div>
      </header>

      <div className="step-tabs" role="tablist">
        {STEP_IDS.map((id, index) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={step === id}
            className={`step-tab ${step === id ? 'is-active' : ''}`}
            onClick={() => onStep(id)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {t(STEP_LABEL[id])}
          </button>
        ))}
      </div>

      <div className="chamber__stage">
        <BalanceScene
          cation={cation}
          anion={anion}
          cationCount={cationCount}
          anionCount={anionCount}
          multiplier={multiplier}
          balanced={balanced}
          chargeTotal={chargeTotal}
        />

        <div className="formula-overlay">
          <div className="formula-card">
            <div className="formula-card__valencies">
              <span>{formatValencyLabel(cation.valency)}</span>
              <span>{formatValencyLabel(anion.valency)}</span>
            </div>
            <div className="formula-card__body">
              <span className={step === 'mark' || step === 'cross' ? 'is-dim' : ''}>
                {formula}
              </span>
            </div>
            {(step === 'mark' || step === 'cross') && (
              <div className="formula-card__raw">
                <em>{cation.display}</em>
                <em>{anion.display}</em>
              </div>
            )}
          </div>
          <p className="step-hint">{t(STEP_HINT[step])}</p>
          <p className="drag-hint">{t('app.dragHint')}</p>
        </div>
      </div>

      <div className="stats-bar">
        <div>
          <span>{t('stats.particles')}</span>
          <strong>
            {cation.display} × {cationCount * multiplier} | {anion.display} ×{' '}
            {anionCount * multiplier}
          </strong>
        </div>
        <div>
          <span>{t('stats.gcd')}</span>
          <strong>
            gcd({a}, {b}) = {g}
          </strong>
        </div>
        <div>
          <span>{t('stats.ratio')}</span>
          <strong>
            {cationCount} : {anionCount}
          </strong>
        </div>
        <div>
          <span>{t('stats.check')}</span>
          <strong className={balanced ? 'ok' : 'bad'}>
            ({formatValencyLabel(cation.valency)})×{cationCount} + (
            {formatValencyLabel(anion.valency)})×{anionCount} = {chargeTotal}
          </strong>
        </div>
      </div>
    </section>
  )
}
