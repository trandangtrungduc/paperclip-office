import type { LiveEvent } from '@shared/paperclip-types'
import type { NormalizedOfficeEvent } from '@shared/office-events'

/**
 * Transform raw Paperclip LiveEvents into normalized office domain events.
 * Returns null for events we don't visualize.
 */
export function normalizeEvent(raw: LiveEvent): NormalizedOfficeEvent | null {
  const timestamp = raw.createdAt
  const p = raw.payload

  switch (raw.type) {
    case 'agent.status':
      return {
        kind: 'agent:state-changed',
        agentId: p.agentId as string,
        status: p.status as NormalizedOfficeEvent extends { kind: 'agent:state-changed' } ? NormalizedOfficeEvent['status'] : never,
        previousStatus: p.previousStatus as string | undefined,
        timestamp
      } as NormalizedOfficeEvent

    case 'heartbeat.run.queued':
      return {
        kind: 'heartbeat:started',
        agentId: p.agentId as string,
        runId: p.runId as string,
        issueId: p.issueId as string | undefined,
        timestamp
      }

    case 'heartbeat.run.status': {
      const status = p.status as string
      if (status === 'running') {
        return {
          kind: 'heartbeat:started',
          agentId: p.agentId as string,
          runId: p.runId as string,
          timestamp
        }
      }
      if (['succeeded', 'failed', 'cancelled', 'timed_out'].includes(status)) {
        return {
          kind: 'heartbeat:completed',
          agentId: p.agentId as string,
          runId: p.runId as string,
          status: status as 'succeeded' | 'failed' | 'cancelled' | 'timed_out',
          timestamp
        }
      }
      return null
    }

    case 'heartbeat.run.log':
      return {
        kind: 'heartbeat:progress',
        agentId: p.agentId as string,
        runId: p.runId as string,
        log: (p.message as string) || '',
        timestamp
      }

    case 'heartbeat.run.event':
      // Tool calls and output — show as progress
      return {
        kind: 'heartbeat:progress',
        agentId: p.agentId as string,
        runId: p.runId as string,
        log: (p.kind as string) === 'tool_call'
          ? `Using tool: ${(p.data as Record<string, unknown>)?.name || 'unknown'}`
          : (p.data as Record<string, unknown>)?.message as string || '',
        timestamp
      }

    case 'activity.logged':
      return {
        kind: 'activity:logged',
        entry: {
          id: String(raw.id),
          actorType: (p.actorType as 'agent' | 'user' | 'system') || 'system',
          action: (p.action as string) || '',
          entityType: (p.entityType as string) || '',
          entityId: (p.entityId as string) || '',
          details: (p.details as Record<string, unknown>) || {},
          createdAt: timestamp
        },
        timestamp
      }

    case 'plugin.ui.updated':
      return {
        kind: 'plugin:status-changed',
        pluginId: p.pluginId as string,
        status: 'ready',
        timestamp
      }

    case 'plugin.worker.crashed':
      return {
        kind: 'plugin:status-changed',
        pluginId: p.pluginId as string,
        status: 'error',
        timestamp
      }

    case 'plugin.worker.restarted':
      return {
        kind: 'plugin:status-changed',
        pluginId: p.pluginId as string,
        status: 'ready',
        timestamp
      }

    default:
      return null
  }
}
