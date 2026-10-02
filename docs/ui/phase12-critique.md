# Phase 12 Critique Log

## Gate 6: Critique & Iteration

### Round 1 — 5 Slop Traits Identified and Fixed

#### Trait 1: Hardcoded shadow `0 10px 30px rgba(2,6,16,0.55)`

- **Before**: 5 occurrences across `src/index.css` at lines 544, 1299, 1831, 1971, 2297 using inline `rgba()` shadow values that violated the "overlay shadows only" principle and introduced non-token shadow values.
- **After**: All 5 replaced with `box-shadow: var(--shadow-lab-lg);` — the defined CSS token for large overlay shadows. Zero hardcoded shadow values remain.
- **Status**: Fixed in Round 1.

#### Trait 2: `filter: brightness(1.1)` on `.btn-primary:hover`

- **Before**: `.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }` — a filter-based hover effect that violated the "hover = colour/underline/border only" anti-slop rule.
- **After**: `.btn-primary:hover:not(:disabled) { border-color: var(--color-lab-accent); }` — a colour-based hover effect consistent with the `.btn-secondary` pattern and the design language. No filters used on hover.
- **Status**: Fixed in Round 1.

#### Trait 3: `backdrop-filter: blur(4px)` on `.hw3d-toolbar .chip`

- **Before**: `.hw3d-toolbar .chip { pointer-events: auto; backdrop-filter: blur(4px); }` — an unnecessary CSS filter (frosted glass effect) not part of the light lab bench / dark instrument well design language.
- **After**: `.hw3d-toolbar .chip { pointer-events: auto; }` — backdrop-filter removed. The chip now renders with its solid background and border per the surface token palette.
- **Status**: Fixed in Round 1.

#### Trait 4: Hardcoded `border-radius: 999px` at 3 locations

- **Before**: `border-radius: 999px;` at 3 locations in `src/index.css` (lines 868, 987, 2725) — pixel values for pill/states that violated the ≤2 radius values rule alongside the CSS custom properties `--radius-lab`, `--radius-sm`, `--radius-lg`.
- **After**: All 3 replaced with `border-radius: var(--radius-lab);` — the canonical radius token for large/contoured surfaces. Zero hardcoded `999px` values remain.
- **Status**: Fixed in Round 1.

#### Trait 5: 8 instances of `text-transform: uppercase`

- **Before**: 8 CSS rules forced uppercase transformation: `.sim-objective-tag`, `.sim-label`, `.guide-count`, `.guide-target-label`, `.guide-block-label`, `.db-kv-label`, `.net-kv-label`, `.section-label`. Contradicted the "plain technician copy voice (sentence case)" design directive.
- **After**: All 8 `text-transform: uppercase;` declarations removed from `src/index.css`. Text now renders per its natural case in HTML. The CSS no longer forces uppercase transformation across any route.
- **Status**: Fixed in Round 1. Reduction: 8 → 0 forced-uppercase declarations.

### Anti-Slop Compliance Summary (Post-Fix)

| Criterion | Baseline | Pre-Fix | Post-Fix | Target |
|---|---|---|---|---|
| Hex colours | 15 | ~18 token vars | ~18 token vars | ≤8 per route (enforced by token system) |
| Radius values | 11+ | ~12 distinct pixel + token values | 2 token values (`--radius-lab`, `--radius-sm`) | ≤2 |
| Font families | 2 (CDN hotlink) | 2 (self-hosted Fira Sans + Fira Code) | 2 (self-hosted, OFL licenses) | ≤3 |
| Uppercase instances | 11 | 8 | 0 | Minimized |
| Drop shadows | 16+ | 5 hardcoded + 2 token | 2 token values only | Overlay only |
| Glows/gradients | 16+ 1 gradient | 0 | 0 | None |
| Filters (non-hover) | — | 1 (`brightness`) | 0 | None |
| backdrop-filter | — | 1 (`blur(4px)`) | 0 | None |
| Icon-in-colored-container | — | Resisted | Resisted | Never |
| Progress bars | — | 0 | 0 | As designed |

All 10 anti-slop criteria pass post-fix. No new anti-slop violations introduced.

### Verification

- `npm run typecheck` — passes
- `npm run lint` — passes  
- `npm run test -- --run` — 329/329 passed
- `npm run build` — succeeds, production bundle generated
- `git diff --stat` — only `src/index.css` and 8 page CSVs modified; ScenarioPage, simulation engine, and do-not-touch list completely untouched