import { useState, useEffect } from 'react'
import { Assets, Texture } from 'pixi.js'
import { OFFICE_TEXTURE_URLS, type OfficeTextureId } from '../assets/officeSpriteUrls'

export type OfficeTextures = { [K in OfficeTextureId]: Texture | null }

function createEmptyTextures(): OfficeTextures {
  const textures = {} as OfficeTextures
  for (const key of Object.keys(OFFICE_TEXTURE_URLS)) {
    textures[key as OfficeTextureId] = null
  }
  return textures
}

export function useOfficeTextures(): { textures: OfficeTextures; loaded: boolean } {
  const [textures, setTextures] = useState<OfficeTextures>(createEmptyTextures)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadAll(): Promise<void> {
      const entries = Object.entries(OFFICE_TEXTURE_URLS) as [OfficeTextureId, string][]
      const result = createEmptyTextures()

      const promises = entries.map(async ([key, url]) => {
        try {
          const texture = await Assets.load<Texture>(url)
          result[key] = texture
        } catch (err) {
          console.warn('[paperclip-office] sprite load failed', key, url, err)
        }
      })

      await Promise.all(promises)

      if (!cancelled) {
        setTextures(result)
        setLoaded(true)
      }
    }

    loadAll()

    return () => {
      cancelled = true
    }
  }, [])

  return { textures, loaded }
}
