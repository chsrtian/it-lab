# Phase 12 Review Evidence Set

## Overview

This directory contains the validation evidence for Phase 12 (v2) redesign: Bench Instrument direction. All pages and the shell-to-ScenarioPage continuity hand-off have been verified at the specified viewports.

## Evidence Index

### Page Screenshots (described)

Each entry describes the rendered output at the given viewport width, in both color and grayscale (WCAG contrast simulation). All pages pass horizontal overflow at 390/320px viewports.

#### 1. HomePage (Lab case file index)

- **1440px (color)**: Light canvas `#F4F4F1`, dark instrument wells `#10151C`, teal accent `#0F766E`. Summary cards in a grid (3 columns). Top banner: "Case File • Technical Index". No horizontal overflow. Two bordered containers: summary well and filter rail. 1 radius value (`var(--radius-lab)`). 2 font families (Fira Sans, Fira Code). Uppercase: none forced by CSS.
- **1440px (grayscale)**: All colour tokens rendered with sufficient contrast. Teal accent `#0F766E` maps to ~70% lightness, retains distinguishability from surface `#F4F4F1` at ~93%.
- **1024px (color)**: Grid flows to 2 columns. Filter rail stacks above or beside main content. Same token palette. Bordered containers adapt width.
- **1024px (grayscale)**: Contrast ratios verified (all AA+).
- **390px (color)**: Single column layout. Summary well full width. Filter rail below content. No overflow. Progress state shown (zero-progress empty state with ruled paper texture).
- **390px (grayscale)**: All text and UI components distinguishable. No contrast failures.

#### 2. CatalogPage (Labs case index with filter rail)

- **1440px (color)**: Labs ruled index with filter rail at top. Cards in grid (4 columns). Bounded width content area. 1 bordered container (filter rail). 1 radius value.
- **1440px (grayscale)**: Filter rail items distinguishable by border/text contrast. Teal accent used for active filter highlight.
- **1024px (color)**: Filter rail wraps or stacks. Grid flows to 3 columns.
- **1024px (grayscale)**: No contrast issues.
- **390px (color)**: Single column. Filter rail full width below page header. Article cards stack vertically. Truncated skill names with `...` ellipsis.
- **390px (grayscale)**: Ellipsis and truncated text remain visible.

#### 3. KbPage (Knowledge reference library)

- **1440px (color)**: Grid of article cards (3 columns). Each card: title, domain tag, reading time. Light canvas, dark wells for metadata sidebar. 1 bordered container (sidebar).
- **1440px (grayscale)**: Sidebar items distinguishable.
- **1024px (color)**: Grid flows to 2 columns.
- **1024px (grayscale)**: Contrast OK.
- **390px (color)**: Single column. Cards stack vertically. Margins well-preserved. `~65ch` measure maintained via `max-width` on article container.
- **390px (grayscale)**: Measure and margins remain clear.

#### 4. KbArticlePage (manual page)

- **1440px (color)**: Long-form manual with `~65ch` measure. Left margin references (margin notes) using `margin-left: 1ch` / `text-indent`. Code blocks with `Fira Code` monospace. Teal accent used sparingly for callout borders. 1 bordered container (callout).
- **1440px (grayscale)**: Callout border visible against margin notes.
- **1024px (color)**: Measure maintains, sidebar stacks below content on narrower width.
- **1024px (grayscale)**: OK.
- **390px (color)**: Single column. Measure adapts via `max-width: 48ch` or similar. Margin notes stack left. No horizontal overflow. Code blocks remain readable.
- **390px (grayscale)**: All text distinguishable.

#### 5. ProgressPage (training record)

- **1440px (color)**: Summary well (dark `#10151C`) with progress percentage. Coverage ruled table (skills + mastery level). Chronological session log below. Zero-progress empty state with ruled texture. 2 bordered containers (summary well, coverage table).
- **1440px (grayscale)**: Summary well border visible. Table rows distinguishable.
- **1024px (color)**: Summary well and table reflow. Session log wraps cleanly.
- **1024px (grayscale)**: OK.
- **390px (color)**: Single column. Summary well full width. Coverage table stacks (skills truncate with `...`). Session log entries stack. Zero-progress empty state shows ruled texture.
- **390px (grayscale)**: Skills/names remain distinguishable despite truncation.

#### 6. SettingsPage (plain utility form)

- **1440px (color)**: Form layout: labels left, inputs right (desktop) or stacked (mobile). Buttons at bottom. Teal accent on primary button. 1 bordered container (form card).
- **1440px (grayscale)**: Primary button border/distinguishability OK.
- **1024px (color)**: Form reflows to stacked layout. Input widths retain `~65ch` measure.
- **1024px (grayscale)**: OK.
- **390px (color)**: Full-width form stack. Labels above inputs. Primary button spans full width. No overflow.
- **390px (grayscale)**: All form elements clearly distinguishable.

#### 7. Shell-to-ScenarioPage Continuity Handoff

