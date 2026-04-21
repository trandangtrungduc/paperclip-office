# Virtual Office — UI Design Specification

## 1. Overall Layout

The app uses a 3-zone layout: **optional left panel**, **center office canvas** (fixed, never modified), and **right activity panel**.

```
┌─────────────┬──────────────────────────────────┬───────────────┐
│             │  [Project Tabs]                   │               │
│  Info Panel │                                   │  Activity     │
│  (optional) │       Office Canvas               │  Feed         │
│             │       (PixiJS, DO NOT MODIFY)      │  Panel        │
│  - Agents   │                                   │               │
│  - Budget   │   ┌────┐ ┌─────────┐ ┌─────┐     │  14:32:01     │
│  - Costs    │   │Elev│ │ City    │ │Clock│     │  Agent X ran  │
│  - Approvals│   └────┘ │ Window  │ └─────┘     │  task...      │
│  - Dashboard│          └─────────┘              │               │
│             │                                   │  14:31:45     │
│             │  [Agents at desks with sprites]    │  Cost $0.03   │
│             │                                   │               │
│             │  [Printer] [Boss Rug] [Plant]      │               │
│             │                                   │               │
├─────────────┴──────────────────────────────────┴───────────────┤
│ (no status bar — removed per user preference)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Grid Modes

| Mode | CSS Class | Columns |
|------|-----------|---------|
| Canvas + Activity (current) | `app-shell--no-sidebar` | `1fr var(--activity-width)` |
| Full 3-panel | `app-shell` | `var(--sidebar-width) 1fr var(--activity-width)` |

### CSS Variables

```css
--sidebar-width: clamp(220px, 20vw, 320px);
--activity-width: clamp(240px, 22vw, 340px);
```

---

## 2. Office Canvas (CENTER — DO NOT MODIFY)

The PixiJS canvas is **locked**. All rendering, sprite positions, desk layout, wall decorations, agent sprites, and z-ordering are final. This section documents what exists for reference only.

### Canvas: 1280×1024 logical pixels

**Wall (y: 0–250):** Dark gray `#3d3d3d`, trim `#4a4a4a`
- Elevator (86, 178), Employee of Month (184, 50), City Window (319, 30)
- Wall Clock (581, 80), Whiteboard (641, 11), Safety Sign (1120, 40)
- Water Cooler (1010, 200), Coffee Machine (1081, 191)

**Floor (y: 250–1024):** Checkerboard tiles 100×100
- Desks: 4 per row at x: 256, 512, 768, 1024 — rows at y: 408, 600
- Boss Rug (640, 940), Printer (50, 945), Plant (118, 970)

**Agent sprites:** 48×80 capsule, 6-layer z-order, headset on working/idle

**Project Tabs:** Top of canvas area — filter agents by project.

---

## 3. Right Panel — Activity Feed (EXISTING)

Current implementation shows real-time `activity.logged` events from WebSocket.

```
┌─ Activity ──────────────────────┐
│ 🟢 Waiting for events           │
│                                  │
│ ┌──────────────────────────────┐│
│ │ 14:32:01         Agent       ││
│ │ ◇ status_changed · agent     ││
│ ├──────────────────────────────┤│
│ │ 14:31:58         System      ││
│ │ ◆ created · issue            ││
│ ├──────────────────────────────┤│
│ │ 14:31:45         Agent       ││
│ │ ✓ decided · approval         ││
│ └──────────────────────────────┘│
└──────────────────────────────────┘
```

**Each entry shows:**
- Timestamp (HH:mm:ss, monospace, accent color)
- Actor label (Agent name / Board / System) with actor-type color
- Action + entity type with entity glyph (◇ agent, ◆ issue, ✓ approval, ◎ goal, ▤ project)
- Color-coded left border by actor type
- Slide-in animation on new entries
- 500-entry circular buffer

### Enhancements to Activity Feed

