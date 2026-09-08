import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'

export type DigestStage = 'idle' | 'mouth' | 'oesophagus' | 'stomach' | 'cell'

const STAGES: DigestStage[] = ['idle', 'mouth', 'oesophagus', 'stomach', 'cell']

type Point = { x: number; y: number }

const TRAY_TOMATO = { x: 28, y: 18 }

function TomatoGraphic({
  className,
  chewed = false,
}: {
  className?: string
  chewed?: boolean
}) {
  if (chewed) {
    return (
      <g className={className}>
        <ellipse cx="10" cy="14" rx="9" ry="7" fill="#e11d48" />
        <ellipse cx="24" cy="10" rx="8" ry="6" fill="#f43f5e" />
        <ellipse cx="22" cy="22" rx="7" ry="6" fill="#be123c" />
        <ellipse cx="8" cy="24" rx="6" ry="5" fill="#fb7185" />
        <path d="M18 4 C20 0 26 1 24 6" fill="#16a34a" />
      </g>
    )
  }
  return (
    <g className={className}>
      <circle cx="16" cy="18" r="14" fill="#e11d48" />
      <circle cx="16" cy="18" r="14" fill="#be123c" opacity="0.35" />
      <path d="M16 5 C18 1 24 2 22 8 C20 6 17 6 16 5 Z" fill="#16a34a" />
      <path d="M16 5 C14 2 10 3 11 8" fill="#15803d" />
      <ellipse cx="11" cy="14" rx="3.2" ry="2" fill="rgba(255,255,255,0.28)" />
    </g>
  )
}

