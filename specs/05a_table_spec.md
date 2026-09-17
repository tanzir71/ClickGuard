# 05a · Threat Table: Detailed Spec

Supersedes `05 §3` and `§6`–`§7`. Variables reference the data model in `06` (`Visitor`, `Visit`) plus derived fields in `06 §2b`.
Priority: **P0** = must ship for the deadline · **P1** = ship if time allows · **P2** = rationale "next steps" only.
Patterns referenced: see `09`.

---

## 1. Page anatomy (top → bottom)

```
┌ AppShell ───────────────────────────────────────────────────────────────────────────────────────────┐
│ ① Page header    Threat Monitoring · subtitle            [Last 7 days ▾] [Relative|Local|UTC] [Export] │
│ ② Stat tiles     VISITORS · BLOCKED · NEEDS REVIEW · WASTED SPEND · PROTECTED (est.)                  │
│ ③ Insights strip (collapsible, P1)  Top networks │ Top countries │ Top campaigns hit │ Top reasons     │
│ ④ View bar       [Visitors | Visits]   Saved views: All · Needs review · Blocked today · Shared IPs ▾ │
│ ⑤ Filter bar     🔍 search…   [+ Add filter]  (Status: Blocked, Monitoring ×) (Paid visits ≥ 1 ×)      │
│                  └ replaced by ⑤b Batch bar when ≥1 row selected                                    │
│ ⑥ Table          sticky header · rows · inline expand                                    ┃ Panel (05b) │
│ ⑦ Footer         Showing 38 of 162 visitors · 50 per page · ‹ 1 2 3 › · density ▾                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ② Stat tiles (P0)
Five `Stat` components. Each tile is a button that **applies a filter**, and the active tile gets `bg-selected` plus an accent underline. Values are recomputed from the date range, **not** from other filters. Tiles describe the whole period; the result count shows the filtered set.

| Tile | Value (variable) | Sub-line | Click applies |
|---|---|---|---|
| VISITORS | `count(visitors with ≥1 visit in range)` | `{paidVisitors} clicked an ad` | clears status filter |
| BLOCKED | `count(status ∈ blocked, pending, failed)` | `▲ {n} vs previous period` (delta vs prior equal range) | Status = Blocked, Pending, Failed |
| NEEDS REVIEW | `count(status=monitoring) + count(status=failed) + count(blocked & !reviewed & blockedAt < 24h)` | `{monitoring} monitoring · {failed} failed` | Saved view "Needs review" |
| WASTED SPEND | `Σ visitor.wastedSpend` (`$0,000.00`) | `on {n} paid clicks before block` | Paid visits ≥ 1 and Status = Blocked |
| PROTECTED (est.) | `Σ visitor.protectedSpendEst` prefixed `~` | `est. from blocked visitors' click rate` + ⓘ tooltip with formula | Status = Blocked; sort by protected desc |

Loading: tile skeleton (value bar 64px). Error: `—` + tooltip "Couldn't load".

---

## 3. ③ Insights strip (P1, collapsed by default, remembers state per user)
Borrowed from Cloudflare top-N. Four small ranked bar lists (top 5 each) of **blocked visitors in range**:

| Panel | Grouping variable | Row content |
|---|---|---|
| Top networks | `visitor.asnName` + `networkType` tag | name · bar · count · % of blocked |
| Top countries | `visitor.geo.country` | country name · bar · count |
| Top campaigns hit | `visit.campaign` over pre-block paid visits | campaign · bar · $ wasted |
| Top reasons | `visitor.topSignals[0].signalId` | signal label · bar · count |

Row hover shows `⊕ Filter` and `⊖ Exclude` icon buttons (tooltip: "Show only Hetzner Online" / "Hide Hetzner Online"). Clicking one adds a filter tag.

---

## 4. ④ View bar

### 4.1 View switch (P0 both, DECISION)
Segmented control. **Visitors** = one row per IP (default, the recommended unit). **Visits** = flat, one row per visit (Samsara "event view"). Useful for "show all paid clicks today", and it shares filters where the field applies. Switching keeps the selected visitor, and in Visits view it highlights that visitor's rows.

### 4.2 Saved views (P0 built-ins, P1 custom)
Dropdown plus the first 4 as inline tabs.