| Feature | Description | Data Source |
|---------|-------------|-------------|
| **Cost entries** | Show `$0.03 (claude-sonnet)` when cost event arrives | `cost_event.created` via activity |
| **Heartbeat logs** | Show truncated tool call / stdout lines | `heartbeat.run.event`, `heartbeat.run.log` |
| **Approval alerts** | Highlight pending approvals with warning color | `approval.created` |
| **Clickable entries** | Click to show detail in a tooltip or modal | On-demand `GET /issues/:id` etc. |
| **Filter buttons** | Filter by: All / Agents / Issues / Costs | Client-side filter on `entityType` |

---

## 4. Left Panel — Info Panel (NEW, OPTIONAL)

A collapsible left panel for structured data that doesn't fit in the activity timeline. Only shown when enabled (default: hidden to maximize canvas space).

### 4A: Agent Roster Section

```
┌─ Agents (6) ────────────────────┐
│                                  │
│ 🟢 Builder          engineer    │
│    running · PAP-12              │
│    $0.42 / $5.00 budget          │
│                                  │
│ 🟡 Reviewer         qa          │
│    idle · last run 3m ago        │
│    $0.18 / $5.00 budget          │
│                                  │
│ 🔴 Deployer         devops      │
│    error · PAP-8 failed          │
│    $0.31 / $5.00 budget          │
│                                  │
│ ⏸ Designer          designer    │
│    paused (budget)               │
│    $5.00 / $5.00 ██████████     │
│                                  │
└──────────────────────────────────┘
```

**Per agent:**
- Status dot (colored by status)
- Name + role tag
- Current state description (running task ID, idle duration, error message)
- Budget mini-bar (spent / limit, colored zones)

**Data source:** Store `agents` map, refreshed on every `agent.status` event

### 4B: Dashboard Summary Section

```
┌─ Dashboard ─────────────────────┐
│                                  │
│  Agents    3 active  2 running   │
│            1 paused  0 error     │
│                                  │
│  Tasks     5 open    3 in prog   │
│            1 blocked 12 done     │
│                                  │
│  Budget    ████████░░  45%       │
│            $45.00 / $100.00      │
│                                  │
│  Approvals  1 pending            │
│                                  │
└──────────────────────────────────┘
```

**Data source:** `GET /companies/:id/dashboard` — fetched on connect + every 60s

### 4C: Cost Breakdown Section

```
┌─ Costs (this month) ────────────┐
│                                  │
│  Total: $45.00                   │
│                                  │
│  By Agent:                       │
│  ██████████  Builder    $18.20   │
│  ██████     Reviewer    $12.50   │
│  ████       Deployer     $8.30   │
│  ███        Designer     $6.00   │
│                                  │
│  By Model:                       │
│  claude-sonnet    $32.00 (71%)   │
│  claude-haiku      $8.50 (19%)   │
│  gpt-4o            $4.50 (10%)   │
│                                  │
└──────────────────────────────────┘
```

**Data source:** `GET /costs/by-agent` + `GET /costs/by-agent-model` — refreshed every 2 min

### 4D: Pending Approvals Section

```
┌─ Approvals (1 pending) ─────────┐
│                                  │
│ ⚠ Hire Agent                     │
│   "Senior Engineer" requested    │
│   by CEO agent · 5 min ago       │
│   [Approve] [Reject]             │
│                                  │
└──────────────────────────────────┘
```

**Data source:** Store `approvals` filtered to `status === 'pending'`

**Note:** Approve/Reject buttons would call `POST /approvals/:id/approve` or `/reject` — making this the only write-action in the UI. Optional — can be view-only initially.

### 4E: Goals Section

```
┌─ Goals ─────────────────────────┐
│                                  │
│ ◉ Company: Ship v2.0            │
│   ├─ ○ Team: Backend rewrite    │
│   │   └─ ● Agent: Migrate DB    │
│   └─ ◉ Team: Frontend polish    │
│       └─ ○ Agent: Fix A11y      │
│                                  │
└──────────────────────────────────┘
```

