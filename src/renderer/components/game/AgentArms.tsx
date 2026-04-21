import { useCallback, useEffect, useState } from 'react'
import type { AgentWithOffice } from '../../stores/officeStore'

interface AgentArmsProps {
  agent: AgentWithOffice
  x: number
  y: number
}

// Same dimensions as claude-office drawArm.ts
const BODY_HALF_W = 22
const STROKE_W = 4
const SHOULDER_Y = -16
const KEYBOARD_Y = 16

export function AgentArms({ agent, x, y }: AgentArmsProps): JSX.Element {
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
  const isError = state === 'error'
  const isApproval = state === 'pending_approval' || state === 'waiting_approval'
  const isCelebrating = state === 'celebrating'
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 70)
    return () => window.clearInterval(id)
  }, [])

  const drawArms = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear()

      const t = Date.now() / 100

      if (isRunning) {
        const drift = Math.sin(t * 3.2) * 1.3
        g.moveTo(BODY_HALF_W, SHOULDER_Y)
        g.bezierCurveTo(BODY_HALF_W + 13, SHOULDER_Y + 8, BODY_HALF_W + 6, KEYBOARD_Y - 12 + drift, 6, KEYBOARD_Y - 9 + drift)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })
        g.moveTo(-BODY_HALF_W, SHOULDER_Y)
        g.bezierCurveTo(-BODY_HALF_W - 13, SHOULDER_Y + 8, -BODY_HALF_W - 6, KEYBOARD_Y - 12 - drift, -6, KEYBOARD_Y - 9 - drift)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })
      }
      if (isActive) {
        // Both arms straight in front, bobbing up/down.
        const bob = Math.sin(t * 2.2) * 2.2
        const forearmY = -12 + bob
        g.moveTo(-BODY_HALF_W + 1, SHOULDER_Y)
        g.lineTo(-8, forearmY)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })
        g.moveTo(BODY_HALF_W - 1, SHOULDER_Y)
        g.lineTo(8, forearmY)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })

        g.roundRect(-13, forearmY - 3, 8, 10, 3)
        g.fill({ color: 0xfce4b8 })
        g.stroke({ color: 0xffffff, width: 1.5 })
        g.roundRect(5, forearmY - 3, 8, 10, 3)
        g.fill({ color: 0xfce4b8 })
        g.stroke({ color: 0xffffff, width: 1.5 })
      }
      if (isIdle) {
        const sway = Math.sin(t * 1.5) * 1.1
        const armY = -18 + sway
        g.moveTo(-BODY_HALF_W + 1, SHOULDER_Y)
        g.lineTo(-BODY_HALF_W - 15, armY)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })
        g.moveTo(BODY_HALF_W - 1, SHOULDER_Y)
        g.lineTo(BODY_HALF_W + 15, armY)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })
      }
      if (isError) {
        // Crossed arms with subtle shake.
        const shake = Math.sin(t * 9) * 1.1
        const crossY = -20 + Math.sin(t * 4.2) * 0.7

        // Left arm crossing to right
        g.moveTo(-BODY_HALF_W + 1, SHOULDER_Y)
        g.quadraticCurveTo(-6, -20 + shake, 10 + shake, crossY)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })

        // Right arm crossing to left
        g.moveTo(BODY_HALF_W - 1, SHOULDER_Y)
        g.quadraticCurveTo(6, -20 - shake, -10 - shake, crossY + 1)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })

        g.circle(10 + shake, crossY, 4.6)
        g.fill({ color: 0xfce4b8 })
        g.stroke({ color: 0xffffff, width: 1.6 })
        g.circle(-10 - shake, crossY + 1, 4.6)
        g.fill({ color: 0xfce4b8 })
        g.stroke({ color: 0xffffff, width: 1.6 })
      }
      if (isApproval) {
        // Arms raised upward for approval/waiting state.
        const sway = Math.sin(t * 2.1) * 3
        g.moveTo(-BODY_HALF_W + 2, SHOULDER_Y - 2)
        g.bezierCurveTo(-BODY_HALF_W - 10, -38 + sway, -14, -56 + sway * 0.6, -8, -72)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })
        g.moveTo(BODY_HALF_W - 2, SHOULDER_Y - 2)
        g.bezierCurveTo(BODY_HALF_W + 10, -38 - sway, 14, -56 - sway * 0.6, 8, -72)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })

        g.circle(-8, -72, 4.8)
        g.fill({ color: 0xfce4b8 })
        g.stroke({ color: 0xffffff, width: 1.6 })
        g.circle(8, -72, 4.8)
        g.fill({ color: 0xfce4b8 })
        g.stroke({ color: 0xffffff, width: 1.6 })
      }
      if (isCelebrating) {
        // Clap animation: hands move inward/outward near chest.
        const clap = (Math.sin(t * 7) + 1) * 0.5
        const handGap = 10 - clap * 6
        const handY = -22 + Math.sin(t * 7) * 0.6

        g.moveTo(-BODY_HALF_W + 2, SHOULDER_Y - 2)
        g.quadraticCurveTo(-10, -26, -handGap, handY)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })
        g.moveTo(BODY_HALF_W - 2, SHOULDER_Y - 2)
        g.quadraticCurveTo(10, -26, handGap, handY)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })

        g.circle(-handGap, handY, 5)
        g.fill({ color: 0xfce4b8 })
        g.stroke({ color: 0xffffff, width: 2 })
        g.circle(handGap, handY, 5)
        g.fill({ color: 0xfce4b8 })
        g.stroke({ color: 0xffffff, width: 2 })
      }
    },
    [isRunning, isActive, isIdle, isError, isApproval, isCelebrating, tick]
  )

  if (!isRunning && !isActive && !isIdle && !isError && !isApproval && !isCelebrating) {
    return <pixiContainer />
  }

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={drawArms} />
    </pixiContainer>
  )
}

