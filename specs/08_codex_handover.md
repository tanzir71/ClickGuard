# 08 · Codex Handover: Build Instructions

**Read first:** `01_brief.md` (requirements), then `03` (tokens), `04` (design system incl. §4b), `05` (decisions and overview), **`05a` (table, exhaustive)**, **`05b` (panel and full journey, exhaustive)**, `06` (data incl. §2b derived fields). `09` is background: why each pattern exists. When files conflict: 05a/05b › 05 › 04. This file defines build order, guardrails, and done criteria. Where specs say `OPEN` or `PROPOSAL`, follow the resolution Tanzir writes inline; if none, use the recommended option.

## 0. Non-negotiables
1. The prototype **imports components from `@clickguard/ui`**. It never defines its own styled components. Screen files hold layout composition only (flex/grid through `Stack`/`Grid` primitives or token-driven layout classes from `@clickguard/ui`).
2. **No literal colours, px spacing, radii, or font sizes outside `packages/tokens`.** Enforced by stylelint + an ESLint rule (see §4).
3. Mock data is **deterministic** (fixed seed, fixed "now" = `2026-09-17T14:00:00Z`) and passes the mechanics tests in 06 §7.
4. Real sorting, filtering, drill-down, empty and edge states. Nothing faked with static screenshots.
5. Keep it small and finished. Cut optional items (§6) before cutting states or tests.

## 1. Stack
- pnpm workspaces · TypeScript strict · React 18 · Vite
- Storybook 8 (`@storybook/react-vite`), addons: essentials, a11y, interactions
- CSS Modules + CSS custom properties (tokens)
- `@tanstack/react-table` (headless) · `lucide-react` · `@floating-ui/react` for tooltip/popover (or Radix primitives, unstyled)
- Vitest + Testing Library
- Fonts: Host Grotesk (Google Fonts), JetBrains Mono (`@fontsource`)
- Deploy: Vercel. Project 1 = `apps/prototype`, Project 2 = Storybook static (`packages/ui/storybook-static`)

## 2. Repo layout
```
/
├─ package.json            scripts: dev, build, storybook, build-storybook, test, lint
├─ pnpm-workspace.yaml
├─ packages/tokens/
│  ├─ src/tokens.ts        primitives + semantic (03 §2), single source of truth
│  ├─ scripts/build.ts     → dist/tokens.css (:root vars, prefix --cg-), dist/tokens.json, dist/index.ts
│  └─ package.json         exports "./tokens.css", "."
├─ packages/ui/
│  ├─ src/
│  │  ├─ foundations/      global.css (reset, font import, imports tokens.css)
│  │  ├─ primitives/       Button, IconButton, Tooltip, Checkbox, TextInput, Menu, Stack, Text
│  │  ├─ data/             DataTable, KeyValue, Stat, SignalBar, SignalMeter
│  │  ├─ domain/           StatusPill, SourceTag, RiskScore, JourneyStrip, EventTimeline, VisitorSummaryPanel, EmptyState, FilterBar, FilterChip
│  │  ├─ patterns/         ThreatTable
│  │  └─ index.ts          public exports
│  ├─ .storybook/          main.ts, preview.ts (imports global.css), Foundations MDX pages
│  └─ package.json         name "@clickguard/ui"
└─ apps/prototype/
   ├─ src/
   │  ├─ data/             types.ts, seed.ts (PRNG), scenarios.ts (H1–H13), crowd.ts, scoring.ts, derive.ts, *.test.ts
   │  ├─ state/            url-state (filters, sort, selected visitor), actions (allow/block with undo)
   │  ├─ screens/ThreatMonitoring.tsx
   │  ├─ shell/AppShell.tsx  (composition of ui components only)
   │  └─ main.tsx          imports "@clickguard/ui/global.css"
   └─ package.json        deps: "@clickguard/ui": "workspace:*"
```
Domain component props take **plain view-model types** (defined in `@clickguard/ui`), not the prototype's data types, so Storybook stays independent. The prototype maps data → view models in `derive.ts`.