| View | Definition | Sort |
|---|---|---|
| All visitors | none | Priority |
| **Needs review** | status ∈ {monitoring, failed} OR (status=blocked AND reviewed=false AND blockedAt within 24h) | Priority |
| Blocked today | status ∈ {blocked,pending,failed} AND blockedAt ≥ today 00:00 local | Blocked at desc |
| Wasted > $20 | wastedSpend > 20 | Wasted desc |
| Shared IPs | deviceCount ≥ 3 | Visits desc |
| Allowed by you | status = allowed | Allowed at desc |

Custom (P1): "Save view…" → name + scope **Team / Only me** (LogRocket). Modified built-in shows `•` and "Save as new / Reset".

---

## 5. ⑤ Filter bar

### 5.1 Search (P0)
- Placeholder: `Search IP, network, city, campaign, click ID…`
- Matches (case-insensitive, substring): `ip` (also prefix wildcard `185.220.*` and CIDR `185.220.101.0/24`, P1), `geo.city`, `geo.region`, `geo.country`, `isp`, `asnName`, `asn` (`AS24940`), any visit's `campaign`, `keyword`, `gclid`.
- Debounce 150ms. Matched substring **rendered bold** in visible cells (Uber). If the match is in a hidden field (e.g. GCLID), the row shows a line-3 hint: `Matched click ID Cj0KCQ…` in `body-sm text-secondary`.
- P1 autocomplete dropdown: "Search `hetz` in → Network: Hetzner Online (14) · City: —". Choosing one converts it to a filter tag.
- `/` focuses search. `Esc` clears and blurs.

### 5.2 Add filter (P0 model, following Uber Base)
`[+ Add filter]` pill → menu grouped (LogRocket taxonomy). Each item has a data-type icon (`#` numeric, `◉` categorical, `◷` date, `⊘` boolean).

| Group | Field (label) | Variable | Type | Operators | Editor |
|---|---|---|---|---|---|
| **Risk & decision** | Status | `status` | categorical | is any of / is none of | checkbox list with counts, status pills |
| | Risk score | `riskScore` | numeric 0–100 | between / ≥ / ≤ | dual slider + **histogram of current distribution** with threshold line at 70 |
| | Risk band | `band` | categorical | is any of | Low / Elevated / High |
| | Blocked on | `exclusions[].platform where state=excluded` | categorical | includes any | Google Ads / Meta Ads / Microsoft Ads |
| | Exclusion state | `exclusions[].state` | categorical | includes any | Excluded / Syncing / Failed / Not connected |
| | Decided by | `decision.by` | categorical | is | Automatic / Team member |
| | Blocked at | `blockedAt` | date | in range / before / after | presets + calendar range |
| | Reviewed | `reviewed` | boolean | is | Yes / No |
| **Visitor** | Country | `geo.country` | categorical (searchable) | is any of / none of | searchable checkbox list with counts |
| | Network type | `networkType` | categorical | is any of | Residential, Mobile, Business, Data center, VPN, Proxy, Tor |
| | Network (ASN) | `asnName` | categorical (searchable) | is any of / none of | searchable list |
| | Devices on this IP | `deviceCount` | numeric | ≥ / ≤ / between | stepper |
| | First seen | `firstSeen` | date | in range | presets |
| | Last seen | `lastSeen` | date | in range | presets |
| **Visit & ad click** | Visits | `visitCount` | numeric | ≥ / ≤ / between | stepper + histogram |
| | Paid visits | `paidVisits` | numeric | ≥ / ≤ / between | stepper (quick chip "Clicked an ad" = ≥1) |
| | Source | any visit `source` | categorical | has any of / only | Paid / Organic / Direct / Referral |
| | Ad platform | any paid visit `platform` | categorical | has any of | |
| | Campaign | any paid visit `campaign` | categorical (searchable) | has any of | |
| | Wasted spend | `wastedSpend` | currency | ≥ / ≤ / between | input with $ |
| **Behavior (official signals)** | Bot probability (max) | `maxBotProbability` | percent | ≥ / ≤ / between | slider + histogram, bands at 50/70 |
| | Interaction level (typical) | `typicalInteraction` | categorical ordinal | is any of | None / Low / Medium / High |
| | VPN / proxy | `vpnProxyAny` | boolean | is | Yes / No |
| | Form fill | any visit `formFill.deliverability` | categorical | has any of | Valid / Invalid / Disposable |
| | Converted | `conversions > 0` | boolean | is | Yes / No |
| | Signal triggered | any `signalId` in `visitor.signals` | categorical (searchable) | includes any / includes none | grouped by raises / lowers risk |

