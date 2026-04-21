import { useCallback, useMemo } from 'react'
import { TextStyle } from 'pixi.js'
import type { AgentWithOffice, SpriteState } from '../../stores/officeStore'

interface AgentSpriteProps {
  agent: AgentWithOffice
  x: number
  y: number
}

// Agent body: 48×80 capsule (same as claude-office)
const BODY_W = 48
const BODY_H = 80
const STROKE_W = 4
const INNER_W = BODY_W - STROKE_W
const INNER_R = INNER_W / 2 // 22px

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

const ROLE_EMOJIS: Record<string, string> = {
  ceo: '\u{1F451}',      // crown
  cto: '\u{1F4BB}',      // laptop
  cmo: '\u{1F4E3}',      // megaphone
  cfo: '\u{1F4B0}',      // money bag
  engineer: '\u{2699}',  // gear
  designer: '\u{1F3A8}', // palette
  pm: '\u{1F4CB}',       // clipboard
  qa: '\u{1F50D}',       // magnifier
  devops: '\u{1F527}',   // wrench
  researcher: '\u{1F4DA}', // books
  general: '\u{1F464}'   // person
}

export function AgentSprite({ agent, x, y }: AgentSpriteProps): JSX.Element {
  const color = ROLE_COLORS[agent.role] ?? 0x94a3b8
  const isTyping = agent.office.spriteState === 'typing'
  const isError = agent.office.spriteState === 'error'
  const isPaused = agent.office.spriteState === 'leaning_back'
  const isCelebrating = agent.office.spriteState === 'celebrating'
  const isSleeping = agent.office.spriteState === 'sleeping'
  const isWaiting = agent.office.spriteState === 'waiting_approval'

  const drawBody = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear()

      // Shadow
      g.roundRect(-INNER_R - 1, -BODY_H + 3, INNER_W + 2, BODY_H + 2, INNER_R)
      g.fill({ color: 0x000000, alpha: 0.2 })

      // Body capsule — white stroke + colored fill
      g.roundRect(-INNER_R, -BODY_H, INNER_W, BODY_H, INNER_R)
      g.fill({ color })
      g.stroke({ color: 0xffffff, width: STROKE_W })

      // Face area — lighter oval
      g.ellipse(0, -BODY_H + 22, 14, 16)
      g.fill({ color: 0xfce4b8 })

      // Eyes
      if (isSleeping) {
        // Closed eyes (—)
        g.moveTo(-5, -BODY_H + 22)
        g.lineTo(-2, -BODY_H + 22)
        g.stroke({ color: 0x333333, width: 2 })
        g.moveTo(2, -BODY_H + 22)
        g.lineTo(5, -BODY_H + 22)
        g.stroke({ color: 0x333333, width: 2 })
      } else {
        // Open eyes
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
      if (isCelebrating) {
        // Happy mouth
        g.arc(0, -BODY_H + 27, 4, 0, Math.PI)
        g.stroke({ color: 0x333333, width: 1.5 })
      } else if (isError) {
        // Frown
        g.arc(0, -BODY_H + 30, 3, Math.PI, 0)
        g.stroke({ color: 0x333333, width: 1.5 })
      } else {
        // Neutral dot
        g.circle(0, -BODY_H + 28, 1)
        g.fill({ color: 0x333333 })
      }
    },
    [color, isSleeping, isCelebrating, isError]
  )

  const drawArms = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear()
      if (!isTyping && !isCelebrating) return

      if (isTyping) {
        const t = Date.now() / 125
        const offsetL = Math.sin(t) * 3
        const offsetR = Math.sin(t + Math.PI) * 3

        // Right arm — shoulder to keyboard
        g.moveTo(INNER_R, -40)
        g.bezierCurveTo(INNER_R + 16, -30 + offsetR * 0.5, INNER_R + 12, -8 + offsetR * 0.7, 10, -4 + offsetR)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })
        // Right hand
        g.roundRect(5, -10 + offsetR, 10, 14, 4)
        g.fill({ color: 0xfce4b8 })
        g.stroke({ color: 0xffffff, width: 2 })

        // Left arm
        g.moveTo(-INNER_R, -40)
        g.bezierCurveTo(-INNER_R - 16, -30 + offsetL * 0.5, -INNER_R - 12, -8 + offsetL * 0.7, -10, -4 + offsetL)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })
        // Left hand
        g.roundRect(-15, -10 + offsetL, 10, 14, 4)
        g.fill({ color: 0xfce4b8 })
        g.stroke({ color: 0xffffff, width: 2 })
      }

      if (isCelebrating) {
        // Arms up!
        g.moveTo(INNER_R, -50)
        g.bezierCurveTo(INNER_R + 20, -70, INNER_R + 15, -90, INNER_R + 8, -95)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })

        g.moveTo(-INNER_R, -50)
        g.bezierCurveTo(-INNER_R - 20, -70, -INNER_R - 15, -90, -INNER_R - 8, -95)
        g.stroke({ color: 0xffffff, width: STROKE_W, cap: 'round' })
      }
    },
    [isTyping, isCelebrating]
  )

  // Status effects
  const drawEffects = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear()

      if (isError) {
        // Red pulse glow
        const pulse = 0.15 + Math.sin(Date.now() / 300) * 0.08
        g.circle(0, -40, 36)
        g.fill({ color: 0xef4444, alpha: pulse })
      }

      if (isWaiting) {
        // Yellow pulse glow
        const pulse = 0.1 + Math.sin(Date.now() / 500) * 0.06
        g.circle(0, -40, 36)
        g.fill({ color: 0xf59e0b, alpha: pulse })
      }

      if (isSleeping) {
        // Z bubbles
        const t = (Date.now() / 1000) % 3
        for (let i = 0; i < 3; i++) {
          const zt = (t + i * 0.8) % 3
          if (zt < 2) {
            const zy = -BODY_H - 10 - zt * 15
            const zx = 15 + zt * 5
            const za = 1 - zt / 2
            g.text({
              text: 'z',
              x: zx,
              y: zy,
              style: { fontSize: 8 + zt * 3, fill: 0x8892a8, alpha: za, fontFamily: 'monospace' }
            })
          }
        }
      }

      if (isPaused) {
        // Coffee cup next to agent
        g.roundRect(INNER_R + 4, -20, 8, 12, 2)
        g.fill({ color: 0xffffff })
        g.stroke({ color: 0xcccccc, width: 1 })
        // Steam
        g.moveTo(INNER_R + 7, -22)
        g.quadraticCurveTo(INNER_R + 9, -28, INNER_R + 7, -32)
        g.stroke({ color: 0xcccccc, width: 1, alpha: 0.5 })
      }
    },
    [isError, isWaiting, isSleeping, isPaused]
  )

  // Bubble
  const drawBubble = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear()
      if (!agent.office.lastBubble) return

      const text = agent.office.lastBubble
      const bubbleW = Math.min(text.length * 6 + 20, 140)
      const bubbleH = 24

      // Shadow
      g.roundRect(-bubbleW / 2 + 2, -BODY_H - bubbleH - 18, bubbleW, bubbleH, 10)
      g.fill({ color: 0x000000, alpha: 0.15 })

      // Bubble body
      g.roundRect(-bubbleW / 2, -BODY_H - bubbleH - 20, bubbleW, bubbleH, 10)
      g.fill({ color: 0xffffff })
      g.stroke({ color: 0x000000, width: 1.5, alpha: 0.1 })

      // Tail (speech triangle)
      g.moveTo(-6, -BODY_H - 20)
      g.lineTo(0, -BODY_H - 12)
      g.lineTo(6, -BODY_H - 20)
      g.fill({ color: 0xffffff })
    },
    [agent.office.lastBubble]
  )

  const nameStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0xffffff,
        fontWeight: 'bold',
        align: 'center',
        stroke: { color: 0x000000, width: 3 }
      }),
    []
  )

  const bubbleTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: 'monospace',
        fontSize: 9,
        fill: 0x333333,
        wordWrap: true,
        wordWrapWidth: 120
      }),
    []
  )

  const roleStyle = useMemo(
    () =>
      new TextStyle({
        fontSize: 14
      }),
    []
  )

  return (
    <pixiContainer x={x} y={y}>
      {/* Status effects (behind body) */}
      <pixiGraphics draw={drawEffects} />

      {/* Body */}
      <pixiGraphics draw={drawBody} />

      {/* Arms (in front of body) */}
      <pixiGraphics draw={drawArms} />

      {/* Role emoji above head */}
      <pixiText
        text={ROLE_EMOJIS[agent.role] ?? ''}
        anchor={0.5}
        x={0}
        y={-BODY_H - 6}
        style={roleStyle}
      />

      {/* Name label below */}
      <pixiText text={agent.name} anchor={{ x: 0.5, y: 0 }} x={0} y={6} style={nameStyle} />

      {/* Speech bubble */}
      {agent.office.lastBubble && (
        <pixiContainer>
          <pixiGraphics draw={drawBubble} />
          <pixiText
            text={agent.office.lastBubble.slice(0, 22)}
            anchor={0.5}
            x={0}
            y={-BODY_H - 28}
            style={bubbleTextStyle}
          />
        </pixiContainer>
      )}
    </pixiContainer>
  )
}
