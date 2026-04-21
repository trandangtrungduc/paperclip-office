# Virtual Office — Developer Guide

## Quick Start

```bash
cd paperclip-office
npm install
npm run dev          # Starts Electron + Vite dev server
```

Requires a Paperclip instance running at `http://localhost:3100`.

## Commands

| Command | What |
|---------|------|
| `npm run dev` | Dev mode (hot reload renderer, rebuild main on change) |
| `npm run build` | Production build to `out/` |
| `npm run start` | Run production build |
| `npm run typecheck` | TypeScript check (all processes) |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run package` | Build distributable (.exe/.dmg/.AppImage) |

## Project Structure

```
src/
├── main/                    # Electron main process (Node.js)
│   ├── index.ts             # App entry, window, tray, IPC handlers
│   ├── config/store.ts      # Persistent settings (electron-store)
│   └── paperclip/
│       ├── client.ts        # REST API client (ky)
│       ├── websocket.ts     # WebSocket with reconnect
│       └── event-normalizer.ts  # Raw → NormalizedOfficeEvent
│
├── preload/
│   └── index.ts             # contextBridge API (typed)
│
├── renderer/                # React + PixiJS (browser context)
│   ├── App.tsx              # Root: connection screen or office view
│   ├── main.tsx             # React mount point
│   ├── stores/
│   │   └── officeStore.ts   # Zustand store (all state + event handlers)
│   ├── hooks/
│   │   ├── useIpcEvents.ts  # Subscribe to main process events
│   │   └── useOfficeTextures.ts  # Load sprite textures
│   ├── components/
│   │   ├── game/            # PixiJS rendering
│   │   │   ├── OfficeCanvas.tsx   # Application + texture init
│   │   │   ├── OfficeRoom.tsx     # Full room rendering
│   │   │   ├── AgentBody.tsx      # Agent capsule body
│   │   │   ├── AgentArms.tsx      # Animated arms
│   │   │   └── city/CityWindow.tsx # Day/night skyline
│   │   └── layout/          # React UI panels
│   │       ├── OfficeView.tsx
│   │       ├── ConnectionScreen.tsx
│   │       ├── ProjectTabs.tsx
│   │       ├── ActivityFeed.tsx
│   │       └── StatusBar.tsx
│   ├── assets/
│   │   ├── officeSpriteUrls.ts    # Sprite import map
│   │   └── sprites/               # PNG files
│   ├── styles/
│   │   ├── tokens.css             # Design tokens
│   │   └── global.css             # Global styles
│   └── types/
│       ├── assets.d.ts            # PNG import types
│       └── electron.d.ts          # window.paperclip types
│
└── shared/                  # Types shared across processes
    ├── paperclip-types.ts   # Paperclip entity types
    ├── office-events.ts     # Normalized event types
    └── ipc-channels.ts      # IPC channel constants
```

## Key Patterns

### 1. Main Process Owns Networking

All HTTP and WebSocket calls happen in the main process. The renderer NEVER calls Paperclip directly. Data flows:

```
Main: fetch data → IPC channel → Renderer: store update → re-render
```

### 2. Event Normalization

Raw Paperclip `LiveEvent` objects are transformed into typed `NormalizedOfficeEvent` objects before reaching the renderer. This decouples the visualization from Paperclip's API shape.

### 3. Store-Driven Rendering

The Zustand store is the single source of truth. PixiJS components read from store selectors. When an event updates the store, React re-renders the affected PixiJS components.

### 4. 6-Layer Z-Order (FROZEN — reference only)

Each desk area renders in 6 layers to create proper depth:
1. Chair (behind everything)
2. Agent body (behind desk)
3. Desk surface + keyboard (covers agent lower body)
4. Agent arms (on top of desk)
5. Headset (on agent head)
6. Monitor + accessories (frontmost)

### 5. Texture Loading (FROZEN — reference only)

Sprites are imported as static ES module imports (`import url from '*.png'`). Vite resolves these to hashed URLs. PixiJS `Assets.load()` fetches them inside the Application context.

### 6. Procedural + Sprite Hybrid (FROZEN — reference only)

Many elements are drawn procedurally with PixiJS Graphics (agent bodies, clock, whiteboard frame) while furniture uses PNG sprite textures.

## Development Scope

**The PixiJS office canvas and all sprite assets are frozen.** Do not modify files under:
- `src/renderer/components/game/` — canvas rendering
- `src/renderer/assets/` — sprite images and texture maps

Active development targets:
- `src/renderer/components/layout/` — right panel enhancements, new left panel sections
- `src/renderer/components/modals/` — overlay detail views (new directory)
- `src/renderer/stores/` — new store slices for dashboard, costs, etc.
- `src/main/paperclip/client.ts` — new API endpoint methods
- `src/main/index.ts` — new IPC handlers
- `src/shared/` — new IPC channels, event types, shared types

## How To: Common Tasks

### Add a new Paperclip API endpoint

1. Add method to `src/main/paperclip/client.ts`
2. Add IPC handler in `src/main/index.ts`
3. Add channel to `src/shared/ipc-channels.ts`
4. Add to preload API in `src/preload/index.ts`
5. Use via `window.paperclip.yourMethod()` in renderer

### Add a new event type

1. Add to `NormalizedOfficeEvent` union in `src/shared/office-events.ts`
2. Add mapping in `src/main/paperclip/event-normalizer.ts`
3. Add handler case in `officeStore.handleEvent()`
4. Update panel components to respond to new state

### Add a new panel section (left panel)

1. Create component in `src/renderer/components/layout/` (e.g., `AgentRoster.tsx`)
2. Add data to Zustand store if not already there
3. Add periodic fetch in main process if needed (new IPC channel)
4. Add to left panel layout with collapsible header
5. Add CSS in `src/renderer/styles/`

### Add an overlay modal

1. Create component in `src/renderer/components/modals/`
2. Add modal state to store (open/close, selected entity ID)
3. Fetch detail data on-demand via IPC
4. Render as portal overlay above canvas + panels

## Environment Variables

| Var | Default | Purpose |
|-----|---------|---------|
| `ELECTRON_RENDERER_URL` | Auto-detected | Vite dev server URL |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Loading office..." stuck | Check browser console for CSP or texture load errors |
| Disk cache errors on WSL | Harmless NTFS permission issue, ignore |
| WebSocket won't connect | Check Paperclip is running, API key is correct |
| Sprites not showing | Check `officeSpriteUrls.ts` imports match filenames |
| Blank window on dev | Vite may not be ready — main process retries 75 times |
