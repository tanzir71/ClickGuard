# Activity funnel: researched redesign plan

## Problem

The existing five independent horizontal meters read as a metric strip, not a graph. Their tiny chevrons do not establish a shared direction or scale. Keep the compact white card and ClickGuard typography, but make the narrowing between stages directly visible.

## Research and design decision

- [Google Analytics funnel exploration](https://support.google.com/analytics/answer/9327974?hl=en) distinguishes a standard stepped funnel from a trended time chart. Use ordered evaluation stages on the horizontal axis, not dates or elapsed time.
- [Amplitude funnel interpretation](https://amplitude.com/docs/analytics/charts/funnel-analysis/funnel-analysis-interpret) compares how many users reach successive steps and separates overall conversion from step-to-step progression. Show cohort percentages directly, with the previous-stage percentage available on hover and keyboard focus.
- [IBM Carbon axes and labels](https://carbondesignsystem.com/data-visualization/axes-and-labels/) recommends clear axis descriptors and a zero baseline for bar/area comparisons. Use a shared 0–100% scale with only three faint guides.

Our design inference: one connected stepped area is more legible here than five meters or a decorative Sankey. It remains a horizontal, compact summary without introducing a chart library.

## Implementation plan

1. Replace the independent meters with a single shared plot: equal-width stage plateaus joined by short descending connectors. Heights encode the percentage of the filtered starting cohort. Do not smooth or exaggerate values.
2. Add a left-to-right baseline arrow, numbered stage ticks, and an “Evaluation stages” label. Keep stage labels, counts, and cohort percentages directly readable. Aim for a roughly 200px card with an 80px plot.
3. Use a quiet indigo fill/outline for continuity. Reserve amber/red for small semantic stage markers, not a rainbow of unrelated bars. Reuse existing design tokens, focus styles, and reduced-motion conventions.
4. Keep the existing visitor-cohort filters and date range. All stages remain nested subsets of the displayed visitors; date-limited visit counts use the selected range. Platform/search filters select visitor cohorts, rather than redefining all their visits. Do not change table/filter semantics in this visual iteration.
5. Clarify that these are current evaluation criteria, not a measured chronological event conversion funnel. Rename the final stage “Block decision,” because it includes blocked, pending, and failed statuses. Show the status breakdown instead of a lifetime protected-spend estimate masquerading as range-specific data.
6. Include an accessible textual representation, a concise screen-reader update, and hover/focus details with count, percentage of evaluated, percentage of the previous stage, and each criterion. Zero denominators produce an unavailable rate, never NaN or an invented 100%.
7. Add focused tests and Storybook fixtures for default, filtered, empty, single-visitor, and flat funnels. Check rendering and filter updates in the browser, including desktop widths around 1024px and 1440px. Run the repository checks before committing/pushing/deploying.

## Scope boundaries

No chart brushing, new filtering controls, timeline interpretation, dashboard KPI redesign, or new chart dependency. A visitor leaving the risk funnel is not automatically a negative outcome; tooltips use neutral language rather than “lost conversion.”

## Acceptance criteria

- The connecting shape and horizontal axis make reading direction obvious without relying on color.
- Every plotted height shares the same zero baseline and denominator; counts remain exact.
- Filter/date changes update the same chart rather than rendering a different visual structure.
- All-zero data shows an honest empty plot, while 100% continuation produces a flat connected profile.
- Pending/failed exclusion attempts are not presented as successfully blocked traffic.
- Stage information is available without a mouse and no new page overflow is introduced at supported desktop widths.

## Implementation and verification

Placement refinement: the funnel belongs directly below the filters, inside the shared traffic-results frame (views → filters → funnel → alert → table). Its standalone card border, shadow, radius, and outer gap are removed in this context. The full-width summary stays aligned with the filters when visitor details open; the standalone Storybook component retains its card treatment.

Implemented the connected SVG profile, shared scale, numbered baseline, directional arrow, semantic markers, accessible stage tooltips, and filter-derived status counts without adding dependencies. The card is approximately 210px tall in the prototype.

- Automated coverage: six new funnel tests plus the seven existing mechanics tests; default counts, nested ranges, both percentage denominators, empty/single/flat geometry, focus/hover/Escape, and dashboard risk/search/date updates.
- Browser: default profile `160 → 156 → 55 → 39 → 35`; high-risk profile `41 → 39 → 39 → 39 → 35`; empty search displays zero counts and no filled profile.
- Desktop checks: compact 1024px view retains readable labels and contained tooltips; 1440px layout bounds show no chart or stage-label overflow. No browser console errors were observed.
- Data is client-side deterministic fixture data; this feature has no API, authentication, or database boundary.
