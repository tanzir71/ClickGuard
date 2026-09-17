# ClickGuard Design Challenge: Working Pack

Status: **v0.3, decisions locked, ready for Codex handover.** v0.2 added 05a, 05b and 09; v0.3 locked every open decision (see below). Files mark `DECISION` for locked choices; any new question gets `OPEN`.

## Deadline

**Submit before Fri 18 Sep 2026, 8:00 AM EDT = 12:00 UTC = 6:00 PM Dhaka.**
Starting Thu 17 Sep, 11:00 AM Dhaka gives about 31 hours. Suggested split:

| Block | Dhaka time | Output |
|---|---|---|
| Review and iterate these docs | Thu 11:00–15:00 | Locked specs 03–06 |
| Codex build: tokens + UI package + Storybook | Thu 15:00–21:00 | Storybook deployed |
| Codex build: prototype + mock data | Thu 21:00 → Fri 10:00 | Prototype deployed |
| Polish, edge states, QA | Fri 10:00–14:00 | |
| Rationale doc/video, submit | Fri 14:00–17:00 | Email to Ella (1 hr buffer) |

## Files

| # | File | Purpose | Goes to Codex? |
|---|---|---|---|
| 01 | `01_brief.md` | Assignment, pulled from Ella's email and structured | Yes |
| 02 | `02_competitor_research.md` | ClickCease, Fraud Blocker, Lunio, Spider AF, plus Uber Base patterns | No (background) |
| 03 | `03_brand_and_tokens.md` | Styles taken from clickguard.com, turned into product tokens | Yes |
| 04 | `04_design_system_storybook.md` | Package layout, components, variants, states, stories | Yes |
| 05 | `05_prototype_spec.md` | Threat Monitoring: decisions, layout overview, states, a11y | Yes |
| 05a | `05a_table_spec.md` | **Table in full detail**: tiles, views, search, filter model, every column's variables, row states, expand, keyboard | Yes |
| 05b | `05b_breakdown_spec.md` | **Breakdown in full detail**: side panel sections A–L, verdict grammar, full journey (chart, visit stream, behavior scrubber, score waterfall), motion | Yes |
| 06 | `06_mock_data_spec.md` | Data model, signals, scoring, scenario cast | Yes |
| 07 | `07_rationale_draft.md` | Skeleton for the 1–2 page rationale | No (Tanzir writes) |
| 08 | `08_codex_handover.md` | Build order, repo, guardrails, acceptance checklist | Yes (entry point) |
| 09 | `09_pattern_research.md` | Patterns taken from Uber, Samsara, GA4, Amplitude, Cloudflare, Datadog, LogRocket, PostHog, Clarity, Stripe Radar, Sift, with sources | No (background) |

## Locked decisions (Tanzir, 17 Sep)
| # | Decision | Where |
|---|---|---|
| 1 | Signal list: 7 official signals mapped, invented ones tagged `N` | 06 §3 |
| 2 | **Row = visitor (IP)**, visits nested | 05 D1 |
| 3 | Panel "map" = **risk chart only** (no geo mini-map) | 05 §4.3, 05b §3 E |
| 4 | Mono font = **JetBrains Mono** | 03 §2.4 |
| 5 | **Bot prob. stays a table column** | 05a §6 col 7 |
| 6 | **Visits view ships (P0)** alongside Visitors | 05a §4.1, §6.1 |
| 7 | **Keep the network-intelligence signal** (blocked on other ClickGuard accounts), called out as invented | 05b §3 I, 06 §3 |
| 8 | **Score tab is the main proof screen**: default tab when the trigger / peak visit is selected; centre of the demo | 05b §8.5, 05 §10 |

No open items remain in the specs. New questions go here.
