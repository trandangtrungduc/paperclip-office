# Virtual Office — Architecture

## Development Scope

**The PixiJS office canvas and all sprite assets are frozen.** Active development targets only:
- **Right panel** — Enhance the existing activity feed
- **Left panel** — Add new structured info sections (agent roster, dashboard, costs, approvals, goals)
- **Overlay modals** — Detail views for agents, issues, settings
- **Main process** — New API endpoints, IPC channels, store logic to feed the panels

Do not modify files under `src/renderer/components/game/` or `src/renderer/assets/`.

## Process Model

```
┌─ Electron Main Process ─────────────────────────────┐
│                                                       │
│  PaperclipClient (ky)     PaperclipWebSocket (ws)    │
│  ├─ GET /companies         ├─ Connect with Bearer    │
│  ├─ GET /agents            ├─ Auto-reconnect         │
│  ├─ GET /issues            ├─ Ping/pong keepalive    │
│  ├─ GET /dashboard         └─ Parse LiveEvent JSON   │
│  ├─ GET /costs/summary                                │
│  └─ ...                    EventNormalizer            │
│                            └─ Raw → NormalizedEvent   │
│  ConfigStore (electron-store)                         │
│  └─ Connection, window state, preferences             │
│                                                       │
│  WindowManager  TrayManager  NotificationService      │
│                                                       │
│  ─── IPC Bridge (contextBridge) ───────────────────  │
└───────────────────────┬───────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────┐
│  Electron Renderer Process                             │
│                                                       │
│  React 19 + PixiJS 8                                  │
│                                                       │
│  ┌─ Zustand Store ──────────────────────────────┐    │
│  │ company, agents, projects, issues, goals,     │    │
│  │ approvals, costs, routines, plugins,          │    │
│  │ floors, selectedProjectId, activityLog,       │    │
│  │ whiteboardMode                                │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  ┌─ PixiJS Canvas ──────────────────────────────┐    │
│  │ OfficeRoom                                    │    │
│  │ ├─ Background (walls, floor tiles)            │    │
│  │ ├─ Wall decorations (sprites + procedural)    │    │
│  │ ├─ Desk layers (6-layer z-order)              │    │
│  │ └─ Agent sprites (body, arms, labels, bubbles)│    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  ┌─ React UI ───────────────────────────────────┐    │
│  │ ProjectTabs | ActivityFeed | StatusBar         │    │
│  │ ConnectionScreen | Modals                      │    │
│  └───────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

## Data Flow

### Initial Load
```
1. User enters URL → main process PaperclipClient.getHealth()
2. User selects company → main process fetches all data in parallel:
   GET /companies/:id, /agents, /projects, /issues, /goals,
   /approvals, /costs/summary, /activity, /routines, /plugins
3. Main sends CompanySnapshot via IPC → renderer
4. Zustand store: loadSnapshot() builds agent map, floor map, issue map
5. PixiJS renders office from store state
6. Main opens WebSocket → streams events via IPC → store.handleEvent()
```

### Real-Time Event Flow
```
Paperclip WebSocket → Main Process → EventNormalizer → IPC → useIpcEvents hook → Zustand store → React/PixiJS re-render
```

### Event Normalization
```typescript
// Raw Paperclip LiveEvent
{ type: "agent.status", payload: { agentId, status, previousStatus } }

// Normalized Office Event
{ kind: "agent:state-changed", agentId, status, previousStatus, timestamp }
```

## Key Files

| File | Role |
|------|------|
| `src/main/index.ts` | Electron entry, window/tray/IPC setup |
| `src/main/paperclip/client.ts` | REST client for all Paperclip endpoints |
| `src/main/paperclip/websocket.ts` | WebSocket with reconnect |
| `src/main/paperclip/event-normalizer.ts` | Raw → normalized event mapping |
| `src/preload/index.ts` | contextBridge typed API |
| `src/renderer/stores/officeStore.ts` | All state + event handlers |
| `src/renderer/components/game/OfficeCanvas.tsx` | PixiJS Application + texture loading (FROZEN) |
| `src/renderer/components/game/OfficeRoom.tsx` | Single room rendering (FROZEN) |
| `src/renderer/components/game/AgentBody.tsx` | Agent capsule body drawing (FROZEN) |
| `src/renderer/components/game/AgentArms.tsx` | Arm animations (FROZEN) |
| `src/shared/paperclip-types.ts` | Paperclip entity types |
| `src/shared/office-events.ts` | Normalized event types |
| `src/shared/ipc-channels.ts` | IPC channel constants |

## Technology Stack

| Concern | Technology |
|---------|-----------|
| Desktop shell | Electron 41 |
| Build | electron-vite 5 + Vite 7 |
| UI framework | React 19 |
| 2D rendering | PixiJS 8 + @pixi/react |
| State | Zustand 5 |
| State machines | XState 5 (not yet used, planned for future) |
| HTTP client | ky |
| WebSocket | ws |
| Config | electron-store |
| Validation | zod |
| Testing | Vitest + Playwright |
| Package manager | npm |
