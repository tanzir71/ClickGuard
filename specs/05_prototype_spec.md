# 05 · Prototype Spec: Threat Monitoring

One screen, three depths: **Table → Summary panel (Uber-style) → Full journey**.

> **v0.2: detail moved.** This file now holds the *decisions, layout overview, states and a11y*. The exhaustive specs live in:
> - **`05a_table_spec.md`**: stat tiles, insights strip, views, search, filter model, every column (variables, formats, sort keys), row states, inline expand, keyboard, footer, table states. **Supersedes §3.1, §3.3, §6, §7 below.**
> - **`05b_breakdown_spec.md`**: side panel sections A–L with variables and rules, verdict grammar, full journey sheet (summary, brushable chart, visit stream, behavior scrubber, Events/Score/Device/Raw tabs), motion. **Supersedes §4 and §5 below.**
> - Pattern sources: **`09_pattern_research.md`**.
> Where this file and 05a/05b disagree, **05a/05b win**.
Everything uses `@clickguard/ui` (see 04) and data from 06.

---

## 1. Job to be done
> "When I see traffic drop or a blocked IP, I want to open one visitor and understand in under 30 seconds **why** it was blocked, **where** (which ad platforms), **when**, and **what it cost me**, so I trust the tool and leave it on."

Secondary jobs: find visitors being *watched* but not blocked (ambiguous), undo a false positive, scan for patterns across visitors.

## 2. Core structural decisions

### D1. Row = Visitor (IP). Visits are nested. (DECISION)
- Blocking is per-IP and cumulative, so the visitor is where status lives.
- A visit-level table would repeat the same IP 12 times and hide the story.
- Visits are still reachable: row expand (inline) for a quick scan, and the full journey view for depth.
- *Rejected:* a flat visit log (ClickCease-style) **as the default**, because it forces the user to reconstruct the journey. A secondary **Visits view** toggle is kept (Samsara event/trip views) for "all paid clicks today" questions (05a §4.1).

### D2. Row click → right side panel. Table stays visible. (DECISION, Uber pattern)
- Keeps context for comparing rows. ↑/↓ moves through visitors while the panel updates.
- *Rejected:* a modal (breaks scanning); inline expand as the *only* drill-down (too cramped for the explanation).

### D3. Verdict first. (DECISION)
The panel opens with a **one-sentence, plain-language verdict** generated from the data, before any numbers:
> **Blocked on Google Ads and Meta Ads** on 14 Sep, 14:32, after **visit 6 of 12**. 6 paid clicks in 38 minutes from a data-center IP with no scrolling.

### D4. Show the threshold, not just the score. (DECISION)
The JourneyStrip shows the score climbing across visits and crossing the dashed threshold line. This is the "map".

### D5. Money on every paid visit. (PROPOSAL)
Each paid visit shows an estimated CPC. The panel shows **Wasted before block** and **Paid clicks prevented since block (est.)**. Organic visits say "No ad spend".

