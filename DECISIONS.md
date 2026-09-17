# Implementation decisions

- **2026-09-17 · Scope:** Built every P0 state and interaction before P1 analytics. Heatmaps, chart brushing, raw JSON, custom saved views, and quick-filter affordances remain intentional P1 cuts per `08_codex_handover.md` §6.
- **2026-09-17 · Icons:** Platform identity uses the specified text glyphs (`G`, `M`, `MS`) rather than third-party brand assets.
- **2026-09-17 · Data volume:** The deterministic crowd generator targets 160 visitors and approximately 900 visits while preserving all H1–H13 mechanics.
- **2026-09-17 · Table engine:** Sorting/filtering is implemented headlessly in `ThreatMonitor`; the public `DataTable` primitive owns the accessible table shell. This keeps the screen package independent of table implementation details.
- **2026-09-17 · Table header:** The header stays in document flow instead of using CSS table-header stickiness. Chromium introduced a row overlap at the target viewport; legible data and correct row selection take priority over that secondary behavior.
