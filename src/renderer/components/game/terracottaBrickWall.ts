import type { Graphics } from 'pixi.js'

const MORTAR = 0xb87a5c
const BRICKS = [0xc85a3e, 0xb85234, 0xcf6448, 0xbc4d32, 0xd06a44]

export function fillTerracottaBrickWall(
  g: Graphics,
  x0: number,
  y0: number,
  w: number,
  h: number,
  brickW: number,
  brickH: number,
  mortarPx: number
): void {
  g.rect(x0, y0, w, h)
  g.fill({ color: MORTAR })
  const m = mortarPx
  let row = 0
  for (let y = y0; y < y0 + h - 1; y += brickH + m) {
    const bh = Math.min(brickH, y0 + h - y - m)
    if (bh < 3) break
    const offset = row % 2 === 0 ? 0 : (brickW + m) * 0.5
    for (let x = x0 - brickW; x < x0 + w + brickW; x += brickW + m) {
      const bx0 = x + offset + m * 0.5
      const bx1 = Math.min(x0 + w - m * 0.5, bx0 + brickW)
      const bx = Math.max(x0 + m * 0.5, bx0)
      const bw = bx1 - bx
      if (bw < 4) continue
      const c = BRICKS[(Math.floor(bx / 19) + Math.floor(y / 11) + row) % BRICKS.length] ?? BRICKS[0]
      g.roundRect(bx, y + m * 0.5, bw, bh, 2)
      g.fill({ color: c })
      g.stroke({ color: 0x8f3d28, width: 0.5, alpha: 0.35 })
    }
    row++
  }
}
