# 05b · Breakdown: Side Panel & Full Journey (Detailed Spec)

Supersedes `05 §4` and `§5`. There are two depths:

- **L1 · Visitor panel** (Uber trip panel): answers *what happened, is it right, what did it cost*, in about 30 seconds. 440px, docked right.
- **L2 · Full journey** (GA4 User Explorer + LogRocket + Stripe Risk insights): answers *show me exactly*. A wide sheet (min(1120px, 100vw − 120px)) layered over the table and panel.

Variables reference `06`. Priorities are P0/P1/P2 as in 05a. Patterns are referenced from `09`.

---

# L1 · Visitor panel

## 1. Container behaviour (P0)
| Aspect | Spec |
|---|---|
| Open | Row click / Enter / ribbon-dot click. Panel slides in from the right 200ms `ease-standard`; table container animates its width at the same time (no overlay ≥1280px). |
| Switch visitor | ↑/↓ or header arrows. Content **crossfades 120ms**, with no slide. The scroll position resets to top **unless** the user is in a section (keeps section anchor). |
| Close | ✕, Esc, or clicking the selected row again. Focus returns to the row. |
| URL | `?visitor=185.220.101.4` (+ `&section=signals`). Reload restores it. |
| Structure | Sticky header (section A+B) · scrollable body · sticky footer (actions) |
| Loading | Header renders immediately from row data; body sections show skeletons (max 400ms simulated). |
| Width | 440px fixed at ≥1280. 1024–1279: overlay with scrim, 480px. |
| a11y | `<aside role="complementary" aria-label="Visitor 185.220.101.4 details">`. Heading order h2 IP → h3 sections. |

## 2. Wireframe: blocked malicious visitor (H1)

```
┌──────────────────────────────────────────────┐
│ A  185.220.101.4 ⧉                 ‹ ›   ✕  │ sticky
│    Frankfurt, Hesse, DE · Hetzner Online     │
│    AS24940 · [DATA CENTER] · 1 device        │
│ B  ┌──────────────────────────────────────┐ │
│    │ ⛨ BLOCKED                  Auto · 94 │ │
│    │ Blocked on 14 Sep at 14:32 after     │ │
│    │ visit 6 of 12: six paid Google Ads   │ │
│    │ clicks in 38 min from a data-center  │ │
│    │ IP, with no scrolling or mouse moves.│ │
│    └──────────────────────────────────────┘ │
├──────────────────────────────────────────────┤ scroll ↓
│ C  EXCLUDED ON                               │
│    G  Google Ads   ✓ Excluded   14:32:41     │
│       All 6 campaigns · 34s after decision   │
│    M  Meta Ads     ✓ Excluded   14:33:05     │
│    MS Microsoft Ads – Not connected  Connect │
├──────────────────────────────────────────────┤
│ D  HOW IT UNFOLDED                           │
│    ○  First seen     14 Sep 14:02:11         │
│    │  Direct → /   · score 0                 │
│    ●  Risk climbing  14:05 → 14:27           │
│    │  5 paid clicks · score 0 → 61           │
│    ◆  Threshold crossed 14:31:52 · visit 6   │
│    │  score 61 → 76 (threshold 70)           │
│    ⛨  Excluded       14:32:41 · +34s          │
│    │                                          │
│    ○  Last seen      14 Sep 16:10:02         │
│       Direct → / · after block · no ad click │
├──────────────────────────────────────────────┤
│ E  RISK JOURNEY                  94 / 100    │
│    [ chart: stepped score line, threshold ]  │
│    ● paid  ○ unpaid  ⚑ block   ▭ over limit  │
├──────────────────────────────────────────────┤
│ F  WHY WE BLOCKED               ranked by    │
│    ▲▲ Click burst          6 paid / 38m +25  │
│    ▲▲ Likely automated     bot 96%      +30  │
│    ▲▲ Data-center network  Hetzner      +22  │
│    ▲  Reused ad click ID   2 visits     +20  │
│    ▲  Timezone mismatch    Asia/Dhaka   +10  │
│    Show all 9 signals (2 lowered risk)       │
├──────────────────────────────────────────────┤
│ G  SIGNALS AT A GLANCE                       │
│    Location      Frankfurt, DE  ⚠ TZ differs │
│    Interaction   ▁▁▁▁ None on 10 of 12       │
│    Bot prob.     96% max · 91% avg           │
│    VPN / proxy   No (data center)            │
│    Form fill     —  never submitted          │
│    Conversion    —  none                     │
├──────────────────────────────────────────────┤
│ H  SPEND                                     │
│    8 paid clicks before block                │
│      Google Ads  6 × avg $4.10     $24.60    │
│      Meta Ads    2 × avg $2.10      $4.20    │
│    Wasted                          $28.80    │
│    Paid clicks since block              0    │
│    Protected (est.)             ~$58 / 7d ⓘ  │
├──────────────────────────────────────────────┤
│ I  RELATED                                   │
│    Same device on 2 other IPs   ● 2 blocked →│
│    Same /24 subnet    5 visitors ● 4 blocked →│
│    Same network (Hetzner)  14   ● 11 blocked →│
│    🌐 Blocked on 38 other ClickGuard accounts │
├──────────────────────────────────────────────┤
│ J  RECENT VISITS                   12 total  │
│    16:10  ○ Direct   /        0:03  after blk│
│    15:48  ○ Organic  /sale/…  0:02  after blk│
│    14:31  ● Paid G   /sale/…  0:01  ⚑ +15    │
│    See all visits →                          │
├──────────────────────────────────────────────┤
│ K  DETAILS                     Show all (24) │
│    IP 185.220.101.4 ⧉ · ASN AS24940          │
│    First / last seen · Devices 1 · Languages │
├──────────────────────────────────────────────┤ sticky
│ L  [ Open full journey → ]                   │
│    Always allow this IP        ⋯             │
└──────────────────────────────────────────────┘
```

