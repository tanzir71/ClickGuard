# 06 · Mock Data Spec

Data must **behave like real traffic** and follow the three mechanics: IP = visitor, mixed sources (only paid costs money), cumulative blocking. Generate it **deterministically** (seeded PRNG, e.g. `mulberry32(20260918)`) so screenshots, Storybook, and the prototype always match. Hand-author the hero scenarios and procedurally generate the background crowd.

## 1. Volume
- **~160 visitors / ~900 visits** over the last 7 days (plus a 30-day tail for the date filter). Enough to filter meaningfully while staying readable. Stat row numbers are *derived*, not hardcoded.
- Status mix, roughly: clean 70% · monitoring 8% · blocked 18% · allowed 2% · pending 1% · failed 1%.
- Visitors with ≥1 paid visit: ~65%.
- Journey length distribution: 1 visit (45%), 2–4 (35%), 5–15 (17%), 16–60 (3%).

## 2. Types (TypeScript, to live in `apps/prototype/src/data/types.ts`)
```ts
type Platform = 'google_ads' | 'meta_ads' | 'microsoft_ads';
type Source = 'paid' | 'organic' | 'direct' | 'referral';
type VisitorStatus = 'blocked' | 'monitoring' | 'clean' | 'allowed' | 'pending' | 'failed';
type NetworkType = 'residential' | 'mobile' | 'datacenter' | 'vpn' | 'proxy' | 'corporate' | 'tor';

interface Visitor {
  ip: string;                       // id
  geo: { city?: string; region?: string; country: string; lat?: number; lon?: number };
  isp?: string; asn?: string; networkType: NetworkType;
  fingerprints: string[];           // device IDs seen on this IP (>1 ⇒ shared IP)
  firstSeen: string; lastSeen: string;          // ISO
  asnName?: string;                 // e.g. 'Hetzner Online'
  reverseDns?: string; abuseListHits?: string[];
  decision?: { by: 'auto' | { user: string }; at: string; rule: string /* 'score>=70' */ };
  reviewed: boolean;                // cleared 'unread' state
  related: { sameFingerprintIps: string[]; subnet24Ips: string[]; asnVisitorCount: number; asnBlockedCount: number };
  networkBlockedAccounts30d: number; // invented cross-customer intelligence
  status: VisitorStatus;
  riskScore: number;                // current cumulative 0–100
  threshold: number;                // 70 (account setting)
  blockedAt?: string; blockedAtVisitId?: string;
  exclusions: Array<{ platform: Platform; state: 'excluded'|'syncing'|'failed'|'not_connected'|'removed'; at?: string; error?: string }>;
  allowedBy?: { user: string; at: string; note?: string };
  visitIds: string[];
  // derived at load time:
  paidVisits: number; wastedSpend: number; protectedSpendEst: number;
  topSignals: SignalHit[];          // cumulative, sorted by |points|
}

interface Visit {
  id: string; ip: string; fingerprint: string;
  startedAt: string; durationMs: number;
  source: Source; platform?: Platform;
  campaign?: string; adGroup?: string; keyword?: string; matchType?: 'exact'|'phrase'|'broad'; gclid?: string; fbclid?: string; cpc?: number; // paid only
  referrer?: string; landingPath: string; landingUrl: string; // full URL incl. UTM
  geo?: Visitor['geo'];             // only when it differs from visitor geo
  pages: Array<{ path: string; t: number }>;
  activityBuckets: number[];        // 250ms buckets, 0–1 intensity (pointer+scroll) for the behavior scrubber
  conversionType?: 'purchase'|'add_to_cart'|'begin_checkout'|'submit_form'|'sign_up'|'request_quote'; // Clarity smart-event vocabulary
  conversionValue?: number;
  jsExecuted: boolean;              // false ⇒ no events, triggers no_js
  device: { type: 'desktop'|'mobile'|'tablet'; os: string; browser: string; ua: string; screen: string; language: string; timezone: string };
  interaction: { level: 'none'|'low'|'medium'|'high'; scrollPct: number; clicks: number; timeMs: number; pointerMoves: number };
  botProbability: number;           // 0–1
  vpnProxy: boolean;
  formFill?: { emailMasked: string; deliverability: 'valid'|'invalid'|'disposable'|'unknown' };
  events: VisitEvent[];
  signals: SignalHit[];             // hits observed on this visit
  scoreBefore: number; scoreAfter: number;
  afterBlock: boolean;              // happened after IP excluded
  converted?: boolean;
}

interface VisitEvent { t: number /* ms from land */; kind: 'landed'|'page_view'|'scroll'|'click'|'form_focus'|'form_submit'|'idle'|'tab_hidden'|'exit'|'signal'|'rage_click'|'dead_click'|'quick_back'|'conversion'; label: string; meta?: Record<string, string|number>; }

interface SignalHit { signalId: SignalId; value: string; points: number /* +raise / −lower */; severity: 'low'|'med'|'high'; }
```