Editor behaviour:
- Opens as a popover anchored to the pill (or to the tag, when editing). `Apply` (primary) / `Cancel`. `Enter` applies.
- Categorical lists show **live counts** for the current filter set, excluding the field itself (facet behaviour, as in Datadog).
- Numeric editors show a 24-bin histogram of the unfiltered distribution, with the selected range highlighted.
- Applying adds a **filter tag**: `Status: Blocked, Monitoring  ×`. Long lists truncate to `Country: US, GB +3`. **Clicking a tag reopens its editor** (the Uber "future" pattern, which we ship).
- A second filter on the same field merges into the existing tag.
- `Clear all` (ghost) appears when ≥1 tag is active.
- Every filter serialises to the URL: `?status=blocked,monitoring&paid_min=1&bot_min=70`.

### 5.3 Quick filters from cells (P1, Cloudflare)
Hovering a filterable value (Network, Country, Campaign, Top reason, Network-type tag) for 400ms shows a tiny inline `⊕ ⊖` pair. ⊕ adds `is`, ⊖ adds `is none of`. Also available in the panel's KeyValue rows.

### 5.4 ⑤b Batch bar (P0 minimal)
Selecting ≥1 row **replaces** the filter bar in place (same height, no layout shift):
`☑ 3 selected  ·  [Block now] [Always allow] [Mark reviewed] [Export CSV]  ·  Clear selection`
- Header checkbox: none → all *visible page* → (link) "Select all 38 matching".
- Actions not valid for every selected row are disabled, with a tooltip: "2 of 3 are already blocked".
- Block/Allow open a confirm dialog with an impact summary: IPs, platforms affected, paid clicks and $ so far. Confirming shows an undo toast (5s).

---

## 6. ⑥ Table columns (Visitors view)

Legend: **Vis** = visible by default · **Panel** = stays visible when the side panel is open (table width about 760px at 1440).

| # | Header | Cell content (top line / second line) | Variables | Format & rules | Sort key | Align · width | Vis | Panel |
|---|---|---|---|---|---|---|---|---|
| 0 | ☐ | checkbox | — | — | — | 40 | ✓ | ✓ |
| 1 | ▸ | expand chevron | `visitCount>1` | hidden if 1 visit | — | 28 | ✓ | ✓ |
| 2 | **Visitor** | L1 `ip` (mono-data) + `NEW` micro-tag if firstSeen < 24h. L2 `city, CC · asnName` + tags `networkType≠residential` (`DC`, `VPN`, `Proxy`, `Tor`, `Mobile`, `Business`) + `{deviceCount} devices` if ≥2 | `ip, geo.city, geo.country, asnName, networkType, deviceCount, firstSeen` | IPv6 middle-truncated `2a01:4f8:…:1` with full value in tooltip. Missing city → `CC` only; all missing → `Unknown location`. | IP numeric (v4 before v6) | left · 240 min | ✓ | ✓ |
| 3 | **Status** | L1 `StatusPill`. L2 platform chips: `G ✓` `M ✓` `MS –` (glyph + state icon) | `status, exclusions[]` | Order of chips fixed: Google, Meta, Microsoft. Chip tooltip: "Google Ads · Excluded 14 Sep 14:32:41 · all 6 campaigns". Failed chip is red with ! | severity: failed 6 › pending 5 › blocked 4 › monitoring 3 › allowed 2 › clean 1 | left · 160 | ✓ | ✓ |
| 4 | **Risk** | L1 `94` (numeric, tabular) + 64px bar with threshold tick at 70. L2 `▲ 18 today` or band label `High` | `riskScore, threshold, band, scoreDelta24h` | bar fill: band colour; ≥ threshold → red-600; value under threshold but ≥60 gets amber **and** a `near threshold` tooltip | `riskScore` | right · 112 | ✓ | ✓ |
| 5 | **Top reason** | L1 top raising signal label, e.g. `Click burst`. L2 `+2 more` or mitigating `▼ Converted` when status=monitoring | `topSignals[0..2]` | Label from signals catalogue. Clean visitors show `—` | none (P1 group sort) | left · 180 | ✓ | ✗ |
| 6 | **Journey** | L1 **visit ribbon**: 7-day track (range-aware), one 6px dot per visit (filled indigo = paid, hollow = unpaid, red tick = block moment, faded after block); >40 visits → per-hour bins. L2 `12 visits · 8 paid` | `visits[].startedAt, source, afterBlock; blockedAt; visitCount; paidVisits` | Ribbon hover: tooltip for nearest dot ("Visit 6 · Paid · Google Ads · 14 Sep 14:31 · +15"). Click dot → opens panel with that visit highlighted | `visitCount` (secondary: `paidVisits`) | left · 176 | ✓ | ✓ (ribbon hides, text remains) |
| 7 | **Bot prob.** (DECISION: keep as column) | L1 `96%` + 40px bar. L2 interaction level glyph `▁▁▁▁ None` | `maxBotProbability, typicalInteraction` | bands: <50 grey, 50–69 amber, ≥70 red | `maxBotProbability` | right · 104 | ✓ | ✗ |
| 8 | **Wasted** | L1 `$41.60`. L2 `on 6 clicks` | `wastedSpend, paidVisitsBeforeBlock` | `$0.00` shown muted; for not-blocked visitors header tooltip explains "paid clicks so far" and the value shows `$12.40 so far` (amber if monitoring) | `wastedSpend` | right · 96 | ✓ | ✗ |
| 9 | **Seen** | L1 last seen relative `2h ago`. L2 `first 14 Sep → 16 Sep · 2d span` (Samsara A→B) | `lastSeen, firstSeen` | follows global time format toggle; tooltip absolute both | `lastSeen` | right · 132 | ✓ | ✓ |
| 10 | **Decision** | L1 `Blocked 14 Sep 14:32`. L2 `at visit 6 of 12 · auto` / `by Sarah Chen` | `blockedAt, blockedAtVisitIndex, visitCount, decision.by` | Monitoring: `Watching · 6 pts to block`. Clean: `—` | `blockedAt` | left · 160 | ✗ (on in "Blocked today") | ✗ |
| 11 | **Conversions** | L1 `1 purchase` / `—`. L2 `form: 1 valid · 2 invalid` | `conversions, conversionValue, formFills{valid,invalid,disposable}` | invalid count in red | `conversions` | left · 136 | ✗ | ✗ |
| 12 | **Country** | flag-free: `DE Germany` | `geo.country` | | alpha | left · 120 | ✗ | ✗ |
| 13 | **Network** | `Hetzner Online · AS24940` | `asnName, asn` | | alpha | left · 180 | ✗ | ✗ |
| 14 | **Protected (est.)** | `~$58` | `protectedSpendEst` | | numeric | right · 96 | ✗ | ✗ |
| 15 | ⋯ | row actions: visible on hover/focus, otherwise hidden (Uber) | — | Menu: Open details (↵) · Open full journey · Copy IP · Copy link · Always allow / Remove from allow list · Block now · Mark reviewed | — | 44 | ✓ | ✓ |

