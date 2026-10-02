# Architecture — IT Problem-Solving Simulator

## Overview

Local-first Vite + React 19 SPA. No backend. All simulation runs in the browser.

```
src/
  app/           App shell, routes, nav
  pages/         Route-level pages (Home, Catalog, Scenario, KB, Progress, Settings)
  features/
    terminal/    xterm host wired to allowlist interpreter
    network/     React Flow topology driven by world state
    scenario/    World inspector panel
    environments/ Domain labs (Hardware, Network, Windows, Linux, Support, Security) + EnvironmentRenderer
  engine/        Pure TS scenario runtime: conditions, scenario, terminal,
                 evaluation (ActionEvaluator), conversation (ConversationEngine), scoring (HintSystem)
  content/       Zod schemas, scenarios, KB, curriculum
  store/         Zustand progress store
  storage/       IndexedDB (+ localStorage fallback) persistence
```

## Core principles

1. **Deterministic engine** — `src/engine` is framework-free; UI only dispatches actions.
2. **Safe terminal** — `executeSimulatedCommand` is an allowlist switch; never `eval`, never process spawn.
3. **Validated content** — Zod schemas in `src/content/schema`; link integrity in `validateContent()`.
4. **Local progress** — IndexedDB via `idb`; no accounts, no cloud.
5. **Domain environments** — `EnvironmentRenderer` picks a lab by category/kind; conversation is scenario-aware.

## Scenario run flow

1. User picks mode → `createRun(scenario, mode)` clones `initialWorld` + `createConversation`.
2. Actions/commands → `applyAction` / `recordCommand` → world patches + action log.
3. Freeform diagnosis → `submitDiagnosis` / `evaluateActionText` grades the step (optimal…harmful).
4. Customer Q&A → `askCustomer` matches script replies and reveals concepts.
5. `verify()` evaluates `verificationSteps` then `successConditions`.
6. On pass → debrief + `scoreRun` + `recordRun` (completed, +50 XP).

## Condition language

Limited to: `stateEquals`, `stateIn`, `commandRan`, `all`, `any`, `not`.
Special paths: `appliedActions`, `ranCommands` resolve from run context.

## Modes

| Mode | Behavior |
|------|----------|
| guided | Hints + hypotheses + full feedback |
| practice | Same tools, fewer hand-holds |
| challenge | Hypotheses panel hidden |

## Action evaluation grades

`optimal | good | reasonable | unnecessary | risky | wrong | harmful | unknown`
Optional per-action `evaluation: { grade, rationale, evidenceGain? }` with token matching via `matchHints`.

## Conversation script (optional on scenario)

`persona`, `opening`, `followUpQuestions[]`, `replies[{ match[], response, once?, revealsConcepts[] }]`, `defaultReply`, `mentorPrompts[]`.

## Scoring

`scoreRun` weights diagnostic/fix points, subtracts hint and wrong-action penalties; grades excellent/good/passing/needs-work after verify.

## UI design system

Generated with `.opencode/skills/ui-ux-pro-max` for dark technical dashboard:
- Palette: `#020617` / `#0F172A` / green CTA `#22C55E`
- Type: Fira Sans + Fira Code
- Rules: no emoji icons, cursor-pointer, focus rings, reduced motion, 40px targets