## 3. Sections: content, variables, rules

### A · Identity header (P0, sticky)
| Element | Variable | Format / rule |
|---|---|---|
| IP | `ip` | `heading-lg` mono. ⧉ copy → toast "IP copied". IPv6 wraps at colons. |
| Location line | `geo.city, geo.region, geo.country` | Missing parts dropped. All missing → "Location unknown" with ⓘ "The IP isn't in our geo database." |
| Network line | `asnName`, `asn`, `networkType`, `deviceCount` | networkType tag uses the neutral tag, except `datacenter`/`tor`/`proxy`/`vpn`, which use amber-outline tags. `deviceCount ≥ 3` → tag "Shared · 3 devices". |
| Prev/next | index in current sorted, filtered list | Disabled at the ends. Tooltip "Previous visitor (↑)". |

### B · Verdict card (P0, sticky)
| Element | Variable | Rule |
|---|---|---|
| Status | `status` | StatusPill `md` |
| Meta right | `decision.by` + `riskScore` | `Auto · 94` or `Sarah Chen · 71` |
| Sentence | generated by `verdict(visitor)` | ≤ 2 lines at 440px (max about 180 chars). **Every clause maps to a field** (listed under "Verdict grammar"). Numbers bold. |
| Card tint | status | blocked → `status-blocked-bg`, monitoring → amber-bg, clean → green-bg, allowed → indigo-50, pending/failed → as pill |

**Verdict grammar** (deterministic, Stripe `seller_message` style):
`{Outcome clause} {when clause} {trigger clause}: {top-2 raising phrases}{, but {top mitigating phrase}}.`

| Status | Outcome + when | Example |
|---|---|---|
| blocked | "Blocked on {d} at {t} after visit {n} of {N}" | see wireframe |
| pending | "Blocking now: decided at {t}, sending to {platforms}" | "Blocking now: decided at 13:59:20, sending to Meta Ads (usually under 2 min)." |
| failed | "We blocked this visitor at visit {n}, but {platform} rejected the exclusion" | "…but Google Ads rejected the exclusion: campaign 'Brand – Exact' already has 500 excluded IPs." |
| monitoring (has paid) | "Not blocked. Risk is {s}, {70−s} points under the block threshold" | "Not blocked. Risk is **64**, **6 points** under the block threshold: 4 paid clicks in 5 days and one VPN visit, but 3 real devices use this IP and one added to cart." |
| monitoring (organic only) | "Suspicious, but there's nothing to block" | "…this visitor has never clicked your ads, so there's no spend at risk. We'll exclude it on its first paid click." |
| clean | "Looks like a real visitor" | "Looks like a real visitor: 3 visits with normal scrolling and a purchase on 15 Sep." |
| allowed | "Always allowed by {user} on {d}" | "…We'd have blocked it at visit 5 (score 71). Note: 'Our buyer at Harrods'." |

