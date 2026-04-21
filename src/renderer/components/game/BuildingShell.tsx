import { useCallback, useMemo } from 'react'
import { TextStyle } from 'pixi.js'
import type { Floor } from '../../stores/officeStore'
import type { OfficeTextures } from '../../hooks/useOfficeTextures'

interface BuildingShellProps {
  floors: Floor[]
  floorHeight: number
  canvasWidth: number
  textures: OfficeTextures
}

const FLOOR_TILE_SIZE = 100
const WALL_HEIGHT = 40

const FLOOR_TYPE_COLORS: Record<string, number> = {
  executive: 0x1a1833,
  project: 0x1a2040,
  general: 0x1e2746,
  lobby: 0x1e2233,
  'server-room': 0x141824
}

const FLOOR_TYPE_ICONS: Record<string, string> = {
  executive: '\u{1F451}',   // crown
  project: '\u{1F4C1}',     // folder
  general: '\u{1F3E2}',     // office
  lobby: '\u{1F6CE}',       // bellhop bell
  'server-room': '\u{1F5A5}' // server
}

export function BuildingShell({
  floors,
  floorHeight,
  canvasWidth,
  textures
}: BuildingShellProps): JSX.Element {
  const floorTiles = useMemo(() => {
    const tex = textures.floorTile
    const scale =
      tex && tex.width > 0 && tex.height > 0
        ? { x: FLOOR_TILE_SIZE / tex.width, y: FLOOR_TILE_SIZE / tex.height }
        : { x: 1, y: 1 }
    const tiles: Array<{ x: number; y: number; scale: { x: number; y: number } }> = []

    for (let fi = 0; fi < floors.length; fi++) {
      const floorY = fi * floorHeight + WALL_HEIGHT
      const tileArea = floorHeight - WALL_HEIGHT

      for (let ty = floorY; ty < floorY + tileArea; ty += FLOOR_TILE_SIZE) {
        for (let tx = 0; tx < canvasWidth; tx += FLOOR_TILE_SIZE) {
          tiles.push({ x: tx, y: ty, scale })
        }
      }
    }

    return tiles
  }, [floors.length, floorHeight, canvasWidth, textures.floorTile])

  // Wall and separator rendering
  const drawWalls = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear()

      for (let i = 0; i < floors.length; i++) {
        const y = i * floorHeight
        const floor = floors[i]
        const bgColor = FLOOR_TYPE_COLORS[floor.type] ?? 0x1e2746

        // Wall section (top strip of each floor)
        g.rect(0, y, canvasWidth, WALL_HEIGHT)
        g.fill({ color: bgColor })

        // Wall trim line
        g.rect(0, y + WALL_HEIGHT - 1, canvasWidth, 1)
        g.fill({ color: 0x3a4a6c, alpha: 0.6 })

        // Floor separator at bottom
        g.rect(0, y + floorHeight - 2, canvasWidth, 2)
        g.fill({ color: 0x2a3a5c })

        // Floor label background
        g.roundRect(8, y + 8, 160, 24, 4)
        g.fill({ color: 0x2a3a5c, alpha: 0.8 })
      }
    },
    [floors, floorHeight, canvasWidth]
  )

  return (
    <pixiContainer>
      {/* Checkered floor tiles (if texture loaded) */}
      {textures.floorTile &&
        floorTiles.map((tile, i) => (
          <pixiSprite
            key={i}
            texture={textures.floorTile!}
            x={tile.x}
            y={tile.y}
            anchor={{ x: 0, y: 0 }}
            scale={tile.scale}
            tint={0xffffff}
            alpha={0.22}
          />
        ))}

      {/* Walls and separators */}
      <pixiGraphics draw={drawWalls} />

      {/* Floor labels */}
      {floors.map((floor, i) => (
        <pixiContainer key={floor.id}>
          <pixiText
            text={`${FLOOR_TYPE_ICONS[floor.type] ?? ''} ${floor.label}`}
            x={16}
            y={i * floorHeight + 14}
            style={
              new TextStyle({
                fontFamily: 'monospace',
                fontSize: 11,
                fill: 0x8892a8,
                fontWeight: 'bold'
              })
            }
          />
          <pixiText
            text={`${floor.agents.length} agent${floor.agents.length !== 1 ? 's' : ''}`}
            x={16}
            y={i * floorHeight + 28}
            style={
              new TextStyle({
                fontFamily: 'monospace',
                fontSize: 8,
                fill: 0x5a6478
              })
            }
          />
        </pixiContainer>
      ))}

      {/* Background fixtures per floor */}
      {floors.map((floor, i) => {
        const y = i * floorHeight
        return (
          <pixiContainer key={`fixtures-${floor.id}`}>
            {/* Water cooler on project/general floors */}
            {(floor.type === 'project' || floor.type === 'general') &&
              textures.waterCooler && (
                <pixiSprite
                  texture={textures.waterCooler}
                  x={canvasWidth - 100}
                  y={y + WALL_HEIGHT + 20}
                  anchor={0.5}
                  scale={0.17}
                />
              )}

            {/* Coffee machine on project/general floors */}
            {(floor.type === 'project' || floor.type === 'general') &&
              textures.coffeeMachine && (
                <pixiSprite
                  texture={textures.coffeeMachine}
                  x={canvasWidth - 50}
                  y={y + WALL_HEIGHT + 15}
                  anchor={0.5}
                  scale={0.17}
                />
              )}

            {/* Plant on lobby */}
            {floor.type === 'lobby' && textures.plant && (
              <pixiSprite
                texture={textures.plant}
                x={canvasWidth - 80}
                y={y + floorHeight - 30}
                anchor={{ x: 0.5, y: 1 }}
                scale={0.12}
              />
            )}

          </pixiContainer>
        )
      })}
    </pixiContainer>
  )
}
