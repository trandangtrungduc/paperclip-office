# Virtual Office — Development Roadmap

## Principle

**The office canvas (PixiJS) is frozen.** All new features go into the side panels (left info panel, right activity feed) or as overlay modals. No changes to sprite rendering, desk layout, wall decorations, or agent positions.

## Status Legend
- [x] Done
- [ ] Not started

---

## Phase 1: Foundation (DONE)

- [x] Electron shell with electron-vite
- [x] Paperclip REST client (all endpoints)
- [x] WebSocket manager with auto-reconnect
- [x] Event normalizer (raw → office events)
- [x] IPC bridge (contextBridge typed API)
- [x] Zustand state store
- [x] Connection screen + company selector

## Phase 2: Office Rendering (DONE — FROZEN)

- [x] PixiJS canvas with 39 sprites
- [x] Wall decorations (clock, window, whiteboard, safety sign, elevator)
- [x] Desk layout (4 per row, 6-layer z-order)
- [x] Agent sprites (body, face, arms, headset)
- [x] Floor tiles, appliances, furniture
- [x] Project tab navigation
- [x] Activity feed panel
- [x] Real-time agent state updates via WebSocket

## Phase 3: Enhanced Activity Feed (Right Panel) (DONE)

Improve the existing right panel with richer event display.

- [x] **Cost event entries** — Show `$0.03 (claude-sonnet)` when `cost:recorded` arrives
- [x] **Heartbeat log entries** — Show tool call names and truncated stdout from `heartbeat:progress` events
- [x] **Approval alerts** — Highlight pending approvals with warning style and pulsing glow
- [x] **Run status entries** — Show "Started run" / "Run succeeded" / "Run failed" from heartbeat events
- [x] **Filter buttons** — Toggle filters: All | Agents | Issues | Costs | Approvals
- [x] **Entry detail tooltip** — Click an entry to expand full payload JSON
- [x] **Auto-scroll toggle** — Pin to bottom with smooth scroll, auto-disables on manual scroll-up

## Phase 4: Info Panel (Left Panel) (DONE)

Add an optional left panel with structured data sections.

### 4A: Panel Infrastructure
- [x] Add left panel to grid layout (3-column mode)
- [x] `Ctrl+B` / `Cmd+B` keyboard shortcut to toggle
- [x] Collapsible sections with chevron toggle
- [ ] Responsive: hide at < 1400px width (deferred — manual toggle sufficient)

### 4B: Agent Roster
- [x] List all agents with status dot, name, role (color-coded pill per role)
- [x] Current state description (running task, idle, paused reason, error)
- [x] Budget mini-bar per agent (spent / limit, color zones at 70%/90%)
- [x] Data: store `agents` map, auto-updates on WebSocket events

### 4C: Dashboard Summary
- [x] Display: agent counts (active/running/paused/error) — computed from store
- [x] Display: task counts (open/inProgress/blocked/done) — computed from issues
- [x] Display: budget utilization bar (% + dollar amounts) — aggregated from agents
- [x] Display: pending approvals count with warning highlight

### 4D: Cost Breakdown
- [x] Display: total monthly spend
- [x] Display: horizontal bar chart by agent (proportional bars)
- [x] Data: uses `costSummary` from snapshot (per-agent breakdown)

### 4E: Pending Approvals
- [x] Show pending approvals from store
- [x] Type label + requester name + time ago
- [ ] Future: Approve/Reject buttons (calls POST API)

### 4F: Goals Hierarchy
- [x] Tree display: hierarchical via `parentId`
- [x] Status icons: ◉ active, ○ planned, ● achieved, ✕ cancelled
- [x] Level labels (company/team/agent/task)

## Phase 5: Advanced Panels

### 5A: Run History Panel
- [ ] Fetch `GET /heartbeat-runs` (latest 50)
- [ ] Timeline: agent name, status icon, duration, start time
- [ ] Click to expand: show run events (tool calls, logs, errors)
- [ ] Color-coded: green=succeeded, red=failed, yellow=running, gray=cancelled

### 5B: Routine Schedule
- [ ] Fetch `GET /routines` with trigger data
- [ ] Display: routine name, cron schedule, next fire time
- [ ] Status indicator: active/paused
- [ ] Manual trigger button (calls `POST /routines/:id/run`)

### 5C: Plugin Status
- [ ] Fetch `GET /plugins` on connect
- [ ] List: plugin name, version, status LED (green/red/gray)
- [ ] Error detail on click for failed plugins

### 5D: Org Chart
- [ ] Build tree from agent `reportsTo` field
- [ ] Simple indented tree display in panel
- [ ] Role colors on names
- [ ] Status dots inline

## Phase 6: Overlay Modals

Modals that appear over the canvas for detail views.

### 6A: Agent Detail Modal
- [ ] Click agent in roster → modal with full agent info
- [ ] Fields: name, role, title, adapter type, status, budget, capabilities
- [ ] Recent runs list
- [ ] Cost history

### 6B: Issue Detail Modal
- [ ] Click issue in run history or activity → modal
- [ ] Fields: title, description, status, priority, assignee, comments
- [ ] Run history for this issue
- [ ] Execution state (review/approval stage)

### 6C: Settings Modal
- [ ] Connection management (switch Paperclip instance)
- [ ] Panel visibility toggles
- [ ] Refresh intervals (dashboard, costs, agents)
- [ ] Notification preferences

## Phase 7: Desktop Integration

- [ ] Desktop notifications for: agent error, budget exceeded, approval needed
- [ ] System tray context menu (company list, show/hide)
- [ ] Always-on-top compact mode
- [ ] Window state persistence

## Phase 8: Distribution

- [ ] electron-builder for Win/Mac/Linux
- [ ] Auto-update via GitHub Releases
- [ ] GitHub Actions CI (lint, typecheck, test, build)
- [ ] Unit tests for store, event normalizer
- [ ] E2E tests with mock Paperclip server

---

## Priority Order

Build what adds the most value with the least effort:

| # | Task | Effort | Impact | Why |
|---|------|--------|--------|-----|
| 1 | Phase 3: Enhanced activity feed | Low | High | Already have the panel, just richer entries |
| 2 | Phase 4C: Dashboard summary | Low | High | Single API call, most info-dense |
| 3 | Phase 4B: Agent roster | Low | High | Data already in store |
| 4 | Phase 4D: Cost breakdown | Medium | High | New API calls, charts |
| 5 | Phase 4E: Pending approvals | Low | Medium | Already in store |
| 6 | Phase 5A: Run history | Medium | Medium | New API + expandable UI |
| 7 | Phase 4F: Goals | Low | Low | Simple tree render |
| 8 | Phase 6: Modals | Medium | Medium | Detail views on demand |
| 9 | Phase 7: Desktop integration | Medium | Medium | Notifications, tray |
| 10 | Phase 8: Distribution | High | High | Ship to users |