Phrase library (signal → phrase): `click_frequency` → "{n} paid clicks in {window}" · `bot_probability` → "{p}% likely automated" · `datacenter_ip` → "from a data-center IP ({asnName})" · `interaction_none` → "no scrolling or mouse movement" · `vpn_proxy` → "behind a VPN" · `form_invalid_email` → "{n} form fills with undeliverable emails" · `gclid_reuse` → "the same ad click ID reused" · `timezone_mismatch` → "browser set to {tz}, far from the IP's location" · `keyword_fixation` → "always the same {cpc} keyword" · `converted` → "a {conversionType} on {d}" · `shared_ip` → "{n} real devices use this IP" · `interaction_high` → "real engagement on {n} visits".

### C · Excluded on (P0) (receipt-line style, from the Uber fare breakdown)
One row per **connected** platform, then unconnected ones.

| Column | Variable | Rule |
|---|---|---|
| Logo + name | `exclusions[].platform` | 16px mono glyph (no brand logos: use letter glyph G/M/MS in a rounded square) |
| State | `exclusions[].state` | ✓ Excluded (green) · ◌ Syncing (animated) · ! Failed (red) · – Not connected (grey) · ↺ Removed (after allow) |
| Time | `exclusions[].at` | per time-format toggle |
| Sub-line | `scope` (`"All 6 campaigns"` / list), latency `at − decision.at` | "34s after decision" |
| Error | `exclusions[].error` | Failed: text + `[Fix in Google Ads ↗]` (fake link) and `[Retry]` |
| Action | not_connected | `Connect` ghost button (no-op toast "Demo: connections are mocked") |
Hidden for `clean` (replaced by "Not on any exclusion list"). For `monitoring`: "Will be excluded on: Google Ads, Meta Ads" in muted text, which sets expectations.

### D · How it unfolded: decision route (P0, Uber pickup→drop-off stepper)
A vertical stepper with 3–6 nodes. Only nodes that exist are rendered.

| Node | Icon | Title · time | Sub-line | Variables |
|---|---|---|---|---|
| First seen | ○ | "First seen · {firstSeen}" | "{source} → {landingPath} · score 0" | visits[0] |
| Risk climbing (collapsed range) | ● | "Risk climbing · {t1} → {t2}" | "{k} visits · {paid} paid · score {a} → {b}" | visits between first and trigger |
| Threshold crossed | ◆ red | "Threshold crossed · {t} · visit {n}" | "score {before} → {after} (threshold {threshold})" | trigger visit |
| Excluded | ⛨ | "Excluded · {t} · +{latency}" | platforms | exclusions |
| Allowed by user | shield-check | "Allowed · {t} · {user}" | note | allowedBy |
| Last seen | ○ | "Last seen · {lastSeen}" | "{source} → {landingPath}" + `after block` tag + "no ad click" if unpaid | last visit |

Monitoring variant: the **"Closest to threshold"** node replaces "Threshold crossed": "Peaked at 68 · visit 5 · 16 Sep", plus a dashed final node "Would block at 70". Clicking any node → selects that visit in the chart (E) and scrolls the chart into view.

### E · Risk journey chart (P0) (Samsara speed graph + our threshold story)
SVG, 408×140 in the panel.

| Layer | Encoding | Variable |
|---|---|---|
| X axis | time, first→last visit; **gaps > 6h compressed** into a 12px break `⫽` labelled "2d" | `startedAt` |
| Y axis | 0–100, gridlines at 0/40/70/100 only; 70 labelled "Block at 70" | `threshold` |
| Score line | stepped line after each visit, `ink-900` 1.5px | `scoreAfter` |
| Over-limit area | area between line and threshold where the line is above, `red-50` fill (Samsara severity colouring) | derived |
| Visit markers | on the line at each step: ● paid (indigo) / ○ unpaid (violet-grey stroke); radius 3–6 by `durationMs` log scale | `source, durationMs` |
| Block marker | ⚑ vertical red dashed line at `blockedAt` + label "Blocked" | `blockedAt` |
| After block | markers at 40% opacity | `afterBlock` |
| Allowed | indigo vertical line "Allowed" + line becomes dashed afterwards (score frozen) | `allowedBy.at` |
| Hover | crosshair + tooltip card: "Visit 6 · 14:31:52 · Paid · Google Ads · Running Shoes – Search · score 61 → **76** (+15) · 6 over threshold" | visit |
| Click marker | selects visit → section J highlights row; "Open in full journey" link inside tooltip | |
| Keyboard | chart is a focusable group; ←/→ steps visit markers; Enter opens full journey at that visit | |
| Empty | 1 visit → single marker + text "Only one visit so far" | |
| >60 visits | markers replaced by hourly bins (bar count under the line) | |

