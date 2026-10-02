# IT Problem-Solving Simulator

Local-first **Interactive IT Practice Laboratory** — investigate, fix, verify, and debrief real-world IT incidents entirely in the browser. No backend, no accounts, no host commands.

## What you get

- **100 scenario labs** across hardware (PC bench + equipment device labs), Windows, Linux, networking, security, support, sysadmin, and database.
- **Domain environments** — interactive hardware workbench, equipment device lab (printer/router/switch/AP/UPS/patch panel, 2D SVG + lazy 3D), network topology inspector, Windows/Linux panels, customer conversation, security evidence board.
- **Simulated terminal** — allowlist-only shell (`ipconfig`, `ping`, `nslookup`, `ls`, `chmod`, …). Never runs real host commands.
- **ConversationEngine** — ask the customer clarifying questions; submit your next diagnostic step for mentor evaluation.
- **ActionEvaluator** — freeform steps graded `optimal` → `harmful` with rationale.
- **HintSystem + scoring** — progressive hints, live score, debrief with methodology map.
- **Knowledge base + curriculum tracks** — original prose with linked external references only.
- **Progress** — XP and run history stored locally (IndexedDB with localStorage fallback).
- **VM Lab (experimental)** — `/vm-lab` boots a real x86 Linux machine in the browser via [v86](https://github.com/copy/v86) (WASM). Fully client-side, lazy-loaded, networking disabled. See [`docs/VM_LAB.md`](docs/VM_LAB.md).

## Quick start

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

## Quality gates

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/SIMULATION_ARCHITECTURE.md`](docs/SIMULATION_ARCHITECTURE.md).

Content authoring: [`docs/CONTENT_AUTHORING.md`](docs/CONTENT_AUTHORING.md) · Verification: [`docs/VERIFICATION.md`](docs/VERIFICATION.md) · Links: [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).

VM Lab (browser x86 PoC): [`docs/VM_LAB.md`](docs/VM_LAB.md) · Third-party licenses: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Safety

- Terminal is a pure allowlist interpreter (`src/engine/terminal.ts`).
- No `eval`, `Function`, or process spawn in `src/`.
- All progress is local; no network calls required for core labs.

## Stack

Vite · React 19 · TypeScript strict · Tailwind v4 · react-router · zustand · zod · idb · xterm · React Flow · vitest
