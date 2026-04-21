import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AgentWithOffice } from '../../stores/officeStore'

interface AgentBodyProps {
  agent: AgentWithOffice
  x: number
  y: number
}

// Agent body: 48Ã—80 capsule (matching claude-office dimensions)
const BODY_H = 80
const STROKE_W = 4
const INNER_W = 48 - STROKE_W // 44
const INNER_R = INNER_W / 2   // 22

const ROLE_COLORS: Record<string, number> = {
  ceo: 0xfbbf24,
  cto: 0x60a5fa,
  cmo: 0xf472b6,
  cfo: 0x34d399,
  engineer: 0x818cf8,
  designer: 0xfb923c,
  pm: 0xa78bfa,
  qa: 0x2dd4bf,
  devops: 0xf87171,
  researcher: 0xc084fc,
  general: 0x94a3b8
}

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function hslToRgbInt(h: number, s: number, l: number): number {
  const hh = ((h % 360) + 360) % 360 / 360
  const ss = Math.max(0, Math.min(1, s))
  const ll = Math.max(0, Math.min(1, l))
  if (ss === 0) {
    const v = Math.round(ll * 255)
    return (v << 16) | (v << 8) | v
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
  const p = 2 * ll - q
  const hue2rgb = (tRaw: number): number => {
    let t = tRaw
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const r = Math.round(hue2rgb(hh + 1 / 3) * 255)
  const g = Math.round(hue2rgb(hh) * 255)
  const b = Math.round(hue2rgb(hh - 1 / 3) * 255)
  return (r << 16) | (g << 8) | b
}

export function AgentBody({ agent, x, y }: AgentBodyProps) {
  const roleColor = ROLE_COLORS[agent.role] ?? 0x94a3b8
  const seed = hashString(agent.id)
  const hue = seed % 360
  const distributedColor = hslToRgbInt(hue, 0.72, 0.62)
  const color = distributedColor ?? roleColor
  const rawState = agent.office.spriteState
  const state =
    agent.role === 'ceo'
      ? rawState === 'running' || rawState === 'typing'
        ? 'running'
        : rawState === 'idle'
          ? 'idle'
          : 'active'
      : rawState
  const isRunning = state === 'running' || state === 'typing'
  const isActive = state === 'active' || state === 'thinking'
  const isIdle = state === 'idle'
  const isPaused = state === 'paused' || state === 'leaning_back'
  const isError = state === 'error'
  const isWaiting = state === 'pending_approval' || state === 'waiting_approval'
  const isTerminated = state === 'terminated' || state === 'packing'
  const isCelebrating = state === 'celebrating'
  const isSleeping = state === 'sleeping'
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 80)
    return () => window.clearInterval(id)
  }, [])

  const motion = useMemo(() => {
    const t = Date.now()
    if (isRunning) return { x: Math.sin(t / 220) * 0.5, y: Math.sin(t / 180) * 1.6, rotation: Math.sin(t / 280) * 0.018 }
    if (isActive) return { x: 0, y: Math.sin(t / 520) * 0.9, rotation: Math.sin(t / 680) * 0.008 }
    if (isIdle || isWaiting || isCelebrating || isError) return { x: Math.sin(t / 300) * 0.9, y: Math.sin(t / 260) * 1.2, rotation: Math.sin(t / 330) * 0.016 }
    if (isPaused) return { x: 0, y: 0, rotation: 0 }
    if (isTerminated) return { x: 0, y: 1.4 + Math.sin(t / 800) * 0.2, rotation: -0.11 + Math.sin(t / 700) * 0.004 }
    if (isSleeping) return { x: 0, y: Math.sin(t / 550) * 1.3, rotation: Math.sin(t / 720) * 0.008 }
    return { x: 0, y: 0, rotation: 0 }
  }, [isRunning, isActive, isIdle, isPaused, isError, isWaiting, isTerminated, isCelebrating, isSleeping, tick])

  const sleepBubbles = useMemo(() => {
    if (!isSleeping) return []
    const phase = (tick % 30) / 10
    return [0, 1, 2].map((i) => {
      const zt = (phase + i * 0.7) % 3
      return {
        text: i === 0 ? 'z' : 'Z',
        x: 12 + zt * 4,
        y: -BODY_H - 10 - zt * 14,
        alpha: Math.max(0.5, 1 - zt / 2.6),
        size: 12 + zt * 5
      }
    })
  }, [isSleeping, tick])

  const drawBody = useCallback(
    (g: import('pixi.js').Graphics) => {
      void tick
      g.clear()

      // Shadow
      g.roundRect(-INNER_R - 1, -BODY_H + 3, INNER_W + 2, BODY_H + 2, INNER_R)
      g.fill({ color: 0x000000, alpha: 0.2 })

      // Body capsule â€” colored fill + white stroke
      g.roundRect(-INNER_R, -BODY_H, INNER_W, BODY_H, INNER_R)
      g.fill({ color })
      g.stroke({ color: 0xffffff, width: STROKE_W })

      // Face area â€” skin tone oval
      g.ellipse(0, -BODY_H + 22, 14, 16)
      g.fill({ color: 0xfce4b8 })

      // Eyes
      if (isSleeping || isTerminated) {
        g.moveTo(-5, -BODY_H + 22)
        g.lineTo(-2, -BODY_H + 22)
        g.stroke({ color: 0x333333, width: 2 })
        g.moveTo(2, -BODY_H + 22)
        g.lineTo(5, -BODY_H + 22)
        g.stroke({ color: 0x333333, width: 2 })
      } else {
        g.circle(-5, -BODY_H + 21, 2.5)
        g.fill({ color: 0x333333 })
        g.circle(5, -BODY_H + 21, 2.5)
        g.fill({ color: 0x333333 })
        // Eye shine
        g.circle(-4, -BODY_H + 20, 1)
        g.fill({ color: 0xffffff })
        g.circle(6, -BODY_H + 20, 1)
        g.fill({ color: 0xffffff })
      }

      // Mouth
      if (isTerminated) {
        g.moveTo(-3, -BODY_H + 28)
        g.lineTo(3, -BODY_H + 31)
        g.stroke({ color: 0x333333, width: 1.2 })
      } else {
        g.circle(0, -BODY_H + 28, 1)
        g.fill({ color: 0x333333 })
      }

    },
    [color, isSleeping, isCelebrating, isError, isWaiting, isPaused, isTerminated, tick]
  )

  return (
    <pixiContainer x={x + motion.x} y={y + motion.y} rotation={motion.rotation}>
      <pixiGraphics draw={drawBody} />
      {isPaused && (
        <pixiContainer x={0} y={-BODY_H - 30}>
          <pixiGraphics
            draw={(g) => {
              g.clear()
              g.roundRect(-22, -10, 44, 20, 8)
              g.fill({ color: 0xffffff })
              g.stroke({ color: 0x000000, width: 1, alpha: 0.12 })
            }}
          />
          <pixiText
            text="Paused"
            anchor={0.5}
            x={0}
            y={0}
            style={{ fontFamily: 'monospace', fontSize: 9, fill: 0xf59e0b, fontWeight: 'bold' }}
          />
        </pixiContainer>
      )}
      {isError && (
        <pixiContainer x={0} y={-BODY_H - 30}>
          <pixiGraphics
            draw={(g) => {
              g.clear()
              g.roundRect(-20, -10, 40, 20, 8)
              g.fill({ color: 0xffffff })
              g.stroke({ color: 0x991b1b, width: 1.2, alpha: 0.35 })
            }}
          />
          <pixiText
            text="Error"
            anchor={0.5}
            x={0}
            y={0}
            style={{ fontFamily: 'monospace', fontSize: 9, fill: 0xdc2626, fontWeight: 'bold' }}
          />
        </pixiContainer>
      )}
      {isWaiting && (
        <pixiContainer x={0} y={-BODY_H - 30}>
          <pixiGraphics
            draw={(g) => {
              g.clear()
              g.roundRect(-26, -10, 52, 20, 8)
              g.fill({ color: 0xffffff })
              g.stroke({ color: 0x1e3a8a, width: 1.2, alpha: 0.35 })
            }}
          />
          <pixiText
            text="Approval"
            anchor={0.5}
            x={0}
            y={0}
            style={{ fontFamily: 'monospace', fontSize: 9, fill: 0x2563eb, fontWeight: 'bold' }}
          />
        </pixiContainer>
      )}
      {isSleeping &&
        sleepBubbles.map((b, i) => (
          <pixiText
            key={`sleep-z-${i}`}
            text={b.text}
            anchor={0.5}
            x={b.x}
            y={b.y}
            alpha={b.alpha}
            style={{ fontFamily: 'monospace', fontSize: b.size, fill: 0x4f5565, fontWeight: 'bold' }}
          />
        ))}
      {isActive && (
        <pixiContainer x={0} y={-BODY_H - 30}>
          <pixiGraphics
            draw={(g) => {
              g.clear()
              g.roundRect(-22, -10, 44, 20, 8)
              g.fill({ color: 0xffffff })
              g.stroke({ color: 0x166534, width: 1.2, alpha: 0.35 })
            }}
          />
          <pixiText
            text="Active"
            anchor={0.5}
            x={0}
            y={0}
            style={{ fontFamily: 'monospace', fontSize: 9, fill: 0x16a34a, fontWeight: 'bold' }}
          />
        </pixiContainer>
      )}
    </pixiContainer>
  )
}