### F · Why we blocked / Why not blocked (P0) (Sift and Stripe ranked signals)
- Title varies by status: "Why we blocked" · "Why it's not blocked yet" · "Why it looks real" · "What we'd have blocked on" (allowed).
- Rows = `visitor.signals` aggregated, **sorted by |points| desc**. Show the top 5 for blocked and **top 3 raising + top 2 lowering** for monitoring/clean (balance).
- `SignalBar` row anatomy: severity glyph (▲▲ high red / ▲ med amber / ▼ lowers green) · label · observed value (mono) · points (`+25` / `−10`, tabular) · 48px contribution bar scaled to the max row.
- Footer: "Show all 9 signals (2 lowered risk)" → expands inline (P0) or opens full journey Signals tab (P1).
- **Signal popover (P1)** on row click (Sift modal):
  ```
  Click burst                          +25
  What it is   Several paid clicks from the same IP in a short window.
  Observed     6 paid clicks in 38 min (visits 2–6)
  How scored   ≥3 in 1h = +12 · ≥5 in 1h = +25 (max once per hour)
  Triggered on visits 2, 3, 4, 5, 6  → (links select visits)
  Shared by    4 other visitors in this range  [⊕ Filter table]
  ```
- Caps note when applicable: "Counted up to 18 points".

### G · Signals at a glance: official 7 (P0)
A 2-column KeyValue grid using `SignalMeter` atoms (the official brief signals, so reviewers see that we honoured them).

| Row | Value format | Variables | Warning rule |
|---|---|---|---|
| IP address | shown in header, **omitted here** | — | — |
| Location | `City, CC` + consistency chip | `geo`, `device.timezone`, `device.language`, campaign geo | chip "TZ differs" / "Outside targeting" in amber |
| Interaction | 4-step meter + "None on 10 of 12 visits" | `visits[].interaction.level` distribution | none ≥ 50% of visits → amber |
| Bot probability | "96% max · 91% avg" + bar | `max/avg botProbability` | ≥70 red, 50–69 amber |
| VPN / proxy | "Yes · NordVPN (3 of 7 visits)" / "No" | `vpnProxy`, provider | yes → amber |
| Form fill | "2 submitted · 1 valid · 1 invalid" / "never submitted" | `formFill[]` | invalid/disposable → red count |
| Conversion | "1 purchase · $84.00 · 15 Sep" / "none" | `converted`, `conversionValue`, `conversionType` | converted → green |

### H · Spend (P0) (Uber fare receipt)
| Line | Variable | Rule |
|---|---|---|
| Heading line | "{n} paid clicks before block" / "{n} paid clicks so far" | `paidVisitsBeforeBlock` |
| Per platform | "{Platform} {k} × avg ${cpcAvg}" → right-aligned subtotal | group paid visits by platform |
| Wasted / Spent so far | total, bold | `wastedSpend`; label "Spent so far" and amber if monitoring; "Spend on this visitor" neutral if clean |
| Organic note | "+ {m} unpaid visits · no ad spend" | unpaid count |
| Paid clicks since block | integer (should be 0 on excluded platforms, which is the proof). If >0 on a failed platform, red: "3 on Google Ads (exclusion failed)" | visits after block with source=paid |
| Protected (est.) | `~$58 / 7d` + ⓘ popover with formula: "Pre-block rate 6 paid clicks/hour × avg CPC $3.60, capped at 7 days of your typical campaign activity. Estimate." | `protectedSpendEst` |
Clean visitors: section collapses to one line "Spend on this visitor: $3.40 · 1 purchase ($84)", showing ROI.

### I · Related (P1) (Stripe related payments, Sift network)
| Row | Definition | Variable | Click |
|---|---|---|---|
| Same device on other IPs | other visitors sharing any `fingerprints[]` | `related.sameFingerprint[]` | filters table to those IPs |
| Same /24 subnet | IPv4 first 3 octets match, in range | `related.subnet24[]` | filter `ip:185.220.101.*` |
| Same network | same `asn` in range | `related.asnCount`, `asnBlocked` | filter ASN |
| Network intelligence 🌐 (DECISION: keep) | invented: count of other ClickGuard accounts that blocked this IP in 30d | `networkBlockedAccounts30d` | ⓘ "Anonymous, aggregated across ClickGuard customers." |
Each row shows the status breakdown as mini dots: `● 4 blocked ● 1 monitoring`. Row hidden when count = 0.

### J · Recent visits (P0)
The last 3 visits (reverse chronological) + the trigger visit if not in the last 3. Row: time · SourceTag (compact) · landing path (truncate middle) · duration · tags (`after block`, `⚑ +15`, `converted`, `invalid email`). Row click → opens full journey with that visit selected. "See all {N} visits →".