## 2b. Derived fields used by the UI (compute in `derive.ts`, never store)
| Field | Definition | Used in |
|---|---|---|
| `visitCount`, `paidVisits`, `unpaidVisits` | counts in date range | table Journey, panel H |
| `paidVisitsBeforeBlock` | paid visits with `startedAt ≤ blockedAt` | Wasted cell, panel H |
| `band` | `riskScore` <40 Low · 40–69 Elevated · ≥70 High | Risk cell, filter |
| `scoreDelta24h` | riskScore − score at now−24h | Risk cell L2 |
| `maxBotProbability`, `avgBotProbability` | over visits | Bot prob. cell, panel G |
| `typicalInteraction` | mode of `interaction.level` (ties → lower) | Bot cell L2, filter |
| `vpnProxyAny` | any visit vpnProxy | filter, panel G |
| `formFills` | `{valid, invalid, disposable}` counts | Conversions cell, panel G |
| `conversions`, `conversionValueTotal` | | Conversions cell |
| `deviceCount` | `fingerprints.length` | Visitor cell tag |
| `blockedAtVisitIndex` | 1-based index of trigger visit | Decision cell, verdict |
| `peakScore`, `peakVisitIndex` | max scoreAfter (monitoring route node) | panel D |
| `topSignals` | aggregated hits sorted by abs(points) | Top reason cell, panel F |
| `priority` | `severityRank*1000 + min(wastedSpend,99)*5 + recency(0–100)` | default sort |
| `exclusionLatencyMs` | `exclusions[].at − decision.at` | panel C |
| `paidAfterBlock` | paid visits after blockedAt (expected 0 unless failed) | panel H proof line |
| `sourceMix` | % paid/organic/direct/referral | journey summary bar |
| `hourWeekdayMatrix` | 7×24 counts (advertiser TZ) | activity heatmap |
| `paidGapStats` | gaps (s), mean, stdev, cv | paid click gaps chart |
| `needsReview` | per 05a §4.2 | stat tile, saved view |
| `verdict` | `verdict(visitor)` per 05b §3 B grammar | panel B, sheet header |

## 3. Signals catalogue

### 3.1 Official signals (from Ella's email, verbatim meaning)
| Signal | What it means (brief) | How we model it | UI treatment |
|---|---|---|---|
| **IP address** | The visitor's identifier. This is what gets added to the exclusion list. | `Visitor.ip` | Row identity, mono, copyable |
| **Location** | Country, region, and city the visit came from | `Visitor.geo` (+ per-visit geo if it changes) | Row line 2, panel header |
| **Interaction level** | How much the visitor actually engaged with the page (scroll, clicks, time, mouse movement) | `Visit.interaction: { level: 'none'\|'low'\|'medium'\|'high'; scrollPct; clicks; timeMs; pointerMoves }` | Per-visit meter; signal row |
| **Bot probability** | Model confidence that the visitor is automated | `Visit.botProbability: 0–1` (+ visitor max/avg) | % with bar; high values drive points |
| **VPN / proxy** | Whether the connection hides the visitor's real location | `Visitor.networkType` + `Visit.vpnProxy: boolean` | Tag on row, signal row |
| **Form fill** | Email deliverability status at the time a form is submitted (e.g. Valid, Invalid) | `Visit.formFill?: { email: masked; deliverability: 'valid'\|'invalid'\|'disposable'\|'unknown' }` | Event + signal. Invalid raises risk, valid lowers it |
| **Conversion** | Whether the visitor actually bought or converted | `Visit.converted` | Strong mitigating signal |

Note: the brief frames these as *visit* signals. Our design shows each one **per visit** and **accumulated per visitor**. That split is how "cumulative blocking" becomes readable.

### 3.2 Scoring contributions
`O` = official signal above · `K` = ClickGuard public site · `C` = category-common · `N` = **invented by us** (the brief invites this; call these out in the rationale).

