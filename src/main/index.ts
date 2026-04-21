import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron'
import { setDefaultResultOrder } from 'node:dns'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { PaperclipClient } from './paperclip/client'
import { PaperclipWebSocket } from './paperclip/websocket'
import { normalizeEvent } from './paperclip/event-normalizer'
import { configStore } from './config/store'
import { IPC } from '@shared/ipc-channels'
import type { ConnectionStatusPayload } from '@shared/office-events'
import type { CompanySnapshot, LiveEvent } from '@shared/paperclip-types'

if (!app.isPackaged) {
  setDefaultResultOrder('ipv4first')
  app.commandLine.appendSwitch('disable-http-cache')
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
  try {
    const root = join(app.getPath('temp'), `paperclip-office-chromium-${process.pid}`)
    const httpCache = join(root, 'http-cache')
    const gpuCache = join(root, 'gpu-cache')
    mkdirSync(httpCache, { recursive: true })
    mkdirSync(gpuCache, { recursive: true })
    app.commandLine.appendSwitch('disk-cache-dir', httpCache)
    app.commandLine.appendSwitch('gpu-disk-cache-dir', gpuCache)
  } catch {
  }
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let paperclipClient: PaperclipClient | null = null
let paperclipWs: PaperclipWebSocket | null = null
let costBreakdownTimer: NodeJS.Timeout | null = null
let activeCompanyId: string | null = null

const COST_BREAKDOWN_REFRESH_MS = 180_000 // 3 min — matches docs refresh cadence

function stopCostBreakdownPolling(): void {
  if (costBreakdownTimer) {
    clearInterval(costBreakdownTimer)
    costBreakdownTimer = null
  }
}

function startCostBreakdownPolling(companyId: string): void {
  stopCostBreakdownPolling()
  costBreakdownTimer = setInterval(async () => {
    if (!paperclipClient || activeCompanyId !== companyId) return
    try {
      const rows = await paperclipClient.getCostByAgentModel(companyId)
      if (activeCompanyId === companyId) {
        sendToRenderer(IPC.COST_BREAKDOWN_UPDATE, rows)
      }
    } catch {
      // Swallow — next tick will retry
    }
  }, COST_BREAKDOWN_REFRESH_MS)
}

function setupCSP(): void {
  const { session } = require('electron')
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = is.dev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* data: blob:; img-src 'self' http://localhost:* http://127.0.0.1:* data: blob:; font-src 'self' data:; worker-src 'self' blob:;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; worker-src 'self' blob:;"

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
}

function isPointInDisplayArea(x: number, y: number): boolean {
  return screen.getAllDisplays().some((d) => {
    const b = d.workArea
    return x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height
  })
}

function pickOppositeDisplay() {
  const displays = screen.getAllDisplays()
  const cursor = screen.getCursorScreenPoint()
  const current = screen.getDisplayNearestPoint(cursor)
  if (displays.length <= 1) return current
  return displays.find((d) => d.id !== current.id) ?? current
}

function resolveAppIconPath(): string {
  const icoPath = join(__dirname, '../../resources/ico.ico')
  if (process.platform === 'win32' && existsSync(icoPath)) {
    return icoPath
  }
  const pngPath = join(__dirname, '../../resources/icon.png')
  if (existsSync(pngPath)) {
    return pngPath
  }
  return icoPath
}

function createWindow(): void {
  const windowState = configStore.get('windowState', { width: 1400, height: 900 }) as {
    width: number
    height: number
    x?: number
    y?: number
  }
  const targetDisplay = pickOppositeDisplay()
  const defaultX = Math.round(targetDisplay.workArea.x + (targetDisplay.workArea.width - windowState.width) / 2)
  const defaultY = Math.round(targetDisplay.workArea.y + (targetDisplay.workArea.height - windowState.height) / 2)
  const hasSavedPosition =
    typeof windowState.x === 'number' &&
    typeof windowState.y === 'number' &&
    isPointInDisplayArea(windowState.x, windowState.y)

  const appIconPath = resolveAppIconPath()

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: hasSavedPosition ? windowState.x : defaultX,
    y: hasSavedPosition ? windowState.y : defaultY,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Virtual Office',
    icon: appIconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      configStore.set('windowState', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y
      })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const explicit = process.env['ELECTRON_RENDERER_URL']?.replace(/\/$/, '')
  const devCandidates: string[] = []
  if (!app.isPackaged) {
    if (explicit) devCandidates.push(explicit)
    devCandidates.push('http://localhost:5173', 'http://127.0.0.1:5173', 'http://[::1]:5173')
  }
  const seen = new Set<string>()
  const ordered = devCandidates.filter((u) => {
    if (seen.has(u)) return false
    seen.add(u)
    return true
  })

  const rendererHtml = join(__dirname, '../renderer/index.html')
  const missingBuildHtml =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Virtual Office</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;background:#1a1a1a;color:#e2e8f0"><h1 style="font-size:1.25rem">Dev server unreachable</h1><p>No Vite on port 5173 (try 127.0.0.1 and localhost) and no <code>out/renderer/index.html</code>.</p><p>From project root run <strong style="color:#fff">npm run dev</strong> and keep the terminal open. If port 5173 is taken, free it or change <code>electron.vite.config.ts</code> server.port and the fallback URLs in <code>src/main/index.ts</code>.</p></body></html>'

  const loadDevWithChromium = async (urls: string[]): Promise<boolean> => {
    const win = mainWindow
    if (!win || urls.length === 0) return false
    const attemptsPerUrl = 8
    const pauseMs = 400
    for (const url of urls) {
      for (let a = 0; a < attemptsPerUrl; a++) {
        try {
          await win.loadURL(url)
          return true
        } catch {
          await new Promise((r) => setTimeout(r, pauseMs))
        }
      }
    }
    return false
  }

  void (async () => {
    if (!app.isPackaged && ordered.length > 0) {
      if (await loadDevWithChromium(ordered)) return
      console.warn(
        '[paperclip-office] Chromium could not load the Vite dev URL (tried ELECTRON_RENDERER_URL, 127.0.0.1:5173, localhost, ::1). Falling back to out/renderer.'
      )
    }
    if (existsSync(rendererHtml)) {
      mainWindow?.loadFile(rendererHtml)
    } else {
      console.error(`[paperclip-office] Missing ${rendererHtml}. Run npm run dev or npm run build.`)
      mainWindow?.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(missingBuildHtml))
    }
  })()
}