### K · Details (P0 pinned, P1 show all) (Amplitude pinned properties, LogRocket info pane)
Pinned (6): IP · ASN · Network type · Devices seen · Languages · First/last seen absolute.
"Show all (24)": two groups, **Visitor** (fingerprint IDs, all locations seen, timezones seen, user agents seen (count), screen sizes, reverse DNS, abuse-list hits) and **Latest visit** (UA, browser, OS, screen, language, referrer, landing URL with UTM, GCLID/FBCLID). Values are mono, copyable, and ⊕/⊖ quick filters appear on ASN / network type / country (P1).

### L · Actions footer (P0, sticky)
| Status | Primary | Secondary | Overflow ⋯ |
|---|---|---|---|
| blocked / pending | Open full journey | Always allow this IP | Copy link · Export JSON · Mark reviewed |
| failed | Retry exclusion | Open full journey | Always allow · Copy link |
| monitoring | Open full journey | Block now (danger outline) | Always allow · Mark reviewed |
| clean | Open full journey | — | Block now · Copy link |
| allowed | Open full journey | Remove from allow list | Copy link |

**Always allow confirm** (popover, not modal):
> **Always allow 185.220.101.4?**
> We'll remove it from exclusion lists on **Google Ads and Meta Ads** and never block it again. It has cost **$28.80** in 8 paid clicks so far.
> Note (optional) [__________]
> [Cancel] [Always allow]

After confirm: pill → allowed, section C rows → "↺ Removed · just now", row flash, toast "Allowed 185.220.101.4 · Undo" (5s).
**Block now confirm:** "Exclude on Google Ads and Meta Ads now? Its score is 64 (threshold 70). You can undo this later." → pending (1.5s simulated) → blocked, `decision.by = you`.

## 4. Panel variants (Storybook stories + H-scenarios)
| Story | Scenario | Key differences |
|---|---|---|
| Blocked · malicious burst | H1 | as wireframe |
| Blocked · slow competitor | H2 | D compresses 6 days; F top reason Keyword fixation; C shows Meta "Not connected" |
| Monitoring · shared household | H3 | F balanced 3 up / 2 down; H "Spent so far $9.80" amber; D "Peaked at 68" |
| Monitoring · VPN buyer | H4 | G conversion green; verdict mitigating clause about the purchase |
| Monitoring · organic scraper | H5 | C "Nothing to exclude, never clicked an ad"; H "No ad spend" |
| Allowed · false positive | H6 | B indigo, note shown; E dashed after allow; C "Removed" rows |
| Pending | H7 | C Meta syncing spinner; footer primary disabled with "Syncing…" |
| Failed · 500-limit | H8 | B red outline; C error + Retry; H "Paid clicks since block: 3 on Google Ads" red |
| Clean · CGNAT | H9 | header "Shared · 14 devices"; F "Why it looks real" |
| Clean · happy customer | H10 | H ROI line |
| Long journey | H11 | E binned; J shows 3 + "See all 60" |
| Missing data | H12 | "Location unknown", `—` values |
| Lead-form spam | H13 | G form fill red "3 invalid"; F top reason Undeliverable emails |
| Loading | — | skeleton sections |

---

# L2 · Full journey sheet

## 5. Container (P0)
- Opens from panel "Open full journey", row menu, `o`, or deep link `?visitor=…&journey=1&visit=v_006`.
- Sheet slides from the right over the panel (300ms); scrim covers the table at 24% ink. The panel stays mounted underneath, so ✕ returns to it.
- Header sticky; body has two regions: **Overview band** (scrolls away) and **Investigation split** (fills the viewport, both columns scroll independently).
- P1: "Open in new tab" as a full page at `/visitors/:ip`.

