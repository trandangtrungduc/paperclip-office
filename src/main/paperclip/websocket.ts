import WebSocket from 'ws'
import type { LiveEvent } from '@shared/paperclip-types'

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]
const PING_INTERVAL = 25_000

export class PaperclipWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private closed = false

  private eventHandler: ((event: LiveEvent) => void) | null = null
  private closeHandler: (() => void) | null = null
  private reconnectHandler: (() => void) | null = null

  constructor(baseUrl: string, apiKey: string | undefined, companyId: string) {
    const wsBase = baseUrl.replace(/^http/, 'ws')
    const tokenParam = apiKey ? `?token=${encodeURIComponent(apiKey)}` : ''
    this.url = `${wsBase}/api/companies/${companyId}/events/ws${tokenParam}`
  }

  onEvent(handler: (event: LiveEvent) => void): void {
    this.eventHandler = handler
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler
  }

  onReconnect(handler: () => void): void {
    this.reconnectHandler = handler
  }

  connect(): void {
    this.closed = false
    this.doConnect()
  }

  close(): void {
    this.closed = true
    this.clearTimers()
    this.ws?.close()
    this.ws = null
  }

  private doConnect(): void {
    if (this.closed) return

    try {
      this.ws = new WebSocket(this.url)

      this.ws.on('open', () => {
        if (this.reconnectAttempt > 0) {
          this.reconnectHandler?.()
        }
        this.reconnectAttempt = 0
        this.startPing()
      })

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString()) as LiveEvent
          this.eventHandler?.(event)
        } catch {
          // Ignore malformed messages
        }
      })

      this.ws.on('close', () => {
        this.stopPing()
        if (!this.closed) {
          this.closeHandler?.()
          this.scheduleReconnect()
        }
      })

      this.ws.on('error', () => {
        // error is followed by close, so reconnect happens there
      })

      this.ws.on('pong', () => {
        // Connection alive
      })
    } catch {
      if (!this.closed) {
        this.scheduleReconnect()
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return

    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)]
    this.reconnectAttempt++

    this.reconnectTimer = setTimeout(() => {
      this.doConnect()
    }, delay)
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping()
      }
    }, PING_INTERVAL)
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private clearTimers(): void {
    this.stopPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
