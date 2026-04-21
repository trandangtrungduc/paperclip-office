import { useCallback, useMemo } from 'react'
import { TextStyle } from 'pixi.js'
import type { AgentWithOffice, Floor } from '../../stores/officeStore'
import type { OfficeTextures } from '../../hooks/useOfficeTextures'
import { AgentBody } from './AgentBody'
import { AgentArms } from './AgentArms'
import {
  DESK_SURFACE_SCALE,
  DESK_SURFACE_Y,
  getSideCabinetFromDeskOffsets,
  SIDE_CABINET_SCALE
} from './deskSideCabinetLayout'

interface FloorRendererProps {
  floor: Floor
  agents: Map<string, AgentWithOffice>
  floorHeight: number
  floorIndex: number
  canvasWidth: number
  textures: OfficeTextures
}

// Desk grid — matching claude-office layout
const DESK_SPACING_X = 256
const DESK_SPACING_Y = 192
const DESK_START_X = 256
const DESK_START_Y = 60
const ROW_SIZE = 4

const PLANT_ABOVE_CABINET_Y = -94
const PLANT_ON_CABINET_SCALE = 0.105

const ACCESSORY_TINTS = [
  0xffffff, 0x87ceeb, 0x98fb98, 0xdda0dd,
  0xf0e68c, 0xffa07a, 0xb0c4de, 0xd2b48c
]

const DESK_ACCESSORIES: Array<keyof OfficeTextures> = [
  'coffeeMug', 'stapler', 'deskLamp', 'penHolder',
  'magic5Ball', 'rubiksCube', 'gengar', 'thermos'
]

