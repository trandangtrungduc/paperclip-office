# Virtual Office — Paperclip Data Map

Complete inventory of what Paperclip exposes and how we use it.

> **Scope note:** The office canvas is frozen. "Panel Use" columns describe how data feeds the **side panels and modals**, not canvas visuals. Canvas visual mappings in section "Entity → Visual Mapping" are reference-only (already implemented, do not modify).

## REST API Endpoints

### Core Data (fetched on company select)

| Endpoint | Returns | Panel Use |
|----------|---------|-----------|
| `GET /health` | Server status, version | Connection validation |
| `GET /companies` | Company list | Company selector |
| `GET /companies/:id` | Company detail | Header display |
| `GET /companies/:id/agents` | All agents | Agent roster (left panel), store |
| `GET /companies/:id/projects` | Projects | Project tabs, store |
| `GET /companies/:id/issues` | Issues with status | Activity feed, modals |
| `GET /companies/:id/goals` | Goal hierarchy | Goals section (left panel) |
| `GET /companies/:id/approvals` | Pending approvals | Approvals section (left panel) |
| `GET /companies/:id/costs/summary` | Total spend | Cost breakdown (left panel) |
| `GET /companies/:id/activity` | Activity log | Activity feed (right panel) |
| `GET /companies/:id/routines` | Scheduled tasks | Routine schedule (left panel) |
| `GET /plugins` | Installed plugins | Plugin status (left panel) |

### Analytics (periodic refresh every 2-5 min)

| Endpoint | Returns | Panel Use |
|----------|---------|-----------|
| `GET /companies/:id/dashboard` | Summary metrics | Dashboard summary (left panel) |
| `GET /companies/:id/costs/by-agent` | Spend per agent | Cost breakdown (left panel) |
| `GET /companies/:id/costs/by-agent-model` | Model breakdown | Cost breakdown (left panel) |
| `GET /companies/:id/costs/by-provider` | Provider breakdown | Cost breakdown (left panel) |
| `GET /companies/:id/budgets/overview` | Budget policies + incidents | Dashboard + approvals (left panel) |
| `GET /companies/:id/sidebar-badges` | Notification counts | Badge indicators (panels) |

### Detail Endpoints (on-demand)

| Endpoint | Returns | Panel Use |
|----------|---------|-----------|
| `GET /agents/:id` | Agent detail | Agent detail modal |
| `GET /issues/:id` | Issue detail | Issue detail modal |
| `GET /issues/:id/comments` | Issue comments | Issue detail modal |
| `GET /issues/:id/runs` | Run history for issue | Run history panel / modal |
| `GET /heartbeat-runs/:id` | Run detail | Run detail modal |
| `GET /heartbeat-runs/:id/events` | Run event stream | Run detail modal |
| `GET /heartbeat-runs/:id/logs` | Full logs | Run detail modal |

## WebSocket Events

**Endpoint:** `ws://.../api/companies/:id/events/ws`

### Agent Events
| Event | Payload | Store / Panel Effect |
|-------|---------|---------------------|
| `agent.status` | `{ agentId, status, previousStatus }` | Update agent in store → roster, dashboard counts |

### Heartbeat (Execution) Events
| Event | Payload | Store / Panel Effect |
|-------|---------|---------------------|
| `heartbeat.run.queued` | `{ agentId, runId, issueId }` | Update agent state → roster, activity feed |
| `heartbeat.run.status` | `{ agentId, runId, status }` | Update run state → activity feed, run history |
| `heartbeat.run.event` | `{ agentId, runId, kind, data }` | Activity feed log entry |
| `heartbeat.run.log` | `{ agentId, runId, message }` | Activity feed log entry |

### Activity Events
| Event | Payload | Store / Panel Effect |
|-------|---------|---------------------|
| `activity.logged` | `{ actorType, action, entityType, entityId, details }` | Activity feed entry (right panel) |

### Plugin Events
| Event | Payload | Store / Panel Effect |
|-------|---------|---------------------|
| `plugin.ui.updated` | `{ pluginId }` | Plugin status section (left panel) |
| `plugin.worker.crashed` | `{ pluginId, error }` | Plugin status section (left panel) |
| `plugin.worker.restarted` | `{ pluginId }` | Plugin status section (left panel) |

## Entity → Panel Mapping

How Paperclip entities map to **panel UI** (the active development area).

### Agent

| Field | Panel Use |
|-------|-----------|
| `name` | Agent roster name, activity feed actor label |
| `role` | Agent roster role tag, color coding |
| `status` | Agent roster status dot, dashboard counts |
| `adapterType` | Agent detail modal |
| `budgetMonthlyCents` | Agent roster budget bar, cost breakdown |
| `spentMonthlyCents` | Agent roster budget bar fill, cost breakdown |
| `reportsTo` | Org chart panel (future) |
| `lastHeartbeatAt` | Agent roster "last active" indicator |

### Issue

| Field | Panel Use |
|-------|-----------|
| `title` | Activity feed entry, issue detail modal |
| `status` | Dashboard task counts, activity feed |
| `priority` | Issue detail modal, priority badge |
| `assigneeAgentId` | Activity feed agent link |
| `identifier` | Activity feed label (e.g., "PAP-12") |

### Approval

| Field | Panel Use |
|-------|-----------|
| `type` | Approvals section type label |
| `status` | Approvals section, dashboard pending count |
| `createdByAgentId` | Approvals section requester |

### Cost Event

| Field | Panel Use |
|-------|-----------|
| `costCents` | Activity feed cost entry, cost breakdown |
| `model` | Activity feed model label, cost-by-model list |
| `inputTokens`, `outputTokens` | Run detail modal |

### Budget Policy

| Field | Panel Use |
|-------|-----------|
| `amount` | Dashboard budget bar max, cost breakdown |
| `warnPercent` | Dashboard budget bar warning zone |
| `hardStopEnabled` | Dashboard budget bar alert |

## Entity → Canvas Mapping (FROZEN — reference only)

These mappings are already implemented in the PixiJS canvas. Do not modify.

- Agent → sprite body color (role), animation state (status), desk label (name)
- Issue → not currently rendered on canvas
- Approval → not currently rendered on canvas
- Cost → not currently rendered on canvas
- Budget → not currently rendered on canvas

## Dashboard Summary (GET /dashboard)

```json
{
  "agents": { "active": 3, "running": 2, "paused": 1, "error": 0 },
  "tasks": { "open": 5, "inProgress": 3, "blocked": 1, "done": 12 },
  "costs": { "monthSpendCents": 4500, "monthBudgetCents": 10000, "monthUtilizationPercent": 45 },
  "pendingApprovals": 1,
  "budgets": { "activeIncidents": 0, "pausedAgents": 0 }
}
```

Used for the dashboard summary section in the left panel — the most information-dense single endpoint.
