import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { AtomModel } from '../data/atoms'
import { formatValencyLabel } from '../lib/formula'

export type ElectronMode = 'neutral' | 'transferring' | 'ionized'

type ElectronUserData = {
  shell: number
  r: number
  phase: number
  speed: number
  /** Index among transferable electrons (outermost first), or -1 */
  transferIndex: number
  role: 'core' | 'leave' | 'arrive'
  home: THREE.Vector3
  target: THREE.Vector3
}

const SHELL_BASE = 1.55
const SHELL_GAP = 1.05

function shellRadius(shellIndex: number, shellCount: number) {
  const scale = shellCount > 3 ? 0.85 : 1
  return (SHELL_BASE + shellIndex * SHELL_GAP) * scale
}

/** Pack N points roughly as a sphere (Fibonacci lattice). No count cap. */
function packNucleons(count: number, radius: number): THREE.Vector3[] {
  if (count <= 0) return []
  if (count === 1) return [new THREE.Vector3(0, 0, 0)]
  const pts: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    pts.push(
      new THREE.Vector3(
        Math.cos(theta) * r * radius,
        y * radius,
        Math.sin(theta) * r * radius,
      ),
    )
  }
  return pts
}

function Nucleus({ protons, neutrons }: { protons: number; neutrons: number }) {
  const { protonPos, neutronPos, ballSize } = useMemo(() => {
    const total = protons + neutrons
    // Grow nucleus with cube-root of nucleon count; shrink balls so Fe (56) stays readable
    const packR = 0.22 + Math.cbrt(Math.max(total, 1)) * 0.28
    const size = Math.max(0.07, Math.min(0.16, 0.55 / Math.cbrt(Math.max(total, 1))))
    const all = packNucleons(total, packR)
    return {
      protonPos: all.slice(0, protons),
      neutronPos: all.slice(protons),
      ballSize: size,
    }
  }, [protons, neutrons])

  return (
    <group>
      {protonPos.map((pos, i) => (
        <mesh key={`p-${i}`} position={pos}>
          <sphereGeometry args={[ballSize, 10, 10]} />
          <meshStandardMaterial color="#ff5b5b" roughness={0.35} metalness={0.2} />
        </mesh>
      ))}
      {neutronPos.map((pos, i) => (
        <mesh key={`n-${i}`} position={pos}>
          <sphereGeometry args={[ballSize, 10, 10]} />
          <meshStandardMaterial color="#70a7ff" roughness={0.35} metalness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

type AtomProps = {
  atom: AtomModel
  mode: ElectronMode
  /** World offset of this atom */
  position?: [number, number, number]
  /** For gainers: how many incoming electrons are already flying */
  progress?: number
  label?: string
  chargeLabel?: string
  /** Live electron count (neutral or after transfer) */
  electronCount?: number
  countLabels?: {
    protons: string
    neutrons: string
    electrons: string
  }
}

/**
 * Bohr-style atom. Metals: outer electrons fly away when mode=transferring/ionized.
 * Non-metals: extra electrons fly in from outside to fill the outer shell.
 */
export function ElectronAtom({
  atom,
  mode,
  position = [0, 0, 0],
  progress = 1,
  label,
  chargeLabel,
  electronCount,
  countLabels,
}: AtomProps) {
  const group = useRef<THREE.Group>(null)
  const electronRefs = useRef<THREE.Mesh[]>([])
  const tRef = useRef(0)

  const lose = atom.transfer > 0
  const gainCount = Math.abs(Math.min(0, atom.transfer))
  const loseCount = Math.max(0, atom.transfer)

  const setup = useMemo(() => {
    const shells = atom.shells
    const rings = shells.map((_, i) => shellRadius(i, shells.length))
    const electrons: ElectronUserData[] = []
    let outerLeft = loseCount

    for (let sh = 0; sh < shells.length; sh++) {
      const count = shells[sh]
      const r = rings[sh]
      const isOuter = sh === shells.length - 1
      for (let j = 0; j < count; j++) {
        const phase = (j / count) * Math.PI * 2
        const home = new THREE.Vector3(
          Math.cos(phase) * r,
          Math.sin(phase) * r * 0.28,
          Math.sin(phase) * r,
        )
        let transferIndex = -1
        let role: ElectronUserData['role'] = 'core'
        if (lose && isOuter && outerLeft > 0) {
          transferIndex = loseCount - outerLeft
          role = 'leave'
          outerLeft -= 1
        }
        electrons.push({
          shell: sh,
          r,
          phase,
          speed: isOuter ? 1.35 : 0.32 + sh * 0.1,
          transferIndex,
          role,
          home,
          target: home
            .clone()
            .normalize()
            .multiplyScalar(r + 4.5 + transferIndex * 0.55)
            .add(new THREE.Vector3(lose ? 2.2 : 0, 1.2, 0)),
        })
      }
    }

    // Incoming electrons for anions (start far away)
    if (!lose && gainCount > 0) {
      const outer = shells.length - 1
      const r = rings[outer]
      const existing = shells[outer]
      for (let k = 0; k < gainCount; k++) {
        const phase = ((existing + k) / (existing + gainCount)) * Math.PI * 2
        const home = new THREE.Vector3(
          Math.cos(phase) * r,
          Math.sin(phase) * r * 0.28,
          Math.sin(phase) * r,
        )
        const start = home
          .clone()
          .normalize()
          .multiplyScalar(r + 5)
          .add(new THREE.Vector3(-2.5 - k * 0.4, 1.4, 0.6))
        electrons.push({
          shell: outer,
          r,
          phase,
          speed: 1.2,
          transferIndex: k,
          role: 'arrive',
          home,
          target: start,
        })
      }
    }

    return { rings, electrons, shells }
  }, [atom, gainCount, lose, loseCount])

  useFrame((_, dt) => {
    tRef.current += dt
    const t = tRef.current
    electronRefs.current.forEach((mesh, i) => {
      const u = setup.electrons[i]
      if (!mesh || !u) return

      if (u.role === 'leave') {
        const shouldFly =
          mode === 'ionized' ||
          (mode === 'transferring' && progress > u.transferIndex + 0.05)
        if (shouldFly) {
          const fly = mode === 'ionized' ? 1 : Math.min(1, (progress - u.transferIndex) * 1.2)
          mesh.position.lerpVectors(u.home, u.target, fly)
          // keep slight wobble while leaving
          if (fly < 1) {
            const a = u.phase + t * u.speed
            const orbit = new THREE.Vector3(
              Math.cos(a) * u.r,
              Math.sin(a) * u.r * 0.28,
              Math.sin(a) * u.r,
            )
            mesh.position.lerpVectors(orbit, u.target, fly)
          }
          mesh.visible = fly < 0.98 || mode === 'transferring'
          if (mode === 'ionized' && fly >= 0.98) mesh.visible = false
          return
        }
      }

      if (u.role === 'arrive') {
        const shouldArrive =
          mode === 'ionized' ||
          (mode === 'transferring' && progress > u.transferIndex + 0.05)
        if (!shouldArrive) {
          mesh.position.copy(u.target)
          mesh.visible = mode !== 'neutral'
          if (mode === 'neutral') mesh.visible = false
          return
        }
        const fly =
          mode === 'ionized' ? 1 : Math.min(1, (progress - u.transferIndex) * 1.15)
        mesh.visible = true
        if (fly >= 1) {
          const a = u.phase + t * u.speed
          mesh.position.set(
            Math.cos(a) * u.r,
            Math.sin(a) * u.r * 0.28,
            Math.sin(a) * u.r,
          )
        } else {
          mesh.position.lerpVectors(u.target, u.home, fly)
        }
        return
      }

      // core / parked outer electrons
      const a = u.phase + t * u.speed
      mesh.position.set(
        Math.cos(a) * u.r,
        Math.sin(a) * u.r * 0.28,
        Math.sin(a) * u.r,
      )
      mesh.visible = true
    })
  })

  const ionized = mode === 'ionized'
  const charge =
    chargeLabel ??
    (ionized
      ? formatValencyLabel(atom.transfer > 0 ? atom.transfer : atom.transfer)
      : '')
  const eCount =
    electronCount ??
    atom.shells.reduce((a, b) => a + b, 0) - (ionized ? atom.transfer : 0)

  return (
    <group ref={group} position={position}>
      <Nucleus protons={atom.protons} neutrons={atom.neutrons} />

      {setup.rings.map((r, i) => (
        <mesh key={`ring-${i}`} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.018, 8, 96]} />
          <meshBasicMaterial color="#3e8fd9" transparent opacity={0.42} />
        </mesh>
      ))}

      {setup.electrons.map((u, i) => (
        <mesh
          key={`e-${i}`}
          ref={(el) => {
            if (el) electronRefs.current[i] = el
          }}
          visible={u.role !== 'arrive'}
        >
          <sphereGeometry args={[0.11, 14, 14]} />
          <meshStandardMaterial
            color="#ffd43b"
            emissive="#7a5a00"
            emissiveIntensity={1.15}
            roughness={0.3}
          />
        </mesh>
      ))}

      <Html
        center
        position={[0, setup.rings[setup.rings.length - 1] + 1.15, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="atom-badge">
          <strong>
            {label ?? atom.display}
            {charge && <sup>{charge}</sup>}
          </strong>
          <div className="atom-badge__counts">
            <span className="leg-p">
              {countLabels?.protons ?? 'p⁺'} {atom.protons}
            </span>
            <span className="leg-n">
              {countLabels?.neutrons ?? 'n'} {atom.neutrons}
            </span>
            <span className="leg-e">
              {countLabels?.electrons ?? 'e⁻'} {eCount}
            </span>
          </div>
        </div>
      </Html>
    </group>
  )
}
