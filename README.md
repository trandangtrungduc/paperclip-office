# Paperclip Office

A 2D pixel-art Electron desktop app that visualizes a [Paperclip](https://github.com/paperclipai/paperclip) AI company as a living office building. Agents, projects, issues, costs, and approvals stream in from a real Paperclip instance and animate across a multi-floor canvas, with React panels for structured metrics, activity, and drill-in modals.

![Paperclip Office demo](./resources/demo.gif)

## Setup in 1 minute

1. Start a Paperclip instance (local): [paperclipai/paperclip](https://github.com/paperclipai/paperclip)
2. Install dependencies and run the app:

   ```bash
   npm install
   npm run dev
   ```

3. In the connection screen, keep the default URL `http://localhost:3100` (or paste your hosted URL), then click **Connect**.
4. Pick your company and you are in.

For local Paperclip in trusted mode, API key can be left empty.

> **Note:** Install Paperclip first, and keep it in the default home path (`/home/<username>`).
> **Windows users:** Run this project through WSL (Ubuntu recommended) for the supported Windows workflow.

## Why this is easy

- **One-click local setup:** URL is prefilled as `http://localhost:3100`
- **Built for live data:** pulls REST snapshot + WebSocket updates from Paperclip
- **Connection memory:** app saves your last URL and selected company for faster reconnects
- **No CORS headaches:** all networking runs in Electron main process

## What this app shows

- Agents moving and working in a pixel office
- Project, issue, goal, and approval activity as it happens
- Cost and usage signals in side panels and modals

Think of it as an ambient "company status" window for your Paperclip company.

## Commands

| Command | What |
| --- | --- |
| `npm run dev` | Dev mode (hot reload renderer, rebuild main on change) |
| `npm run build` | Production build to `out/` |
| `npm run preview` / `npm run start` | Run the production build |
| `npm run typecheck` | Type-check all three tsconfigs |
| `npm run typecheck:main` / `:preload` / `:renderer` | Per-process type-check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run package` | Build Windows installer (NSIS x64) |
| `npm run package:win` | Same as `npm run package` |
| `npm run package:linux` | Build Linux AppImage |

## Tech stack

| Concern | Technology |
| --- | --- |
| Desktop shell | Electron 41 |
| Build | electron-vite 5 + Vite 7 |
| UI framework | React 19 |
| 2D rendering | PixiJS 8 + @pixi/react |
| State | Zustand 5 |
| HTTP client | ky |
| WebSocket | ws |
| Config | electron-store |
| Testing | Vitest + Playwright |
| Package manager | npm |

## Project layout

```
src/
├── main/                       # Electron main process (Node.js)
│   ├── index.ts                # App entry, window, tray, IPC handlers
│   ├── config/store.ts         # Persistent settings (electron-store)
│   └── paperclip/
│       ├── client.ts           # REST API client (ky)
│       ├── websocket.ts        # WebSocket with reconnect
│       └── event-normalizer.ts # Raw → NormalizedOfficeEvent
├── preload/
│   └── index.ts                # contextBridge typed API
├── renderer/                   # React + PixiJS
│   ├── App.tsx
│   ├── main.tsx
│   ├── stores/officeStore.ts   # Zustand store: state + event handlers
│   ├── hooks/                  # useIpcEvents, useOfficeTextures, …
│   ├── components/
│   │   ├── game/               # PixiJS rendering — FROZEN
│   │   ├── layout/             # React UI panels
│   │   └── modals/             # Overlay detail views
│   ├── assets/                 # Sprites, texture maps — FROZEN
│   ├── styles/                 # Tokens + global CSS
│   └── types/                  # Asset + window.paperclip typings
└── shared/                     # Cross-process types
    ├── paperclip-types.ts
    ├── office-events.ts
    └── ipc-channels.ts
```

## Development scope

The PixiJS canvas and sprite assets are **frozen**. Do not modify:

- `src/renderer/components/game/` — canvas rendering
- `src/renderer/assets/` — sprites and texture maps

Active development targets:

- `src/renderer/components/layout/` — right panel enhancements, new left panel sections
- `src/renderer/components/modals/` — overlay detail views
- `src/renderer/stores/` — new store slices for dashboard, costs, etc.
- `src/main/paperclip/client.ts` — new API endpoint methods
- `src/main/index.ts` — new IPC handlers
- `src/shared/` — new IPC channels, event types, shared types

## Data flow

```
Paperclip WebSocket → Main process → EventNormalizer → IPC
                                                        ↓
                                           useIpcEvents hook
                                                        ↓
                                             Zustand officeStore
                                                        ↓
                                      React panels + PixiJS canvas re-render
```

Initial load fetches all entities in parallel (`agents`, `projects`, `issues`, `goals`, `approvals`, `costs/summary`, `activity`, `routines`, `plugins`) into a `CompanySnapshot`, then the WebSocket takes over for live updates.

## Engineering rules

1. All API calls live in `src/main/paperclip/client.ts` — the renderer never calls Paperclip directly.
2. All IPC channels are declared in `src/shared/ipc-channels.ts` — no magic strings.
3. Raw Paperclip events are normalized to `NormalizedOfficeEvent` in `event-normalizer.ts` before crossing IPC.
4. The renderer is store-driven — PixiJS components read from `officeStore` and never fetch data.
5. Test the event normalizer and snapshot loader thoroughly — they are the core logic.

## Documentation

Deep-dive docs live in [`docs/`](./docs):

1. [`01-PRODUCT-OVERVIEW.md`](./docs/01-PRODUCT-OVERVIEW.md) — what we're building, current state, data sources
2. [`02-UI-DESIGN.md`](./docs/02-UI-DESIGN.md) — layout, panel specs, color system, typography
3. [`03-ARCHITECTURE.md`](./docs/03-ARCHITECTURE.md) — process model, data flow, key files
4. [`04-PAPERCLIP-DATA-MAP.md`](./docs/04-PAPERCLIP-DATA-MAP.md) — API endpoints, WebSocket events, entity mapping
5. [`05-DEVELOPMENT-ROADMAP.md`](./docs/05-DEVELOPMENT-ROADMAP.md) — phased task breakdown
6. [`06-DEVELOPER-GUIDE.md`](./docs/06-DEVELOPER-GUIDE.md) — quick start, project structure, how-to guides

## License

MIT