## 3. Page layout (desktop ≥1280; target 1440)

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ▣ ClickGuard   Dashboard  Threat Monitoring•  Rules  Reports          acme-shoes.com ▾  (T) │  AppShell top bar
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ Threat Monitoring                                              Last 7 days ▾   Export      │
│ Every visitor we evaluated, and why we did or didn't block them.                           │
│ ┌──────────┐┌──────────┐┌────────────┐┌──────────────┐┌──────────────────┐                  │
│ │VISITORS  ││BLOCKED   ││MONITORING  ││WASTED SPEND  ││SPEND PROTECTED   │  Stat row        │
│ │ 1,284    ││ 47  ▲12  ││ 9          ││ $312         ││ ~$1,940 est.     │  (click = filter)│
│ └──────────┘└──────────┘└────────────┘└──────────────┘└──────────────────┘                  │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search IP, city, ISP…   [Status ▾] [Paid visits only] [Platform ▾] [Risk ▾]  Clear all  │  FilterBar
├──────────────────────────────────────────────────────────┬────────────────────────────────┤
│ ☐ VISITOR          STATUS          RISK   VISITS  PAID  LAST SEEN ▾ │  VisitorSummaryPanel      │
│ ☐ 185.220.101.4    ● BLOCKED G M   94 ▮   12      12    2h ago      │  (see §4)                 │
│   Frankfurt · Hetzner (DC)                                          │                           │
│ ☐ 72.14.201.88     ● MONITORING    64 ▮   7       4     5h ago      │                           │
│   Austin · Spectrum · 3 devices                                     │                           │
│ ☐ …                                                                 │                           │
└──────────────────────────────────────────────────────────┴────────────────────────────────┘
```
Panel width 440px. Table columns shrink, and secondary columns hide when the panel is open (see §3.2).

### 3.1 Table columns
| Column | Content | Sort | Notes |
|---|---|---|---|
| ☐ | Row select | – | Bulk actions |
| **Visitor** | `IP` (mono) + line 2: `City · ISP` + tags (`DC`, `VPN`, `3 devices`) | IP | Truncate with tooltip |
| **Status** | StatusPill + platform glyphs | by severity order | blocked > failed > pending > monitoring > allowed > clean |
| **Risk** | RiskScore inline (0–100, threshold tick) | ✓ | |
| **Bot prob.** | max bot probability % (official signal) | ✓ | hidden when panel open. DECISION: keep as a column |
| **Visits** | total, with mini sparkline of visit dots (optional) | ✓ | |
| **Paid** | paid visits count · `$` wasted | ✓ | Muted if 0 |
| **First seen** | relative, absolute on hover | ✓ | hidden when panel open |
| **Last seen** | relative | ✓ default desc | |
| **Blocked at** | date/time · "visit 6" | ✓ | hidden when panel open |
| ⋯ | Row menu: Open journey, Copy IP, Always allow, Block now | – | |

Default sort: **Priority** (DECISION, see 05a §6).

### 3.2 Responsive
- 1024–1279: panel overlays the table as a drawer with a scrim.
- < 1024: out of scope. Show a "best on desktop" note, but don't break layout.

### 3.3 Row expand (inline, secondary)
Chevron at row start → nested visit rows (mini table: `#`, time, SourceTag, landing page, duration, events, Δscore). A block marker row sits between visit N and N+1: `── Added to exclusion lists · Google Ads, Meta Ads · 14 Sep 14:32 ──`. **Visits after the block** are shown muted with "after block" (e.g. organic return). That proves the block took effect on ads.

## 4. VisitorSummaryPanel (the Uber moment)

```
┌────────────────────────────────────────┐
│ 185.220.101.4  ⧉            ↑ ↓   ✕    │  header: IP (copy), prev/next, close
│ Frankfurt, DE · Hetzner Online · DC    │
│ ● BLOCKED   Google Ads ✓  Meta Ads ✓   │
├────────────────────────────────────────┤
│ Blocked on 14 Sep, 14:32 after visit   │  Verdict sentence (§4.2)
│ 6 of 12. Six paid clicks in 38 min     │
│ from a data-center IP, no scrolling.   │
├────────────────────────────────────────┤
│ RISK JOURNEY                    94/100 │  JourneyStrip (§4.3)
│ 100┤                ___●──●──○──○      │
│  70┤- - - - - - - -⚑- - - - - - -  thr │
│    │    ___●──●──●                     │
│   0┤●──●                               │
│    14:02            14:32        16:10 │
│    ● paid  ○ organic/direct            │
├────────────────────────────────────────┤
│ FIRST SEEN   14 Sep 14:02              │  Timestamps (like pickup/drop-off)
│ BLOCKED      14 Sep 14:32 · visit 6    │
│ LAST SEEN    14 Sep 16:10 · after block│
├────────────────────────────────────────┤
│ WHY WE BLOCKED               top 3     │  SignalBar ×3
│ ▲ Click burst: 6 paid / 38 min    +28  │
│ ▲ Data-center network (Hetzner)   +22  │
│ ▲ Bot probability 96%, no interaction +30│
│   View all 9 signals                   │
├────────────────────────────────────────┤
│ 12 VISITS · 8 PAID · $41.60 WASTED     │  mini stats
│ ~$58 protected since block (est.)      │
├────────────────────────────────────────┤
│ [ Open full journey → ]  (primary)     │  one primary CTA
│  Always allow this IP    (ghost)       │
└────────────────────────────────────────┘
```

