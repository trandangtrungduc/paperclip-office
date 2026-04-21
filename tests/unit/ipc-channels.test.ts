import { describe, it, expect } from 'vitest'
import { IPC } from '../../src/shared/ipc-channels'

describe('IPC channels', () => {
  it('exports IPC object with all required channels', () => {
    expect(IPC).toBeDefined()
    expect(typeof IPC).toBe('object')
  })

  it('has unique channel values (no duplicates)', () => {
    const values = Object.values(IPC)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(IPC)) {
      expect(typeof value).toBe('string')
      expect(value.length).toBeGreaterThan(0)
    }
  })

  it('contains main→renderer channels', () => {
    expect(IPC.CONNECTION_STATUS).toBeDefined()
    expect(IPC.STATE_SNAPSHOT).toBeDefined()
    expect(IPC.EVENT).toBeDefined()
    expect(IPC.COMPANIES_LIST).toBeDefined()
    expect(IPC.ERROR).toBeDefined()
  })

  it('contains renderer→main channels', () => {
    expect(IPC.CONNECT).toBeDefined()
    expect(IPC.DISCONNECT).toBeDefined()
    expect(IPC.SELECT_COMPANY).toBeDefined()
    expect(IPC.FETCH_COMPANIES).toBeDefined()
    expect(IPC.REFRESH).toBeDefined()
  })
})
