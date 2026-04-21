import floorTileUrl from './sprites/floor-tile.png'
import lowerCabinetUrl from './sprites/lower-cabinet.png'
import waterCoolerUrl from './sprites/watercooler.png'
import coffeeMachineUrl from './sprites/coffee-machine.png'
import plantUrl from './sprites/plant.png'
import cabinetUrl from './sprites/cabinet.png'
import chairUrl from './sprites/chair.png'
import deskUrl from './sprites/desk.png'
import keyboardUrl from './sprites/keyboard_orange.png'
import monitorUrl from './sprites/monitor_back.png'
import elevatorFrameUrl from './sprites/elevator_frame.png'
import elevatorDoorUrl from './sprites/elevator_door.png'
import wallOutletUrl from './sprites/wall-outlet.png'
import headsetUrl from './sprites/headset.png'
import coffeeMugUrl from './sprites/decor/5-coffee-mug.png'
import staplerUrl from './sprites/decor/9-stapler.png'
import deskLampUrl from './sprites/decor/4-desk-lamp.png'
import penHolderUrl from './sprites/decor/2-pen-holder.png'
import magic5BallUrl from './sprites/decor/7-magic-5-ball.png'
import rubiksCubeUrl from './sprites/decor/8-rubiks-cube.png'
import gengarUrl from './sprites/decor/0-gengar.png'
import thermosUrl from './sprites/decor/1-thermos.png'
import phoneUrl from './sprites/decor/3-phone.png'
import logoUrl from './sprites/logo.png'
import trashCanUrl from './sprites/trash-can.png'
import faucetUrl from './sprites/faucet.png'
import paperCupTrayUrl from './sprites/paper-cup-tray.png'
import airConditionerUrl from './sprites/air-conditioner.png'
import fridgeUrl from './sprites/fridge.png'

export const OFFICE_TEXTURE_URLS = {
  floorTile: floorTileUrl,
  lowerCabinet: lowerCabinetUrl,
  waterCooler: waterCoolerUrl,
  coffeeMachine: coffeeMachineUrl,
  plant: plantUrl,
  cabinet: cabinetUrl,
  chair: chairUrl,
  desk: deskUrl,
  keyboard: keyboardUrl,
  monitor: monitorUrl,
  phone: phoneUrl,
  elevatorFrame: elevatorFrameUrl,
  elevatorDoor: elevatorDoorUrl,
  wallOutlet: wallOutletUrl,
  headset: headsetUrl,
  coffeeMug: coffeeMugUrl,
  stapler: staplerUrl,
  deskLamp: deskLampUrl,
  penHolder: penHolderUrl,
  magic5Ball: magic5BallUrl,
  rubiksCube: rubiksCubeUrl,
  gengar: gengarUrl,
  thermos: thermosUrl,
  logo: logoUrl,
  trashCan: trashCanUrl,
  faucet: faucetUrl,
  paperCupTray: paperCupTrayUrl,
  airConditioner: airConditionerUrl,
  fridge: fridgeUrl
} as const

export type OfficeTextureId = keyof typeof OFFICE_TEXTURE_URLS
