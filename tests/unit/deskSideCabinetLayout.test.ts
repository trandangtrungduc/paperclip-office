import { describe, it, expect } from 'vitest'
import {
  getSideCabinetFromDeskOffsets,
  DESK_SURFACE_Y,
  DESK_SURFACE_SCALE,
  SIDE_CABINET_SCALE
} from '../../src/renderer/components/game/deskSideCabinetLayout'

describe('getSideCabinetFromDeskOffsets', () => {
  it('calculates offsets with provided dimensions', () => {
    const desk = { width: 512, height: 256 }
    const cab = { width: 400, height: 300 }
    const result = getSideCabinetFromDeskOffsets(desk, cab)

    const dw = 512 * DESK_SURFACE_SCALE
    const dh = 256 * DESK_SURFACE_SCALE
    const cw = 400 * SIDE_CABINET_SCALE
    const gap = -13

    expect(result.cabinetFromDeskX).toBeCloseTo(-(dw * 0.5 + cw * 0.5 + gap))
    expect(result.cabinetFromDeskY).toBeCloseTo(DESK_SURFACE_Y + dh - 3)
  })

  it('uses fallback desk dimensions when desk is null', () => {
    const cab = { width: 400, height: 300 }
    const result = getSideCabinetFromDeskOffsets(null, cab)

    const dw = 512 * DESK_SURFACE_SCALE
    const dh = 256 * DESK_SURFACE_SCALE
    const cw = 400 * SIDE_CABINET_SCALE

    expect(result.cabinetFromDeskX).toBeCloseTo(-(dw * 0.5 + cw * 0.5 + (-13)))
    expect(result.cabinetFromDeskY).toBeCloseTo(DESK_SURFACE_Y + dh - 3)
  })

  it('uses fallback cabinet dimensions when cab is undefined', () => {
    const desk = { width: 512, height: 256 }
    const result = getSideCabinetFromDeskOffsets(desk, undefined)

    const cw = 400 * SIDE_CABINET_SCALE
    const dw = 512 * DESK_SURFACE_SCALE

    expect(result.cabinetFromDeskX).toBeCloseTo(-(dw * 0.5 + cw * 0.5 + (-13)))
  })

  it('uses fallbacks when both are null', () => {
    const result = getSideCabinetFromDeskOffsets(null, null)

    const dw = 512 * DESK_SURFACE_SCALE
    const dh = 256 * DESK_SURFACE_SCALE
    const cw = 400 * SIDE_CABINET_SCALE

    expect(result.cabinetFromDeskX).toBeCloseTo(-(dw * 0.5 + cw * 0.5 + (-13)))
    expect(result.cabinetFromDeskY).toBeCloseTo(DESK_SURFACE_Y + dh - 3)
  })

  it('uses fallback for zero-width desk', () => {
    const result = getSideCabinetFromDeskOffsets({ width: 0, height: 0 }, null)

    const dw = 512 * DESK_SURFACE_SCALE
    const dh = 256 * DESK_SURFACE_SCALE
    const cw = 400 * SIDE_CABINET_SCALE

    expect(result.cabinetFromDeskX).toBeCloseTo(-(dw * 0.5 + cw * 0.5 + (-13)))
    expect(result.cabinetFromDeskY).toBeCloseTo(DESK_SURFACE_Y + dh - 3)
  })

  it('uses fallback for zero-width cabinet', () => {
    const result = getSideCabinetFromDeskOffsets(null, { width: 0, height: 0 })

    const cw = 400 * SIDE_CABINET_SCALE
    const dw = 512 * DESK_SURFACE_SCALE

    expect(result.cabinetFromDeskX).toBeCloseTo(-(dw * 0.5 + cw * 0.5 + (-13)))
  })

  it('returns numeric values', () => {
    const result = getSideCabinetFromDeskOffsets(null, null)
    expect(typeof result.cabinetFromDeskX).toBe('number')
    expect(typeof result.cabinetFromDeskY).toBe('number')
    expect(Number.isFinite(result.cabinetFromDeskX)).toBe(true)
    expect(Number.isFinite(result.cabinetFromDeskY)).toBe(true)
  })
})

describe('exported constants', () => {
  it('DESK_SURFACE_Y is 30', () => {
    expect(DESK_SURFACE_Y).toBe(30)
  })

  it('DESK_SURFACE_SCALE is 0.105', () => {
    expect(DESK_SURFACE_SCALE).toBe(0.105)
  })

  it('SIDE_CABINET_SCALE is 0.11', () => {
    expect(SIDE_CABINET_SCALE).toBe(0.11)
  })
})
