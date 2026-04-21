import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { CompanySnapshot, Company, CostByAgentModelRow } from '@shared/paperclip-types'
import type { NormalizedOfficeEvent, ConnectionStatusPayload } from '@shared/office-events'

export type PaperclipAPI = typeof api

const api = {
  // Connection
  connect: (url: string, apiKey: string) =>
    ipcRenderer.invoke(IPC.CONNECT, { url, apiKey }) as Promise<{ ok: boolean; error?: string }>,

  disconnect: () =>
    ipcRenderer.invoke(IPC.DISCONNECT) as Promise<void>,

  fetchCompanies: () =>
    ipcRenderer.invoke(IPC.FETCH_COMPANIES) as Promise<{ ok: boolean; data?: Company[]; error?: string }>,

  selectCompany: (companyId: string) =>
    ipcRenderer.invoke(IPC.SELECT_COMPANY, { companyId }) as Promise<{ ok: boolean; error?: string }>,

  refresh: () =>
    ipcRenderer.invoke(IPC.REFRESH) as Promise<{ ok: boolean; error?: string }>,

  // Event listeners
  onConnectionStatus: (callback: (payload: ConnectionStatusPayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: ConnectionStatusPayload) => callback(payload)
    ipcRenderer.on(IPC.CONNECTION_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC.CONNECTION_STATUS, handler)
  },

  onStateSnapshot: (callback: (snapshot: CompanySnapshot) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: CompanySnapshot) => callback(snapshot)
    ipcRenderer.on(IPC.STATE_SNAPSHOT, handler)
    return () => ipcRenderer.removeListener(IPC.STATE_SNAPSHOT, handler)
  },

  onEvent: (callback: (event: NormalizedOfficeEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, event: NormalizedOfficeEvent) => callback(event)
    ipcRenderer.on(IPC.EVENT, handler)
    return () => ipcRenderer.removeListener(IPC.EVENT, handler)
  },

  onCostBreakdownUpdate: (callback: (rows: CostByAgentModelRow[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, rows: CostByAgentModelRow[]) => callback(rows)
    ipcRenderer.on(IPC.COST_BREAKDOWN_UPDATE, handler)
    return () => ipcRenderer.removeListener(IPC.COST_BREAKDOWN_UPDATE, handler)
  },

  // Window
  minimizeToTray: () => ipcRenderer.send(IPC.MINIMIZE_TO_TRAY),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.send(IPC.SET_ALWAYS_ON_TOP, { enabled }),

  // Preferences
  getPreferences: () =>
    ipcRenderer.invoke(IPC.GET_PREFERENCES) as Promise<Record<string, unknown>>,

  setPreferences: (prefs: Record<string, unknown>) =>
    ipcRenderer.invoke(IPC.SET_PREFERENCES, prefs) as Promise<void>,

  onPreferencesChanged: (callback: (prefs: Record<string, unknown>) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, prefs: Record<string, unknown>) => callback(prefs)
    ipcRenderer.on(IPC.PREFERENCES_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.PREFERENCES_CHANGED, handler)
  }
}

contextBridge.exposeInMainWorld('paperclip', api)
