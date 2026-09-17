# 04 · Design System & Storybook Spec

Goal: a **small, real system** that the prototype *imports*. It should prove systems thinking (tokens → primitives → domain components) without over-building. Target about 12 components, each with variants, states, and docs.

## 1. Hard requirements (from brief)
- Tokens (color, spacing, type, radii) live in the DS package, not on screens.
- Stories show **states and variants**, not only the happy path.
- `apps/prototype` **imports from `@clickguard/ui`** (a workspace package). No local copies, no one-off styled components on screens.
- No duplicated hardcoded styles. **Enforced by lint (08 §4).**

## 2. Package architecture (DECISION, pending Tanzir's review)
```
clickguard-threat-monitoring/          pnpm workspace
├─ packages/
│  ├─ tokens/        @clickguard/tokens   tokens.ts → build → tokens.css (CSS vars) + tokens.json + TS consts
│  └─ ui/            @clickguard/ui       React components + CSS Modules consuming var(--cg-*)
│     └─ .storybook/                      Storybook 8 (react-vite)
├─ apps/
│  └─ prototype/     Vite + React + TS    depends on "@clickguard/ui": "workspace:*"
```
- **Why CSS vars + CSS Modules:** zero runtime, tokens are visible in devtools, trivial to theme later. Reviewers can open DevTools and see `var(--cg-color-status-blocked-fg)` instead of hex values. Rejected: Tailwind (turns into per-screen utility soup, which reads as "hardcoded styles"); styled-components (runtime cost, weaker token story).
- **Why headless TanStack Table inside `DataTable`:** real sort, filter, and expand logic without hand-rolling. Visuals remain 100% ours.
- Charts: **hand-built SVG** for JourneyStrip and EventTimeline. Rejected: Recharts/Chart.js (generic look, hard to hit the "minimal" brief).
- Icons: `lucide-react`, wrapped in an `Icon` component with token sizes.

## 3. Storybook structure
```
Foundations/
  Colors            swatches from tokens.json, grouped primitive / semantic, with contrast ratio
  Typography        every text style rendered
  Spacing & Radii
  Elevation & Motion
Primitives/
  Button · IconButton · Badge (StatusPill) · Chip (FilterChip) · Tooltip · Checkbox · TextInput (Search) · Select/Menu
Data display/
  DataTable · KeyValue · Stat · SignalBar
Domain (Threat Monitoring)/
  StatusPill · SourceTag · RiskScore · JourneyStrip · EventTimeline · VisitorSummaryPanel · EmptyState
Patterns/
  ThreatTable (composition: DataTable + domain cells)  ← the same composition the prototype uses
```
Every story file: `Default`, all variants, **Loading**, **Empty**, **Error or Edge** where relevant, plus a `Playground` with controls. Autodocs on. Add `@storybook/addon-a11y`.

## 4. Component specs

