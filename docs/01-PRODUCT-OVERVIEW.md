# Virtual Office — Product Overview

## What Is This?

Virtual Office is an Electron desktop app that connects to a **Paperclip** AI-company control plane and renders the organization as a **2D pixel-art office**. Agents sit at desks, type when working, celebrate when tasks succeed, show errors when they fail — all in real-time.

## Design Principle

**The office canvas is frozen.** Sprite rendering, desk layout, wall decorations, and agent positions are final. All new features go into:
- **Right panel** — Activity feed (enhanced with richer event types)
- **Left panel** — Structured info (agent roster, dashboard, costs, approvals, goals)
- **Overlay modals** — Detail views for agents, issues, settings

## Current State

### Done
- Electron shell (window, tray, IPC)
- Paperclip REST client + WebSocket with auto-reconnect
- Event normalization pipeline
- Zustand state store
- PixiJS office canvas: walls, floor tiles, desks (6-layer z-order), 39 sprite assets
- Agent sprites: 48×80 capsules with faces, arms, headsets, role colors
- Wall decorations: clock, city window, whiteboard, safety sign, elevator, appliances
- Project tab navigation
- Activity feed panel (right)
- Connection screen + company selector

### Next Up
- Enhanced activity feed (cost entries, heartbeat logs, filters)
- Left info panel (agent roster, dashboard metrics, cost breakdown, approvals, goals)
- Overlay modals (agent detail, issue detail, settings)
- Desktop notifications, auto-update, distribution

## Data Sources

| Source | Method | Refresh |
|--------|--------|---------|
| Agents, Issues, Projects, Goals, Approvals | REST on connect | + WebSocket updates |
| Dashboard summary | REST every 60s | `GET /dashboard` |
| Cost breakdown | REST every 120s | `GET /costs/by-agent` |
| Budget overview | REST every 120s | `GET /budgets/overview` |
| Activity log | WebSocket real-time | `activity.logged` events |
| Agent status | WebSocket real-time | `agent.status` events |
| Heartbeat runs | WebSocket real-time | `heartbeat.run.*` events |
