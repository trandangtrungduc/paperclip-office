import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

// vi.hoisted runs before vi.mock hoisting, so MockWebSocket is available in the factory
const { MockWebSocket } = vi.hoisted(() => {
  const { EventEmitter: EE } = require('events')

  class MockWebSocket extends EE {
    static OPEN = 1
    readyState = 1
    url: string

    constructor(url: string) {
      super()
      MockWebSocket.instances.push(this)
      this.url = url
      // Only auto-open if autoOpen is enabled
      if (MockWebSocket.autoOpen) {
        queueMicrotask(() => this.emit('open'))
      }
    }

    close() {
      this.readyState = 3
    }

    ping = vi.fn()

    static autoOpen = true
    static instances: MockWebSocket[] = []
    static reset() {
      MockWebSocket.instances = []
      MockWebSocket.autoOpen = true
    }
  }

  return { MockWebSocket }
})

vi.mock('ws', () => ({
  default: MockWebSocket,
  WebSocket: MockWebSocket
}))

import { PaperclipWebSocket } from '../../src/main/paperclip/websocket'

describe('PaperclipWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- Constructor URL building ---
  describe('constructor', () => {
    it('converts http to ws in URL', () => {
      const pws = new PaperclipWebSocket('http://localhost:3100', 'key123', 'c1')
      pws.connect()
      const ws = MockWebSocket.instances[0]
      expect(ws.url).toBe('ws://localhost:3100/api/companies/c1/events/ws?token=key123')
    })

    it('converts https to wss', () => {
      const pws = new PaperclipWebSocket('https://example.com', 'key', 'c1')
      pws.connect()
      const ws = MockWebSocket.instances[0]
      expect(ws.url).toBe('wss://example.com/api/companies/c1/events/ws?token=key')
    })

    it('omits token param when no apiKey', () => {
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.connect()
      const ws = MockWebSocket.instances[0]
      expect(ws.url).toBe('ws://localhost:3100/api/companies/c1/events/ws')
    })

    it('encodes special characters in apiKey', () => {
      const pws = new PaperclipWebSocket('http://localhost:3100', 'key with spaces&chars', 'c1')
      pws.connect()
      const ws = MockWebSocket.instances[0]
      expect(ws.url).toContain('token=key%20with%20spaces%26chars')
    })
  })

  // --- Handler registration ---
  describe('handler registration', () => {
    it('onEvent registers event handler', async () => {
      const handler = vi.fn()
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.onEvent(handler)
      pws.connect()

      await vi.advanceTimersByTimeAsync(0) // let open fire

      const ws = MockWebSocket.instances[0]
      const event = { id: 1, companyId: 'c1', type: 'agent.status', createdAt: '2026-01-01', payload: {} }
      ws.emit('message', JSON.stringify(event))

      expect(handler).toHaveBeenCalledWith(event)
    })

    it('ignores malformed messages', async () => {
      const handler = vi.fn()
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.onEvent(handler)
      pws.connect()

      await vi.advanceTimersByTimeAsync(0)

      const ws = MockWebSocket.instances[0]
      ws.emit('message', 'not-json{{{')

      expect(handler).not.toHaveBeenCalled()
    })

    it('onClose is called on close when not explicitly closed', async () => {
      const closeHandler = vi.fn()
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.onClose(closeHandler)
      pws.connect()

      await vi.advanceTimersByTimeAsync(0)

      const ws = MockWebSocket.instances[0]
      ws.emit('close')

      expect(closeHandler).toHaveBeenCalled()
    })

    it('onClose is NOT called when explicitly closed', async () => {
      const closeHandler = vi.fn()
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.onClose(closeHandler)
      pws.connect()

      await vi.advanceTimersByTimeAsync(0)

      pws.close()
      const ws = MockWebSocket.instances[0]
      ws.emit('close')

      expect(closeHandler).not.toHaveBeenCalled()
    })
  })

  // --- Reconnect ---
  describe('reconnect', () => {
    it('schedules reconnect on unexpected close', async () => {
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.connect()

      await vi.advanceTimersByTimeAsync(0)
      expect(MockWebSocket.instances).toHaveLength(1)

      // Simulate close
      MockWebSocket.instances[0].emit('close')

      // First reconnect delay is 1000ms
      await vi.advanceTimersByTimeAsync(1000)
      expect(MockWebSocket.instances).toHaveLength(2)
    })

    it('uses exponential backoff for consecutive failures', async () => {
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.connect()

      await vi.advanceTimersByTimeAsync(0) // open fires

      // Disable auto-open so reconnected sockets don't reset reconnectAttempt
      MockWebSocket.autoOpen = false

      MockWebSocket.instances[0].emit('close')

      // 1st reconnect: 1000ms delay (attempt=0)
      await vi.advanceTimersByTimeAsync(999)
      expect(MockWebSocket.instances).toHaveLength(1) // not yet
      await vi.advanceTimersByTimeAsync(1)
      expect(MockWebSocket.instances).toHaveLength(2)

      // 2nd instance doesn't auto-open, so close triggers with attempt still incrementing
      MockWebSocket.instances[1].emit('close')

      // 2nd reconnect: 2000ms delay (attempt=1)
      await vi.advanceTimersByTimeAsync(1999)
      expect(MockWebSocket.instances).toHaveLength(2) // not yet
      await vi.advanceTimersByTimeAsync(1)
      expect(MockWebSocket.instances).toHaveLength(3)

      pws.close()
    })

    it('calls reconnectHandler on successful reconnect', async () => {
      const reconnectHandler = vi.fn()
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.onReconnect(reconnectHandler)
      pws.connect()

      await vi.advanceTimersByTimeAsync(0) // initial open
      expect(reconnectHandler).not.toHaveBeenCalled() // first connect, not reconnect

      MockWebSocket.instances[0].emit('close')
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(0) // let open fire

      expect(reconnectHandler).toHaveBeenCalledTimes(1)
    })

    it('does not reconnect after explicit close', async () => {
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.connect()

      await vi.advanceTimersByTimeAsync(0)
      pws.close()

      await vi.advanceTimersByTimeAsync(30000)
      // Only the initial connection
      expect(MockWebSocket.instances).toHaveLength(1)
    })

    it('does not connect if closed before doConnect runs', () => {
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.close() // close before connect
      pws.connect() // sets closed=false
      pws.close() // close again immediately

      // Should not create any more WebSocket instances after close
      expect(MockWebSocket.instances).toHaveLength(1) // from connect()
    })
  })

  // --- Ping ---
  describe('ping', () => {
    it('starts pinging on open', async () => {
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.connect()

      await vi.advanceTimersByTimeAsync(0) // open

      const ws = MockWebSocket.instances[0]

      // Advance by 25 seconds (PING_INTERVAL)
      await vi.advanceTimersByTimeAsync(25_000)
      expect(ws.ping).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(25_000)
      expect(ws.ping).toHaveBeenCalledTimes(2)

      pws.close()
    })

    it('stops pinging on close', async () => {
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.connect()

      await vi.advanceTimersByTimeAsync(0)
      const ws = MockWebSocket.instances[0]

      pws.close()

      await vi.advanceTimersByTimeAsync(50_000)
      expect(ws.ping).not.toHaveBeenCalled()
    })
  })

  // --- close() ---
  describe('close', () => {
    it('nullifies ws and clears timers', async () => {
      const pws = new PaperclipWebSocket('http://localhost:3100', undefined, 'c1')
      pws.connect()

      await vi.advanceTimersByTimeAsync(0)
      pws.close()

      // Verify no further activity
      await vi.advanceTimersByTimeAsync(60_000)
      expect(MockWebSocket.instances).toHaveLength(1)
    })
  })
})