### 4.1 Button
| Prop | Values |
|---|---|
| `variant` | `primary` (lime CTA, brand), `secondary` (ink outline), `ghost`, `danger` (red outline, for "Block now"), `link` |
| `size` | `sm` 32h · `md` 36h (site's 2.25rem) |
| `iconStart/iconEnd` | Icon |
| States | default, hover, active, focus-visible, disabled, **loading** (spinner, keeps width) |
Rule in docs: only one `primary` per view.

### 4.2 StatusPill (visitor status)
| `status` | Label | Colour | Icon |
|---|---|---|---|
| `blocked` | Blocked | status-blocked | shield-x |
| `monitoring` | Monitoring | status-monitoring | eye |
| `clean` | Clean | status-clean | check |
| `allowed` | Always allowed | status-allowed | shield-check |
| `pending` | Blocking… (syncing) | status-neutral | loader |
| `failed` | Exclusion failed | status-blocked outline | alert-triangle |
Props: `size` sm/md, `withPlatforms?: Platform[]` renders mini platform glyphs (Google, Meta) after the label. Mono uppercase label (brand echo).
Stories: all statuses × sizes; with 0/1/2 platforms; truncated in narrow cell.

### 4.3 SourceTag (visit source)
`paid` (filled indigo dot + "Paid · Google Ads"), `organic`, `direct`, `referral` (hollow dot). Prop `platform?`. Stories: all, plus "Paid · missing GCLID" warning variant.

### 4.4 RiskScore
Score 0–100 with band. Props: `value`, `threshold` (default 70), `variant`: `inline` (number + small bar), `gauge` (panel header), `delta?` (e.g. +18 since last visit).
Bands: 0–39 Low · 40–69 Elevated · 70–100 High (≥ threshold). **The threshold tick is always drawn.**
Stories: 12, 55, 69 (just under, the ambiguous case), 70 (at threshold), 94; with delta; no data (`—`).

### 4.5 SignalBar
One row of evidence: signal name, observed value, contribution to the score (+pts), severity. Props: `label`, `value`, `contribution`, `severity: none|low|med|high`, `direction: up|down` (some signals *reduce* risk, e.g. "Completed checkout"), `hint`.
Stories: raising, lowering, neutral, long label wrap.
Why this exists: it turns the black-box score into ranked reasons. This is the core of the trust argument.

### 4.6 JourneyStrip ⭐ (the "Uber map" equivalent)
Minimal SVG, about 320×96 in the panel, and a larger variant in the full view.
- X axis: time from first to last visit (compressed gaps shown with a `//` break if > 24h).
- Dots per visit: filled = paid, hollow = unpaid, radius scaled by duration (clamped).
- Stepped line: cumulative risk score after each visit.
- Dashed horizontal line: threshold with a label.
- Marker at the crossing: `Blocked · visit 6` flag. After block, visits that happened anyway (e.g. organic) are rendered faded, with the label "after block".
- Hover/focus a dot → tooltip (time, source, score change). Click → select the visit (callback).
Props: `visits`, `threshold`, `blockedAtVisitId?`, `selectedVisitId?`, `size: sm|lg`, `onSelectVisit`.
Stories: **Malicious burst** (12 visits / 40 min), **Slow-burn competitor** (9 visits / 6 days), **Ambiguous hovering at 64**, **Single visit clean**, **Organic-only high risk (not blockable)**, **Blocked then allowed by user**, **Empty (no visits in range)**.

### 4.7 EventTimeline
Vertical list of in-visit events for the full breakdown.
Event kinds: `landed`, `page_view`, `scroll` (depth %), `click` (target), `form_focus`, `form_submit`, `idle`, `tab_hidden`, `exit`, `signal` (system flag inline, e.g. "Headless browser detected").
Each row: relative time `+00:04.2`, icon, description, optional signal flag chip.
Props: `events`, `density: compact|comfortable`, `highlightSignals`.
Stories: human-like session, bot session (land → exit in 0.8s, no scroll), long session collapsed with "Show 24 more".

### 4.8 DataTable (generic)
Wraps TanStack Table.
Features: sortable headers (`aria-sort`), sticky header, row hover, **selected row** (drives the panel), optional **expandable rows** (nested visits), row checkbox selection plus bulk bar, column `align`/`width`/`mono`, keyboard nav (↑/↓ move, Enter open, Esc close), `density`.
States: loading (skeleton rows), empty (slot), error (slot), no results after filtering (slot distinct from empty).
Stories: default, sorted, selected, expanded, bulk-selected, loading, empty, no-results, 1,000 rows (virtualised is OPTIONAL).

### 4.9 FilterChip & FilterBar
Chip: `label`, `value`, `active`, `onRemove`, `count?`. Menu-trigger variant.
Bar: search input (IP, city, ISP), chips for Status, Source (Paid only), Platform, Risk band, Date range, plus "Clear all".
Stories: none active, several active, overflow wrap.

### 4.9b SignalMeter (official per-visit signals)
Compact row of the 5 official visit signals: `InteractionLevel` (4-step meter none/low/medium/high), `BotProbability` (% + bar, bands <50 / 50–69 / ≥70), `VpnProxy` (yes/no tag), `FormFill` (Valid / Invalid / Disposable / — tag), `Conversion` (✓ / —). Stories: bot visit, human visit, missing values.

### 4.10 Stat
KPI tile: `label` (mono), `value` (numeric-lg), `delta?`, `tone?`. Used in the page header strip: Visitors · Blocked · Monitoring · Wasted spend (paid clicks from blocked IPs, pre-block) · Est. spend protected.

### 4.11 KeyValue
Label/value list for panel facts (IP, ISP, ASN type, Location, Device, Fingerprints seen). `mono` values. States: missing value `—`, copyable.

### 4.12 VisitorSummaryPanel (composed)
The right-side panel. It composes StatusPill, RiskScore, JourneyStrip, SignalBar (top 3), KeyValue, Button. Layout is in 05 §4.
Stories: Blocked-malicious, Monitoring-ambiguous, Clean, Allowed-by-user, Pending-sync, Exclusion-failed (Google 500 limit), Loading.

### 4.13 EmptyState
Props: `illustration?` (small radar icon, a nod to the site's radar Lottie), `title`, `body`, `action?`.
Variants: `no-data` ("No visitors yet, tracking script installed?"), `no-results` ("No visitors match these filters" + Clear filters), `error` (retry), `all-clean` (positive tone: "No threats in the last 7 days").

## 4b. Components added in v0.2 (from 05a / 05b)
| Component | Layer | Purpose | Key props | States / stories | Priority |
|---|---|---|---|---|---|
| `VisitRibbon` | domain | row "map thumbnail": visits on a range track | `visits[{t,paid,afterBlock}]`, `range`, `blockedAt?`, `onDotClick` | 1 visit · burst · spread over 7d · >40 binned · after block · empty | P0 |
| `DecisionRoute` | domain | Uber-style vertical stepper (first seen → crossed → excluded → last seen) | `nodes[{kind,title,time,sub}]`, `onNodeClick` | blocked · monitoring (peak + would-block dashed) · allowed · single visit | P0 |
| `ExclusionList` | domain | per-platform receipt lines | `rows[{platform,state,at,scope,latency,error}]`, `onRetry`, `onConnect` | excluded · syncing · failed · not connected · removed | P0 |
| `SpendReceipt` | domain | fare-breakdown style spend | `lines[]`, `total`, `label`, `tone`, `protectedEst`, `paidAfterBlock` | blocked · monitoring · clean with ROI · failed with leak | P0 |
| `VerdictCard` | domain | status + generated sentence | `status`, `sentence` (rich: bold numbers), `meta` | all statuses | P0 |
| `FilterEditor` | data | typed editors behind Add filter | `type: categorical|numeric|date|boolean`, `options+counts`, `histogram?` | each type · with histogram · searchable list · empty options | P0 (categorical, numeric), P1 (date) |
| `FilterTag` | data | stacked filter summary, click to edit | `field`, `summary`, `onEdit`, `onRemove` | short · truncated `+3` · focused | P0 |
| `BatchBar` | data | replaces filter bar on selection | `count`, `actions[{label,disabled,reason}]` | 1 · many · with disabled action | P0 |
| `QuickFilter` | data | hover ⊕/⊖ on a value | `field`, `value`, `onInclude`, `onExclude` | idle · hover · keyboard focus | P1 |
| `InsightList` | data | Cloudflare-style top-N bars | `title`, `rows[{label,count,pct}]` | 5 rows · 1 row · empty | P1 |
| `SegmentedControl` | primitive | Visitors / Visits, time format, density | `options`, `value` | 2–3 options · disabled | P0 |
| `Popover` / `ConfirmPopover` | primitive | allow/block confirms, signal popover | `title`, `body`, `confirmLabel`, `tone` | default · danger · with note input | P0 |
| `Toast` | primitive | action result + Undo | `message`, `action?`, `duration` | info · success · with undo | P0 |
| `Sheet` | primitive | full journey container | `open`, `width`, `onClose` | open · with scrim · reduced motion | P0 |
| `Tabs` | primitive | Events / Score / Device / Raw | `items`, `value` | default · overflow | P0 |
| `RiskChart` (was JourneyStrip) | domain | stepped score, threshold, over-limit area, markers, block/allow lines, hover tooltip; `size: panel|wide`, `brushable` (P1) | see 05b §3 E | all H-scenario stories + binned | P0 |
| `VisitStream` | domain | Day → Visit rows, system rows, filters chips, expand all | `days[]`, `selectedId`, `filters` | blocked with divider · allowed · failed · empty filter | P0 |
| `BehaviorScrubber` | domain | LogRocket-style activity timebar | `durationMs`, `buckets[]`, `markers[]`, `cursor`, `onScrub`, `compressIdle` | bot (empty track) · human · long with idle compression · no JS | P0 static, P1 playback |
| `ScoreWaterfall` | domain | per-visit / whole-journey score build-up | `start`, `steps[{label,reason,points}]`, `end`, `threshold` | crossing · capped · decay · mitigating | P0 |
| `ActivityHeatmap` | data viz | 7×24 visits | `matrix`, `caption?` | 9–5 pattern · random · empty | P1 |
| `GapHistogram` | data viz | paid click gaps | `gaps[]`, `caption?` | regular · irregular · <3 clicks hidden | P1 |
| `JsonViewer` | data | Raw tab | `value`, `maskKeys` | small · long collapsed | P1 |

StatusPill / SignalBar / SignalMeter / KeyValue gain: `onQuickFilter` (P1), `copyable` (KeyValue), severity `high|med|low|lowers` (SignalBar, matching Sift red/amber/green).

## 5. Docs page per component (MDX, short)
- When to use / when not to use
- Anatomy
- Token table (which semantic tokens it reads)
- Accessibility notes (roles, keyboard)

## 6. Acceptance
- [ ] `grep -R "#[0-9a-fA-F]\{3,6\}" packages/ui/src apps/prototype/src` → 0 hits (except tokens package)
- [ ] Every component in the prototype comes from `@clickguard/ui`
- [ ] Storybook builds statically and is deployed
- [ ] a11y addon: no critical violations on stories
- [ ] Foundations pages are generated from `tokens.json`, not typed by hand
