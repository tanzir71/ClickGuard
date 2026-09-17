# 07 · Design Rationale: Draft Skeleton (1–2 pages)

> Tanzir writes the final version in his own voice. This is scaffolding with the decisions pre-filled so nothing gets forgotten. Fill the `[ ]` items after the build.

## The problem, in one line
Blocking is invisible. Trust comes from making **one decision readable**: who, what they did, when the line was crossed, where they were excluded, and what it cost.

## What I decided
1. **The visitor (IP) is the row, and visits nest inside it.** Blocking is cumulative and per-IP, so status belongs to the visitor. The journey *is* the explanation.
2. **Row click opens a side panel, not a page or modal** (borrowed from Uber's trip list → map panel). You keep scanning while you inspect.
3. **Verdict sentence first.** Plain language generated from the data, before any chart or number.
4. **The Risk Journey strip replaces "the map".** It shows the score rising visit by visit, the dashed threshold, and the visit that tipped it. It shows *that the rule was applied*, not just a score.
5. **Balanced evidence.** Top signals include what *lowered* risk (conversion, valid form email, real engagement, shared network). That makes "Monitoring" believable and blocks feel fair.
6. **Money on paid visits only.** Wasted before block and protected after (est.). Organic visits are labelled "no ad spend". This is the mechanic from the brief, made visible.
7. **Honest operational states.** Syncing, exclusion failed (Google's 500-IP cap), platform not connected, allowed by user.
8. **The proof screen is the Score tab**: a per-visit waterfall showing exactly which signals moved the score across the threshold. Also: a **network-intelligence signal** (IP blocked on other ClickGuard accounts), an invented cross-customer signal.
9. **Signals I added:** reused GCLID, machine-regular click cadence, timezone vs IP location mismatch, keyword fixation (competitor pattern), shared-network mitigator, returning-organic mitigator. [ ] Trim to the ones that made it into the build.
10. **Brand-faithful but denser.** Host Grotesk, ClickGuard's navy ink, indigo accent, lime CTA, violet hairlines, and mono uppercase labels, all taken from their live CSS. Semantic status colours were added because the marketing site has none. Colour is reserved for status and risk.

## What I rejected
- Flat visit log (category default, e.g. ClickCease's Clicks Report): it makes the user rebuild the journey.
- A single fraud score with no breakdown (e.g. Fraud Blocker 0–10): it's a number to trust instead of a reason to trust.
- Session-recording video as the "proof": it's slow, and it puts the analysis on the user.
- Modal drill-down: it breaks comparison.
- A chart library: generic look, and the strip needed to be minimal and specific.
- Tailwind: utility classes on screens look exactly like "hardcoded styles duplicated across components".
- Geo mini-map: an Uber echo, but the risk chart explains more per pixel.

## The design system is real, and here's the proof
- `@clickguard/tokens` → CSS variables. `@clickguard/ui` consumes only semantic tokens. The prototype depends on `@clickguard/ui` via workspace.
- Lint rule forbids hex/px literals outside the tokens package. CI fails otherwise.
- Storybook stories cover states: loading, empty, no-results, error, syncing, failed, allowed.
- The data has tests that enforce the mechanics (no paid visit on an excluded platform after block; organic-only visitors are never blocked; wasted spend = pre-block CPC sum).

## Where I used AI
- [ ] Research sweep of competitor help docs and extraction of ClickGuard's CSS variables
- [ ] Drafting spec files, then generating components, stories, and the mock data generator (Codex)
- [ ] Boilerplate: monorepo, Storybook config, TanStack wiring, tests

## Where I overrode it
- [ ] AI defaulted to a visit-level log table → changed to visitor rows with nested visits
- [ ] AI's default palette (generic SaaS blue, red/green badges everywhere) → brand tokens, with colour only for status
- [ ] AI generated random data → replaced with seeded, hand-authored hero scenarios plus mechanics tests
- [ ] AI copy ("Suspicious activity detected!") → calm, specific verdict sentences
- [ ] [add real moments from the build log, since these are the most credible part]

## What I'd do next
Rule simulator ("what if the threshold were 60?"), cohort view for IP ranges/ASNs, notifications for pending/failed exclusions, dark theme via the semantic token tier.