| id | Label (UI) | Rule | Points | Src |
|---|---|---|---|---|
| `bot_probability` | Likely automated | botProbability ≥ .9 (+30), ≥ .7 (+18), ≥ .5 (+8); counted once at the visitor's max | +8…+30 | **O** |
| `interaction_none` | No real interaction | level `none` (0 scroll, 0 pointer, < 2s) | +6 per visit (cap 18) | **O** |
| `interaction_low` | Minimal interaction | level `low` | +2 per visit (cap 8) | **O** |
| `vpn_proxy` | VPN or proxy | once per visitor | +12 | **O** |
| `form_invalid_email` | Form submitted with invalid email | deliverability `invalid` / `disposable` | +20 / +15 | **O** |
| `location_outside_targeting` | Outside campaign targeting | geo ∉ campaign geo | +10 | O/K |
| `click_frequency` | Repeat paid clicks | ≥3 paid in 1h (+12), ≥5 (+25), ≥3 in 24h (+8) | +8…+25 | C |
| `datacenter_ip` | Data-center network | networkType `datacenter` | +22 | K |
| `timezone_mismatch` | Browser timezone ≠ IP location | e.g. IP Frankfurt, TZ Asia/Dhaka | +10 | **N** |
| `device_spoofing` | Device spoofing | UA iPhone, screen 1920×1080 | +15 | K |
| `fingerprint_rotation` | New device every visit | fingerprints change per visit within 10 min | +15 | K |
| `gclid_reuse` | Reused ad click ID | same GCLID on >1 visit | +20 | **N** |
| `gclid_missing` | Paid landing without click ID | utm paid, no GCLID | +8 | K |
| `click_cadence` | Machine-regular timing | stdev of paid-click gaps < 5% | +15 | **N** |
| `keyword_fixation` | Same expensive keyword every time | ≥4 paid visits, same top-CPC keyword, same page | +10 | **N** |
| `business_hours_competitor` | Office-hours-only clicks from a business ISP | | +8 | **N** |
| — mitigating — | | | | |
| `converted` | Converted | Conversion = true | −25 | **O** |
| `form_valid_email` | Form submitted with deliverable email | deliverability `valid` | −10 | **O** |
| `interaction_high` | Real engagement | level `high` (scroll ≥ 50%, ≥ 30s) | −6 per visit (cap −18) | **O** |
| `shared_ip` | Shared network (many real devices) | ≥3 fingerprints with human interaction | −10 | **N** |
| `returning_organic` | Also finds you organically | organic/direct visits with medium+ interaction | −5 | **N** |
| `no_js` | Tag didn't run (no behaviour recorded) | paid visit with `jsExecuted=false` | +8 per visit (cap 16) | **N** |
| `quick_back` | Bounced straight back to the ad | paid landing → back within 3s | +3 per visit (cap 9) | **N** (Clarity quick-backs) |
| `human_friction` | Human frustration (rage/dead clicks) | ≥1 rage or dead click | −4 per visit (cap −8) | **N** (Clarity) |
| `network_intel` | Blocked on other ClickGuard accounts | `networkBlockedAccounts30d ≥ 5` | +10 | **N** (Sift globe) |

### Scoring model (simple and explainable, which is the point)
- Visitor score = clamp(0,100, Σ points of all hits across visits), with **decay of 15% per 7 days of inactivity** (so old one-offs fade).
- Network-type and bot-probability signals count **once** per visitor, and per-visit signals accumulate up to their caps.
- `threshold = 70`. When `scoreAfter ≥ threshold` **and the visitor has ≥1 paid visit**, the IP is blocked at that visit. Organic-only visitors can exceed 70 but stay `monitoring` (nothing to exclude).
- Exclusion `at` = blockedAt + 20–90 s (Google), + 1–4 min (Meta).
- Wasted spend = Σ cpc of paid visits **up to and including** the block visit.
- Protected spend est. = (paid click rate before block, per day) × days since block × avg CPC, capped. Label it "est." everywhere.
- CPC range: $0.80–$6.50, depending on campaign/keyword.

## 4. Hero scenarios (hand-authored; pin them near the top of default sort)

