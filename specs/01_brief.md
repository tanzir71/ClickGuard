# 01 · Assignment Brief (extracted)

Source: email "Next Step: ClickGuard UI/UX Design Challenge" from Ella Gallo (Chief of Staff, ella@clickguard.com), 16 Sep 2026. Role: UI/UX Designer.

## 1. What they are evaluating
1. **Design craft and product decisions**: what to show, hide, group, and emphasise.
2. **A working React prototype in code**: not a Figma file, not a clickable mockup.
3. **A simple but real design system in Storybook** that the prototype actually uses.

Meta-signal: *"Use AI to generate the work, not to make the decisions."* They are paying for judgement and taste. Vibe-coded sameness counts against you.

## 2. Product context
- ClickGuard protects PPC advertisers from **invalid traffic**.
- A paid-ad click lands on the client's site, and the algorithm scores that visit against multiple signals. **These are some of the signals, not the full list. We may invent signals** that make a blocking decision easier to understand ("We'd rather see what you'd add").

| Signal | What it means |
|---|---|
| IP address | The visitor's identifier. This is what gets added to the exclusion list. |
| Location | Country, region, and city the visit came from |
| Interaction level | How much the visitor actually engaged with the page (scroll, clicks, time, mouse movement) |
| Bot probability | Model confidence that the visitor is automated |
| VPN / proxy | Whether the connection hides the visitor's real location |
| Form fill | Email deliverability status at the time a form is submitted (e.g., Valid, Invalid) |
| Conversion | Whether the visitor actually bought or converted |

## 3. Mechanics we MUST design around
| Mechanic | Design implication |
|---|---|
| A visitor = an **IP**. Each arrival = a **visit**. The same visitor returns many times. | 1 visitor : N visits. Grouping is required. |
| Not every visit is from an ad: **paid**, organic search, direct, referral. Only paid visits cost money. | Source type is a first-class attribute. Spend applies only to paid visits. |
| **Blocking is cumulative.** The system judges the whole journey and at some point adds the IP to **exclusion lists** in ad platforms (Google Ads, Meta Ads). The visitor stops seeing that advertiser's ads. | Status belongs to the visitor, not the visit. We need to show *when* and *after which visit* the threshold was crossed, and *on which platforms*. |

## 4. The problem
Advertisers stay only if they **trust** ClickGuard. Blocking is invisible: traffic just disappears.
**Design the screen that earns trust.** A customer opens one blocked visitor, reads the journey, and understands **why** it was blocked without contacting support.
Target a-ha: *"OK, this thing knows what it's doing. I'll leave it on."*

**Feature: Threat Monitoring.** A table of visitors showing status (blocked or not, **where**, **when**) with drill-down into the behaviour of each individual visit.

## 5. Deliverables
### 5.1 Deployed React prototype (Vercel, Netlify, or similar)
- A simple app shell plus this table experience is enough.
- Must be interactive: **real sorting, filtering, drill-down, empty states, edge states**.
- Realistic mock data that behaves like real traffic:
  - enough rows to make filtering meaningful
  - varied journey lengths
  - mixed paid and organic visits
  - ≥1 **clearly malicious** pattern
  - ≥1 **genuinely ambiguous** case
- Interaction patterns are our call (drawers, expandable rows, filters, timelines, bulk actions…). **The choice is itself evaluated.**

### 5.2 Deployed Storybook
- Components used in the prototype. A meaningful few that prove a *system*.
- **Tokens (color, spacing, typography, radii) live in the design system**, not hardcoded per screen.
- States and variants, not only the happy path.
- **Hard requirement:** the prototype imports and renders components from the Storybook package/library.
- An HTML style page that an AI was told to "follow strictly" does **not** count.

### 5.3 Design rationale (1–2 pages or video)
What was decided · what was rejected · why · where AI was used · where it was overridden.

## 6. Automatic red flags
- Hardcoded styles duplicated across components
- A design system that nothing imports
- Data that does not reflect the mechanics in §3

## 7. Tooling rules
- Use a coding agent (Claude Code, **Codex**, Cursor…) in a **real repository**.
- **No** prompt-to-app builders (Lovable, v0, Bolt, Replit).

## 8. Submission (before Fri 18 Sep 2026, 8 AM EST)
1. Prototype URL 2. Storybook URL 3. Repo URL (public or invite) 4. Rationale doc or video.
Questions to Ella are welcome before or during the work.

