# Verification

## Commands

```bash
npm run typecheck   # tsc -b
npm run lint        # eslint
npm run test        # vitest (engine + content golden tests)
npm run build       # production bundle
npm run dev         # http://127.0.0.1:5173
```

## Test coverage (unit)

| Area | File |
|------|------|
| Conditions + patches | `src/engine/conditions.test.ts` |
| Scenario golden paths | `src/engine/scenario.test.ts` |
| Terminal allowlist safety | `src/engine/terminal.test.ts` |
| Simulation foundation (eval, conversation, scoring) | `src/engine/simulation.test.ts` |
| Content integrity (100 scenarios, link graph) | included in scenario + simulation tests |
| Equipment device model (registry sync, derivations, gating, seeds) | `src/features/environments/equipment/logic.test.ts` |
| Equipment rendering (routing, 2D/3D parity, capability gate) | `src/features/environments/equipmentExpansion.test.tsx` |

Golden paths covered:
- `pc-no-power` full diagnose → verify
- `linux-permission-denied`
- `dns-some-sites-broken`
- `windows-app-crash` + wrong-path feedback
- `account-lockout` identity workflow
- Premature action gating + hints
- ActionEvaluator grades + ConversationEngine replies
- scoreRun hint/wrong penalties

## Manual E2E checklist

1. Home loads with stats (no React `getSnapshot` errors).
2. Catalog filters/search; open a lab.
3. Start **Guided** on `pc-no-power` → hardware workbench → actions → Verify → debrief + score.
4. Open `account-lockout` → ask customer → submit diagnosis → mentor evaluation.
5. Network lab shows topology + terminal `help` / `ping`.
6. Progress updates XP/completed; Settings content integrity OK.
7. Keyboard: Tab focus visible; skip link works.
8. `npm run build` succeeds.

## Safety checks

- Terminal never executes host commands (`terminal.test.ts`).
- No `child_process`, `eval`, or `Function` in `src/`.