### 4.1 Header
IP + copy, location · ISP · network type tag, StatusPill with **per-platform status** (✓ excluded, … syncing, ✕ failed, – not connected). ↑/↓ prev/next visitor, Esc closes. Panel state is in the URL (`?visitor=185.220.101.4`) so it can be shared with a colleague, which also supports trust.

### 4.2 Verdict sentence: templates by status
| Status | Template |
|---|---|
| Blocked | "Blocked on {platforms} on {date}, after visit {n} of {total}. {top-signal-1 phrase}, {top-signal-2 phrase}." |
| Monitoring | "Not blocked yet: risk {score}/100, {70-score} below threshold. {top risk phrase}, but {top mitigating phrase}." e.g. "Not blocked yet. 4 paid clicks over 5 days from a residential IP, but visitors on this IP also added to cart, and it's shared by 3 devices." |
| Clean | "Looks human. {n} visits with normal engagement; {mitigating phrase}." |
| Allowed | "You marked this IP as always allowed on {date}. We'd otherwise have blocked it at visit {n}." |
| Pending | "Blocking now. Sending to Google Ads and Meta Ads (usually < 2 min)." |
| Failed | "We decided to block this IP on {date}, but Google Ads' 500-IP limit for campaign '{name}' is full. [Manage exclusions]" |
| Organic-only high risk | "Suspicious, but it has never clicked an ad, so there's nothing to exclude and no spend at risk. We'll block it on the first paid click." |

These are generated from data (no LLM needed). Copy tone follows the brand: calm, confident, specific.

### 4.3 JourneyStrip: the "map"
See 04 §4.6. **DECISION:** risk chart only (Proposal A).
~~Proposal B: strip + a 120px mini map (IP geo pin, plus a second pin for browser timezone/locale when mismatched, "IP says Frankfurt, browser says Asia/Dhaka"). Nice Uber echo, but adds map dependency risk under the deadline.~~ Rejected: the risk chart explains more per pixel.

### 4.4 Why we blocked / Why not blocked
Top 3 SignalBars sorted by |contribution|, including **mitigating** signals (▼, green) so the reasoning is balanced. "View all" opens the full journey at the Signals tab.

### 4.5 Actions
- Primary: **Open full journey**
- Blocked → ghost "Always allow this IP" → confirm popover: "This IP will be removed from exclusion lists in Google Ads and Meta Ads and never blocked again. Its 12 paid clicks so far cost $41.60." [Cancel] [Allow]
- Monitoring → secondary "Block now" (danger outline) + ghost "Always allow"
- Undo toast after either action (5s).