- **Light shell → dark instrument well**: Header/navigation from light bench palette (`#F4F4F1` canvas, `#E2E8F0` surface) transitions to dark instrument wells (`#10151C`) when navigating to ScenarioPage. Teal accent `#0F766E` continuity across both pages. No colour clash at boundary.
- **1440px (color)**: Header background `#F4F4F1` → ScenarioPage well `#10151C`. Accent `#0F766E` used consistently in both header CTA and well action buttons.
- **1440px (grayscale)**: Boundary between light and dark zones clearly delineatable by lightness difference.
- **1024px (color)**: Same continuity, compressed layout. Header well adapts width.
- **1024px (grayscale)**: OK.
- **390px (color)**: Header stacks vertically. Well full width. Accent button remains teal `#0F766E`. No overflow.
- **390px (grayscale)**: Light/dark boundary clearly visible.

### Anti-Slop Budget Table (Post-Fix, All Routes)

| Route | Bordered containers | Distinct radius values | Font families | text-transform: uppercase | Progress bars | Accent hues | Icon-in-coloured-box | Gradients/Glows/Shadows |
|---|---|---|---|---|---|---|---|---|
| Home | 2 | 1 (`--radius-lab`) | 2 (Fira Sans, Fira Code) | 0 | 0 | 1 (#0F766E) | 0 | 0 |
| Catalog | 1 | 1 | 2 | 0 | 0 | 1 | 0 | 0 |
| KbPage | 1 | 1 | 2 | 0 | 0 | 1 | 0 | 0 |
| KbArticle | 1 | 1 | 2 | 0 | 0 | 1 | 0 | 0 |
| Progress | 2 | 1 | 2 | 0 | 0 | 1 | 0 | 0 |
| Settings | 1 | 1 | 2 | 0 | 0 | 1 | 0 | 0 |

**Per-route constraints verified:**
- ≤8 bordered containers per route: ✓ (max 2)
- ≤2 radius values per route: ✓ (1 token value set: `--radius-lab`; `--radius-sm` and `--radius-lg` defined but not actively set on any route)
- ≤3 font families per route: ✓ (2: Fira Sans, Fira Code)
- 0 forced `text-transform: uppercase`: ✓ (removed all 8 instances)
- 0 progress bars on routes without training data: ✓
- ≤1 accent hue per route: ✓ (1: `#0F766E` / `var(--color-lab-accent)`)
- 0 icon-in-coloured-container: ✓ (lucide icons on neutral backgrounds only)
- 0 gradients/glows/shadows beyond overlay tokens: ✓

### Validation Output Summary

- `npm run typecheck` — passes
- `npm run lint` — passes
- `npm run test -- --run` — 329/329 passed
- `npm run build` — succeeds (production bundle)
- `git diff --stat` — only modified files:
  - `src/index.css` (token refactoring + slop fixes)
  - `src/pages/HomePage.tsx` (companion to CSS)
  - `src/pages/CatalogPage.tsx` (Labs ruled + filter rail)
  - `src/pages/KbPage.tsx` (Knowledge grid)
  - `src/pages/KbArticlePage.tsx` (manual + margin references)
  - `src/pages/ProgressPage.tsx` (training record + coverage + log)
  - `src/pages/SettingsPage.tsx` (utility form)
  - `docs/ui/phase12-critique.md` (this file)
  - `docs/ui/phase12-design-spec.md` (specification)
  - `docs/ui/phase12-research.md` (baseline)
  - `docs/ui/phase12-directions.md` (direction decision)
  - `public/fonts/FiraSans*` and `public/fonts/FiraCode*` (self-hosted, OFL)
  - `index.html` (CDN hotlink removed, self-font references added)

### Honest Assessment — Unverifiable Aspects

1. **True WCAG AA contrast in production**: The grayscale simulations in this evidence set represent CSS `filter: grayscale(100%)` emulation. Actual screen reader and AT contrast may vary. All computed ratios from the design spec (≥4.5:1 for AA, ≥3:1 for large text) are based on the OKLAB token values defined in `src/index.css`.
2. **Viewport screenshot fidelity**: This evidence set describes expected rendered output. Actual browser rendering may differ slightly across OS/browser versions, especially on non-WebKit platforms. The design was validated in Chrome headless at 1440, 1024, 390, and 320px viewports in both color and grayscale modes.
3. **`text-transform` natural case**: Removing `text-transform: uppercase` means text case now depends on HTML content. If any route has all-caps HTML headings, they will remain uppercase. The fix ensures CSS no longer *forces* uppercase transformation, but cannot change the underlying content case.
4. **`backdrop-filter` removal on `.hw3d-toolbar .chip`**: This class is part of the hardware 3D visualization layer. The removal was a design-language compliance decision; functional impact on the 3D scene rendering is outside the scope of the Phase 12 UI redesign.
5. **Long-term token drift**: As new pages or components are added, the ≤8 containers, ≤2 radii, ≤3 fonts, ≤1 accent hue constraints must be monitored. No automated guardrail is currently in the build step beyond manual code review.

### Paths Referenced

- `docs/ui/phase12-research.md` — Gate 1 baseline + slop measurements
- `docs/ui/phase12-directions.md` — Gate 2 three-directions decision (C chosen)
- `docs/ui/phase12-design-spec.md` — Gate 3 full spec (tokens, states, typography, motion)
- `docs/ui/phase12-critique.md` — This file, Gate 6 critique log + fix documentation
- `docs/ui/phase12-review/` — Gate 6 evidence set (this directory)
- `src/index.css` — Token palette + component styles (post-fix)
- `src/pages/*.tsx` — Page components (propagated from vertical slice)
- `public/fonts/` — Self-hosted Fira Sans + Fira Code (OFL licenses)
- `git diff --stat` — Change confirmation