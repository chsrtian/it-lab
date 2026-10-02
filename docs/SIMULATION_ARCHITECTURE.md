# Simulation Architecture

This document describes the Local Interactive IT Practice Laboratory simulation foundation introduced after the base catalog/terminal/network lab.

## Goals

- Domain-specific interactive environments (hardware, windows, linux, network, security, support).
- Scenario-aware conversation (customer + mentor).
- Deterministic action evaluation with quality grades.
- Progressive hints with scoring.
- Stateful investigation: actions change world state; evidence gates fixes; wrong actions have consequences.

## Engine modules (pure TypeScript)

| Module | File | Responsibility |
|--------|------|----------------|
| Conditions | `src/engine/conditions.ts` | Evaluate condition trees against world + run context; apply patches |
| Scenario runtime | `src/engine/scenario.ts` | createRun, applyAction, recordCommand, requestHint, verify, availableActions |
| Terminal | `src/engine/terminal.ts` | Allowlist simulated shell (never host commands) |
| ActionEvaluator | `src/engine/evaluation.ts` | Grade freeform text against actions; score deltas |
| ConversationEngine | `src/engine/conversation.ts` | Customer replies, mentor tips, diagnosis submission |
| HintSystem / scoring | `src/engine/scoring.ts` | scoreRun, hintPreview, nextHintLevel |

All engines are framework-free and unit-tested under `src/engine/*.test.ts`.

## Schema extensions (`src/content/schema/index.ts`)

Backward-compatible optional fields on `Scenario`:

- `environment.components[]` — which domain panels to prefer.
- `environment.showInspector` / `showTerminal` — layout toggles.
- `conversation` — customer/mentor script (optional; defaults derived from ticket).
- `conversationEnabled` — default true.
- `scoring` — weights for diagnostic/fix/hint/wrong penalties.
- `actions[].evaluation` — `{ grade, rationale, evidenceGain? }`.
- `actions[].matchHints[]` — freeform text matching aids.
- `hints[].category` — `method | tool | concept | direct`.

Content is authored as `ScenarioInput` (`z.input`) so defaulted fields may be omitted; runtime uses parsed `Scenario`.

## EnvironmentRenderer

`src/features/environments/EnvironmentRenderer.tsx` maps category/kind to:

| Domain | Component |
|--------|-----------|
| hardware / hardware-bench | `HardwareLab` |
| networking / network+terminal | `NetworkLab` (topology + inspector) |
| windows / windows-panel | `WindowsLab` (Event Viewer, Task Manager, Services, Device Manager) |
| linux / sysadmin / database | `LinuxLab` (filesystem, processes, services, packages) |
| security | `SecurityLab` (evidence board) |
| support / phone / walkup | `SupportLab` (customer chat + diagnosis) |

`ScenarioPage` layout: left ticket/score/hypotheses/actions/hints · center environment + terminal · right session log / inspector / concepts · debrief after verify.

## Conversation flow

1. Run start → `createConversation(scenario)` seeds customer opening.
2. Learner asks → `askCustomer` token-matches `conversation.replies` → response + optional `revealsConcepts`.
3. Learner states next step → `submitDiagnosis` → `evaluateActionText` grade + mentor reply; if the step is currently available, it is applied.
4. Mentor tips increment `mentorTipsShown` against `mentorPrompts`.

## Evaluation grades

| Grade | Score | Meaning |
|-------|------:|---------|
| optimal | +10 | Best next step for this state |
| good | +7 | Solid diagnostic/corrective |
| reasonable | +4 | Acceptable but weak |
| low-value | +1 | Low-value step — weak evidence |
| premature | −1 | Needs more evidence (`appliesWhen` not met) |
| unnecessary | 0 | Already done |
| unknown | 0 | Unrecognized freeform |
| risky | −1 | May cause side effects |
| wrong | −3 | Off track |
| harmful | −6 | Policy/security violation |

