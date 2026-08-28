import { Canvas } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  Float,
  Html,
  OrbitControls,
  RoundedBox,
} from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import type { Ion } from '../data/ions'
import { formatValencyLabel } from '../lib/formula'
import { useI18n } from '../i18n/I18nProvider'

type SceneProps = {
  cation: Ion
  anion: Ion
  cationCount: number
  anionCount: number
  multiplier: number
  balanced: boolean
  chargeTotal: number
}

function IonSphere({
  position,
  color,
  emissive,
  label,
  valency,
  size = 0.38,
}: {
  position: [number, number, number]
  color: string
  emissive: string
  label: string
  valency: string
  size?: number
}) {
  return (
    <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.25}>
      <group position={position}>
        <mesh castShadow>
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={0.55}
            roughness={0.28}
            metalness={0.35}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[size * 1.18, 24, 24]} />
          <meshBasicMaterial color={emissive} transparent opacity={0.12} />
        </mesh>
        <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="ion-label">
            <span className="ion-label__val">{valency}</span>
            <span className="ion-label__sym">{label}</span>
          </div>
        </Html>
      </group>
    </Float>
  )
}

function BalanceRig({
  cation,
  anion,
  cationCount,
  anionCount,
  multiplier,
  balanced,
  chargeTotal,
}: SceneProps) {
  const { t } = useI18n()
  const tip = Math.max(-0.28, Math.min(0.28, chargeTotal * 0.035))

  const positives = useMemo(() => {
    const n = Math.min(cationCount * multiplier, 8)
    return Array.from({ length: n }, (_, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      return [-2.35 + col * 0.55, 1.15 + tip * 1.6 + row * 0.12, -0.2 + row * 0.45] as [
        number,
        number,
        number,
      ]
    })
  }, [cationCount, multiplier, tip])

  const negatives = useMemo(() => {
    const n = Math.min(anionCount * multiplier, 8)
    return Array.from({ length: n }, (_, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      return [2.35 - col * 0.55, 1.15 - tip * 1.6 + row * 0.12, -0.2 + row * 0.45] as [
        number,
        number,
        number,
      ]
    })
  }, [anionCount, multiplier, tip])

  return (
    <group>
      {/* floor plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[5.2, 64]} />
        <meshStandardMaterial color="#121820" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* pillar */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.1, 20]} />
        <meshStandardMaterial color="#2a3544" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial
          color={balanced ? '#5eead4' : '#94a3b8'}
          emissive={balanced ? '#14b8a6' : '#475569'}
          emissiveIntensity={balanced ? 0.9 : 0.25}
        />
      </mesh>

      {/* beam */}
      <group position={[0, 1.12, 0]} rotation={[0, 0, tip]}>
        <RoundedBox args={[5.2, 0.1, 0.28]} radius={0.04} castShadow>
          <meshStandardMaterial color="#3b4a5c" metalness={0.45} roughness={0.4} />
        </RoundedBox>

        {/* pans */}
        <mesh position={[-2.2, -0.28, 0]} castShadow>
          <cylinderGeometry args={[0.95, 0.85, 0.08, 32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[2.2, -0.28, 0]} castShadow>
          <cylinderGeometry args={[0.95, 0.85, 0.08, 32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.35} />
        </mesh>

        {positives.map((p, i) => (
          <IonSphere
            key={`p-${i}`}
            position={[p[0], p[1] - 1.12, p[2]]}
            color="#38bdf8"
            emissive="#0284c7"
            label={cation.display}
            valency={formatValencyLabel(cation.valency)}
            size={cation.polyatomic ? 0.42 : 0.36}
          />
        ))}
        {negatives.map((p, i) => (
          <IonSphere
            key={`n-${i}`}
            position={[p[0], p[1] - 1.12, p[2]]}
            color="#fbbf24"
            emissive="#d97706"
            label={anion.display}
            valency={formatValencyLabel(anion.valency)}
            size={anion.polyatomic ? 0.42 : 0.36}
          />
        ))}
      </group>

      <Html position={[0, 2.35, 0]} center style={{ pointerEvents: 'none' }}>
        <div className={`sum-badge ${balanced ? 'is-ok' : 'is-off'}`}>
          <strong>{balanced ? t('scene.sum') : `Σ = ${chargeTotal > 0 ? '+' : ''}${chargeTotal}`}</strong>
          <span>{balanced ? t('stats.neutral') : t('stats.imbalance')}</span>
        </div>
      </Html>

      <Html position={[-2.4, 0.15, 1.4]} center style={{ pointerEvents: 'none' }}>
        <div className="side-tag side-tag--pos">{t('scene.positive')}</div>
      </Html>
      <Html position={[2.4, 0.15, 1.4]} center style={{ pointerEvents: 'none' }}>
        <div className="side-tag side-tag--neg">{t('scene.negative')}</div>
      </Html>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.45}
        scale={10}
        blur={2.4}
        far={4}
      />
    </group>
  )
}

export function BalanceScene(props: SceneProps) {
  return (
    <div className="scene-shell">
      <Canvas
        shadows
        camera={{ position: [0, 2.6, 6.2], fov: 42 }}
        dpr={[1, 1.75]}
      >
        <color attach="background" args={['#0b1220']} />
        <fog attach="fog" args={['#0b1220', 8, 18]} />
        <ambientLight intensity={0.45} />
        <directionalLight
          castShadow
          position={[4, 8, 3]}
          intensity={1.35}
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-4, 3, -2]} intensity={0.55} color="#38bdf8" />
        <pointLight position={[4, 3, -2]} intensity={0.45} color="#fbbf24" />
        <Suspense fallback={null}>
          <BalanceRig {...props} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={3.2}
          maxDistance={11}
          maxPolarAngle={Math.PI * 0.49}
          target={[0, 1.0, 0]}
        />
      </Canvas>
    </div>
  )
}
