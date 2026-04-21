import { useRef, useState, useEffect, useMemo } from 'react'
import { Application, extend } from '@pixi/react'
import { Container, Graphics, Text, Sprite, Assets, Texture } from 'pixi.js'
import type { AgentWithOffice, Floor } from '../../stores/officeStore'
import type { Project } from '@shared/paperclip-types'
import type { OfficeTextures } from '../../hooks/useOfficeTextures'
import { OFFICE_TEXTURE_URLS, type OfficeTextureId } from '../../assets/officeSpriteUrls'
import { useDeskDecorTextures } from '../../hooks/useDeskDecorTextures'
import { OfficeRoom } from './OfficeRoom'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './canvasDimensions'

extend({ Container, Graphics, Text, Sprite })

export { CANVAS_WIDTH, CANVAS_HEIGHT }

interface OfficeCanvasProps {
  agents: Map<string, AgentWithOffice>
  floors: Floor[]
  projects: Project[]
}

const BG_COLOR = 0x6a6866

function createEmptyTextures(): OfficeTextures {
  const t = {} as OfficeTextures
  for (const key of Object.keys(OFFICE_TEXTURE_URLS)) {
    t[key as OfficeTextureId] = null
  }
  return t
}

function OfficeScene({
  agents,
  floors
}: {
  agents: Map<string, AgentWithOffice>
  floors: Floor[]
}): JSX.Element {
  const [textures, setTextures] = useState<OfficeTextures>(createEmptyTextures)
  const [loaded, setLoaded] = useState(false)

  const visibleAgents = useMemo(() => {
    const list: AgentWithOffice[] = []
    for (const floor of floors) {
      for (const agentId of floor.agents) {
        const agent = agents.get(agentId)
        if (agent && agent.status !== 'terminated') {
          list.push(agent)
        }
      }
    }
    return list
  }, [agents, floors])

  const deskDecorTextures = useDeskDecorTextures(visibleAgents.length)

  useEffect(() => {
    let cancelled = false
    async function loadAll(): Promise<void> {
      const result = createEmptyTextures()
      await Promise.all(
        (Object.entries(OFFICE_TEXTURE_URLS) as [OfficeTextureId, string][]).map(
          async ([key, url]) => {
            try {
              result[key] = await Assets.load<Texture>(url)
            } catch (err) {
              console.warn('[paperclip-office] sprite load failed', key, url, err)
            }
          }
        )
      )
      if (!cancelled) { setTextures(result); setLoaded(true) }
    }
    loadAll()
    return () => { cancelled = true }
  }, [])

  if (!loaded) {
    return (
      <pixiContainer>
        <pixiGraphics draw={(g) => { g.clear(); g.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); g.fill({ color: BG_COLOR }) }} />
        <pixiText
          text="Loading office..."
          x={CANVAS_WIDTH / 2} y={CANVAS_HEIGHT / 2}
          anchor={0.5}
          style={{ fontFamily: 'monospace', fontSize: 16, fill: 0x8892a8 }}
        />
      </pixiContainer>
    )
  }

  return (
    <OfficeRoom
      agents={visibleAgents}
      textures={textures}
      deskDecorTextures={deskDecorTextures}
    />
  )
}

export function OfficeCanvas({ agents, floors }: OfficeCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Wait for container to be mounted and have dimensions before creating the Application
    if (containerRef.current) setReady(true)
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {ready && containerRef.current && (
        <Application
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          background={BG_COLOR}
          antialias={false}
          resolution={1}
          autoDensity
          resizeTo={containerRef.current}
        >
          <OfficeScene agents={agents} floors={floors} />
        </Application>
      )}
    </div>
  )
}