function createTray(): void {
  const icon = nativeImage.createFromPath(resolveAppIconPath())
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Window', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setToolTip('Virtual Office')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow?.show())
}

function sendToRenderer(channel: string, data: unknown): void {
  mainWindow?.webContents.send(channel, data)
}

function sendConnectionStatus(payload: ConnectionStatusPayload): void {
  sendToRenderer(IPC.CONNECTION_STATUS, payload)
}

// --- IPC Handlers ---

function setupIpcHandlers(): void {
  ipcMain.handle(IPC.CONNECT, async (_event, { url, apiKey }: { url: string; apiKey?: string }) => {
    try {
      sendConnectionStatus({ status: 'connecting' })

      paperclipClient = new PaperclipClient(url, apiKey || undefined)
      await paperclipClient.getHealth()

      configStore.set('lastConnection', { url })

      sendConnectionStatus({ status: 'connected' })
      return { ok: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      sendConnectionStatus({ status: 'error', error: message })
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(IPC.DISCONNECT, async () => {
    stopCostBreakdownPolling()
    activeCompanyId = null
    paperclipWs?.close()
    paperclipWs = null
    paperclipClient = null
    sendConnectionStatus({ status: 'disconnected' })
  })

  ipcMain.handle(IPC.FETCH_COMPANIES, async () => {
    if (!paperclipClient) return { ok: false, error: 'Not connected' }
    try {
      const companies = await paperclipClient.getCompanies()
      return { ok: true, data: companies }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch companies'
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(IPC.SELECT_COMPANY, async (_event, { companyId }: { companyId: string }) => {
    if (!paperclipClient) return { ok: false, error: 'Not connected' }

    try {
      // Close existing WebSocket
      paperclipWs?.close()

      // Fetch full state snapshot in parallel
      const [
        company, agents, projects, issues, goals, approvals,
        costSummary, costByAgentModel, activity, routines, plugins
      ] = await Promise.all([
        paperclipClient.getCompany(companyId),
        paperclipClient.getAgents(companyId),
        paperclipClient.getProjects(companyId),
        paperclipClient.getIssues(companyId),
        paperclipClient.getGoals(companyId),
        paperclipClient.getApprovals(companyId),
        paperclipClient.getCostSummary(companyId),
        paperclipClient.getCostByAgentModel(companyId),
        paperclipClient.getActivity(companyId),
        paperclipClient.getRoutines(companyId),
        paperclipClient.getPlugins()
      ])

      const snapshot: CompanySnapshot = {
        company, agents, projects, issues, goals,
        approvals, costSummary, costByAgentModel,
        activity, routines, plugins
      }

      sendToRenderer(IPC.STATE_SNAPSHOT, snapshot)

      // Open WebSocket for live events
      paperclipWs = new PaperclipWebSocket(
        paperclipClient.baseUrl,
        paperclipClient.apiKey,
        companyId
      )

      paperclipWs.onEvent((liveEvent: LiveEvent) => {
        const normalized = normalizeEvent(liveEvent)
        if (normalized) {
          sendToRenderer(IPC.EVENT, normalized)
        }
      })

      paperclipWs.onClose(() => {
        sendConnectionStatus({ status: 'connecting' })
      })

      paperclipWs.onReconnect(() => {
        sendConnectionStatus({ status: 'connected' })
      })

      paperclipWs.connect()

      activeCompanyId = companyId
      startCostBreakdownPolling(companyId)

      configStore.set('lastCompanyId', companyId)
      return { ok: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load company'
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(IPC.REFRESH, async () => {
    const companyId = configStore.get('lastCompanyId') as string | undefined
    if (!paperclipClient || !companyId) return { ok: false, error: 'No active company' }

    try {
      const [agents, issues, approvals, costSummary, costByAgentModel] = await Promise.all([
        paperclipClient.getAgents(companyId),
        paperclipClient.getIssues(companyId),
        paperclipClient.getApprovals(companyId),
        paperclipClient.getCostSummary(companyId),
        paperclipClient.getCostByAgentModel(companyId)
      ])
      sendToRenderer(IPC.STATE_SNAPSHOT, { agents, issues, approvals, costSummary })
      sendToRenderer(IPC.COST_BREAKDOWN_UPDATE, costByAgentModel)
      return { ok: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed'
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(IPC.GET_PREFERENCES, () => {
    return configStore.get('preferences', {})
  })

  ipcMain.handle(IPC.SET_PREFERENCES, (_event, prefs: Record<string, unknown>) => {
    const current = configStore.get('preferences', {}) as Record<string, unknown>
    configStore.set('preferences', { ...current, ...prefs })
    sendToRenderer(IPC.PREFERENCES_CHANGED, { ...current, ...prefs })
  })

  ipcMain.on(IPC.MINIMIZE_TO_TRAY, () => {
    mainWindow?.hide()
  })

  ipcMain.on(IPC.SET_ALWAYS_ON_TOP, (_event, { enabled }: { enabled: boolean }) => {
    mainWindow?.setAlwaysOnTop(enabled)
  })
}

// --- App lifecycle ---

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.paperclip.office')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupCSP()
  setupIpcHandlers()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopCostBreakdownPolling()
  paperclipWs?.close()
})