## 3. Build order (commit per step, with conventional commit messages)
1. **Scaffold** workspace, TS configs, lint, Vitest, Storybook boots.
2. **Tokens** package from 03 §2 → CSS/JSON. Storybook Foundations pages render from `tokens.json` (colours with contrast ratio, type ramp, spacing, radii, shadows).
3. **Primitives**: Button, Text, Stack, Tooltip, Checkbox, TextInput, Menu, each with stories (variants and states).
4. **Data display**: StatusPill, SourceTag, RiskScore, SignalBar, SignalMeter, KeyValue, Stat, EmptyState + stories.
5. **Data layer** (prototype): types, seeded generator, scoring, H1–H13, derive, tests green.
6. **JourneyStrip** + **EventTimeline** + stories fed by fixtures copied from H1/H2/H3/H5/H6.
7. **DataTable** + **FilterBar** (search with bold match, Add filter → FilterEditor → FilterTag, BatchBar) + **ThreatTable** with the exact columns in 05a §6 + VisitRibbon + inline expand (05a §8) + stories (sorted, selected, expanded, bulk, loading, empty, no-results).
8. **VisitorSummaryPanel** sections A–L (05b §3) using VerdictCard, ExclusionList, DecisionRoute, RiskChart(panel), SignalBar, SignalMeter, SpendReceipt, KeyValue + stories for every row in 05b §4.
9. **Prototype screen**: AppShell, stat row, filters ↔ URL, table, panel, keyboard nav.
10. **Full journey sheet** (05b §5–9), **Score tab default on the trigger/peak visit**: Summary card, RiskChart(wide), VisitStream, visit header, SignalMeter, BehaviorScrubber (static), tabs Events / Score (ScoreWaterfall) / Device & network. P1: brush, heatmap, gap histogram, Raw, scrubber playback.
11. **Actions**: Always allow / Block now with confirm + undo toast (in-memory state).
12. **States**: loading skeleton, empty, no-results, error, demo switcher (`?simulate=empty|error|slow`).
13. **a11y + polish pass**: focus order, aria labels on strip dots, reduced motion.
14. **Deploy** both. Add URLs to README.

## 4. Guardrails (automated)
- **Stylelint** in `packages/ui` and `apps/prototype`: `color-no-hex: true`, `declaration-property-unit-allowed-list` blocking `px` on `margin|padding|gap|font-size|border-radius` (allow `var(--cg-*)`), `function-disallowed-list: [rgb, rgba, hsl]`. `packages/tokens` is excluded.
- **ESLint**: `no-restricted-syntax` to ban `style={{…}}` literal colour/spacing in `apps/prototype` (allow dynamic geometry in SVG inside `packages/ui` only).
- **ESLint import rule**: `apps/prototype` may not import from `packages/ui/src/**` paths, only the `@clickguard/ui` entry.
- CI script `pnpm check` = lint + typecheck + test + build + build-storybook.

## 5. Acceptance checklist
**Design system**
- [ ] Storybook deployed. Foundations pages render from tokens.
- [ ] ≥12 components with variants + states + autodocs + a11y check.
- [ ] `grep -rE "#[0-9a-fA-F]{3,8}\b" packages/ui/src apps/prototype/src` → 0.
- [ ] Prototype `package.json` depends on `@clickguard/ui`, and every visual component on screen comes from it.

**Prototype**
- [ ] ~160 visitors / ~900 visits, H1–H13 present, mechanics tests pass.
- [ ] Sort on every sortable column. Filters: search, status, paid-only, platform, risk, date range. URL-synced. Result count.
- [ ] Row click → panel with verdict, strip, timestamps, top signals, money, actions. ↑/↓ and Esc work.
- [ ] Row expand → nested visits with block divider and "after block" muted rows.
- [ ] Full journey: default-selects the block-trigger visit. Events/Signals/Device tabs work.
- [ ] All states in 05 §8 are reachable (demo switcher for global ones).
- [ ] Allow / Block with confirm + undo updates the row, panel, and stats.
- [ ] Deployed and loads in < 2s on desktop.

## 6. Cut list if time runs short (in order)
0. Everything tagged **P2** in 05a/05b is out by default. Build all P0 first (the Visits view is P0), then P1 in this order: signal popover → brush → heatmap/gaps → Raw tab → insights strip → quick filters → custom saved views.
1. Bulk actions → keep row actions only
2. Date range filter → fixed "Last 7 days"
3. Geo mini-map (if Proposal B chosen)
4. 1024px drawer-overlay responsive mode
5. Mini visit sparkline in Visits column

**Never cut:** verdict sentence, JourneyStrip, mitigating signals, empty/edge states, token lint, mechanics tests.

## 7. Working notes for Codex
- Ask before adding dependencies not listed in §1.
- When a spec is ambiguous, choose the simpler option and leave a `// DECISION:` comment plus a line in `DECISIONS.md` at the repo root. Tanzir uses this for the "where AI decided vs. where I overrode" rationale.
- Don't invent new colours or sizes. If one is needed, add it to `tokens.ts` with a comment and log it in `DECISIONS.md`.