**Column picker (P1):** `Columns ▾` in the footer. Checkbox list, drag to reorder, "Reset to default". Presets: *Default*, *Investigation* (adds Decision, Network, Country), *Spend* (adds Protected, Conversions).

**Default sort:** `Priority` (Samsara) = `severityRank*1000 + min(wastedSpend,99)*5 + recencyScore(lastSeen)`, shown in the sort menu as "Priority (recommended)". Clicking any header uses the **3-state cycle desc → asc → off** (Uber); off returns to Priority.

### 6.1 Visits view columns (P0)
`☐ · Time (startedAt) · Visitor (ip + status pill mini) · Source (SourceTag + platform) · Campaign › keyword · Landing page · Duration · Interaction · Bot prob. · Form · Converted · Δ score (scoreBefore→scoreAfter, e.g. 61 → 76 ▲15) · Cost (cpc or "no ad spend") · After block (muted label)`. Row click opens the same panel, scrolled to that visit.

---

## 7. Row visual states

| State | Trigger | Treatment |
|---|---|---|
| Default | — | `bg-surface`, bottom hairline `border-default`, height 56 (two-line), compact density 44 (single line: L2 hidden, moved to tooltip) |
| Hover | pointer | `bg-subtle`; row actions ⋯ fade in (120ms); cursor pointer |
| Column hover | pointer on sortable header | column cells `bg-subtle`; sort icon visible |
| Focus (keyboard) | ↑/↓ | 2px inset focus ring `accent`; **does not** open panel until Enter (prevents panel thrash) |
| Selected (panel open) | click / Enter | `bg-selected` + 3px left bar `accent`; persists while panel open |
| Checked | checkbox | `bg-selected` without left bar |
| Expanded | chevron / → key | chevron rotates 90°; nested block below with `bg-canvas` and 16px left indent |
| New | firstSeen < 24h | `NEW` micro-tag (mono-sm, indigo) |
| Unreviewed block | blocked & !reviewed & < 24h | 6px indigo dot before IP ("unread", like an inbox). Clears after the panel is open ≥ 3s or on Mark reviewed |
| Pending | status=pending | pill loader spins (reduced-motion: static ellipsis) |
| Failed | status=failed | red outline pill with `!`; Decision cell text `Google Ads exclusion failed` in red |
| Just changed | after Block/Allow action or live update | 1.2s background flash `bg-selected` → none |
| After allow | status=allowed | whole row text stays primary (no greying); pill conveys it |
| Search match | search active | bold substring |

