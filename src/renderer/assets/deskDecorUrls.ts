/// <reference types="vite/client" />

const decorPng = import.meta.glob('./sprites/decor/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>

function slotFromDecorPath(fullPath: string): number | null {
  const n = fullPath.replace(/\\/g, '/')
  const inFolder = n.match(/\/decor\/(\d+)\/.+\.png$/i)
  if (inFolder) {
    const s = parseInt(inFolder[1], 10)
    return Number.isNaN(s) ? null : s
  }
  const prefixName = n.match(/\/decor\/(\d+)-[^/]+\.png$/i)
  if (prefixName) {
    const s = parseInt(prefixName[1], 10)
    return Number.isNaN(s) ? null : s
  }
  const flat = n.match(/\/decor\/(\d+)\.png$/i)
  if (flat) {
    const s = parseInt(flat[1], 10)
    return Number.isNaN(s) ? null : s
  }
  return null
}

function buildUrlsBySlot(): Map<number, string[]> {
  const m = new Map<number, string[]>()
  const paths = Object.keys(decorPng).sort((a, b) => a.localeCompare(b))
  for (const fullPath of paths) {
    const slot = slotFromDecorPath(fullPath)
    if (slot === null) continue
    const url = decorPng[fullPath]
    if (!url) continue
    if (!m.has(slot)) m.set(slot, [])
    m.get(slot)!.push(url)
  }
  return m
}

const urlsBySlot = buildUrlsBySlot()

export function getDeskDecorUrlsForSlot(slot: number): readonly string[] {
  return urlsBySlot.get(slot) ?? []
}
