import { useCallback, useEffect, useMemo, useState } from 'react'
import { Assets, TextStyle, type Texture } from 'pixi.js'
import type { AgentWithOffice } from '../../stores/officeStore'
import type { OfficeTextures } from '../../hooks/useOfficeTextures'
import type { DeskDecorTexturesBySlot } from '../../hooks/useDeskDecorTextures'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './canvasDimensions'
import { AgentBody } from './AgentBody'
import { AgentArms } from './AgentArms'
import { fillTerracottaBrickWall } from './terracottaBrickWall'
import {
  DESK_SURFACE_SCALE,
  DESK_SURFACE_Y,
  getSideCabinetFromDeskOffsets,
  SIDE_CABINET_SCALE
} from './deskSideCabinetLayout'
interface OfficeRoomProps {
  agents: AgentWithOffice[]
  textures: OfficeTextures
  deskDecorTextures: DeskDecorTexturesBySlot
}

type SnorlaxDir = 'up' | 'down' | 'left' | 'right'
type SnorlaxPhase =
  | 'opening-out'
  | 'exiting'
  | 'closing-out'
  | 'patrol'
  | 'opening-in'
  | 'entering'
  | 'closing-in'
  | 'waiting'

interface SnorlaxControllerState {
  phase: SnorlaxPhase
  x: number
  y: number
  doorOpen: number // 0 closed, 1 fully open
  patrolIndex: number
  dir: SnorlaxDir
  waitMs: number
  frameTickMs: number
  frameIndex: 0 | 1
}