## 6. Wireframe

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ← Back   185.220.101.4 ⧉  ⛨ BLOCKED  G✓ M✓  · Frankfurt, DE · Hetzner · DC     [Always allow] [⋯] [✕] │
│ Blocked on 14 Sep at 14:32 after visit 6 of 12: six paid Google Ads clicks in 38 min from a data…      │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ OVERVIEW BAND                                                                                          │
│ ┌ Summary (GA4 card) ──────┐ ┌ Risk journey (lg, brushable) ───────────────────────────────────────┐ │
│ │ First seen  14 Sep 14:02 │ │ 100┤                              ●──●                                │ │
│ │ Last seen   14 Sep 16:10 │ │  70┤- - - - - - - - - - - -⚑- - - - - - - - - - - - Block at 70      │ │
│ │ Span        2h 08m       │ │    │          ●──●──●──●                                              │ │
│ │ Visits      12 · 8 paid  │ │   0┤●──●                                  ○        ○                  │ │
│ │ Time on site 0:41 total  │ │    14:00        14:20        14:40       15:00     15:40    16:10     │ │
│ │ Devices 1 · Locations 1  │ │    [brush: drag to zoom · double-click to reset]                      │ │
│ │ Conversions 0 · Forms 0  │ └────────────────────────────────────────────────────────────────────────┘ │
│ │ Wasted $28.80 · ~$58 prot│ ┌ Activity pattern (P1) ─────────────┐ ┌ Paid click gaps (P1) ────────┐ │
│ └──────────────────────────┘ │ hour × weekday heatmap (7×24)       │ │ histogram of seconds between │ │
│                              │ (competitor 9–5 pattern visible)    │ │ paid clicks; "very regular"  │ │
│                              └─────────────────────────────────────┘ └──────────────────────────────┘ │
├────────────────────────────────┬──────────────────────────────────────────────────────────────────────┤
│ VISITS                  12     │ VISIT 6 of 12 · ⚑ triggered block                        ‹ prev  next › │
│ [Paid only] [With signals]     │ Sat 14 Sep 2026 · 14:31:52 local (08:31:52 UTC) · lasted 1.1s          │
│ [After block] [Converted]      │ ● Paid · Google Ads › Running Shoes – Search › Trail – Exact            │
│ Expand all · Collapse all · ⇅  │   keyword "trail running shoes sale" · CPC $4.10                        │
│                                │   GCLID Cj0KCQjw…a8B ⧉  ⚠ also used on visit 5                         │
│ ▾ Sat 14 Sep  · 12 visits      │   Landing /sale/trail-runners?utm_source=google&utm_medium=cpc          │
│   16:10 ○ Direct  /     0:03 ⋯ │ ┌ Official signals ──────────────────────────────────────────────────┐ │
│   15:48 ○ Organic /sale 0:02   │ │ Interaction ▁▁▁▁ None │ Bot 96% ▮▮▮▮▮ │ VPN No │ Form — │ Conv — │ │ │
│  ── ⛨ Excluded G 14:32 M 14:33 │ └────────────────────────────────────────────────────────────────────┘ │
│ ▸ 14:31 ● Paid G /sale 0:01 ⚑  │ BEHAVIOR SCRUBBER (LogRocket timebar)                                    │
│   14:27 ● Paid G /sale 0:01 +12│ 0s ├▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┤ 1.1s                         │
│   14:20 ● Paid G /sale 0:01 +12│    ▲land  ▮bot96%              ▲exit                                    │
│   …                            │ ▶ 1× · Relative | Local | UTC                                            │
│                                ├──────────────────────────────────────────────────────────────────────┤
│                                │ [Events] [Score] [Device & network] [Raw]                               │
│                                │ +0.000s  ⬇ Landed  /sale/trail-runners  (from google ad click)          │
│                                │ +0.180s  ⚑ Signal  Bot probability 96%: webdriver flag, no pointer     │
│                                │ +0.200s  ⚑ Signal  Reused ad click ID (also visit 5)                  │
│                                │ +1.100s  ⬆ Exit    no scroll · 0 clicks · 0 pointer moves              │
└────────────────────────────────┴──────────────────────────────────────────────────────────────────────┘
```

## 7. Overview band

### 7.1 Summary card (P0) (GA4 user summary)
| Label | Variable | Format |
|---|---|---|
| First seen / Last seen | `firstSeen`, `lastSeen` | absolute per toggle |
| Span | `lastSeen − firstSeen` | `2h 08m` / `6d 4h` |
| Visits | `visitCount`, `paidVisits` | |
| Time on site | `Σ durationMs` + avg | `0:41 total · 3s avg` |
| Devices · Locations | `deviceCount`, `distinct geo.city` | |
| Conversions · Forms | `conversions`, `formFills` | invalid in red |
| Wasted · Protected | `wastedSpend`, `protectedSpendEst` | |
| Sources | stacked 100% bar paid/organic/direct/referral | legend on hover |

### 7.2 Risk journey, large (P0 chart; P1 brush)
Same encodings as panel E, at 100% width × 220px, plus:
- **Visit number labels** under markers when there are ≤ 20 visits.
- **Brush** (Samsara click-drag zoom): drag horizontally to zoom; a "Reset zoom" chip appears; the visit stream filters to the brushed window (chip in stream: "14:20–14:40 ×").
- Selected visit marker ringed (2px accent). Hovering a visit in the stream highlights its marker and the reverse (linked highlighting).
- Signal ticks (P1): a thin lane under the X axis with coloured ticks where signals fired (red high / amber med / green lowering).

### 7.3 Activity pattern heatmap (P1) (Amplitude insights)
7 rows (Mon–Sun) × 24 columns (local hour of *advertiser's* timezone); cell = visit count; paid-only toggle. Caption auto-generated when a pattern is detected: "All paid clicks between 09:00–17:00 on weekdays" (feeds H2's `business_hours_competitor` explanation).

### 7.4 Paid click gaps (P1) (supports `click_cadence`)
Histogram of seconds between consecutive paid clicks (log bins). Caption: "Gaps are unusually regular (≈ 4m 20s ± 6s)" when stdev < 5%. Hidden when < 3 paid clicks.

## 8. Investigation split

### 8.1 Visit stream (left, 340px) (GA4 timeline + Amplitude stream)
| Aspect | Spec |
|---|---|
| Grouping | Day header (`Sat 14 Sep · 12 visits · 8 paid · $28.80`) → visit rows. Days collapsible. |
| Order | Reverse chronological (toggle ⇅ to oldest-first; persisted). |
| Visit row | time · source dot + short source (`Paid G`, `Organic`, `Direct`, `Ref`) · landing path (middle-truncated) · duration · right tag: `⚑` trigger / `+12` score delta / `after block` / `✓ purchase` / `✉ invalid` |
| System rows | Out-of-visit events (Amplitude style: `bg-subtle`, mono-sm): "⛨ Excluded · Google Ads 14:32:41 · Meta Ads 14:33:05", "↺ Allowed by Sarah", "✕ Google exclusion failed · 500 limit", "Score decayed 71 → 60 (7 days inactive)" |
| Filters | toggle chips: **Paid only · With signals · After block · Converted** (AND). Count updates in header "12 → 5". |
| Expand | row chevron shows inline mini event list (first 4 events) without changing the selection; **Expand all / Collapse all** |
| Selection | click selects → right side updates (120ms crossfade); `↑/↓` in stream moves selection; default selection = **trigger visit** if blocked, **peak-score visit** if monitoring, **latest** otherwise |
| Filter-match dot | if the table has an active behaviour filter (e.g. Form fill = Invalid), matching visits show an indigo dot (LogRocket green-dot pattern) |
| Brush sync | brushed window filters the list (chip) |

### 8.2 Visit header (right top) (LogRocket "session details")
| Row | Variables | Rules |
|---|---|---|
| Title | `index`, `visitCount`, trigger flag | "VISIT 6 of 12 · ⚑ triggered block" / "· converted" / "· after block" |
| When | `startedAt`, `durationMs` | local + UTC both shown; duration `1.1s` / `3m 12s` |
| Source line | `source`, `platform`, `campaign`, `adGroup`, `keyword`, `matchType`, `cpc` | breadcrumb `Google Ads › campaign › ad group`; organic: "Organic · google.com search"; referral: referrer domain; direct: "Direct (typed or bookmark)" |
| Click ID | `gclid`/`fbclid` | truncated mono + copy; warnings: `⚠ also used on visit 5` (gclid_reuse) · `⚠ missing on a paid landing` (gclid_missing) |
| Landing | `landingUrl` | full URL with UTM params dimmed |
| Geo (only if differs from visitor) | `visit.geo` | amber chip "Different location from other visits" |
| Device | `device.type, os, browser, screen, language, timezone` | one line; spoof chip if `device_spoofing` |

### 8.3 Official signals strip (P0)
`SignalMeter` row, identical atoms to panel G but for **this visit**: Interaction level (+ scroll %, clicks, pointer moves, time on page as tooltip) · Bot probability (%) · VPN/proxy · Form fill (deliverability + masked email `j•••@mailinator.com`) · Conversion (type + value).

### 8.4 Behavior scrubber (P0 static, P1 playback) (LogRocket timebar)
| Layer | Encoding | Variables |
|---|---|---|
| Track | 0 → `durationMs`; for sessions > 10 min, **idle periods > 30s are compressed** (hatched gap with "4m idle") (LogRocket skip-inactivity) | `events[kind=idle]` |
| Activity density | background shading per 250ms bucket from pointer moves + scroll deltas: white = none, `grey-100` → `ink-900 @ 40%` = busy | `activityBuckets[]` |
| Scroll depth line | thin indigo line across the track showing max scroll % over time (P1) | `events[kind=scroll].meta.depth` |
| Markers | ▲ page view (ink) · ● click (ink small) · ✎ form focus/submit (indigo) · $ conversion (green) · ⚑ signal (red) · ◐ tab hidden (violet-grey band) · ↩ quick back (amber) · ✹ rage click (amber, **lowers** bot risk) | `events[]` |
| Cursor | vertical line; drag to scrub; the event list **auto-scrolls to the nearest event** and highlights it | |
| Playback (P1) | ▶ plays cursor at 1×/2×/4× through the timeline (no video, just events lighting up) | |
| Time label | Relative (`+0.180s`) · Local · UTC toggle (global) | |
| Bot visit look | nearly white track, landing ▲ and exit ▲ 1s apart, red ⚑ at 0.18s. The absence of activity is the visual proof. | |

### 8.5 Tabs (right bottom)

**Default tab (DECISION):** **Score** when the selected visit is the trigger visit (blocked/pending/failed) or the peak-score visit (monitoring); **Events** otherwise. The tab choice persists while the user moves between visits, until they pick one manually.

**Events (P0)** (LogRocket event timeline)
| Column | Variable | Format |
|---|---|---|
| Time | `t` | per toggle, `+0.180s` |
| Icon | `kind` | as scrubber markers |
| Description | `label` | e.g. "Scrolled to 62%", "Clicked 'Add to cart' (button#add)", "Submitted newsletter form · email invalid (mailbox doesn't exist)", "Tab hidden for 42s" |
| Detail expand | `meta` | key/value list (selector, URL, depth, field names; **never raw PII**, masked emails) |
- Filter by kind (multi-select chips: Pages · Clicks · Scroll · Forms · Signals · Tab) and a text search.
- Hover row → scrubber marker pulses. Click row → moves cursor.
- Long visits: first 30 events, then "Show 84 more".

**Score (P0, main proof screen, DECISION)** (new; the explanation engine)
Waterfall for this visit:
```
Score before visit 6                          61
▲ Click burst (5→6 paid in 1h)               +0  (already at cap)
▲ Reused ad click ID                        +10  (2nd occurrence)
▲ No real interaction                        +5  (cap 18 reached)
▼ Decay since previous visit                 −0
Score after visit 6                          76  ◆ crossed 70 → block
```
- Each line: signal label · reason in parentheses (cap reached, first occurrence, decay) · points · horizontal bar.
- Toggle **This visit | Whole journey**. Whole journey = table: signal · first triggered (visit #) · times triggered · points counted (of raw) · direction. Sorted by points.
- Link "How scoring works" → popover summarising the model (threshold, caps, decay) in 5 lines.

**Device & network (P0)**
Two KeyValue groups. **This visit**: UA (full, mono, wrap), browser, OS, device type, screen, viewport, language, timezone, fingerprint ID, webdriver flag, touch support. **Network**: IP, reverse DNS, ASN/name, network type, VPN/proxy provider, Tor exit (bool), abuse-list hits, geo (city/region/country/lat-lon rounded). Values have ⊕/⊖ quick filters (P1) and copy.

**Raw (P1)** (Amplitude Raw view)
Pretty-printed JSON of the `Visit` object (PII masked) with a copy button. Caption: "What ClickGuard received for this visit." A transparency move.

## 9. Full-journey states
| State | UI |
|---|---|
| Loading | overview skeleton, stream skeleton rows, right side skeleton |
| Visit has no events (tracking blocked) | scrubber shows "No behaviour recorded: the tag didn't load on this visit (ad blocker or bot that doesn't run JavaScript)". **This itself counts as a signal** (`no_js`, +8, invented) |
| Brushed window empty | stream "No visits in this window · Reset zoom" |
| Stream filters → 0 | "No visits match · Clear" |
| Very long journey (60+) | day groups collapsed except the trigger day; heatmap prominent |
| Allowed visitor | banner under header: "Always allowed by Sarah Chen on 15 Sep: 'Our buyer at Harrods'" + Remove |
| Failed exclusion | banner red with Retry, and stream shows paid visits after failure highlighted red "paid after failed exclusion" |

## 10. Motion & feedback summary
| Interaction | Motion |
|---|---|
| Panel open/close | 200ms slide + table width tween |
| Panel content switch | 120ms crossfade |
| Sheet open | 300ms slide from right + scrim fade |
| Visit selection | 120ms crossfade right side; marker ring grows 0→2px 150ms |
| Chart hover | tooltip no delay; crosshair follows pointer |
| Action result | row flash 1.2s; pill morph 200ms; toast with Undo |
| Reduced motion | all slides → instant; crossfades → none; spinners → static text |
