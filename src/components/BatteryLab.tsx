import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'

type PartId = 'electrodes' | 'electrolytes' | 'saltBridge' | 'wire'

const partIds: PartId[] = ['electrodes', 'electrolytes', 'saltBridge', 'wire']

export function BatteryLab() {
  const { t } = useI18n()
  const [parts, setParts] = useState<Record<PartId, boolean>>({
    electrodes: true,
    electrolytes: true,
    saltBridge: false,
    wire: false,
  })
  const [running, setRunning] = useState(false)

  const ready = useMemo(() => partIds.every((id) => parts[id]), [parts])
  const completed = partIds.filter((id) => parts[id]).length

  const togglePart = (id: PartId) => {
    setRunning(false)
    setParts((current) => ({ ...current, [id]: !current[id] }))
  }

  const reset = () => {
    setRunning(false)
    setParts({
      electrodes: true,
      electrolytes: true,
      saltBridge: false,
      wire: false,
    })
  }

  return (
    <section className="battery-lab">
      <div className="battery-lab__intro panel">
        <div>
          <span className="eyebrow">{t('battery.eyebrow')}</span>
          <h2>{t('battery.title')}</h2>
          <p>{t('battery.intro')}</p>
        </div>
        <div className={`battery-status ${running ? 'is-running' : ready ? 'is-ready' : ''}`}>
          <span>{t('battery.voltmeter')}</span>
          <strong>{running ? '1.10 V' : '0.00 V'}</strong>
          <small>
            {running
              ? t('battery.statusRunning')
              : ready
                ? t('battery.statusReady')
                : t('battery.statusBuilding')}
          </small>
        </div>
      </div>

      <div className="battery-principles" aria-label={t('battery.principlesTitle')}>
        <article className="panel">
          <span>01</span>
          <div>
            <strong>{t('battery.principleRedox')}</strong>
            <p>{t('battery.principleRedoxBody')}</p>
          </div>
        </article>
        <article className="panel">
          <span>02</span>
          <div>
            <strong>{t('battery.principleElectron')}</strong>
            <p>{t('battery.principleElectronBody')}</p>
          </div>
        </article>
        <article className="panel">
          <span>03</span>
          <div>
            <strong>{t('battery.principleIon')}</strong>
            <p>{t('battery.principleIonBody')}</p>
          </div>
        </article>
      </div>

      <div className="battery-layout">
        <aside className="panel battery-console">
          <header className="panel__head">
            <div>
              <h2>{t('battery.partsTitle')}</h2>
              <p>{t('battery.partsSubtitle')}</p>
            </div>
            <span className="build-count">{completed}/4</span>
          </header>

          <div className="battery-parts">
            {partIds.map((id, index) => (
              <button
                type="button"
                key={id}
                className={`battery-part ${parts[id] ? 'is-installed' : ''}`}
                onClick={() => togglePart(id)}
                aria-pressed={parts[id]}
              >
                <span>{parts[id] ? '✓' : index + 1}</span>
                <div>
                  <strong>{t(`battery.part.${id}`)}</strong>
                  <small>{t(`battery.part.${id}Desc`)}</small>
                </div>
              </button>
            ))}
          </div>

          <div className="battery-actions">
            <button
              type="button"
              className="primary-btn"
              disabled={!ready}
              onClick={() => setRunning((value) => !value)}
            >
              {running ? t('battery.openCircuit') : t('battery.closeCircuit')}
            </button>
            <button type="button" className="ghost-btn" onClick={reset}>
              {t('battery.reset')}
            </button>
          </div>

          {!ready && <p className="battery-build-hint">{t('battery.buildHint')}</p>}
        </aside>

        <div className="panel battery-stage">
          <div className="battery-stage__labels">
            <span className="battery-key battery-key--electron">● {t('battery.electron')}</span>
            <span className="battery-key battery-key--cation">● {t('battery.cation')}</span>
            <span className="battery-key battery-key--anion">● {t('battery.anion')}</span>
          </div>

          <svg
            className="battery-diagram"
            viewBox="0 0 900 520"
            role="img"
            aria-label={t('battery.diagramLabel')}
          >
            <defs>
              <linearGradient id="solution-zinc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9fd8ff" stopOpacity=".64" />
                <stop offset="100%" stopColor="#1478b8" stopOpacity=".78" />
              </linearGradient>
              <linearGradient id="solution-copper" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5bd1ff" stopOpacity=".68" />
                <stop offset="100%" stopColor="#075d99" stopOpacity=".85" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {parts.wire && (
              <>
                <path
                  className={running ? 'wire is-live' : 'wire'}
                  d="M260 165 V70 H640 V165"
                  fill="none"
                />
                <g className="meter">
                  <rect x="405" y="38" width="90" height="62" rx="14" />
                  <text x="450" y="64" textAnchor="middle">{t('battery.meterShort')}</text>
                  <text x="450" y="87" textAnchor="middle">{running ? '1.10 V' : '0.00 V'}</text>
                </g>
                {running &&
                  [0, 1, 2, 3, 4].map((index) => (
                    <circle key={index} r="7" fill="#f8e45c" filter="url(#glow)">
                      <animateMotion
                        dur="2.8s"
                        begin={`${index * 0.56}s`}
                        repeatCount="indefinite"
                        path="M260 165 V70 H640 V165"
                      />
                    </circle>
                  ))}
              </>
            )}

            <g className="beaker beaker--left">
              <path d="M120 190 V440 Q120 468 148 468 H352 Q380 468 380 440 V190" />
              {parts.electrolytes && <path className="solution" fill="url(#solution-zinc)" d="M130 275 H370 V438 Q370 458 350 458 H150 Q130 458 130 438 Z" />}
              <text x="250" y="495" textAnchor="middle">ZnSO₄(aq)</text>
            </g>
            <g className="beaker beaker--right">
              <path d="M520 190 V440 Q520 468 548 468 H752 Q780 468 780 440 V190" />
              {parts.electrolytes && <path className="solution" fill="url(#solution-copper)" d="M530 275 H770 V438 Q770 458 750 458 H550 Q530 458 530 438 Z" />}
              <text x="650" y="495" textAnchor="middle">CuSO₄(aq)</text>
            </g>

            {parts.electrodes && (
              <>
                <g className="electrode electrode--zinc">
                  <rect x="230" y="150" width="60" height="260" rx="5" />
                  <text x="260" y="220" textAnchor="middle">Zn</text>
                  <text x="260" y="244" textAnchor="middle">{t('battery.negative')}</text>
                </g>
                <g className="electrode electrode--copper">
                  <rect x="610" y="150" width="60" height="260" rx="5" />
                  <text x="640" y="220" textAnchor="middle">Cu</text>
                  <text x="640" y="244" textAnchor="middle">{t('battery.positive')}</text>
                </g>
              </>
            )}

            {parts.saltBridge && (
              <g className="salt-bridge">
                <path d="M330 310 Q450 180 570 310" />
                <text x="450" y="217" textAnchor="middle">{t('battery.saltBridge')}</text>
                {running && (
                  <>
                    <g className="bridge-ion bridge-ion--cation">
                      <circle cx="424" cy="238" r="8" />
                      <text x="424" y="242" textAnchor="middle">K⁺</text>
                    </g>
                    <g className="bridge-ion bridge-ion--anion">
                      <circle cx="476" cy="238" r="8" />
                      <text x="476" y="242" textAnchor="middle">NO₃⁻</text>
                    </g>
                  </>
                )}
              </g>
            )}

            {running && parts.electrolytes && (
              <>
                <g className="solution-ions solution-ions--left">
                  <text x="175" y="340">Zn²⁺</text>
                  <text x="310" y="390">SO₄²⁻</text>
                </g>
                <g className="solution-ions solution-ions--right">
                  <text x="565" y="390">SO₄²⁻</text>
                  <text x="705" y="340">Cu²⁺</text>
                </g>
              </>
            )}
          </svg>

          <div className={`electron-direction ${running ? 'is-visible' : ''}`}>
            <strong>e⁻</strong>
            <span>Zn → Cu</span>
            <small>{t('battery.electronDirection')}</small>
          </div>
        </div>
      </div>

      <div className="battery-knowledge">
        <article className="panel battery-card battery-card--oxidation">
          <span>{t('battery.anode')}</span>
          <h3>Zn → Zn²⁺ + 2e⁻</h3>
          <p>{t('battery.oxidationBody')}</p>
        </article>
        <article className="panel battery-card battery-card--reduction">
          <span>{t('battery.cathode')}</span>
          <h3>Cu²⁺ + 2e⁻ → Cu</h3>
          <p>{t('battery.reductionBody')}</p>
        </article>
        <article className="panel battery-card battery-card--summary">
          <span>{t('battery.totalReaction')}</span>
          <h3>Zn + Cu²⁺ → Zn²⁺ + Cu</h3>
          <p>{t('battery.summaryBody')}</p>
        </article>
      </div>

      <div className="battery-fact panel">
        <strong>{t('battery.modelTitle')}</strong>
        <p>{t('battery.modelBody')}</p>
      </div>
    </section>
  )
}
