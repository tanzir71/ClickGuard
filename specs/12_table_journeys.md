# Table journey clarity

The former flat ribbon positioned each dot inside a zero-width tooltip wrapper; timestamps therefore did not spread the dots along the track. It also conveyed no risk progression.

The replacement is a compact stepped risk chart driven by the recorded visits, with no changes to fixture data:

- Fixed 0–100 vertical scale in every row; dashed, numerically labeled visitor-specific threshold.
- Horizontal position uses actual timestamps from the first to last recorded visit. The elapsed span is shown above each chart. This is a per-visitor time scale, not a shared calendar axis; the table legend explicitly says full history.
- Filled circle = paid, hollow circle = unpaid, diamond + vertical rule = block decision, square = conversion. Color is supplementary, not the only distinction.
- A decision is shown only when `blockedAtVisitId` identifies a visit, not inferred from risk alone. Pending/failed exclusions are still decisions, not successful blocks; an allowed visitor retains a labeled prior decision.
- Post-decision risk remains visible as a dashed continuation on a subtle background.
- One visit gets a single score-change stem rather than a fabricated horizontal trajectory. Coincident timestamps retain their actual position. Dense histories retain every score change but thin overlapping ordinary markers.
- Hovering over the chart shows the nearest visit number, source, and score change inline. One keyboard tab stop per chart; left/right explores every visit, Home/End jump, Enter/Space opens the selected visit, and Escape returns to the overview. An accessible description and native timestamp tooltip provide detail.
- The legend explains shapes, risk, time direction, and history scope. Counts remain visible whenever the chart is not being explored.

Tests cover numeric geometry, irregular time gaps, shared risk scaling, genuine decisions, unpaid high-risk traffic, post-decision paths, low and declining risk, empty/single/coincident/dense histories, marker shapes, pointer selection, keyboard navigation, and correct panel drill-down.