## 5. Full journey view (expand)
Opens as a **wide overlay sheet (≈ 960px) from the right**, stacked over the panel. DECISION: sheet (keeps list context); full-page route `/visitors/:ip` is P1.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← 185.220.101.4 · BLOCKED · Google Ads ✓ Meta Ads ✓                     ✕  │
│ Verdict sentence                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ JourneyStrip (lg), click a dot to select visit                             │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ VISITS (12)              │ VISIT 6 · 14 Sep 14:31:52 · Paid · Google Ads    │
│ #1 14:02 ○ direct  0:41  │ Campaign: Running Shoes – Search · kw "buy ..."  │
│ #2 14:05 ● paid    0:02  │ Landing: /sale/trail-runners · GCLID Cj0K…(reused)│
│ …                        │ Duration 1.1s · Score 61 → 76 (+15) ⚑ BLOCKED     │
│ #6 14:31 ● paid ⚑  0:01  │ ┌ Tabs: [Events] [Signals] [Device & network] ┐   │
│ ── added to exclusions ──│ │ EventTimeline                              │   │
│ #7 15:10 ○ organic 0:03  │ │ +0.0s  Landed /sale/trail-runners          │   │
│ …                        │ │ +0.2s  ⚑ Bot probability 96%               │   │
│                          │ │ +1.1s  Exit, no scroll, no pointer         │   │
│                          │ └────────────────────────────────────────────┘   │
└──────────────────────────┴──────────────────────────────────────────────────┘
```
- Left: visit list (grouped by day), with the block divider.
- Right: selected visit. **Default selection = the visit that triggered the block** (the a-ha), or the latest visit if not blocked.
- Tabs:
  - **Events**: EventTimeline.
  - **Signals**: all SignalBars for the *visitor* (cumulative) with a toggle "this visit only". Shows each signal's contribution by visit.
  - Visit header always shows the official per-visit signals as a compact row: **Interaction level · Bot probability · VPN/proxy · Form fill · Conversion**.
  - **Device & network**: KeyValue (user agent, fingerprint IDs seen on this IP, ASN / network type, VPN/proxy, timezone vs geo, screen, language).
- Keyboard: ←/→ previous/next visit.

## 6. Filtering, sorting, search (must be real)
- Search: IP prefix, city, ISP (debounced 150ms).
- Status multi-select (with counts). Stat tiles act as shortcuts to these filters.
- **Paid visits only** toggle (visitors with ≥1 paid visit).
- Platform: Google Ads / Meta Ads / Microsoft Ads.
- Risk band: Low / Elevated / High.
- Date range: Today, 7d, 30d. Filters visits by time, which recomputes visitor counts.
- Filters are stored in URL query params.
- Result count: "Showing 38 of 1,284 visitors".

## 7. Bulk actions (light)
Select rows → bar: "3 selected · Block now · Always allow · Export CSV". Confirm dialog summarises impact (IPs, platforms, spend). Mixed-status selection disables incompatible actions, with a tooltip explaining why.

## 8. States checklist (evaluated explicitly)
| State | Where | Treatment |
|---|---|---|
| Loading | table, panel | skeleton rows / skeleton panel (simulate 400ms on first load) |
| No data at all | table | EmptyState `no-data`: "No visitors tracked yet. Check that the ClickGuard tag is installed." |
| No results | table | EmptyState `no-results` + Clear filters |
| All clean | table filtered to Blocked | positive empty: "Nothing blocked in this range. Traffic looks clean." |
| Error | table | EmptyState `error` + Retry (toggle with dev switch `?simulate=error`) |
| Pending sync | row/panel | StatusPill pending + verdict |
| Exclusion failed (500 limit) | row/panel | failed pill + Manage exclusions |
| Platform not connected | panel | Meta Ads "– Not connected · Connect" |
| Allowed by user (false positive) | row/panel | allowed pill + would-have-blocked note |
| Shared IP (many devices) | row tag, verdict | "3 devices" tag, ambiguity explained |
| Organic-only high risk | row/panel | monitoring + "nothing to exclude" verdict |
| Visits after block | expand / journey | muted with label "after block" |
| Very long journey (60+ visits) | strip, list | strip bins dots per hour; list virtualised or "Show more" |
| Missing data (no geo, unknown ISP) | cells | `—` with tooltip "Not available" |
| Narrow panel content overflow | panel | truncation + tooltips |

Add a small **dev/demo switcher** (bottom-left, discreet) to toggle: empty dataset, error, slow loading. Reviewers can then see the states without hunting.

## 9. Accessibility
- Table: native `<table>`, `aria-sort`, row selection via checkbox, row open via Enter; focus returns to the row on panel close.
- Panel: `role="dialog"` non-modal (`aria-modal=false`) on desktop, focus moves to header.
- JourneyStrip: each dot is focusable, with `aria-label` "Visit 6, paid, Google Ads, 14:31, score 76, blocked". A visually hidden table fallback.
- Colour never alone: status has icon + label; paid vs unpaid uses filled vs hollow.

## 10. Demo script (for the video/rationale)
1. Land → stat row → click "Blocked".
2. Open `185.220.101.4` (malicious burst) → verdict → strip shows the crossing → top signals → "OK, that's a bot."
3. ↓ to `72.14.201.88` (ambiguous) → "Not blocked yet, and here's why" → reasoning is balanced.
4. Open full journey on the malicious visitor → visit 6 opens on the **Score tab**: 61 → 76 waterfall crossing 70 (**the a-ha**) → switch to Events + behavior bar: empty track, bot 96% flag.
5. Allow a false positive → confirm with consequences → undo toast.
6. Filter "Paid only" + High risk → show empty/no-results.