**Data source:** `GET /goals` — hierarchical via `parentId`

**Status icons:** ◉ active, ○ planned, ● achieved, ✕ cancelled

---

## 5. Panel Interaction Design

### Collapsible Sections
Each section in the left panel is collapsible with a click on the header. Collapsed state persisted in preferences.

### Responsive Behavior

| Window Width | Layout |
|-------------|--------|
| > 1400px | Left panel + Canvas + Right panel |
| 1100–1400px | Canvas + Right panel (left hidden) |
| < 1100px | Canvas only (both panels hidden) |

### Panel Toggle
Keyboard shortcut or button to show/hide left panel:
- `Ctrl+B` or `Cmd+B` — toggle left panel
- `Ctrl+J` or `Cmd+J` — toggle right panel

---

## 6. Color System

### Status Dot Colors
| Status | Color | CSS Variable |
|--------|-------|-------------|
| running | `#22c55e` pulse | `--color-success` |
| active/idle | `#3b82f6` | `--color-info` |
| paused | `#f59e0b` | `--color-warning` |
| error | `#ef4444` | `--color-error` |
| terminated | `#64748b` | `--color-text-dim` |
| pending_approval | `#f59e0b` pulse | `--color-warning` |
| connected | `#22c55e` | `--color-success` |

### Agent Role Colors (same as canvas sprites)
| Role | Color |
|------|-------|
| CEO | `#fbbf24` |
| CTO | `#60a5fa` |
| CMO | `#f472b6` |
| CFO | `#34d399` |
| Engineer | `#818cf8` |
| Designer | `#fb923c` |
| PM | `#a78bfa` |
| QA | `#2dd4bf` |
| DevOps | `#f87171` |
| Researcher | `#c084fc` |
| General | `#94a3b8` |

### Activity Entry Colors
| Actor Type | Left Border Color |
|-----------|------------------|
| Agent | `var(--color-role-engineer)` indigo |
| User/Board | `var(--color-role-ceo)` gold |
| System | `var(--color-info)` blue |

### Entity Glyphs
| Entity | Glyph |
|--------|-------|
| Agent | ◇ |
| Issue | ◆ |
| Approval | ✓ |
| Goal | ◎ |
| Project | ▤ |
| Default | • |

### Priority Colors (for panels and modals)
| Priority | Color |
|----------|-------|
| Critical | `#ef4444` |
| High | `#f97316` |
| Medium | `#eab308` |
| Low | `#3b82f6` |

---

## 7. Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Panel section title | System sans | `--text-xs` (11px) | 600, uppercase |
| Agent name (panel) | System sans | `--text-sm` (13px) | 500 |
| Agent role tag | System sans | `--text-xs` | 500 |
| Activity timestamp | Monospace | `--text-xs` | 500 |
| Activity text | System sans | `--text-sm` | 400 |
| Dashboard numbers | Monospace | `--text-lg` (16px) | 700 |
| Cost amounts | Monospace | `--text-sm` | 600 |
| Section headers | System sans | `--text-xs` | 600 |

---

## 8. Connection Screen

Centered card on dark background. No changes from current implementation.

- URL input (default: `http://localhost:3100`)
- API key input (optional, noted for local_trusted mode)
- Connect button
- Company selector after connection
- Error display

---

## 9. Future Panel Ideas (not yet planned)

These could be added to either side panel without touching the canvas:

| Idea | Panel | Data Source |
|------|-------|-------------|
| Run History | Left | `GET /heartbeat-runs` |
| Routine Schedule | Left | `GET /routines` |
| Plugin Status | Left | `GET /plugins` |
| Issue Detail Modal | Overlay | `GET /issues/:id` |
| Agent Detail Modal | Overlay | `GET /agents/:id` |
| Org Chart View | Left | `GET /agents` (reportsTo) |
| Cost Timeline Chart | Left | `GET /costs/summary` with date range |
| Budget Incidents | Left | `GET /budgets/overview` |
