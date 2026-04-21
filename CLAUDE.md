# Virtual Office

A 2D pixel-art Electron desktop app that visualizes a Paperclip AI company as a living office building.

## Project Overview

- **What:** Electron app that connects to a Paperclip instance and renders agents, tasks, budgets, and approvals as an animated pixel-art office
- **Source of truth:** Paperclip's REST API + WebSocket live events
- **Rendering:** PixiJS 8 for 2D canvas, React 19 for UI panels, Zustand for state
- **Architecture:** Electron main process handles networking (REST + WebSocket), renderer handles visualization

## Development Scope (IMPORTANT)

**The PixiJS office canvas and all sprite assets are FROZEN.** Do not modify:
- `src/renderer/components/game/` — canvas rendering (locked)
- `src/renderer/assets/` — sprites and textures (locked)

All active development goes into:
- **Right panel** — Enhance the existing activity feed (`src/renderer/components/layout/`)
- **Left panel** — New structured info sections (`src/renderer/components/layout/`)
- **Overlay modals** — Detail views (`src/renderer/components/modals/`)
- **Store / main process** — New data fetching, IPC channels, store slices to feed the panels

## Read Order

1. `docs/01-PRODUCT-OVERVIEW.md` — What we're building, current state, data sources
2. `docs/02-UI-DESIGN.md` — Layout, panel specs, color system, typography
3. `docs/03-ARCHITECTURE.md` — Process model, data flow, key files
4. `docs/04-PAPERCLIP-DATA-MAP.md` — API endpoints, WebSocket events, entity mapping
5. `docs/05-DEVELOPMENT-ROADMAP.md` — Phased task breakdown with priority
6. `docs/06-DEVELOPER-GUIDE.md` — Quick start, project structure, how-to guides

## Tech Stack

- **Runtime:** Electron 41, Node.js 22
- **Build:** electron-vite, TypeScript 5.7+
- **Renderer:** React 19, PixiJS 8, @pixi/react, Zustand 5
- **Main process:** ky (HTTP), ws (WebSocket), electron-store
- **Testing:** Vitest, Playwright, MSW
- **Package manager:** npm

## Project Structure

```
src/
├── main/              # Electron main process
│   ├── paperclip/     # REST client + WebSocket + event normalizer
│   ├── config/        # electron-store settings
│   └── ...            # Window manager, tray, notifications
├── preload/           # contextBridge IPC
├── renderer/          # React + PixiJS app
│   ├── stores/        # Zustand stores (office, animation, preferences)
│   ├── components/
│   │   ├── game/      # PixiJS rendering (Building, Floor, AgentSprite, etc.)
│   │   ├── layout/    # React UI panels (Sidebar, ActivityFeed, StatusBar)
│   │   └── modals/    # Connection, settings, detail modals
│   ├── machines/      # XState state machines (agent, elevator)
│   ├── systems/       # Animation, pathfinding, layout engine
│   └── assets/        # Sprites, tiles, fonts
└── shared/            # Types shared between main and renderer
```

## Key Commands

```bash
npm install            # Install dependencies
npm run dev            # Start dev mode with hot reload
npm run build          # Production build
npm test               # Run unit tests (Vitest)
npm run test:e2e       # Run E2E tests (Playwright)
npm run typecheck      # TypeScript type checking
npm run lint           # ESLint
npm run package        # Build distributable packages
```

## Paperclip Integration

- REST API at `http://<paperclip-host>:3100/api/`
- WebSocket at `ws://<paperclip-host>:3100/api/companies/:id/events/ws`
- Authentication: Bearer token (agent API key or board session)
- All networking happens in the Electron main process (no CORS)
- Events are normalized into office domain events before sending to renderer via IPC

## Key Patterns

- **Main process owns networking**: REST + WebSocket in main, data sent to renderer via IPC
- **Store-driven rendering**: Zustand stores are the single source of truth for the renderer
- **Event normalization**: Raw Paperclip events → NormalizedOfficeEvent → store update → visual change
- **Canvas is frozen**: PixiJS rendering is complete — all new features go into panels and modals

## Engineering Rules

1. Keep all API calls in `src/main/paperclip/client.ts` — renderer never calls Paperclip directly
2. All IPC channels defined in `src/shared/ipc-channels.ts` — no magic strings
3. Validate Paperclip API responses with zod schemas
4. Animation state lives in `animationStore`, business state in `officeStore` — keep them separate
5. PixiJS components should be pure renderers — they read from stores, never fetch data
6. Test event normalization and layout computation thoroughly — they're the core logic