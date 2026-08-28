import type { Ion } from '../data/ions'
import { ANIONS, CATIONS, SAMPLES } from '../data/ions'
import { useI18n } from '../i18n/I18nProvider'
import { formatValencyLabel } from '../lib/formula'

type Props = {
  cation: Ion
  anion: Ion
  cationCount: number
  anionCount: number
  multiplier: number
  statusLabel: string
  statusTone: 'ok' | 'warn' | 'bad'
  onSelectCation: (ion: Ion) => void
  onSelectAnion: (ion: Ion) => void
  onCationCount: (n: number) => void
  onAnionCount: (n: number) => void
  onMultiplier: (n: number) => void
  onSample: (cationId: string, anionId: string) => void
  onAuto: () => void
  onPrev: () => void
  onNext: () => void
}

function Stepper({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (n: number) => void
  label: string
}) {
  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <div className="stepper__controls">
        <button type="button" aria-label="decrease" onClick={() => onChange(Math.max(1, value - 1))}>
          −
        </button>
        <strong>{value}</strong>
        <button type="button" aria-label="increase" onClick={() => onChange(Math.min(9, value + 1))}>
          +
        </button>
      </div>
    </div>
  )
}

export function InputConsole({
  cation,
  anion,
  cationCount,
  anionCount,
  multiplier,
  statusLabel,
  statusTone,
  onSelectCation,
  onSelectAnion,
  onCationCount,
  onAnionCount,
  onMultiplier,
  onSample,
  onAuto,
  onPrev,
  onNext,
}: Props) {
  const { t } = useI18n()

  return (
    <aside className="panel console">
      <header className="panel__head">
        <div>
          <h2>{t('console.title')}</h2>
          <p>{t('console.subtitle')}</p>
        </div>
        <span className={`status-chip status-chip--${statusTone}`}>{statusLabel}</span>
      </header>

      <section className="console__section">
        <h3>{t('console.cations')}</h3>
        <div className="ion-grid">
          {CATIONS.map((ion) => (
            <button
              key={ion.id}
              type="button"
              className={`ion-tile ion-tile--pos ${cation.id === ion.id ? 'is-active' : ''}`}
              onClick={() => onSelectCation(ion)}
              title={t(ion.nameKey)}
            >
              <span className="ion-tile__sym">{ion.display}</span>
              <span className="ion-tile__val">{formatValencyLabel(ion.valency)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="console__section">
        <h3>{t('console.anions')}</h3>
        <div className="ion-grid">
          {ANIONS.map((ion) => (
            <button
              key={ion.id}
              type="button"
              className={`ion-tile ion-tile--neg ${anion.id === ion.id ? 'is-active' : ''}`}
              onClick={() => onSelectAnion(ion)}
              title={t(ion.nameKey)}
            >
              <span className="ion-tile__sym">{ion.display}</span>
              <span className="ion-tile__val">{formatValencyLabel(ion.valency)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="console__section">
        <h3>{t('console.counts')}</h3>
        <div className="stepper-row">
          <Stepper
            value={cationCount}
            onChange={onCationCount}
            label={cation.display}
          />
          <Stepper
            value={anionCount}
            onChange={onAnionCount}
            label={anion.display}
          />
        </div>
        <label className="slider-field">
          <span>
            {t('console.multiplier')}
            <strong>{multiplier}</strong>
          </span>
          <input
            type="range"
            min={1}
            max={4}
            value={multiplier}
            onChange={(e) => onMultiplier(Number(e.target.value))}
          />
        </label>
      </section>

      <section className="console__section">
        <h3>{t('console.samples')}</h3>
        <div className="sample-grid">
          {SAMPLES.map((s) => {
            const active = s.cationId === cation.id && s.anionId === anion.id
            return (
              <button
                key={s.id}
                type="button"
                className={`sample-chip ${active ? 'is-active' : ''}`}
                onClick={() => onSample(s.cationId, s.anionId)}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </section>

      <footer className="console__footer">
        <button type="button" className="ghost-btn" onClick={onPrev}>
          ‹ {t('console.prev')}
        </button>
        <button type="button" className="primary-btn" onClick={onAuto}>
          {t('console.auto')}
        </button>
        <button type="button" className="ghost-btn" onClick={onNext}>
          {t('console.next')} ›
        </button>
      </footer>
    </aside>
  )
}