export function FloorRenderer({
  floor,
  agents,
  floorHeight,
  floorIndex,
  canvasWidth,
  textures
}: FloorRendererProps): JSX.Element {
  const floorY = floorIndex * floorHeight

  const floorAgents = useMemo(
    () =>
      floor.agents
        .map((id) => agents.get(id))
        .filter((a): a is AgentWithOffice => a != null && a.status !== 'terminated'),
    [floor.agents, agents]
  )

  // Desk positions (center of each desk)
  const deskPositions = useMemo(
    () =>
      floorAgents.map((_, i) => ({
        x: DESK_START_X + (i % ROW_SIZE) * DESK_SPACING_X,
        y: floorY + DESK_START_Y + Math.floor(i / ROW_SIZE) * DESK_SPACING_Y
      })),
    [floorAgents.length, floorY]
  )

  const sideCabinetOffsets = useMemo(
    () => getSideCabinetFromDeskOffsets(textures.desk ?? undefined, textures.cabinet ?? undefined),
    [textures.desk, textures.cabinet]
  )

  // Agent Y position — sits at desk with feet behind the desk surface
  // Desk surface is at desk.y + 30, agent feet at desk.y + 40
  // This means the desk covers the agent's lower ~40px of body
  const agentY = (deskIdx: number): number => {
    const pos = deskPositions[deskIdx]
    return pos ? pos.y + 40 : 0
  }

  // Kanban board
  const drawKanban = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear()
      if (floor.type !== 'project' && floor.type !== 'general') return
      const bx = canvasWidth - 380
      const by = floorY + 4
      g.roundRect(bx, by, 200, 32, 3)
      g.fill({ color: 0xf5f0e8, alpha: 0.9 })
      g.stroke({ color: 0xd4c5a9, width: 1 })
      for (let c = 1; c < 4; c++) {
        g.moveTo(bx + c * 50, by + 12)
        g.lineTo(bx + c * 50, by + 30)
        g.stroke({ color: 0xd4c5a9, width: 0.5 })
      }
    },
    [floor.type, floorY, canvasWidth]
  )

  return (
    <pixiContainer>
      {/* Kanban */}
      <pixiGraphics draw={drawKanban} />
      {(floor.type === 'project' || floor.type === 'general') &&
        ['TODO', 'WIP', 'REV', 'DONE'].map((label, i) => (
          <pixiText
            key={label}
            text={label}
            x={canvasWidth - 380 + i * 50 + 8}
            y={floorY + 7}
            style={new TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: 0x8b7355, fontWeight: 'bold' })}
          />
        ))}

      {/*
        1. Chairs
        2. Agent bodies
        3. Side cabinet + plant (under desk when overlapping)
        4. Desk + Keyboard
        5. Agent arms
        6. Labels + bubbles
        7. Monitor + accessories
      */}

      {/* === 1. CHAIRS (behind everything) === */}
      {floorAgents.map((agent, i) => {
        const pos = deskPositions[i]
        if (!pos) return null
        return (
          <pixiContainer key={`chair-${agent.id}`} x={pos.x} y={pos.y}>
            {textures.chair ? (
              <pixiSprite texture={textures.chair} anchor={0.5} x={5} y={20} scale={0.1386} />
            ) : (
              <pixiGraphics draw={(g) => { g.clear(); g.circle(5, 20, 14); g.fill({ color: 0x2d3748, alpha: 0.6 }) }} />
            )}
          </pixiContainer>
        )
      })}

      {/* === 2. AGENT BODIES (behind desk surface) === */}
      {floorAgents.map((agent, i) => {
        const pos = deskPositions[i]
        if (!pos) return null
        return (
          <AgentBody key={`body-${agent.id}`} agent={agent} x={pos.x} y={agentY(i)} />
        )
      })}

      {/* === 3. SIDE CABINET + PLANT (under desk when overlapping) === */}
      {floorAgents.map((agent, i) => {
        const pos = deskPositions[i]
        if (!pos || !textures.cabinet) return null
        return (
          <pixiContainer
            key={`cabinet-${agent.id}`}
            x={pos.x + sideCabinetOffsets.cabinetFromDeskX}
            y={pos.y + sideCabinetOffsets.cabinetFromDeskY}
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

      {/* === 4. DESK SURFACE + KEYBOARD (covers agent lower body) === */}
      {floorAgents.map((agent, i) => {
        const pos = deskPositions[i]
        if (!pos) return null
        return (
          <pixiContainer key={`desk-${agent.id}`} x={pos.x} y={pos.y}>
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

      {/* === 5. AGENT ARMS (on top of desk, reaching keyboard) === */}
      {floorAgents.map((agent, i) => {
        const pos = deskPositions[i]
        if (!pos) return null
        return (
          <AgentArms key={`arms-${agent.id}`} agent={agent} x={pos.x} y={agentY(i)} />
        )
      })}

      {/* === 6. AGENT LABELS + BUBBLES (on top of arms) === */}
      {floorAgents.map((agent, i) => {
        const pos = deskPositions[i]
        if (!pos) return null
        const ay = agentY(i)
        return (
          <pixiContainer key={`label-${agent.id}`} x={pos.x} y={ay}>
            {/* Name below agent */}
            <pixiText
              text={agent.name}
              anchor={{ x: 0.5, y: 0 }}
              x={0}
              y={6}
              style={new TextStyle({
                fontFamily: 'monospace',
                fontSize: 11,
                fill: 0xffffff,
                fontWeight: 'bold',
                align: 'center',
                stroke: { color: 0x000000, width: 3 }
              })}
            />
            {/* Role emoji above head */}
            <pixiText
              text={ROLE_EMOJIS[agent.role] ?? ''}
              anchor={0.5}
              x={0}
              y={-84}
              style={new TextStyle({ fontSize: 14 })}
            />
            {/* Bubble */}
            {agent.office.lastBubble && (
              <pixiContainer>
                <pixiGraphics draw={(g) => {
                  g.clear()
                  const text = agent.office.lastBubble!
                  const bw = Math.min(text.length * 6 + 20, 140)
                  g.roundRect(-bw / 2 + 2, -100, bw, 24, 10)
                  g.fill({ color: 0x000000, alpha: 0.15 })
                  g.roundRect(-bw / 2, -102, bw, 24, 10)
                  g.fill({ color: 0xffffff })
                  g.stroke({ color: 0x000000, width: 1.5, alpha: 0.1 })
                  g.moveTo(-6, -78)
                  g.lineTo(0, -70)
                  g.lineTo(6, -78)
                  g.fill({ color: 0xffffff })
                }} />
                <pixiText
                  text={agent.office.lastBubble.slice(0, 22)}
                  anchor={0.5}
                  x={0}
                  y={-90}
                  style={new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: 0x333333 })}
                />
              </pixiContainer>
            )}
          </pixiContainer>
        )
      })}

      {/* === 7. MONITOR + ACCESSORIES (in front of everything at desk) === */}
      {floorAgents.map((agent, i) => {
        const pos = deskPositions[i]
        if (!pos) return null
        const tint = ACCESSORY_TINTS[i % ACCESSORY_TINTS.length]
        const accessoryKey = DESK_ACCESSORIES[i % DESK_ACCESSORIES.length]
        const accessoryTexture = textures[accessoryKey]

        return (
          <pixiContainer key={`desk-top-${agent.id}`} x={pos.x} y={pos.y}>
            {textures.monitor ? (
              <pixiSprite
                texture={textures.monitor}
                anchor={0.5}
                x={-45}
                y={27}
                scale={0.08}
                tint={agent.office.spriteState === 'typing' ? 0xaaccff : 0xffffff}
              />
            ) : (
              <pixiGraphics draw={(g) => {
                g.clear()
                g.roundRect(-61, 16, 32, 22, 2)
                g.fill({ color: agent.office.spriteState === 'typing' ? 0x3b82f6 : 0x1a1a2e })
                g.stroke({ color: 0x4a5568, width: 1 })
              }} />
            )}
            {accessoryTexture && (
              <pixiSprite
                texture={accessoryTexture}
                anchor={0.5}
                x={50}
                y={35}
                scale={
                  accessoryKey === 'deskLamp'
                    ? 0.35
                    : accessoryKey === 'gengar'
                      ? 0.055
                      : accessoryKey === 'thermos'
                        ? 0.045
                        : 0.025
                }
                tint={tint}
              />
            )}
            {i % 3 === 0 && textures.phone && (
              <pixiSprite texture={textures.phone} anchor={0.5} x={50} y={20} scale={0.03} />
            )}
          </pixiContainer>
        )
      })}

    </pixiContainer>
  )
}

const ROLE_EMOJIS: Record<string, string> = {
  ceo: '\u{1F451}',
  cto: '\u{1F4BB}',
  cmo: '\u{1F4E3}',
  cfo: '\u{1F4B0}',
  engineer: '\u{2699}',
  designer: '\u{1F3A8}',
  pm: '\u{1F4CB}',
  qa: '\u{1F50D}',
  devops: '\u{1F527}',
  researcher: '\u{1F4DA}',
  general: '\u{1F464}'
}
