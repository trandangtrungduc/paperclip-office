export const DESK_SURFACE_Y = 30
export const DESK_SURFACE_SCALE = 0.105
export const SIDE_CABINET_SCALE = 0.11
const CABINET_FEET_RAISE_PX = 3

export function getSideCabinetFromDeskOffsets(
  desk: { width: number; height: number } | null | undefined,
  cab: { width: number; height: number } | null | undefined
): { cabinetFromDeskX: number; cabinetFromDeskY: number } {
  const dw = (desk && desk.width > 0 ? desk.width : 512) * DESK_SURFACE_SCALE
  const dh = (desk && desk.height > 0 ? desk.height : 256) * DESK_SURFACE_SCALE
  const cw = (cab && cab.width > 0 ? cab.width : 400) * SIDE_CABINET_SCALE
  const gap = -13
  const cabinetFromDeskX = -(dw * 0.5 + cw * 0.5 + gap)
  const cabinetFromDeskY = DESK_SURFACE_Y + dh - CABINET_FEET_RAISE_PX
  return { cabinetFromDeskX, cabinetFromDeskY }
}
