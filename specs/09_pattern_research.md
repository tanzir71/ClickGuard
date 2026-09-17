# 09 · Pattern Research: What to Steal, and From Whom

Goal: pull the **highest-value** pattern from each reference product and translate it into Threat Monitoring. Three families were studied:

1. **Ride-hailing / fleet**: Uber (Base design system data table, rider trips, Business Hub), Samsara (trip history, Safety Inbox)
2. **Analytics**: Google Analytics 4 (User Explorer), Amplitude (User Lookup), Cloudflare (Security Events), Datadog (RUM Explorer)
3. **Session / app analytics**: LogRocket, PostHog, Microsoft Clarity
4. **Bonus, risk decisioning** (the closest analogue to "explain a block"): Stripe Radar, Sift

Evidence level per row: **Doc** = confirmed from the vendor's documentation · **Obs** = commonly known UI pattern, not verified in docs this session.

---

## 1. Source-by-source

### 1.1 Uber Base design system: Data Table (Doc)
| Pattern | Detail | Adopt? |
|---|---|---|
| Sticky header; first column sticky on horizontal scroll | Header uses same size, heavier weight | ✅ |
| Row hover darkens whole row; **column-header hover darkens the whole column** and reveals the sort icon | Visual scan of one metric | ✅ column hover only on sortable columns |
| **3-state sort cycle**: 1st click desc (icon black), 2nd asc, 3rd removes sort (icon grey, hides) | Predictable, reversible | ✅ exactly |
| Search across all non-numeric columns; **matched substring rendered bold** in results | | ✅ |
| **Batch actions:** header checkbox selects visible rows; selecting any row **replaces the search/filter bar with a batch-action bar** | Removes redundant UI while acting | ✅ |
| **Row-hover quick actions** on the far right | | ✅ (Allow / Block / Open) |
| **"Add filter" pill → list of columns with data-type icon → type-specific filter editor** (categorical, boolean, date-time, numerical with histogram) → **filter summary tags** that stack, with × to remove | Scales to many fields without a wall of dropdowns | ✅ core filter model |
| Zebra striping | | ❌ we use hairlines. Zebra fights the status colour and selected-row tint. |
| No cell spans, strict column schema, "more like Excel" | | ✅ as an engineering principle for `DataTable` |

### 1.2 Uber rider trips / Business Hub (Obs, plus Business Hub page)
| Pattern | Translation |
|---|---|
| **Trip list row with a mini map thumbnail**: a glanceable picture of the journey on every row | **Visit ribbon** in each row: last 7 days as a track, one dot per visit, filled = paid, red tick = block. The "map thumbnail" for traffic. |
| **Trip detail: map on top, then a two-stop vertical route** (pickup → drop-off, each with time and address) | **Decision route**: First seen → Threshold crossed → Excluded → Last seen, as a vertical stepper with times |
| **Fare breakdown like a receipt** (line items → total) | **Spend receipt**: paid clicks × CPC by platform → wasted, then protected (est.) |
| "Report an issue" at the bottom of a trip | "This looks wrong → Always allow / Tell us why" (feedback loop) |
| Business Hub: "Review all trips… reports with data on **time, location, cost**" | Our three row axes: *when, where (geo + platforms), cost* |

