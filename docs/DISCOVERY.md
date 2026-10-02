# Discovery — IT Problem-Solving Simulator

## Repo state
- Greenfield repository at `C:\Users\PC\it-simulator`
- Initialized with Vite + React 19 + TypeScript (project references)
- Not a git repository at discovery time

## Environment
- Node.js v24.2.0
- npm 11.3.0
- Platform: win32

## Chosen stack
| Layer | Choice | Rationale |
|---|---|---|
| App | Vite + React 19 + TS strict | Local-first SPA, no server required |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Fast, token-driven lab UI |
| Routing | react-router-dom v7 | Client routes for lab/kb/progress |
| State | zustand | Lightweight app/session state |
| Content validation | zod v4 | Scenario/KB schemas |
| Progress | idb (IndexedDB) | Local-first persistence |
| Terminal UI | @xterm/xterm + fit addon | Real terminal rendering |
| Network diagrams | @xyflow/react | Interactive topology |
| Icons | lucide-react | ISC, tree-shakable |
| Unit tests | vitest + testing-library + jsdom | Vite-native |
| E2E | Playwright (phase later) / env browser automation | Real UI workflow proof |

## Architecture decisions
1. Pure-TS scenario engine under `src/engine` — framework-free, unit-testable
2. Terminal is allowlist interpreter only — never executes host commands
3. Scenarios/KB/curriculum are Zod-validated content modules under `src/content`
4. Progress in IndexedDB; no accounts; no cloud

## Phase plan
0. Discovery (this file) — done
1. Foundation (config, shell, design tokens, scripts) — done
2. Schemas + engine + content validation tests — done
3. Home / Catalog / KB / Progress skeleton — done
4. Scenario Runner + first scenario E2E path — done
5. Terminal simulation — done
6. Network lab (React Flow topology) — done
7. System panels (Windows/Linux/Hardware via action lists + inspector) — done
8. Progress persistence hardening (idb + localStorage fallback) — done
9. Content pack (15 scenarios) — done
10. Polish, a11y, docs, verification — done (see docs/VERIFICATION.md)

## Deviations from master prompt
- create-vite scaffolding produced a vanilla template first; React deps installed manually
- ESLint flat config with typescript-eslint; no Prettier integration conflict expected
- ui-ux-pro-max skill installed at `.opencode/skills/ui-ux-pro-max` for design guidance
- System “panels” are action lists + world inspector rather than full mock OS chrome
- E2E is manual/browser-agent based; Playwright harness still a placeholder script