export function DigestiveLab() {
  const { t } = useI18n()
  const [stage, setStage] = useState<DigestStage>('idle')
  const [dragging, setDragging] = useState(false)
  const [pointer, setPointer] = useState<Point>(TRAY_TOMATO)
  const [dropFlash, setDropFlash] = useState(false)
  const [pepsinReady, setPepsinReady] = useState(false)
  const [cellFocus, setCellFocus] = useState<'chief' | 'parietal'>('chief')
  const labRef = useRef<HTMLDivElement>(null)
  const mouthRef = useRef<SVGEllipseElement>(null)
  const dragOrigin = useRef<Point>(TRAY_TOMATO)

  const stageIndex = STAGES.indexOf(stage)

  const pepsinTimer = useRef<number | null>(null)

  const clearPepsinTimer = () => {
    if (pepsinTimer.current !== null) {
      window.clearTimeout(pepsinTimer.current)
      pepsinTimer.current = null
    }
  }

  const armPepsin = () => {
    clearPepsinTimer()
    setPepsinReady(false)
    pepsinTimer.current = window.setTimeout(() => setPepsinReady(true), 1800)
  }

  const startMouth = useCallback(() => {
    setStage('mouth')
    setDropFlash(true)
    window.setTimeout(() => setDropFlash(false), 1600)
  }, [])

  const enterStage = (id: DigestStage) => {
    if (id === 'idle') {
      reset()
      return
    }
    setStage(id)
    if (id === 'stomach') armPepsin()
  }

  const reset = () => {
    clearPepsinTimer()
    setStage('idle')
    setDragging(false)
    setPointer(TRAY_TOMATO)
    setPepsinReady(false)
    setCellFocus('chief')
  }

  const goNext = () => {
    if (stage === 'idle') {
      startMouth()
      return
    }
    const next = STAGES[Math.min(stageIndex + 1, STAGES.length - 1)]
    enterStage(next)
  }

  const goBack = () => {
    const prev = STAGES[Math.max(stageIndex - 1, 0)]
    enterStage(prev)
    if (prev === 'idle') {
      setPointer(TRAY_TOMATO)
    }
  }

  useEffect(() => () => clearPepsinTimer(), [])

  const hitMouth = (clientX: number, clientY: number) => {
    const node = mouthRef.current
    if (!node) return false
    const box = node.getBoundingClientRect()
    const pad = 18
    return (
      clientX >= box.left - pad &&
      clientX <= box.right + pad &&
      clientY >= box.top - pad &&
      clientY <= box.bottom + pad
    )
  }

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (stage !== 'idle') return
    event.currentTarget.setPointerCapture(event.pointerId)
    const lab = labRef.current?.getBoundingClientRect()
    dragOrigin.current = {
      x: event.clientX - (lab?.left ?? 0) - 18,
      y: event.clientY - (lab?.top ?? 0) - 18,
    }
    setPointer(dragOrigin.current)
    setDragging(true)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return
    const lab = labRef.current?.getBoundingClientRect()
    setPointer({
      x: event.clientX - (lab?.left ?? 0) - 18,
      y: event.clientY - (lab?.top ?? 0) - 18,
    })
  }

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return
    setDragging(false)
    if (hitMouth(event.clientX, event.clientY)) {
      startMouth()
      return
    }
    setPointer(TRAY_TOMATO)
  }

  const narration = useMemo(() => {
    const map: Record<DigestStage, string> = {
      idle: t('digest.narrIdle'),
      mouth: t('digest.narrMouth'),
      oesophagus: t('digest.narrOesophagus'),
      stomach: t('digest.narrStomach'),
      cell: t('digest.narrCell'),
    }
    return map[stage]
  }, [stage, t])

  const equation = useMemo(() => {
    if (stage === 'mouth') return t('digest.eqAmylase')
    if (stage === 'stomach') {
      return pepsinReady ? t('digest.eqPepsin') : t('digest.eqActivate')
    }
    if (stage === 'cell') {
      return cellFocus === 'parietal' ? t('digest.eqAcid') : t('digest.eqResp')
    }
    return t('digest.eqActivate')
  }, [stage, pepsinReady, cellFocus, t])

  return (
    <section className="digest-lab">
      <div className="digest-lab__intro panel">
        <div>
          <span className="eyebrow">{t('digest.eyebrow')}</span>
          <h2>{t('digest.title')}</h2>
          <p>{t('digest.intro')}</p>
        </div>
        <ol className="digest-steps" aria-label={t('digest.title')}>
          {STAGES.map((id, index) => (
            <li key={id}>
              <button
                type="button"
                className={`digest-step ${stage === id ? 'is-active' : ''} ${
                  index < stageIndex ? 'is-done' : ''
                }`}
                onClick={() => enterStage(id)}
              >
                <small>0{index + 1}</small>
                <strong>
                  {id === 'idle'
                    ? t('digest.stageIdle')
                    : id === 'mouth'
                      ? t('digest.stageMouth')
                      : id === 'oesophagus'
                        ? t('digest.stageOesophagus')
                        : id === 'stomach'
                          ? t('digest.stageStomach')
                          : t('digest.stageCell')}
                </strong>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="digest-lab__stage" ref={labRef}>
        <aside className="panel digest-tray">
          <div className="panel__head">
            <div>
              <h2>{t('digest.tray')}</h2>
              <p>{t('digest.dragHint')}</p>
            </div>
          </div>
          <div className="digest-tray__well">
            {stage === 'idle' && (
              <button
                type="button"
                className="digest-tomato-btn"
                style={{
                  left: TRAY_TOMATO.x,
                  top: TRAY_TOMATO.y,
                  opacity: dragging ? 0 : 1,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                aria-label={t('digest.tomato')}
              >
                <svg viewBox="0 0 32 32" width="72" height="72" aria-hidden="true">
                  <defs>
                    <radialGradient id="tomatoShine" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="55%" stopColor="#e11d48" />
                      <stop offset="100%" stopColor="#9f1239" />
                    </radialGradient>
                  </defs>
                  <TomatoGraphic />
                </svg>
              </button>
            )}
            {stage !== 'idle' && (
              <p className="digest-tray__empty">{t('digest.dropOk')}</p>
            )}
          </div>
          <div className="digest-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={goNext}
              disabled={stage === 'cell'}
            >
              {stage === 'idle' ? t('digest.feed') : t('digest.next')}
            </button>
            <button type="button" onClick={goBack} disabled={stage === 'idle'}>
              {t('digest.back')}
            </button>
            <button type="button" onClick={reset}>
              {t('digest.reset')}
            </button>
          </div>
          <ul className="digest-legend">
            <li>
              <i className="swatch swatch--saliva" />
              {t('digest.legendSaliva')}
            </li>
            <li>
              <i className="swatch swatch--amylase" />
              {t('digest.legendAmylase')}
            </li>
            <li>
              <i className="swatch swatch--hcl" />
              {t('digest.legendHcl')}
            </li>
            <li>
              <i className="swatch swatch--ogen" />
              {t('digest.legendPepsinogen')}
            </li>
            <li>
              <i className="swatch swatch--pepsin" />
              {t('digest.legendPepsin')}
            </li>
            <li>
              <i className="swatch swatch--protein" />
              {t('digest.legendProtein')}
            </li>
          </ul>
        </aside>

        <div className="panel digest-body">
          <p className="digest-body__label">{t('digest.personLabel')}</p>
          <svg
            className={`digest-svg ${stage === 'cell' ? 'is-cell' : ''}`}
            viewBox="0 0 360 620"
            role="img"
            aria-label={t('digest.personLabel')}
          >
            <defs>
              <radialGradient id="tomatoShineSvg" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="55%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#9f1239" />
              </radialGradient>
              <linearGradient id="skinGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f8d7c0" />
                <stop offset="100%" stopColor="#e8b894" />
              </linearGradient>
              <linearGradient id="stomachGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#9f1239" />
              </linearGradient>
              <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <ellipse cx="180" cy="78" rx="54" ry="62" fill="url(#skinGrad)" />
            <ellipse
              ref={mouthRef}
              className={`digest-mouth ${stage === 'idle' ? 'is-target' : ''} ${
                dropFlash ? 'is-fed' : ''
              }`}
              cx="180"
              cy="96"
              rx="22"
              ry={stage === 'idle' ? 16 : 10}
              fill="#4a1c24"
              stroke="#fb7185"
              strokeWidth={stage === 'idle' ? 3 : 1}
            />
            <ellipse cx="158" cy="68" rx="6" ry="4" fill="#1e293b" />
            <ellipse cx="202" cy="68" rx="6" ry="4" fill="#1e293b" />
            {stage === 'idle' && (
              <text x="180" y="28" textAnchor="middle" className="digest-svg-label">
                {t('digest.mouthTarget')}
              </text>
            )}

            <path
              d="M180 112 C178 150 176 190 174 230 C172 268 168 300 178 332"
              fill="none"
              stroke="#f97316"
              strokeWidth="14"
              strokeLinecap="round"
              className={stage === 'oesophagus' ? 'oesophagus-wave' : ''}
            />
            <path
              d="M180 112 C178 150 176 190 174 230 C172 268 168 300 178 332"
              fill="none"
              stroke="#fdba74"
              strokeWidth="6"
              strokeLinecap="round"
            />

            <path
              d="M178 328 C120 340 96 390 118 430 C140 468 210 490 250 455 C292 418 270 348 210 338 C198 334 188 330 178 328 Z"
              fill="url(#stomachGrad)"
              opacity="0.92"
            />
            <path
              d="M130 360 C160 350 210 358 230 390"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <text x="186" y="410" textAnchor="middle" className="digest-svg-label">
              {t('digest.stageStomach').split(' · ')[0]}
            </text>

            <path
              d="M236 452 C250 470 268 500 246 530 C220 564 180 548 200 520 C218 496 230 478 236 452"
              fill="none"
              stroke="#64748b"
              strokeWidth="10"
              opacity="0.45"
            />

            {stage === 'mouth' && (
              <g className="chew-layer">
                <g transform="translate(164 82)">
                  <TomatoGraphic chewed />
                </g>
                <g className="saliva-drops">
                  <circle cx="168" cy="108" r="3" fill="#7dd3fc" />
                  <circle cx="186" cy="112" r="2.4" fill="#38bdf8" />
                  <circle cx="176" cy="118" r="2" fill="#bae6fd" />
                  <circle cx="194" cy="104" r="2.2" fill="#7dd3fc" />
                </g>
                <g className="amylase-bits" filter="url(#softGlow)">
                  <circle cx="156" cy="100" r="4" fill="#a3e635" />
                  <circle cx="200" cy="98" r="3.4" fill="#84cc16" />
                  <circle cx="190" cy="118" r="3" fill="#bef264" />
                </g>
                <text x="248" y="92" className="digest-svg-tag">
                  {t('digest.chewLabel')}
                </text>
                <text x="248" y="112" className="digest-svg-tag">
                  {t('digest.salivaLabel')}
                </text>
              </g>
            )}

            {stage === 'oesophagus' && (
              <g>
                <circle className="bolus" r="11" fill="#e11d48" />
                <text x="214" y="210" className="digest-svg-tag">
                  {t('digest.swallowLabel')}
                </text>
              </g>
            )}

            {(stage === 'stomach' || stage === 'cell') && (
              <g className="stomach-mix">
                <g className="food-bits">
                  <ellipse cx="160" cy="390" rx="10" ry="7" fill="#e11d48" />
                  <ellipse cx="190" cy="404" rx="8" ry="6" fill="#fb7185" />
                  <ellipse cx="210" cy="378" rx="7" ry="5" fill="#be123c" />
                  <rect
                    className="protein-chain"
                    x="140"
                    y="418"
                    width="70"
                    height="8"
                    rx="4"
                    fill="#fbbf24"
                  />
                </g>
                <g className="hcl-ions">
                  {Array.from({ length: 10 }, (_, i) => (
                    <text
                      key={`h${i}`}
                      className="ion-float"
                      x={130 + (i % 5) * 22}
                      y={360 + Math.floor(i / 5) * 28}
                      fill="#fde68a"
                    >
                      H⁺
                    </text>
                  ))}
                  {Array.from({ length: 6 }, (_, i) => (
                    <text
                      key={`cl${i}`}
                      className="ion-float ion-float--late"
                      x={150 + i * 16}
                      y={448}
                      fill="#93c5fd"
                    >
                      Cl⁻
                    </text>
                  ))}
                </g>
                <g>
                  <circle cx="148" cy="372" r="7" fill="#c4b5fd" />
                  <text x="138" y="356" className="digest-svg-tag">
                    {t('digest.legendPepsinogen')}
                  </text>
                  {pepsinReady && (
                    <>
                      <circle cx="200" cy="396" r="8" fill="#22d3ee" filter="url(#softGlow)" />
                      <circle cx="176" cy="428" r="7" fill="#06b6d4" />
                      <text x="214" y="400" className="digest-svg-tag">
                        {t('digest.legendPepsin')}
                      </text>
                      <rect
                        className="protein-chain is-cut"
                        x="140"
                        y="418"
                        width="28"
                        height="8"
                        rx="4"
                        fill="#f59e0b"
                      />
                      <rect
                        x="176"
                        y="422"
                        width="22"
                        height="7"
                        rx="3"
                        fill="#fcd34d"
                      />
                    </>
                  )}
                </g>
                <path
                  d="M126 350 C150 342 200 346 232 368"
                  fill="none"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <text x="96" y="348" className="digest-svg-tag">
                  {t('digest.legendMucus')}
                </text>
              </g>
            )}

            {stage === 'cell' && (
              <g className="cell-inset">
                <rect x="28" y="470" width="304" height="138" rx="18" fill="#0b1a2c" stroke="#38bdf8" />
                <ellipse cx="118" cy="540" rx="70" ry="48" fill="#14532d" opacity="0.9" />
                <ellipse cx="118" cy="540" rx="22" ry="14" fill="#f59e0b" className="mito-pulse" />
                <circle cx="70" cy="512" r="6" fill="#fde68a" />
                <circle cx="86" cy="500" r="5" fill="#38bdf8" />
                <text x="48" y="492" className="digest-svg-tag">
                  {cellFocus === 'chief' ? t('digest.cellGlucose') : t('digest.cellO2')}
                </text>
                <text x="96" y="578" className="digest-svg-tag">
                  {t('digest.cellMito')}
                </text>
                <circle cx="168" cy="508" r="6" fill="#34d399" className="atp-spark" />
                <circle cx="54" cy="560" r="5" fill="#94a3b8" />
                <circle cx="48" cy="548" r="4" fill="#64748b" />
                <text x="40" y="580" className="digest-svg-tag">
                  {t('digest.cellCo2')}
                </text>
                <g transform="translate(200 500)">
                  <rect x="0" y="8" width="110" height="14" rx="7" fill="#7c3aed" />
                  <circle cx="18" cy="15" r="8" fill="#c4b5fd" />
                  <circle cx="44" cy="15" r="8" fill="#a78bfa" />
                  <circle cx="70" cy="15" r="8" fill="#8b5cf6" />
                  <circle cx="108" cy="15" r="10" fill="#22d3ee" className="vesicle-out" />
                </g>
                <text x="200" y="496" className="digest-svg-tag">
                  {t('digest.cellRibo')}
                </text>
                <text x="214" y="548" className="digest-svg-tag">
                  {t('digest.cellVesicle')}
                </text>
              </g>
            )}
          </svg>
        </div>

        <aside className="panel digest-lesson">
          <div className="panel__head">
            <div>
              <h2>{t('digest.legendTitle')}</h2>
              <p>{equation}</p>
            </div>
          </div>
          <p className="digest-narration">{narration}</p>

          {stage === 'stomach' && (
            <article className="digest-card">
              <strong>{t('digest.zymogenTitle')}</strong>
              <p>{t('digest.zymogenBody')}</p>
            </article>
          )}
          {stage === 'stomach' && (
            <article className="digest-card">
              <strong>{t('digest.acidTitle')}</strong>
              <p>{t('digest.acidBody')}</p>
            </article>
          )}
          {stage === 'cell' && (
            <>
              <div className="digest-cell-switch" role="group">
                <button
                  type="button"
                  className={cellFocus === 'chief' ? 'is-active' : ''}
                  onClick={() => setCellFocus('chief')}
                >
                  {t('digest.chiefLabel')}
                </button>
                <button
                  type="button"
                  className={cellFocus === 'parietal' ? 'is-active' : ''}
                  onClick={() => setCellFocus('parietal')}
                >
                  {t('digest.parietalLabel')}
                </button>
              </div>
              <article className="digest-card">
                <strong>
                  {cellFocus === 'chief'
                    ? t('digest.cellTitle')
                    : t('digest.parietalTitle')}
                </strong>
                <p>
                  {cellFocus === 'chief'
                    ? t('digest.narrCell')
                    : t('digest.parietalBody')}
                </p>
              </article>
              <ul className="digest-cell-facts">
                <li>{t('digest.cellGlucose')}</li>
                <li>{t('digest.cellO2')}</li>
                <li>{t('digest.cellAtp')}</li>
                <li>{t('digest.cellCo2')}</li>
                <li>{t('digest.cellAa')}</li>
                <li>{t('digest.cellWaste')}</li>
              </ul>
            </>
          )}

          <article className="digest-card digest-card--model">
            <strong>{t('digest.modelTitle')}</strong>
            <p>{t('digest.modelBody')}</p>
          </article>
        </aside>

        {dragging && (
        <div
          className="digest-tomato-ghost"
          style={{ left: pointer.x, top: pointer.y }}
        >
          <svg viewBox="0 0 32 32" width="56" height="56" aria-hidden="true">
            <defs>
              <radialGradient id="tomatoShineGhost" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#9f1239" />
              </radialGradient>
            </defs>
            <circle cx="16" cy="18" r="14" fill="url(#tomatoShineGhost)" />
            <path d="M16 5 C18 1 24 2 22 8 C20 6 17 6 16 5 Z" fill="#16a34a" />
          </svg>
        </div>
      )}
      </div>
    </section>
  )
}