Freeform matching uses stop-word filtered token overlap + candidate coverage against `label`, id tokens, and `matchHints`. Actions with unmet `appliesWhen` grade as `premature` (does not override `wrong`/`risky`/`harmful`).

## State-driven terminal

`CommandResult` may include `worldPatch`. The terminal does **not** run host commands; it reads/patches simulated world only:

| Command | World effect |
|---------|--------------|
| `nslookup` | Reads `network.faults.dnsServerDown` / `dnsWrongRecord` and optional `world.dnsZones` map; fails while DNS down, resolves zone records after fix |
| `chmod <mode> <path>` | Clones virtual `world.fs`, sets file mode; sets `perms.configFixed` for safe modes (660/664/644/755) |
| `systemctl start\|stop\|restart\|enable` | Updates `world.services[]` status; fails when `world.svc.confReadable === false` unless fixed |
| `ping` / `ipconfig` / … | Output derived from `hosts`, `network.faults` (unchanged) |

`recordCommand(scenario, run, commandId, summary, worldPatch?)` applies the patch, logs the command, then tries `matchActionByText` on the typed line so diagnostic freeform (`ping gateway`) can auto-apply the matching scenario action when `appliesWhen` allows.

## Mentor concept explanations

`explainConcept(scenario, state, term)` answers from a deterministic glossary (DNS, DHCP, permissions, evidence, …) without revealing the fix path. SupportLab exposes “Ask mentor a concept” and chips that link to KB articles (`Learn: dns` → `/kb/what-is-dns`).

## Interactive labs

- **HardwareLab** — clickable SVG chassis zones (`power-supply`, `motherboard`, `ram`, `storage`, `cpu-cooler`, `front-panel`) map to actions via `component`/`inspectTarget`.
- **NetworkLab** — chip + topology node selection (`host`/`gateway`/`dns`/`dhcp`/`internet`); React Flow nodes selectable; “Learn {node}” KB links.
- **WindowsLab** — Event Viewer / Task Manager / Services / Device Manager tabs; services list is array-or-record aware; clickable service rows.
- **LinuxLab** — recursive VFS browser (path, mode, content preview) + services/processes/packages views.
- **SecurityLab** — evidence board + concept→KB chips.
- **SupportLab** — customer ask, freeform diagnosis evaluation, mentor tips, concept Q&A.

## Scoring formula (simplified)

```
raw = diagnosticPoints * diagnosticWeight
    + fixPoints * fixWeight
    - hintsUsed * hintPenalty
    - wrongActions * wrongActionPenalty
total = clamp(raw, 0, maxScore)
```

Grades after verify: excellent ≥85% · good ≥65% · passing otherwise.

## Migrated representative scenarios

| Scenario | Domain | Conversation | Evaluations |
|----------|--------|--------------|-------------|
| pc-no-power | hardware | yes (storm/outlet/button) | full |
| linux-permission-denied | linux | yes (identity/mode) | full |
| dns-some-sites-broken | networking | yes (cached vs new) | full |
| windows-wont-boot | windows | yes (update/USB) | environment components |
| account-lockout | support | yes (lockout/policy) | full |

Other scenarios remain valid with default ticket-derived conversation and inferred grades from `isDiagnostic`/`isFix`.

## Safety

- Terminal remains allowlist-only (`src/engine/terminal.ts`).
- No `eval` / `Function` / host process APIs in `src/`.
- Conversation matching is deterministic string/token matching — no external AI.

## Tests

- Existing: conditions, scenario golden paths, terminal safety, content integrity.
- New: `src/engine/simulation.test.ts` — evaluation, conversation, scoring, migrated paths.

## Future phases (not done)

- Deeper Event Viewer / packet capture simulation with world-driven event streams.
- Multi-turn customer branching trees with state machine.
- Adaptive difficulty and spaced-repetition review.
- Code-splitting for React Flow / xterm chunks (build size warning).