const snorlaxPng = import.meta.glob('../../assets/sprites/snorlax/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>

const DESK_DECOR_Y = 40
const DESK_DECOR_X_SHIFT = 8
const DESK_DECOR_X_BASE = 46 + DESK_DECOR_X_SHIFT
const DESK_DECOR_X_STEP = 18
const DESK_DECOR_SLOT_GENGAR = 0
const DESK_DECOR_SLOT_THERMOS = 1
const DESK_DECOR_SLOT_PEN_HOLDER = 2
const DESK_DECOR_SLOT_DESK_LAMP = 4
const DESK_DECOR_SLOT_COFFEE_MUG = 5
const DESK_DECOR_MULT_GENGAR = 1.45
const DESK_DECOR_MULT_THERMOS = 1.52
const DESK_DECOR_MULT_PEN_HOLDER = 0.74
const DESK_DECOR_MULT_DESK_LAMP = 0.88
const DESK_DECOR_MULT_COFFEE_MUG = 0.64
const ELEV_DOOR_OPEN_X = 50
const SNORLAX_SCALE = 0.88
const SNORLAX_MOVE_SPEED = 105 // px/s
const SNORLAX_Z_INDEX_FRONT = 500
const SNORLAX_Z_INDEX_BACK = 5
const DESK_AREA_Z_INDEX = 10
/** Extra gap from the right edge of the Pixi scene so the scaled sprite never bleeds past the canvas (reads as “into” the Activity panel). */
const SNORLAX_CANVAS_EDGE_PAD = 96
const SNORLAX_MIN_WALK_Y = 312
const SNORLAX_TOP_SAFE_OFFSET = 112
const SNORLAX_LEFT_SAFE_X = 116
const SNORLAX_HALF_W_FALLBACK = 120

function deskDecorBaseScale(tex: Texture): number {
  const w = tex.width > 0 ? tex.width : 64
  const h = tex.height > 0 ? tex.height : 64
  return Math.min(0.38, 52 / w, 52 / h)
}

function deskDecorScaleForLayer(agentSlotIndex: number, url: string, tex: Texture): number {
  const base = deskDecorBaseScale(tex)
  const u = url.toLowerCase()
  let m = 1
  if (u.includes('gengar') || agentSlotIndex === DESK_DECOR_SLOT_GENGAR) m *= DESK_DECOR_MULT_GENGAR
  if (u.includes('thermos') || agentSlotIndex === DESK_DECOR_SLOT_THERMOS) m *= DESK_DECOR_MULT_THERMOS
  if (u.includes('pen-holder') || u.includes('pen_holder') || agentSlotIndex === DESK_DECOR_SLOT_PEN_HOLDER) {
    m *= DESK_DECOR_MULT_PEN_HOLDER
  }
  if (u.includes('desk-lamp') || u.includes('desk_lamp') || agentSlotIndex === DESK_DECOR_SLOT_DESK_LAMP) {
    m *= DESK_DECOR_MULT_DESK_LAMP
  }
  if (u.includes('coffee-mug') || u.includes('coffee_mug') || agentSlotIndex === DESK_DECOR_SLOT_COFFEE_MUG) {
    m *= DESK_DECOR_MULT_COFFEE_MUG
  }
  return base * m
}

// === LAYOUT (matching claude-office exactly) ===
const WALL_H = 250
const WALL_TRIM = 0x4a4a4a
const FLOOR_TILE_PAD_COLOR = 0x6a6866
const FLOOR_TILE_PAD_PX = 0.5
const ELEV_FRAME_TEX_W = 594
const ELEV_FRAME_TEX_H = 555
const ELEV_FRAME_SCALE = 0.26
const FAUCET_SCALE = 0.17
const OUTLET_WALL_SCALE = 0.043
const OUTLET_DUO_GAP = 2
const OUTLET_WALL_LIFT = 26
const TRAY_TO_CLUSTER_GAP = 6
const FAUCET_AFTER_OUTLETS_GAP = 6
export const BREAK_SINK_CLUSTER_OFFSET_X = 125
const AIR_CON_SCALE_X = 0.28
const AIR_CON_SCALE_Y = 0.32
const LC_VERTICAL_SQUASH = 0.72
const FRIDGE_SHIFT_LEFT_PX = 8
const FRIDGE_SHIFT_DOWN_PX = 5
const TILE_SIZE = 100

// Desk grid
const DESK_X0 = 256
const DESK_Y0 = 408
const DESK_DX = 256
const DESK_DY = 192
const ROW = 4

const PLANT_ABOVE_CABINET_Y = -94
const PLANT_ON_CABINET_SCALE = 0.105

// Positions (from claude-office constants/positions.ts)
const BREAK_COOLER_SCALE = 0.165
const BREAK_COFFEE_SCALE = 0.165
const BREAK_PAPER_CUP_TRAY_MAX_SCALE = 0.2

const P = {
  clock:    { x: 352, y: 72 },
  elevator: { x: 86, y: 178 }
}

const DESK_ITEMS: Array<{ key: keyof OfficeTextures; scale: number; x: number; y: number }> = [
  { key: 'deskLamp', scale: 0.35, x: 50, y: 29 },
  { key: 'coffeeMug', scale: 0.025, x: 54, y: 40 },
  { key: 'magic5Ball', scale: 0.025, x: 52, y: 35 },
  { key: 'stapler', scale: 0.025, x: 50, y: 43 },
  { key: 'penHolder', scale: 0.025, x: 54, y: 35 },
  { key: 'thermos', scale: 0.045, x: 52, y: 38 },
  { key: 'rubiksCube', scale: 0.025, x: 50, y: 40 },
  { key: 'gengar', scale: 0.055, x: 54, y: 42 }
]
const ROLE_EMOJIS: Record<string, string> = {
  ceo: '\u{1F451}', cto: '\u{1F4BB}', cmo: '\u{1F4E3}', cfo: '\u{1F4B0}',
  engineer: '\u{2699}', designer: '\u{1F3A8}', pm: '\u{1F4CB}', qa: '\u{1F50D}',
  devops: '\u{1F527}', researcher: '\u{1F4DA}', general: '\u{1F464}'
}

export function OfficeRoom({ agents, textures, deskDecorTextures }: OfficeRoomProps) {
  const desks = useMemo(() =>
    agents.map((_, i) => ({
      x: DESK_X0 + (i % ROW) * DESK_DX,
      y: DESK_Y0 + Math.floor(i / ROW) * DESK_DY
    })), [agents.length])

  const agentY = (i: number) => (desks[i]?.y ?? 0) + 40

  const floorTileLayout = useMemo(() => {
    const tex = textures.floorTile
    const inner = TILE_SIZE - 2 * FLOOR_TILE_PAD_PX
    const scale =
      tex && tex.width > 0 && tex.height > 0
        ? { x: inner / tex.width, y: inner / tex.height }
        : { x: 1, y: 1 }
    const cells: Array<{ x: number; y: number; scale: { x: number; y: number } }> = []
    for (let ty = WALL_H; ty < CANVAS_HEIGHT; ty += TILE_SIZE) {
      for (let tx = 0; tx < CANVAS_WIDTH; tx += TILE_SIZE) {
        cells.push({
          x: tx + FLOOR_TILE_PAD_PX,
          y: ty + FLOOR_TILE_PAD_PX,
          scale
        })
      }
    }
    return cells
  }, [textures.floorTile])

  const elevLandmarks = useMemo(() => {
    const ex = P.elevator.x
    const ey = P.elevator.y
    const fh = ELEV_FRAME_TEX_H * ELEV_FRAME_SCALE
    const fw = ELEV_FRAME_TEX_W * ELEV_FRAME_SCALE
    const top = ey - fh * 0.5
    const bottom = ey + fh * 0.5
    const lw = textures.logo && textures.logo.width > 0 ? textures.logo.width : 400
    const logoScale = Math.min(0.2, 128 / lw)
    const logoY = top - 20
    const tw = textures.trashCan && textures.trashCan.width > 0 ? textures.trashCan.width : 160
    const th = textures.trashCan && textures.trashCan.height > 0 ? textures.trashCan.height : 280
    const trashScale = Math.min(0.125, 92 / th)
    const trashDispW = tw * trashScale
    const gap = 6
    const rightElev = ex + fw * 0.5
    const t1x = rightElev + gap + trashDispW * 0.5
    const t2x = t1x + trashDispW + gap
    const trashY = bottom + 4
    return { logoX: ex, logoY, logoScale, t1x, t2x, trashY, trashScale }
  }, [textures.logo, textures.trashCan])

  const breakNook = useMemo(() => {
    const lc = textures.lowerCabinet
    const fri = textures.fridge
    const wc = textures.waterCooler
    const cf = textures.coffeeMachine
    const ft = textures.faucet
    const pt = textures.paperCupTray
    const lcW = lc && lc.width > 0 ? lc.width : 2048
    const lcH = lc && lc.height > 0 ? lc.height : 420
    const targetW = CANVAS_WIDTH * 0.48
    const lcScaleX = targetW / lcW
    const lcScaleY = lcScaleX * LC_VERTICAL_SQUASH
    const displayW = lcW * lcScaleX
    const displayH = lcH * lcScaleY
    const bottomY = WALL_H + 34
    const rightX = CANVAS_WIDTH - 6
    const cabinetLeft = rightX - displayW
    const cabinetTop = bottomY - displayH
    const counterSurfaceY = cabinetTop + displayH * 0.14
    const coolerW = (wc && wc.width > 0 ? wc.width : 320) * BREAK_COOLER_SCALE
    const coolerLeft = cabinetLeft + 3
    const coffeeLeft = coolerLeft + coolerW + 5
    const coffeeW = (cf && cf.width > 0 ? cf.width : 300) * BREAK_COFFEE_SCALE
    const trayH = pt && pt.height > 0 ? pt.height : 220
    let paperCupTrayScale = Math.min(BREAK_PAPER_CUP_TRAY_MAX_SCALE, 112 / trayH)
    const paperCupTrayLeft = coffeeLeft + coffeeW + 4
    const trayTexW = pt && pt.width > 0 ? pt.width : 180
    const faucetDispW = (ft && ft.width > 0 ? ft.width : 160) * FAUCET_SCALE
    const wo = textures.wallOutlet
    const outletSpriteW = (wo && wo.width > 0 ? wo.width : 120) * OUTLET_WALL_SCALE
    const clusterW =
      outletSpriteW + OUTLET_DUO_GAP + outletSpriteW + FAUCET_AFTER_OUTLETS_GAP + faucetDispW
    const maxTrayRight =
      rightX -
      8 -
      TRAY_TO_CLUSTER_GAP -
      BREAK_SINK_CLUSTER_OFFSET_X -
      clusterW
    const trayEnd0 = paperCupTrayLeft + trayTexW * paperCupTrayScale
    if (trayEnd0 > maxTrayRight) {
      const maxW = Math.max(40, maxTrayRight - paperCupTrayLeft)
      paperCupTrayScale = Math.min(paperCupTrayScale, maxW / trayTexW)
    }
    const trayRight = paperCupTrayLeft + trayTexW * paperCupTrayScale
    const clusterLeft = trayRight + TRAY_TO_CLUSTER_GAP + BREAK_SINK_CLUSTER_OFFSET_X
    const outlet1X = clusterLeft + outletSpriteW * 0.5
    const outlet2X = outlet1X + OUTLET_DUO_GAP + outletSpriteW
    const faucetX = outlet2X + outletSpriteW * 0.5 + FAUCET_AFTER_OUTLETS_GAP + faucetDispW * 0.5
    const faucetY = counterSurfaceY + 10
    const outletWallY = counterSurfaceY - OUTLET_WALL_LIFT
    const friTexH = fri && fri.height > 0 ? fri.height : 520
    const coolerDispH = (wc && wc.height > 0 ? wc.height : 320) * BREAK_COOLER_SCALE
    const cabinetFloorY = bottomY
    const fridgeTargetH =
      (bottomY - counterSurfaceY + coolerDispH) * 1.09
    const fridgeScale = fridgeTargetH / friTexH
    const fridgeX = cabinetLeft - FRIDGE_SHIFT_LEFT_PX
    const fridgeY = cabinetFloorY + FRIDGE_SHIFT_DOWN_PX
    return {
      lcScaleX,
      lcScaleY,
      bottomY,
      cabinetFloorY,
      rightX,
      fridgeX,
      fridgeY,
      fridgeScale,
      coolerLeft,
      coffeeLeft,
      paperCupTrayLeft,
      paperCupTrayScale,
      faucetX,
      faucetY,
      counterSurfaceY,
      outlet1X,
      outlet2X,
      outletWallY
    }
  }, [textures.lowerCabinet, textures.fridge, textures.waterCooler, textures.coffeeMachine, textures.faucet, textures.paperCupTray, textures.wallOutlet])

  const sideCabinetOffsets = useMemo(
    () => getSideCabinetFromDeskOffsets(textures.desk ?? undefined, textures.cabinet ?? undefined),
    [textures.desk, textures.cabinet]
  )

  const [snorlaxTextures, setSnorlaxTextures] = useState<Record<SnorlaxDir, readonly Texture[]>>({
    up: [],
    down: [],
    left: [],
    right: []
  })
  useEffect(() => {
    let cancelled = false
    const paths = Object.keys(snorlaxPng)
    if (paths.length === 0) return
    const classify = (p: string): SnorlaxDir | null => {
      const n = p.toLowerCase()
      if (n.includes('left') || n.includes('west')) return 'left'
      if (n.includes('right') || n.includes('east')) return 'right'
      if (n.includes('up') || n.includes('north')) return 'up'
      if (n.includes('down') || n.includes('south')) return 'down'
      return null
    }
    const frameNo = (p: string): number => {
      const m = p.match(/-(\d+)\.png$/i)
      if (!m) return 0
      const n = parseInt(m[1], 10)
      return Number.isNaN(n) ? 0 : n
    }
    void (async () => {
      const grouped: Record<SnorlaxDir, Array<{ order: number; tex: Texture }>> = {
        up: [],
        down: [],
        left: [],
        right: []
      }
      await Promise.all(
        paths.map(async (p) => {
          const d = classify(p)
          if (!d) return
          try {
            const tex = await Assets.load<Texture>(snorlaxPng[p])
            grouped[d].push({ order: frameNo(p), tex })
          } catch {
            // ignore broken frame; fallback visual remains available
          }
        })
      )
      if (cancelled) return
      setSnorlaxTextures({
        up: grouped.up.sort((a, b) => a.order - b.order).map((x) => x.tex),
        down: grouped.down.sort((a, b) => a.order - b.order).map((x) => x.tex),
        left: grouped.left.sort((a, b) => a.order - b.order).map((x) => x.tex),
        right: grouped.right.sort((a, b) => a.order - b.order).map((x) => x.tex)
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const snorlaxHalfW = useMemo(() => {
    let maxW = 0
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      for (const t of snorlaxTextures[dir]) {
        maxW = Math.max(maxW, t.width)
      }
    }
    return maxW > 0 ? maxW * SNORLAX_SCALE * 0.5 : SNORLAX_HALF_W_FALLBACK
  }, [snorlaxTextures])

  const snorlaxRoute = useMemo(() => {
    const inside = { x: P.elevator.x, y: WALL_H + 12 }
    const outside = { x: P.elevator.x + 8, y: WALL_H + 74 }
    const bottom = { x: outside.x, y: CANVAS_HEIGHT - 58 }
    // Center x must stay left enough that scaled sprite does not extend past CANVAS_WIDTH.
    const maxX = CANVAS_WIDTH - SNORLAX_CANVAS_EDGE_PAD - snorlaxHalfW
    const right = { x: maxX, y: bottom.y }
    // Keep Snorlax on the floor lane (below kitchen counters), not behind kitchen assets.
    const topNearKitchen = {
      x: maxX,
      y: Math.max(SNORLAX_MIN_WALK_Y, breakNook.cabinetFloorY + SNORLAX_TOP_SAFE_OFFSET)
    }
    const left = { x: SNORLAX_LEFT_SAFE_X, y: topNearKitchen.y }
    return { inside, outside, patrol: [outside, bottom, right, topNearKitchen, left, outside], maxX }
  }, [breakNook.cabinetFloorY, snorlaxHalfW])

  const [snorlax, setSnorlax] = useState<SnorlaxControllerState>({
    phase: 'opening-out',
    x: P.elevator.x,
    y: WALL_H + 12,
    doorOpen: 0,
    patrolIndex: 0,
    dir: 'down',
    waitMs: 1000,
    frameTickMs: 0,
    frameIndex: 0
  })
  useEffect(() => {
    let prev = Date.now()
    const id = window.setInterval(() => {
      const now = Date.now()
      const dtSec = Math.min(0.05, (now - prev) / 1000)
      const dtMs = now - prev
      prev = now

      const stepToward = (
        x: number,
        y: number,
        tx: number,
        ty: number,
        speed: number
      ): { x: number; y: number; reached: boolean; dir: SnorlaxDir } => {
        const dx = tx - x
        const dy = ty - y
        const dist = Math.hypot(dx, dy)
        if (dist <= speed * dtSec || dist < 0.001) {
          const dir: SnorlaxDir = Math.abs(dx) > Math.abs(dy)
            ? (dx >= 0 ? 'right' : 'left')
            : (dy >= 0 ? 'down' : 'up')
          return { x: tx, y: ty, reached: true, dir }
        }
        const nx = x + (dx / dist) * speed * dtSec
        const ny = y + (dy / dist) * speed * dtSec
        const dir: SnorlaxDir = Math.abs(dx) > Math.abs(dy)
          ? (dx >= 0 ? 'right' : 'left')
          : (dy >= 0 ? 'down' : 'up')
        return { x: nx, y: ny, reached: false, dir }
      }

      setSnorlax((s) => {
        const finish = (n: SnorlaxControllerState): SnorlaxControllerState => ({
          ...n,
          x: Math.min(n.x, snorlaxRoute.maxX)
        })

        const next: SnorlaxControllerState = { ...s, frameTickMs: s.frameTickMs + dtMs }
        if (next.frameTickMs > 180) {
          next.frameTickMs = 0
          next.frameIndex = next.frameIndex === 0 ? 1 : 0
        }

        if (next.phase === 'opening-out') {
          next.doorOpen = Math.min(1, next.doorOpen + dtSec * 2.4)
          if (next.doorOpen >= 1) next.phase = 'exiting'
          return finish(next)
        }
        if (next.phase === 'exiting') {
          const out = stepToward(next.x, next.y, snorlaxRoute.outside.x, snorlaxRoute.outside.y, SNORLAX_MOVE_SPEED)
          next.x = out.x
          next.y = out.y
          next.dir = out.dir
          if (out.reached) next.phase = 'closing-out'
          return finish(next)
        }
        if (next.phase === 'closing-out') {
          next.doorOpen = Math.max(0, next.doorOpen - dtSec * 2.6)
          if (next.doorOpen <= 0) {
            next.phase = 'patrol'
            next.patrolIndex = 0
          }
          return finish(next)
        }
        if (next.phase === 'patrol') {
          const t = snorlaxRoute.patrol[Math.min(next.patrolIndex + 1, snorlaxRoute.patrol.length - 1)]
          const out = stepToward(next.x, next.y, t.x, t.y, SNORLAX_MOVE_SPEED)
          next.x = out.x
          next.y = out.y
          next.dir = out.dir
          if (out.reached) {
            if (next.patrolIndex + 1 >= snorlaxRoute.patrol.length - 1) next.phase = 'opening-in'
            else next.patrolIndex += 1
          }
          return finish(next)
        }
        if (next.phase === 'opening-in') {
          next.doorOpen = Math.min(1, next.doorOpen + dtSec * 2.6)
          if (next.doorOpen >= 1) next.phase = 'entering'
          return finish(next)
        }
        if (next.phase === 'entering') {
          const out = stepToward(next.x, next.y, snorlaxRoute.inside.x, snorlaxRoute.inside.y, SNORLAX_MOVE_SPEED)
          next.x = out.x
          next.y = out.y
          next.dir = out.dir
          if (out.reached) next.phase = 'closing-in'
          return finish(next)
        }
        if (next.phase === 'closing-in') {
          next.doorOpen = Math.max(0, next.doorOpen - dtSec * 2.4)
          if (next.doorOpen <= 0) {
            next.phase = 'waiting'
            next.waitMs = 1000
          }
          return finish(next)
        }
        if (next.phase === 'waiting') {
          next.waitMs -= dtMs
          if (next.waitMs <= 0) {
            next.phase = 'opening-out'
            next.x = snorlaxRoute.inside.x
            next.y = snorlaxRoute.inside.y
            next.patrolIndex = 0
          }
        }
        return finish(next)
      })
    }, 16)
    return () => window.clearInterval(id)
  }, [snorlaxRoute])

  const drawBg = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.rect(0, WALL_H, CANVAS_WIDTH, CANVAS_HEIGHT - WALL_H)
    g.fill({ color: FLOOR_TILE_PAD_COLOR })
    fillTerracottaBrickWall(g, 0, 0, CANVAS_WIDTH, WALL_H - 10, 36, 16, 2)
    g.rect(0, WALL_H - 10, CANVAS_WIDTH, 10)
    g.fill({ color: WALL_TRIM })
  }, [])

  const [clockTick, setClockTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setClockTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const drawClock = useCallback((g: import('pixi.js').Graphics) => {
    void clockTick
    g.clear()
    const cx = P.clock.x, cy = P.clock.y
    // Outer ring
    g.circle(cx, cy, 44); g.fill({ color: 0x000000 })
    // Face
    g.circle(cx, cy, 40); g.fill({ color: 0xffffff }); g.stroke({ color: 0x2d3748, width: 4 })
    // Hour marks
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2
      g.circle(cx + Math.cos(a) * 32, cy + Math.sin(a) * 32, 2); g.fill({ color: 0x2d3748 })
    }
    // Hands
    const now = new Date()
    const ha = ((now.getHours() % 12 + now.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2
    const ma = (now.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2
    const sa = (now.getSeconds() / 60) * Math.PI * 2 - Math.PI / 2
    g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ha) * 20, cy + Math.sin(ha) * 20); g.stroke({ color: 0x2d3748, width: 4 })
    g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ma) * 30, cy + Math.sin(ma) * 30); g.stroke({ color: 0x2d3748, width: 3 })
    g.moveTo(cx, cy); g.lineTo(cx + Math.cos(sa) * 35, cy + Math.sin(sa) * 35); g.stroke({ color: 0xef4444, width: 1 })
    g.circle(cx, cy, 3); g.fill({ color: 0x2d3748 })
  }, [clockTick])

  return (
    <pixiContainer sortableChildren={true}>
      {/* === BACKGROUND === */}
      <pixiGraphics draw={drawBg} />

      {textures.floorTile &&
        floorTileLayout.map((t, i) => (
          <pixiSprite
            key={i}
            texture={textures.floorTile!}
            x={t.x}
            y={t.y}
            anchor={{ x: 0, y: 0 }}
            scale={t.scale}
            tint={0xffffff}
          />
        ))}

      {/* === WALL DECORATIONS (left to right, matching screenshot) === */}

      {/* Wall Clock */}
      <pixiGraphics draw={drawClock} />

      {textures.airConditioner && (
        <pixiSprite texture={textures.airConditioner}
          x={CANVAS_WIDTH * 0.36}
          y={0}
          anchor={{ x: 0.5, y: 0 }}
          scale={{ x: AIR_CON_SCALE_X, y: AIR_CON_SCALE_Y }}
          zIndex={4}
        />
      )}

      {textures.fridge && (
        <pixiSprite texture={textures.fridge}
          x={breakNook.fridgeX}
          y={breakNook.fridgeY}
          anchor={{ x: 1, y: 1 }}
          scale={breakNook.fridgeScale}
          zIndex={2}
        />
      )}

      {textures.lowerCabinet && (
        <pixiSprite texture={textures.lowerCabinet}
          x={breakNook.rightX}
          y={breakNook.cabinetFloorY}
          anchor={{ x: 1, y: 1 }}
          scale={{ x: breakNook.lcScaleX, y: breakNook.lcScaleY }}
          zIndex={3}
        />
      )}

      {textures.waterCooler && (
        <pixiSprite texture={textures.waterCooler}
          x={breakNook.coolerLeft} y={breakNook.counterSurfaceY} anchor={{ x: 0, y: 1 }} scale={BREAK_COOLER_SCALE} zIndex={14} />
      )}

      {textures.coffeeMachine && (
        <pixiSprite texture={textures.coffeeMachine}
          x={breakNook.coffeeLeft} y={breakNook.counterSurfaceY} anchor={{ x: 0, y: 1 }} scale={BREAK_COFFEE_SCALE} zIndex={15} />
      )}

      {textures.paperCupTray && (
        <pixiSprite texture={textures.paperCupTray}
          x={breakNook.paperCupTrayLeft} y={breakNook.counterSurfaceY} anchor={{ x: 0, y: 1 }} scale={breakNook.paperCupTrayScale} zIndex={8} />
      )}
      {textures.wallOutlet && (
        <pixiSprite texture={textures.wallOutlet}
          x={breakNook.outlet1X} y={breakNook.outletWallY} anchor={{ x: 0.5, y: 1 }} scale={OUTLET_WALL_SCALE} zIndex={120} />
      )}
      {textures.wallOutlet && (
        <pixiSprite texture={textures.wallOutlet}
          x={breakNook.outlet2X} y={breakNook.outletWallY} anchor={{ x: 0.5, y: 1 }} scale={OUTLET_WALL_SCALE} zIndex={120} />
      )}
      {textures.faucet && (
        <pixiSprite texture={textures.faucet}
          x={breakNook.faucetX}
          y={breakNook.faucetY}
          anchor={{ x: 0.5, y: 1 }}
          scale={FAUCET_SCALE}
          zIndex={130}
        />
      )}

      {textures.logo && (
        <pixiSprite texture={textures.logo}
          x={elevLandmarks.logoX} y={elevLandmarks.logoY} anchor={{ x: 0.5, y: 1 }} scale={elevLandmarks.logoScale} />
      )}
      {textures.elevatorFrame && (
        <pixiSprite texture={textures.elevatorFrame}
          x={P.elevator.x} y={P.elevator.y} anchor={0.5} scale={ELEV_FRAME_SCALE} />
      )}
      {textures.elevatorDoor && (
        <pixiContainer x={P.elevator.x} y={P.elevator.y + 9}>
          <pixiSprite texture={textures.elevatorDoor}
            anchor={{ x: 0, y: 0.5 }} x={-ELEV_DOOR_OPEN_X * snorlax.doorOpen} scale={{ x: 0.09, y: 0.183 }} />
          <pixiSprite texture={textures.elevatorDoor}
            anchor={{ x: 1, y: 0.5 }} x={ELEV_DOOR_OPEN_X * snorlax.doorOpen} scale={{ x: 0.09, y: 0.183 }} />
          <pixiGraphics draw={(g) => { g.clear(); g.rect(-5, -76, 10, 8); g.fill({ color: 0xef4444 }) }} />
        </pixiContainer>
      )}
      {textures.trashCan && (
        <>
          <pixiSprite texture={textures.trashCan}
            x={elevLandmarks.t1x} y={elevLandmarks.trashY} anchor={{ x: 0.5, y: 1 }} scale={elevLandmarks.trashScale} />
          <pixiSprite texture={textures.trashCan}
            x={elevLandmarks.t2x} y={elevLandmarks.trashY} anchor={{ x: 0.5, y: 1 }} scale={elevLandmarks.trashScale} />
        </>
      )}

      {/* Snorlax patrol NPC */}
      {(() => {
        const snorlaxUseFrontLayer =
          snorlax.phase === 'opening-out' ||
          snorlax.phase === 'exiting' ||
          snorlax.phase === 'closing-out'
        const snorlaxZIndex = snorlaxUseFrontLayer ? SNORLAX_Z_INDEX_FRONT : SNORLAX_Z_INDEX_BACK
        const frames = snorlaxTextures[snorlax.dir]
        const tex = frames.length > 0 ? frames[snorlax.frameIndex % frames.length] : null
        if (tex) {
          return (
            <pixiSprite
              texture={tex}
              x={snorlax.x}
              y={snorlax.y}
              anchor={{ x: 0.5, y: 1 }}
              scale={SNORLAX_SCALE}
              zIndex={snorlaxZIndex}
            />
          )
        }
        // Fallback marker if frames are missing.
        return (
          <pixiGraphics
            draw={(g) => {
              g.clear()
              g.roundRect(snorlax.x - 10, snorlax.y - 22, 20, 22, 6)
              g.fill({ color: 0x334155 })
              g.stroke({ color: 0x94a3b8, width: 1 })
            }}
            zIndex={snorlaxZIndex}
          />
        )
      })()}

      {/*
        === DESK AREA render order ===
        Wrapped in a container with zIndex so Snorlax can reliably go behind.
      */}
      <pixiContainer zIndex={DESK_AREA_Z_INDEX}>

      {/* 1. CHAIRS */}
      {agents.map((a, i) => {
        const d = desks[i]; if (!d) return null
        return (
          <pixiContainer key={`ch-${a.id}`} x={d.x} y={d.y}>
            {textures.chair ? (
              <pixiSprite texture={textures.chair} anchor={0.5} x={5} y={30} scale={{ x: 0.17, y: 0.25 }} />
            ) : (
              <pixiGraphics draw={(g) => { g.clear(); g.circle(5, 30, 16); g.fill({ color: 0x2d3748, alpha: 0.6 }) }} />
            )}
          </pixiContainer>
        )
      })}

      {/* 2. AGENT BODIES */}
      {agents.map((a, i) => {
        const d = desks[i]; if (!d) return null
        return <AgentBody key={`bd-${a.id}`} agent={a} x={d.x} y={agentY(i)} />
      })}

      {/* 3. SIDE CABINET + PLANT (under desk when overlapping) */}
      {agents.map((a, i) => {
        const d = desks[i]
        if (!d || !textures.cabinet) return null
        return (
          <pixiContainer
            key={`cabinet-${a.id}`}
            x={d.x + sideCabinetOffsets.cabinetFromDeskX}
            y={d.y + sideCabinetOffsets.cabinetFromDeskY}
          >
            <pixiSprite texture={textures.cabinet} anchor={{ x: 0.5, y: 1 }} scale={SIDE_CABINET_SCALE} />
            {textures.plant && (
              <pixiSprite
                texture={textures.plant}
                anchor={{ x: 0.5, y: 1 }}
                x={0}
                y={PLANT_ABOVE_CABINET_Y}
                scale={PLANT_ON_CABINET_SCALE}
              />
            )}
          </pixiContainer>
        )
      })}

      {/* 3. DESK SURFACE + KEYBOARD */}
      {agents.map((a, i) => {
        const d = desks[i]; if (!d) return null
        return (
          <pixiContainer key={`dk-${a.id}`} x={d.x} y={d.y}>
            {textures.desk ? (
              <pixiSprite texture={textures.desk} anchor={{ x: 0.5, y: 0 }} y={DESK_SURFACE_Y} scale={DESK_SURFACE_SCALE} />
            ) : (
              <pixiGraphics draw={(g) => { g.clear(); g.roundRect(-44, 30, 88, 44, 3); g.fill({ color: 0x3d2b1f }); g.stroke({ color: 0x5a3e28, width: 1 }) }} />
            )}
            {textures.keyboard && (
              <pixiSprite texture={textures.keyboard} anchor={0.5} y={42} scale={0.04} />
            )}
          </pixiContainer>
        )
      })}

      {/* 4. AGENT ARMS */}
      {agents.map((a, i) => {
        const d = desks[i]; if (!d) return null
        return <AgentArms key={`ar-${a.id}`} agent={a} x={d.x} y={agentY(i)} />
      })}

      {/* 5. HEADSETS (running + idle agents) */}
      {agents.map((a, i) => {
        const d = desks[i]; if (!d) return null
        const s = a.office.spriteState
        const show = s !== 'sleeping' && s !== 'packing' && s !== 'terminated'
        if (!show || !textures.headset) return null
        return (
          <pixiSprite key={`hs-${a.id}`} texture={textures.headset}
            x={d.x} y={agentY(i) - 62} anchor={0.5} scale={{ x: 0.66825, y: 0.675 }} />
        )
      })}

      {/* 6. MONITOR + ACCESSORIES */}
      {agents.map((a, i) => {
        const d = desks[i]; if (!d) return null
        const item = DESK_ITEMS[i % DESK_ITEMS.length]
        const decorList = deskDecorTextures.get(i)
        return (
          <pixiContainer key={`dt-${a.id}`} x={d.x} y={d.y}>
            {textures.monitor ? (
              <pixiSprite texture={textures.monitor} anchor={0.5}
                x={-45} y={27} scale={0.08}
                tint={a.office.spriteState === 'typing' || a.office.spriteState === 'running' ? 0xaaccff : 0xffffff} />
            ) : (
              <pixiGraphics draw={(g) => {
                g.clear(); g.roundRect(-61, 16, 32, 22, 2)
                g.fill({ color: a.office.spriteState === 'typing' || a.office.spriteState === 'running' ? 0x3b82f6 : 0x1a1a2e })
                g.stroke({ color: 0x4a5568, width: 1 })
              }} />
            )}
            {decorList && decorList.length > 0
              ? decorList.map((layer, j) => (
                  <pixiSprite
                    key={`dc-${a.id}-${j}`}
                    texture={layer.texture}
                    anchor={0.5}
                    x={DESK_DECOR_X_BASE + j * DESK_DECOR_X_STEP}
                    y={DESK_DECOR_Y}
                    scale={deskDecorScaleForLayer(i, layer.url, layer.texture)}
                    tint={0xffffff}
                  />
                ))
              : item && textures[item.key] && (
                  <pixiSprite texture={textures[item.key]!} anchor={0.5}
                    x={item.x + DESK_DECOR_X_SHIFT} y={item.y} scale={item.scale} tint={0xffffff} />
                )}
            {(!decorList || decorList.length === 0) && i % 3 === 0 && textures.phone && (
              <pixiSprite texture={textures.phone} anchor={0.5} x={50} y={20} scale={0.03} />
            )}
          </pixiContainer>
        )
      })}

      {/* 7. LABELS + BUBBLES */}
      {agents.map((a, i) => {
        const d = desks[i]; if (!d) return null
        const ay = agentY(i)
        return (
          <pixiContainer key={`lb-${a.id}`} x={d.x} y={ay}>
            <pixiText text={ROLE_EMOJIS[a.role] ?? ''} anchor={0.5} x={0} y={-84}
              style={new TextStyle({ fontSize: 14 })} />
            <pixiText text={a.name} anchor={{ x: 0.5, y: 0 }} x={0} y={6}
              style={new TextStyle({
                fontFamily: 'monospace', fontSize: 11, fill: 0xffffff,
                fontWeight: 'bold', stroke: { color: 0x000000, width: 3 }
              })} />
            {a.office.lastBubble && (
              <pixiContainer>
                <pixiGraphics draw={(g) => {
                  g.clear()
                  const bw = Math.min(a.office.lastBubble!.length * 6 + 20, 140)
                  g.roundRect(-bw / 2 + 2, -100, bw, 24, 10); g.fill({ color: 0x000000, alpha: 0.15 })
                  g.roundRect(-bw / 2, -102, bw, 24, 10); g.fill({ color: 0xffffff })
                  g.stroke({ color: 0x000000, width: 1.5, alpha: 0.1 })
                  g.moveTo(-6, -78); g.lineTo(0, -70); g.lineTo(6, -78); g.fill({ color: 0xffffff })
                }} />
                <pixiText text={a.office.lastBubble.slice(0, 22)} anchor={0.5} x={0} y={-90}
                  style={new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: 0x333333 })} />
              </pixiContainer>
            )}
          </pixiContainer>
        )
      })}

      </pixiContainer>{/* end DESK AREA wrapper */}

    </pixiContainer>
  )
}
