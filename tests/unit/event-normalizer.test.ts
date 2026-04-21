import { describe, it, expect } from 'vitest'
import { normalizeEvent } from '../../src/main/paperclip/event-normalizer'
import type { LiveEvent } from '../../src/shared/paperclip-types'

function makeLiveEvent(overrides: Partial<LiveEvent>): LiveEvent {
  return {
    id: 1,
    companyId: 'comp-1',
    type: 'agent.status',
    createdAt: '2026-01-01T00:00:00Z',
    payload: {},
    ...overrides
  }
}

describe('normalizeEvent', () => {
  // --- agent.status ---
  it('normalizes agent.status to agent:state-changed', () => {
    const raw = makeLiveEvent({
      type: 'agent.status',
      payload: { agentId: 'a1', status: 'running', previousStatus: 'idle' }
    })

    const result = normalizeEvent(raw)

    expect(result).not.toBeNull()
    expect(result!.kind).toBe('agent:state-changed')
    if (result!.kind === 'agent:state-changed') {
      expect(result!.agentId).toBe('a1')
      expect(result!.status).toBe('running')
      expect(result!.previousStatus).toBe('idle')
      expect(result!.timestamp).toBe('2026-01-01T00:00:00Z')
    }
  })

  // --- heartbeat.run.queued ---
  it('normalizes heartbeat.run.queued to heartbeat:started', () => {
    const raw = makeLiveEvent({
      type: 'heartbeat.run.queued',
      payload: { agentId: 'a1', runId: 'r1', issueId: 'i1' }
    })

    const result = normalizeEvent(raw)

    expect(result).not.toBeNull()
    expect(result!.kind).toBe('heartbeat:started')
    if (result!.kind === 'heartbeat:started') {
      expect(result!.agentId).toBe('a1')
      expect(result!.runId).toBe('r1')
      expect(result!.issueId).toBe('i1')
    }
  })

  it('normalizes heartbeat.run.queued without issueId', () => {
    const raw = makeLiveEvent({
      type: 'heartbeat.run.queued',
      payload: { agentId: 'a1', runId: 'r1' }
    })

    const result = normalizeEvent(raw)

    expect(result!.kind).toBe('heartbeat:started')
    if (result!.kind === 'heartbeat:started') {
      expect(result!.issueId).toBeUndefined()
    }
  })

  // --- heartbeat.run.status ---
  it('normalizes heartbeat.run.status with running to heartbeat:started', () => {
    const raw = makeLiveEvent({
      type: 'heartbeat.run.status',
      payload: { agentId: 'a1', runId: 'r1', status: 'running' }
    })

    const result = normalizeEvent(raw)

    expect(result!.kind).toBe('heartbeat:started')
  })

  it.each(['succeeded', 'failed', 'cancelled', 'timed_out'])(
    'normalizes heartbeat.run.status with %s to heartbeat:completed',
    (status) => {
      const raw = makeLiveEvent({
        type: 'heartbeat.run.status',
        payload: { agentId: 'a1', runId: 'r1', status }
      })

      const result = normalizeEvent(raw)

      expect(result!.kind).toBe('heartbeat:completed')
      if (result!.kind === 'heartbeat:completed') {
        expect(result!.status).toBe(status)
        expect(result!.agentId).toBe('a1')
        expect(result!.runId).toBe('r1')
      }
    }
  )

  it('returns null for heartbeat.run.status with queued', () => {
    const raw = makeLiveEvent({
      type: 'heartbeat.run.status',
      payload: { agentId: 'a1', runId: 'r1', status: 'queued' }
    })

    expect(normalizeEvent(raw)).toBeNull()
  })

  // --- heartbeat.run.log ---
  it('normalizes heartbeat.run.log to heartbeat:progress', () => {
    const raw = makeLiveEvent({
      type: 'heartbeat.run.log',
      payload: { agentId: 'a1', runId: 'r1', message: 'Processing...' }
    })

    const result = normalizeEvent(raw)

    expect(result!.kind).toBe('heartbeat:progress')
    if (result!.kind === 'heartbeat:progress') {
      expect(result!.log).toBe('Processing...')
    }
  })

  it('defaults to empty string when heartbeat.run.log has no message', () => {
    const raw = makeLiveEvent({
      type: 'heartbeat.run.log',
      payload: { agentId: 'a1', runId: 'r1' }
    })

    const result = normalizeEvent(raw)

    if (result!.kind === 'heartbeat:progress') {
      expect(result!.log).toBe('')
    }
  })

  // --- heartbeat.run.event ---
  it('normalizes heartbeat.run.event tool_call to progress with tool name', () => {
    const raw = makeLiveEvent({
      type: 'heartbeat.run.event',
      payload: { agentId: 'a1', runId: 'r1', kind: 'tool_call', data: { name: 'search' } }
    })

    const result = normalizeEvent(raw)

    expect(result!.kind).toBe('heartbeat:progress')
    if (result!.kind === 'heartbeat:progress') {
      expect(result!.log).toBe('Using tool: search')
    }
  })

  it('normalizes heartbeat.run.event tool_call with missing tool name', () => {
    const raw = makeLiveEvent({
      type: 'heartbeat.run.event',
      payload: { agentId: 'a1', runId: 'r1', kind: 'tool_call', data: {} }
    })

    const result = normalizeEvent(raw)

    if (result!.kind === 'heartbeat:progress') {
      expect(result!.log).toBe('Using tool: unknown')
    }
  })

  it('normalizes heartbeat.run.event non-tool_call with message', () => {
    const raw = makeLiveEvent({
      type: 'heartbeat.run.event',
      payload: { agentId: 'a1', runId: 'r1', kind: 'output', data: { message: 'Hello' } }
    })

    const result = normalizeEvent(raw)

    if (result!.kind === 'heartbeat:progress') {
      expect(result!.log).toBe('Hello')
    }
  })

  it('normalizes heartbeat.run.event non-tool_call without message to empty string', () => {
    const raw = makeLiveEvent({
      type: 'heartbeat.run.event',
      payload: { agentId: 'a1', runId: 'r1', kind: 'output', data: {} }
    })

    const result = normalizeEvent(raw)

    if (result!.kind === 'heartbeat:progress') {
      expect(result!.log).toBe('')
    }
  })

  // --- activity.logged ---
  it('normalizes activity.logged to activity:logged', () => {
    const raw = makeLiveEvent({
      type: 'activity.logged',
      payload: {
        actorType: 'agent',
        action: 'created_issue',
        entityType: 'issue',
        entityId: 'i1',
        details: { title: 'Bug fix' }
      }
    })

    const result = normalizeEvent(raw)

    expect(result!.kind).toBe('activity:logged')
    if (result!.kind === 'activity:logged') {
      expect(result!.entry.actorType).toBe('agent')
      expect(result!.entry.action).toBe('created_issue')
      expect(result!.entry.entityType).toBe('issue')
      expect(result!.entry.entityId).toBe('i1')
      expect(result!.entry.details).toEqual({ title: 'Bug fix' })
      expect(result!.entry.id).toBe('1')
      expect(result!.entry.createdAt).toBe('2026-01-01T00:00:00Z')
    }
  })

  it('defaults activity.logged fields to empty/system when missing', () => {
    const raw = makeLiveEvent({
      type: 'activity.logged',
      payload: {}
    })

    const result = normalizeEvent(raw)

    if (result!.kind === 'activity:logged') {
      expect(result!.entry.actorType).toBe('system')
      expect(result!.entry.action).toBe('')
      expect(result!.entry.entityType).toBe('')
      expect(result!.entry.entityId).toBe('')
      expect(result!.entry.details).toEqual({})
    }
  })

  // --- plugin events ---
  it('normalizes plugin.ui.updated to plugin:status-changed ready', () => {
    const raw = makeLiveEvent({
      type: 'plugin.ui.updated',
      payload: { pluginId: 'p1' }
    })

    const result = normalizeEvent(raw)

    expect(result!.kind).toBe('plugin:status-changed')
    if (result!.kind === 'plugin:status-changed') {
      expect(result!.pluginId).toBe('p1')
      expect(result!.status).toBe('ready')
    }
  })

  it('normalizes plugin.worker.crashed to plugin:status-changed error', () => {
    const raw = makeLiveEvent({
      type: 'plugin.worker.crashed',
      payload: { pluginId: 'p1' }
    })

    const result = normalizeEvent(raw)

    if (result!.kind === 'plugin:status-changed') {
      expect(result!.status).toBe('error')
    }
  })

  it('normalizes plugin.worker.restarted to plugin:status-changed ready', () => {
    const raw = makeLiveEvent({
      type: 'plugin.worker.restarted',
      payload: { pluginId: 'p1' }
    })

    const result = normalizeEvent(raw)

    if (result!.kind === 'plugin:status-changed') {
      expect(result!.status).toBe('ready')
    }
  })

  // --- unknown event ---
  it('returns null for unknown event types', () => {
    const raw = makeLiveEvent({
      type: 'unknown.event' as LiveEvent['type']
    })

    expect(normalizeEvent(raw)).toBeNull()
  })
})