| # | IP | Name (internal) | Story | Expected status | Score |
|---|---|---|---|---|---|
| H1 | `185.220.101.4` | **Click-farm burst** (clearly malicious) | Frankfurt, Hetzner DC. 1 direct probe, then 11 paid Google clicks in 40 min on the same campaign, 0.8–1.4s each, no scroll, bot probability 0.96 from visit 3, interaction `none`, GCLID reused on visits 5–6, TZ Asia/Dhaka. Blocked at visit 6. Visits 7–12: 2 organic/direct after block (ads no longer shown) and paid visits stop. | blocked (Google ✓, Meta ✓) | 94 |
| H2 | `98.42.17.203` | **Slow-burn competitor** | Austin, AT&T Business. 9 paid visits over 6 days, 9–5 weekdays only, always the keyword "commercial trail shoes wholesale" (top CPC $6.20), views the pricing page only, 20–40s, some scroll. Crosses at visit 8 via keyword_fixation + business_hours + click_frequency (24h). | blocked (Google ✓, Meta – not connected) | 78 |
| H3 | `72.14.201.88` | **Ambiguous: shared household/office IP** (genuinely ambiguous) | Austin, Spectrum residential. 3 fingerprints. 7 visits: 4 paid (2 within 20 min from different devices), 3 organic. One device submitted the newsletter form with a **valid** email and added to cart but didn't buy; another bounced twice in 2s. VPN flagged on one visit. Score hovers at 64; the mitigators (shared_ip, engaged_session) are what keep it under. | monitoring | 64 |
| H4 | `203.0.113.77` | **Ambiguous: VPN power user who converts** | Singapore IP, VPN, TZ Asia/Singapore (match). 5 paid clicks over 3 days, fast bounces with bot probability ~0.55, then a purchase. Would be 82 without `converted −25`. | monitoring | 57 |
| H5 | `45.83.64.9` | **Organic scraper** | DC IP, 40 organic/direct hits in 2 hours, never clicked an ad. | monitoring ("nothing to exclude") | 88 |
| H6 | `81.2.69.160` | **False positive, allowed by user** | London, BT residential. 5 paid clicks in 1h (comparing products on mobile then desktop). Auto-blocked, then user "Always allowed" it the next day with note "Our buyer at Harrods". | allowed | 71 (frozen) |
| H7 | `192.0.2.44` | **Pending sync** | Blocked 40s ago; Google excluded, Meta syncing. | pending | 83 |
| H8 | `198.51.100.23` | **Exclusion failed (500 limit)** | Blocked; Google failed: "Campaign 'Brand – Exact' has reached 500 IP exclusions"; Meta ✓. | failed | 90 |
| H9 | `100.64.12.8` | **Mobile carrier CGNAT** | T-Mobile, 14 fingerprints, 22 visits, mostly organic with normal engagement. Mixed signals but clearly many humans. | clean | 22 |
| H10 | `66.249.70.11` | **Happy customer** | 2 organic, 1 paid, 3 min session, purchase. | clean | 0 |
| H11 | `5.188.10.120` | **Long journey (60 visits)** | Proxy, visits over 30 days, low-level repeat paid clicks. Stress test for strip binning. | blocked | 100 |
| H13 | `194.61.40.12` | **Lead-form spam** | Paid Meta clicks, form filled in 1.2s with **invalid / disposable** emails 3×, bot probability 0.81. | blocked (Meta ✓, Google ✓) | 86 |
| H12 | `—` | **Missing data** | Geo unknown, ISP unknown. | clean | 8 |

## 5. Background crowd generation rules
- Countries weighted to a US/UK e-commerce advertiser ("acme-shoes.com"): US 60%, UK 15%, CA 8%, DE 5%, other 12%.
- ISPs per country from a small realistic list (Comcast, Spectrum, Verizon Fios, AT&T, BT, Sky, Virgin Media, Rogers, Deutsche Telekom). DC ASNs: Hetzner, OVH, DigitalOcean, AWS, M247.
- Use documentation and reserved IP ranges where possible (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`) **plus** realistic-looking public IPs for the crowd. DECISION: real-looking public IPs are OK; avoid known real company ranges.
- Campaigns (Google): "Running Shoes – Search", "Brand – Exact", "Trail – PMax"; (Meta): "Autumn Sale – Retargeting", "Prospecting – Lookalike".
- Paid visit events: land → 60% scroll → 25% click product → 8% add to cart → 2.5% purchase. Bot visits: land → exit.
- Visits cluster by hour of day (evening peak local time) except bot scenarios.
- Dates relative to a fixed "now" = **2026-09-17T14:00:00Z**, so the demo stays stable (don't use `Date.now()`).

## 6. Derived aggregates (computed, never stored)
visitors · blocked · monitoring · wasted spend · protected spend est. · counts per status/platform for filter chips. All respect the date range filter.

## 7. Data validation tests (Vitest)
- Every `blocked/pending/failed` visitor has ≥1 paid visit and `blockedAtVisitId` pointing to a visit whose `scoreAfter ≥ threshold`.
- No visit before `blockedAt` has `afterBlock=true`, and none after has `false`.
- No paid visit **on an excluded platform** occurs after exclusion time (organic can).
- Organic-only visitors are never `blocked`.
- `wastedSpend` equals the sum of pre-block paid CPCs.
- Hero scenarios H1–H13 exist with the expected statuses.
These tests are rationale evidence: "Data reflects mechanics" is a named red-flag, and this proves we took it seriously.
