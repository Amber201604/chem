import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { Ion } from '../data/ions'
import { getAtomModel, ionElectronCount, ionShells, shellLabel } from '../data/atoms'
import { useI18n } from '../i18n/I18nProvider'
import { formatValencyLabel } from '../lib/formula'
import { ElectronAtom, type ElectronMode } from './ElectronAtom'

type Props = {
  cation: Ion
  anion: Ion
}

type Phase = 'neutral' | 'playing' | 'done'

export function ElectronTransferLab({ cation, anion }: Props) {
  const { t } = useI18n()
  const metal = getAtomModel(cation.id)
  const nonmetal = getAtomModel(anion.id)
  const [focus, setFocus] = useState<'metal' | 'nonmetal' | 'both'>(() => {
    const m = getAtomModel(cation.id)
    const n = getAtomModel(anion.id)
    if (m && n) return 'both'
    if (m) return 'metal'
    if (n) return 'nonmetal'
    return 'both'
  })
  const [phase, setPhase] = useState<Phase>('neutral')
  const [progress, setProgress] = useState(0)
  const raf = useRef<number | null>(null)

  // Reset animation when selected ions change
  useEffect(() => {
    setPhase('neutral')
    setProgress(0)
    if (raf.current) cancelAnimationFrame(raf.current)
    const m = getAtomModel(cation.id)
    const n = getAtomModel(anion.id)
    if (m && n) setFocus('both')
    else if (m) setFocus('metal')
    else if (n) setFocus('nonmetal')
  }, [cation.id, anion.id])

  useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  const maxSteps = useMemo(() => {
    const a = metal ? Math.abs(metal.transfer) : 0
    const b = nonmetal ? Math.abs(nonmetal.transfer) : 0
    if (focus === 'metal') return Math.max(a, 1)
    if (focus === 'nonmetal') return Math.max(b, 1)
    return Math.max(a, b, 1)
  }, [metal, nonmetal, focus])

  const play = () => {
    if (!metal && !nonmetal) return
    if (raf.current) cancelAnimationFrame(raf.current)
    setPhase('playing')
    setProgress(0)
    const start = performance.now()
    const duration = 900 + maxSteps * 700

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration) * maxSteps
      setProgress(p)
      if (p < maxSteps) {
        raf.current = requestAnimationFrame(tick)
      } else {
        setPhase('done')
        setProgress(maxSteps)
      }
    }
    raf.current = requestAnimationFrame(tick)
  }

  const reset = () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    setPhase('neutral')
    setProgress(0)
  }

  const modeFor = (_side: 'metal' | 'nonmetal'): ElectronMode => {
    if (phase === 'neutral') return 'neutral'
    if (phase === 'playing') return 'transferring'
    return 'ionized'
  }

  const showMetal = focus !== 'nonmetal' && !!metal
  const showNonmetal = focus !== 'metal' && !!nonmetal
  const ionized = phase === 'done'

  const metalStateText = metal
    ? phase === 'done'
      ? t('e.metalIonized')
          .replace('{sym}', metal.display)
          .replace('{charge}', formatValencyLabel(metal.transfer))
          .replace('{shells}', shellLabel(ionShells(metal, true)))
          .replace('{e}', String(ionElectronCount(metal, true)))
          .replace('{p}', String(metal.protons))
      : phase === 'playing'
        ? t('e.metalFlying')
            .replace('{sym}', metal.display)
            .replace('{n}', String(metal.transfer))
        : t('e.metalNeutral')
            .replace('{sym}', metal.display)
            .replace('{shells}', shellLabel(metal.shells))
            .replace('{e}', String(ionElectronCount(metal, false)))
    : t('e.polyCation').replace('{sym}', cation.display)

  const nonmetalStateText = nonmetal
    ? phase === 'done'
      ? t('e.nonmetalIonized')
          .replace('{sym}', nonmetal.display)
          .replace('{charge}', formatValencyLabel(nonmetal.transfer))
          .replace('{shells}', shellLabel(ionShells(nonmetal, true)))
          .replace('{e}', String(ionElectronCount(nonmetal, true)))
          .replace('{p}', String(nonmetal.protons))
      : phase === 'playing'
        ? t('e.nonmetalFlying')
            .replace('{sym}', nonmetal.display)
            .replace('{n}', String(Math.abs(nonmetal.transfer)))
        : t('e.nonmetalNeutral')
            .replace('{sym}', nonmetal.display)
            .replace('{shells}', shellLabel(nonmetal.shells))
            .replace('{e}', String(ionElectronCount(nonmetal, false)))
    : t('e.polyAnion').replace('{sym}', anion.display)

  const whyMetal = metal
    ? t('e.whyLose')
        .replace('{n}', String(metal.transfer))
        .replace('{sym}', metal.display)
    : null
  const whyNonmetal = nonmetal
    ? t('e.whyGain')
        .replace('{n}', String(Math.abs(nonmetal.transfer)))
        .replace('{sym}', nonmetal.display)
    : null

  const countLabels = {
    protons: t('e.shortP'),
    neutrons: t('e.shortN'),
    electrons: t('e.shortE'),
  }

  const metalElectrons = metal
    ? (() => {
        const base = ionElectronCount(metal, false)
        if (phase === 'done') return ionElectronCount(metal, true)
        if (phase === 'playing') {
          return base - Math.min(metal.transfer, Math.floor(progress + 0.001))
        }
        return base
      })()
    : 0
  const nonmetalElectrons = nonmetal
    ? (() => {
        const base = ionElectronCount(nonmetal, false)
        if (phase === 'done') return ionElectronCount(nonmetal, true)
        if (phase === 'playing') {
          const gained = Math.min(
            Math.abs(nonmetal.transfer),
            Math.floor(progress + 0.001),
          )
          return base + gained
        }
        return base
      })()
    : 0

  const ParticleTable = ({
    atom,
    electrons,
  }: {
    atom: NonNullable<typeof metal>
    electrons: number
  }) => (
    <div className="particle-table" aria-label={t('e.countsTitle')}>
      <div>
        <span className="leg-p">{t('e.legendP')}</span>
        <strong>{atom.protons}</strong>
      </div>
      <div>
        <span className="leg-n">{t('e.legendN')}</span>
        <strong>{atom.neutrons}</strong>
      </div>
      <div>
        <span className="leg-e">{t('e.legendE')}</span>
        <strong>{electrons}</strong>
      </div>
      <div className="particle-table__sum">
        <span>{t('e.nucleons')}</span>
        <strong>{atom.protons + atom.neutrons}</strong>
      </div>
    </div>
  )

  return (
    <section className="panel electron-lab">
      <header className="panel__head electron-lab__head">
        <div>
          <h2>{t('e.title')}</h2>
          <p>{t('e.subtitle')}</p>
        </div>
        <div className="focus-switch" role="tablist">
          <button
            type="button"
            className={focus === 'metal' ? 'is-active' : ''}
            onClick={() => setFocus('metal')}
            disabled={!metal}
          >
            {cation.display}
          </button>
          <button
            type="button"
            className={focus === 'both' ? 'is-active' : ''}
            onClick={() => setFocus('both')}
          >
            {t('e.focusBoth')}
          </button>
          <button
            type="button"
            className={focus === 'nonmetal' ? 'is-active' : ''}
            onClick={() => setFocus('nonmetal')}
            disabled={!nonmetal}
          >
            {anion.display}
          </button>
        </div>
      </header>

      <div className="electron-lab__body">
        <div className="electron-lab__stage">
          <Canvas
            camera={{
              position: [0, 2.2, focus === 'both' ? 14 : 11],
              fov: 42,
            }}
            dpr={[1, 1.75]}
          >
            <color attach="background" args={['#08111b']} />
            <fog attach="fog" args={['#08111b', 12, 28]} />
            <ambientLight intensity={1.2} />
            <pointLight position={[4, 5, 8]} intensity={40} />
            <pointLight position={[-5, 2, -3]} intensity={18} color="#70a7ff" />
            <Suspense fallback={null}>
              {showMetal && metal && (
                <ElectronAtom
                  atom={metal}
                  mode={modeFor('metal')}
                  progress={progress}
                  position={showNonmetal ? [-4.2, 0, 0] : [0, 0, 0]}
                  label={metal.display}
                  chargeLabel={
                    ionized ? formatValencyLabel(metal.transfer) : undefined
                  }
                  electronCount={metalElectrons}
                  countLabels={countLabels}
                />
              )}
              {showNonmetal && nonmetal && (
                <ElectronAtom
                  atom={nonmetal}
                  mode={modeFor('nonmetal')}
                  progress={progress}
                  position={showMetal ? [4.2, 0, 0] : [0, 0, 0]}
                  label={nonmetal.display}
                  chargeLabel={
                    ionized ? formatValencyLabel(nonmetal.transfer) : undefined
                  }
                  electronCount={nonmetalElectrons}
                  countLabels={countLabels}
                />
              )}
              {!showMetal && !showNonmetal && (
                <mesh>
                  <sphereGeometry args={[0.4, 16, 16]} />
                  <meshStandardMaterial color="#334155" />
                </mesh>
              )}
              <ContactShadows
                position={[0, -3.2, 0]}
                opacity={0.35}
                scale={18}
                blur={2.5}
              />
            </Suspense>
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.08}
              minDistance={6}
              maxDistance={22}
              target={[0, 0, 0]}
            />
          </Canvas>
          <div className="electron-lab__hint">{t('e.dragHint')}</div>
          <div className="electron-lab__legend">
            <span className="leg-e">● {t('e.legendE')}</span>
            <span className="leg-p">● {t('e.legendP')}</span>
            <span className="leg-n">● {t('e.legendN')}</span>
          </div>
        </div>

        <aside className="electron-lab__side">
          <div className="e-card e-card--accent">
            <h3>{t('e.intuition')}</h3>
            <p>{t('e.intuitionBody')}</p>
          </div>

          <div className="e-card">
            <h3>
              {cation.display}
              {metal ? '' : ` (${t('e.polyatomic')})`}
            </h3>
            <p className="e-state">{metalStateText}</p>
            {metal && <ParticleTable atom={metal} electrons={metalElectrons} />}
            {whyMetal && <p className="e-why">{whyMetal}</p>}
          </div>

          <div className="e-card">
            <h3>
              {anion.display}
              {nonmetal ? '' : ` (${t('e.polyatomic')})`}
            </h3>
            <p className="e-state">{nonmetalStateText}</p>
            {nonmetal && (
              <ParticleTable atom={nonmetal} electrons={nonmetalElectrons} />
            )}
            {whyNonmetal && <p className="e-why">{whyNonmetal}</p>}
          </div>

          <div className="e-card">
            <h3>{t('e.correctTitle')}</h3>
            <p>{t('e.correctBody')}</p>
          </div>

          <div className="e-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={play}
              disabled={!metal && !nonmetal}
            >
              {t('e.play')}
            </button>
            <button type="button" className="ghost-btn" onClick={reset}>
              {t('e.reset')}
            </button>
          </div>

          {(metal || nonmetal) && (
            <div className="e-card e-card--mono">
              <h3>{t('e.equations')}</h3>
              {metal && (
                <code>
                  {metal.display} → {metal.display}
                  <sup>{formatValencyLabel(metal.transfer)}</sup> +{' '}
                  {metal.transfer > 1 ? `${metal.transfer}e⁻` : 'e⁻'}
                </code>
              )}
              {nonmetal && (
                <code>
                  {nonmetal.display} +{' '}
                  {Math.abs(nonmetal.transfer) > 1
                    ? `${Math.abs(nonmetal.transfer)}e⁻`
                    : 'e⁻'}{' '}
                  → {nonmetal.display}
                  <sup>{formatValencyLabel(nonmetal.transfer)}</sup>
                </code>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
