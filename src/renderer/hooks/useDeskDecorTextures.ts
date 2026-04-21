import { useEffect, useState } from 'react'
import { Assets, Texture } from 'pixi.js'
import { getDeskDecorUrlsForSlot } from '../assets/deskDecorUrls'

export type DeskDecorLayer = { texture: Texture; url: string }

export type DeskDecorTexturesBySlot = ReadonlyMap<number, readonly DeskDecorLayer[]>

export function useDeskDecorTextures(agentCount: number): DeskDecorTexturesBySlot {
  const [map, setMap] = useState<DeskDecorTexturesBySlot>(new Map())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next = new Map<number, DeskDecorLayer[]>()
      for (let slot = 0; slot < agentCount; slot++) {
        const urls = getDeskDecorUrlsForSlot(slot)
        if (urls.length === 0) continue
        const layers: DeskDecorLayer[] = []
        for (const url of urls) {
          try {
            const texture = await Assets.load<Texture>(url)
            layers.push({ texture, url })
          } catch (err) {
            console.warn('[paperclip-office] desk decor load failed', slot, url, err)
          }
        }
        if (layers.length > 0) next.set(slot, layers)
      }
      if (!cancelled) setMap(next)
    })()
    return () => {
      cancelled = true
    }
  }, [agentCount])

  return map
}