### 1.3 Samsara: Trip History + Safety Inbox (Doc)
| Pattern | Translation |
|---|---|
| Trip column shows **A (start + time) → B (end + time) + duration** in one cell | Visitor cell line 2: `first seen → last seen · span 6d` |
| **Three view modes: Event view / Trip view / Driver-by-day view** | View switch: **Visitors** (default) / **Visits** / (P2) **By network** |
| **"Needs Review" tab** as the entry point; statuses **Reviewed / Coached / Dismissed** | Saved view **Needs review** (monitoring + failed + recent blocks you haven't opened). Row state *Reviewed* once the panel was viewed ≥3s or marked. |
| **Sort by Priority** (highest-risk first) | "Priority" sort = severity × spend × recency |
| **Speed graph with the posted limit line, colour-coded by severity; hover shows speed, limit, "amount over"**; click-drag zoom | **Risk journey chart**: threshold line, segments above threshold tinted, hover shows score, threshold, and "points over". Brush-zoom in the full view. |
| Trip speeding summary (time speeding, count, severity breakdown) | Visitor signal summary: signals triggered, count, severity breakdown |

### 1.4 Google Analytics 4: User Explorer (Doc)
| Pattern | Translation |
|---|---|
| User table where **cell type can be text, bar, or heat map** | Risk, bot probability, spend render as **in-cell bars** |
| User detail: **summary card** (first visit date, location, stream, top event categories, totals: events, revenue, engagement time) | Full-journey **Visitor summary card** |
| **Timeline of events grouped by date → sessions**, each collapsible; **Expand all / Collapse all**; sort asc/desc; expanding an event shows device info, user properties, event parameters, audiences | **Visit stream**: grouped Day → Visit → Events, same controls |
| Filter timeline by event name | Filter stream: Paid only · With signals · After block · Converted |
| "Create segment from selected events" | P2: "Find visitors with this pattern" |

### 1.5 Amplitude: User Lookup (Doc)
| Pattern | Translation |
|---|---|
| Event stream **grouped by session, reverse chronological**; **in-session vs out-of-session events colour-coded** | Visits in reverse chronological order by default; system events (block decision, exclusion sync) rendered as **out-of-visit events** in a different style between visits |
| **Info view vs Raw view (JSON)** toggle | **Raw** tab per visit, for support and power users. Cheap and shows transparency. |
| **Pin properties** to show by default; the rest below the fold | Panel "Details" shows 6 pinned fields, "Show all 24" |
| Insights tab with activity charts for the user | Full view **Activity pattern**: hour × weekday heatmap + gaps between paid clicks |
| Live event updates toggle | P2: "Live" toggle on table (new rows fade in) |

### 1.6 Cloudflare: Security Events (Doc)
| Pattern | Translation |
|---|---|
| **Top-N insight panels** above the log (by Action, Host, Country, ASN) and events by service | Collapsible **Insights strip**: Top networks (ASN), Top countries, Top campaigns hit, Top reasons, each for blocked visitors |
| **Hover a legend value → "Filter" / "Exclude" buttons** | **Cell-level ⊕ / ⊖** on filterable values everywhere (ASN, country, campaign, signal) |
| **Sampled logs table; expand a row to see fields** (action, rule, ray ID, IP, ASN, country, UA, path), and **each field can become a filter or exclusion** | Inline row expand shows visits; the panel's KeyValue rows get ⊕ / ⊖ |
| Field–operator–value filter builder | Same operators in our filter editor |
| Time-range defaults ("Last 24 hours") | Default "Last 7 days" |

### 1.7 Datadog: RUM Explorer (Doc, thin)
| Pattern | Translation |
|---|---|
| Search bar with **autocomplete for facets and recent queries**; **saved views** | Search suggests field-scoped queries: `asn:Hetzner`, `ip:185.220.*`, `campaign:"Brand – Exact"` |
| List / columns / timeseries visualisations of the same query | P2: toggle table ↔ timeseries |

### 1.8 LogRocket: Session Replay + Filters (Doc)
| Pattern | Translation |
|---|---|
| **Timebar activity density**: "White represents no activity, and dark gray indicates greater user activity"; **errors = red lines, tab switches = purple markers** | **Behavior scrubber** per visit: shaded by pointer/scroll activity; red = signal flags, indigo = form submit / conversion, violet-grey = tab hidden |
| **Event timeline synced to playback**: auto-scrolls to the nearest event; expand an entry for details; **green dot marks events that matched the list's search filter** | Event list synced to scrubber cursor; events that match the active table filter get an indigo dot |
| **Time display toggle**: Relative / Absolute Local / Absolute UTC / Unix | Global time format toggle: Relative · Local · UTC |
| **Session Info pane**: *User details* (ID, session count, first/last seen, total time) + *Session details* (IP, browser/device, referrer, UA, language) | Panel and visit detail field groups use exactly this split: **Visitor** vs **This visit** |
| Filter taxonomy: **User identification / Session metadata / Session activity / Performance** | Our "Add filter" menu groups: **Visitor · Visit & ad click · Behavior · Risk & decision** |
| **Saved segments, Public ("Team Filters") vs Private ("My Filters")** | Saved views: **Team** / **Mine** |

### 1.9 PostHog: Session Replay (Doc)
| Pattern | Translation |
|---|---|
| **List on the left + player on the right, activity timeline in sync** | Full view layout: Visit stream left, visit detail right |
| **Share link to exact timestamp** | Deep link: `?visitor=…&visit=6&t=0.2s` |
| Filters: rage clicks, dead clicks, exceptions | Behaviour filters |
| AI summary of a recording | ❌ skip. Deterministic verdict sentences are more trustworthy for *this* problem (put this in the rationale). |

### 1.10 Microsoft Clarity (Doc)
| Pattern | Translation |
|---|---|
| **Smart events auto-detected**: Purchase, Add to Cart, Begin Checkout, Contact Us, Submit Form, Request Quote, Sign Up, Login, Download | Our conversion/engagement event vocabulary |
| Behaviour insights: **rage clicks, dead clicks, excessive scrolling, quick backs** | **Human-friction markers**. Invented angle: these are *mitigating* (bots rarely rage-click), and a **quick back** after a paid click is a "pogo" that raises risk slightly |

### 1.11 Stripe Radar: Risk evaluation + Risk insights (Doc) ⭐ closest analogue
| Pattern | Translation |
|---|---|
| **Named risk levels with score bands and a default action**: Normal 0–64 → allowed · Elevated 65–74 → manual review · High 75–99 → blocked | Our bands: **Low 0–39 · Elevated 40–69 (monitor) · High ≥70 (block)**, with the action shown next to the band |
| **`seller_message`**, a one-line human sentence: "Stripe blocked this charge as too risky." | Our **verdict sentence**, the most-validated pattern in the set |
| **Risk insights** card: factors behind the score, **"Show all insights"** | Top 3 reasons → "Show all signals" |
| Customer consistency (name ↔ email match, email's authorisation rate across network) | **Form-fill deliverability** + cross-account network signal |
| **Geography: billing, shipping, and IP locations** together | **Location consistency**: IP location · browser timezone · language · campaign targeting |
| **Related payments**: same customer, IP, or card. Reveals card testing (many cards, one IP). | **Related visitors**: same device fingerprint on other IPs, same /24 subnet, same ASN in window |
| **"Add to allow list"** on a blocked payment | **Always allow this IP** |

### 1.12 Sift: User details signals (Doc) ⭐
| Pattern | Translation |
|---|---|
| **Signals ordered by impact** on the score; only the most significant shown | Ranked SignalBars |
| **Red = extremely risky, Yellow = risky, Green = reduces risk** | Our severity colours map 1:1 (red / amber / green) |
| **Click a signal → modal**: value, description, admin annotations, **entities sharing the same value**, "create list of similar users" | **Signal popover**: what it is, observed value, points, how it's computed, **"12 other visitors share this value" → filter** |
| **Globe icon = value seen with fraud across Sift's global network** | **Network badge**: "Seen blocked on 38 other ClickGuard accounts this month". A cross-customer intelligence signal (invented for ClickGuard; flag it in the rationale). |

---

## 2. Pattern matrix: what goes where

| Layer | Borrowed patterns |
|---|---|
| **Page header** | Stat tiles as filter shortcuts · Insights strip, top-N with Filter/Exclude (Cloudflare) · Saved views incl. *Needs review* (Samsara, LogRocket) · time-format toggle (LogRocket) |
| **Filter bar** | Search with bold match + field autocomplete (Uber, Datadog) · Add-filter pill → typed editors → stacked tags (Uber) · grouped field menu (LogRocket) · batch bar replaces filters on selection (Uber) |
| **Table** | Visitor rows · 3-state sort (Uber) · Priority sort (Samsara) · in-cell bars (GA4) · visit ribbon as the row "map thumbnail" (Uber) · A→B time cell (Samsara) · top-reason column (Stripe, Sift) · row hover actions (Uber) · cell ⊕/⊖ (Cloudflare) · view switch Visitors/Visits (Samsara) |
| **Row expand** | Visits nested with block divider · out-of-visit system events (Amplitude) |
| **Side panel** | Verdict sentence (Stripe) · decision route stepper (Uber trip) · risk chart with limit line (Samsara) · ranked red/amber/green signals + popover with "shared by N" (Sift, Stripe) · official signal snapshot · spend receipt (Uber fare) · related visitors (Stripe) · pinned details / show all (Amplitude) · allow-list action (Stripe) |
| **Full journey** | Summary card (GA4) · brushable risk chart (Samsara) · activity heatmap (Amplitude insights) · Day → Visit → Event stream with expand/collapse all (GA4, Amplitude) · list-left/detail-right sync (PostHog) · behaviour scrubber with density and markers (LogRocket) · synced event list (LogRocket) · score waterfall (new) · Info/Raw toggle (Amplitude) · timestamp deep link (PostHog) |

## 3. Deliberately NOT borrowed
- **Session replay video** (LogRocket, PostHog, Clarity): we have no DOM recording, and for bots the "replay" is empty. The *behaviour scrubber* gives the same "watch what happened" confidence with synthetic, honest data.
- **AI summaries** (PostHog Replay Vision): a trust screen needs reproducible explanations. Every verdict word maps to a data field.
- **Column-picker walls** (ClickCease has 20+ optional columns): default to 9 opinionated columns. The picker exists, but presets come first.
- **Zebra stripes** (Uber Base): they conflict with status tints and the selected row.
- **Free-form query language as the primary filter** (Datadog): wrong audience. Advertisers aren't SREs. Keep it as search autocomplete only.

## Sources
- Uber Base: [Data table](https://base.uber.com/6d2425e9f/p/901301-data-table) · [Business Hub](https://www.uber.com/us/en/business/products/business-hub/)
- Samsara: [Trip History Report](https://kb.samsara.com/hc/en-us/articles/360043246071-Trip-History-Report) · [Speeding Events in the Safety Inbox](https://kb.samsara.com/hc/en-us/articles/10649378458125-Speeding-Events-in-the-Safety-Inbox)
- Google: [GA4 User explorer](https://support.google.com/analytics/answer/9283607?hl=en) · [MeasureSchool GA4 User Explorer guide](https://measureschool.com/user-explorer-in-ga4/)
- Amplitude: [Look up event data for individual users](https://amplitude.com/docs/analytics/user-data-lookup)
- Cloudflare: [Security Events](https://developers.cloudflare.com/waf/analytics/security-events/)
- Datadog: [RUM Explorer](https://docs.datadoghq.com/real_user_monitoring/explorer/)
- LogRocket: [Using the timeline](https://docs.logrocket.com/docs/using-the-logrocket-timeline) · [Filters](https://docs.logrocket.com/docs/logrocket-filters)
- PostHog: [Session replay web app](https://posthog.com/docs/session-replay/surfaces/web-app)
- Microsoft Clarity: [Ultimate guide to Smart Events](https://clarity.microsoft.com/blog/ultimate-guide-clarity-smart-events/)
- Stripe: [Risk evaluations](https://docs.stripe.com/radar/risk-evaluation) · [Risk insights](https://docs.stripe.com/radar/reviews/risk-insights)
- Sift: [Understanding Signals](https://siftscience.zendesk.com/hc/en-us/articles/219073757-Understanding-Signals)
