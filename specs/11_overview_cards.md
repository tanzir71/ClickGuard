# Account overview cards

## Visual direction

Keep the five scan-friendly totals, but add stronger tabular numerals, compact tinted domain icons, contextual captions, and thin segmented composition bars. The bar segments encode the real breakdown beneath each headline, not a fabricated time trend. Green is reserved for estimated protection; attention and block outcomes retain their existing semantic colors.

The cards are explicitly labeled **Account overview / All tracked traffic**. Their account-wide scope is unchanged; the funnel inside the table remains the filter-aware summary.

## Breakdown contracts

| Card | Disjoint breakdown | Action |
| --- | --- | --- |
| Visitors | Visitors with any paid visits / unpaid-only visitors | Clear table filters |
| Block decisions | Blocked / pending exclusion / exclusion failed | Blocked saved view, which includes all three states |
| Needs review | Monitoring / failed exclusions / unreviewed blocks / any other review flags | Needs-review saved view |
| Wasted spend | Recorded pre-block click cost by current visitor status: block decisions / monitoring / clean or allowed | Wasted over $20 saved view |
| Protected | Existing estimated protected spend by network group: data-center/VPN/proxy/Tor / residential / mobile or other | Informational breakdown only |

Each numeric breakdown sums to its headline before display rounding. Money rows show cents and the headline is rounded to whole USD. Percentages show at most one decimal; empty totals use an unavailable percentage rather than dividing by zero.

The review card previously counted only monitoring visitors (17). It now uses the same `needsReview` flags as its saved view: 24 in the initial fixture, comprising 17 monitoring, 3 failed exclusions, and 4 unreviewed blocks. The block card keeps its existing total of 36 but is labeled "Block decisions" to distinguish the 32 blocked, 1 pending, and 3 failed records.

Spend definitions are not upgraded into production analytics: the prototype's wasted-spend measure includes all recorded paid clicks when no block exists, and the protection estimate is fixture-derived (2.05× pre-block cost, capped at $280 per blocked visitor when generated). Both limitations are explicit in the popovers.

## Interaction and accessibility

- Hover anywhere on a card to open its breakdown; the pointer can enter the popover without closing it.
- Keyboard focus opens the same breakdown, with an explicit focus ring and `aria-describedby` association.
- Escape dismisses the visible breakdown, including hover-only disclosure, without triggering the dashboard's unrelated Escape action.
- Clicking an actionable card still selects its corresponding table view. Informational cards remain keyboard-focusable.
- Popovers on the right-hand cards align to the right so they stay within the desktop viewport.
- No new dependency or chart library is required; the reusable `Stat` also supports simple cards without breakdowns.

## Verification

Five focused tests cover reconciled totals, review flag updates, empty accounts, hover persistence/Escape, keyboard information cards, and dashboard card actions. Existing funnel and fixture tests remain in the suite. Browser checks cover the default and 1024px desktop layouts, including right-aligned monetary breakdowns and keyboard navigation.