---

## 8. Inline row expand (P0)
Chevron or `→` expands; `←` collapses. Only one row expanded at a time by default (P1 setting: allow many).

```
▾ 185.220.101.4   ● BLOCKED G✓ M✓   94 ▮   Click burst   ●●●●●|○○   96%   $41.60   2h ago
   ┌───────────────────────────────────────────────────────────────────────────────────────────────┐
   │ #   Time (local)     Source              Landing page            Dur.   Interact.  Bot   Δ score │
   │ 12  16:10:02         ○ Direct            /                       0:03   Low        41%   —  after block
   │ 11  15:48:40         ○ Organic · google  /sale/trail-runners     0:02   None       88%   —  after block
   │ ── ⛨ Added to exclusion lists · Google Ads 14:32:41 · Meta Ads 14:33:05 · decided at 14:32:07 ──── │
   │ 6   14:31:52   ⚑     ● Paid · Google Ads /sale/trail-runners     0:01   None       96%   61→76 ▲15│
   │ 5   14:27:10         ● Paid · Google Ads /sale/trail-runners     0:01   None       95%   49→61 ▲12│
   │ …   show 4 earlier visits                                                                        │
   │                                                     [Open full journey →]                         │
   └───────────────────────────────────────────────────────────────────────────────────────────────┘
```
- Order: **reverse chronological** (Amplitude), newest first, so "after block" visits appear on top and prove the block worked.
- Shows at most 6 visits: after-block visits, then the trigger visit (`⚑`), then up to 3 before. "Show N earlier visits" loads the rest inline.
- The **system event row** (block + exclusion sync) sits between visits, styled as an out-of-visit event (Amplitude): `bg-subtle`, mono-sm, shield icon.
- Nested row click → opens the panel with that visit pre-selected in the full journey link.
- Paid rows show CPC on hover tooltip of the Source cell: `CPC $3.40 · Running Shoes – Search › "trail running shoes sale"`.

---

## 9. Keyboard map (P0)
| Key | Action |
|---|---|
| `↑ ↓` | move row focus (panel open: also switches panel content) |
| `Enter` | open panel for focused row |
| `→ / ←` | expand / collapse row |
| `Space` | toggle checkbox |
| `Esc` | close panel → clear selection → blur search |
| `/` | focus search |
| `f` | open Add filter |
| `o` | open full journey for selected |
| `?` | shortcuts sheet |

---

## 10. Footer (P0)
`Showing 1–50 of 162 visitors (filtered from 1,284)` · pagination 50/page (P1 selector 25/50/100) · density toggle `Comfortable | Compact` · `Columns ▾` (P1) · `Export CSV` of the current filtered set (columns as visible, plus `visits_json` optional).

---

## 11. Table-level states (P0)
| State | Condition | UI |
|---|---|---|
| First load | data promise pending | 8 skeleton rows matching column widths; tiles skeleton; filter bar enabled |
| Refetch after filter | < 300ms | no skeleton; table dims to 60% opacity with a top 2px progress bar |
| No data in account | 0 visitors ever | EmptyState no-data: "No traffic tracked yet" · "Install the ClickGuard tag to start scoring visitors." · [View setup guide] |
| No results | filters → 0 | EmptyState no-results: "No visitors match these filters" · lists active tags · [Clear filters] [Remove last filter] |
| Positive empty | view = Blocked today & 0 | "Nothing blocked today" · "Traffic in this range looks clean. We scored {n} visitors." |
| Error | fetch failed | EmptyState error: "Couldn't load visitors" · [Retry] · keeps filters |
| Partial platform outage | any exclusion state failed in range | inline banner above table (amber): "Google Ads exclusions failed for 2 visitors · Campaign 'Brand – Exact' reached the 500-IP limit" [Review] → applies filter |
| Stale data | P2 | "Updated 3 min ago · Refresh" |

Demo switcher (bottom-left, dev only but visible in deployed build): `Data: Normal | Empty | Error | Slow` and `Platform outage: on/off`.
