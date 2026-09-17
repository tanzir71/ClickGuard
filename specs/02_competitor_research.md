# 02 · Competitor & Pattern Research

Scope: how click-fraud tools explain *why* traffic was blocked, and which interaction patterns we can borrow or improve. Focus is on concrete fields, scales, and mechanics. Sources are at the bottom.

## 1. Summary: where the category falls short
Competitors show **what** was blocked (an IP log with a reason label). None of them put the **journey that led to the decision** at the centre. The typical pattern is a flat clicks report with 20 optional columns, plus a session recording. That is proof by volume: users are left to connect the dots themselves.

**Our opening:** make the *decision* readable. Show the threshold, the visit where it was crossed, the evidence that pushed the score up, and the money involved. That is the trust moment the brief asks for.

## 2. Competitor teardown

### 2.1 ClickCease (CHEQ Essentials): market leader
**Clicks Report, per IP** (from their help centre):
- Detection: *IP Address, Threat Level, Detected (status), Block Reason*
- Activity: *Clicks (in period), First Click, Last Click, Converted*
- Geo/tech: *Country, City, OS & Browser, ISP, ZIP, Device ID (fingerprint)*
- Campaign: *Campaign Name, Ad Placement (GDN URL), Keywords*
- Extra: *Requested URL, GCLID, Recording (session recording)*
- "Show columns" picker to toggle fields.

**Detection model:** user-configured **Click Fraud Thresholds** ("how many times we allow an IP to click before blocking"), up to 5 rules, plus suggested rules per industry. Also a separate **Blocked IPs** list with timestamp and reason.

**Takeaways**
- ✅ *IP as the row unit, First/Last click, Converted, Device ID* are good table primitives, and users already know them.
- ❌ A column-picker wall. The reason is a single label. The recording is the "proof", which puts analysis work on the user.
- ❌ Threshold rules are *count*-based (N clicks in T). ClickGuard's cumulative behavioural scoring is richer, so we should *show* that difference.

### 2.2 Fraud Blocker
- **Fraud Score 0–10**: *Clean* (1–4), *Suspected* (4–7), *Invalid* (7–10).
- IPs **auto-block at ≥7** and are sent in near real time to Google Ads and Meta exclusion lists.
- Individual IP score **rises as new fraud types are detected or frequency increases**, which is cumulative and very close to ClickGuard's mechanic.
- **Organic, direct, and non-paid traffic is scored but excluded** from the account fraud score and blocklists.
- Account average benchmark of about 3.5.

**Takeaways**
- ✅ Three named bands with a visible threshold are easy to understand. Borrow the *band* idea, and show the **threshold line** explicitly.
- ✅ "Scored but not blocked because not paid" is a real edge state we should represent (organic-only risky visitor).
- ❌ One score number with no breakdown. Why 7.4? We answer that with signal contributions.

### 2.3 Lunio
- Positions as "ad traffic verification" across paid channels, with an audit-style, report-led product and marketing-level storytelling (State of Click Fraud report).
- Publishes content on the **Google 500 IP exclusion limit** workaround.
- **Takeaway:** it sells outcomes (waste %, spend reclaimed). Our screen should carry a **spend line** (wasted spend on paid visits, spend protected after block) so trust ties to money.

### 2.4 Spider AF / ClickPatrol / TrafficGuard
- Spider AF: articles on **multiple / repeat clicks**, the classic pattern that justifies a visitor-grouped view.
- TrafficGuard and Lunio both write about **Google's 500-IP-per-campaign exclusion cap**. This is a real operational edge state (see below).
- ClickPatrol: positions against ClickCease on clarity and price.

## 3. Platform mechanics worth designing for
| Mechanic | Why it matters in UI |
|---|---|
| **Google Ads: max 500 IP exclusions per campaign.** | Edge state: *"Exclusion list full, rotating oldest"* or *"Queued"*. Shows operational honesty. |
| **Meta Ads has no native per-campaign IP exclusion like Google.** Tools use their own sync mechanism. | Show per-platform status separately (Google: Excluded · Meta: Excluded / Pending / Not connected). **Verify how ClickGuard does Meta before claiming specifics. Keep copy generic ("Excluded on Meta Ads").** |
| GCLID per paid click | Reused GCLID or a missing GCLID on a "paid" landing is a strong invented signal. |
| Shared IPs (corporate NAT, mobile carrier CGNAT) | One IP, many device fingerprints. This is the natural *ambiguous* case, and it is where IP-level blocking can hurt real customers. |

## 4. Pattern reference: Uber (Base design system)
What Tanzir likes: in Uber dashboards (Uber for Business trips, driver/fleet views) **clicking a row opens a side panel with a map summary** (start/end, route, timestamps) while the list stays visible.

Base principles (public summary):
- Near black-and-white UI, **one accent used once per screen**. The *map* carries the colour and the content; the chrome recedes.
- 4px baseline grid, type scale from 14px × 1.125, line height ≈ size × 1.45.
- "Go big / less is more / simple semantics": few styles, named by role.
- Components: Data table, **Drawer**, **Sheet**.

**Translation for ClickGuard**
| Uber | ClickGuard Threat Monitoring |
|---|---|
| Trip row | Visitor (IP) row |
| Map with route start→end | **Risk Journey strip**: visits on a time axis, risk line rising to the threshold, block marker |
| Pickup / drop-off timestamps | First seen / Blocked at (visit N of M) |
| Fare, distance | Paid clicks, wasted spend, spend protected since block |
| "View trip details" | "Open full journey" → per-visit event timeline and signal breakdown |
| Map is the only colourful thing | The risk line and status are the only colour. Everything else is navy and greys. |

## 5. Design principles we derive (PROPOSAL)
1. **Verdict first, evidence second, raw data last.** Sentence → strip → tables.
2. **Show the threshold.** Trust comes from seeing the rule applied, not from a score.
3. **Money is context.** Tie every paid visit to a cost, and organic visits to "no ad spend".
4. **Honest about uncertainty.** Ambiguous visitors get a first-class "Monitoring" state with the reason it has *not* been blocked.
5. **Reversible.** Show Unblock / Always allow (with consequences) to reduce fear of false positives.

## Sources
- [ClickCease: What information is available for each IP in the Clicks Report](https://support.clickcease.com/hc/en-us/articles/11197187668881-What-Information-is-Available-For-Each-IP-in-the-Clicks-Report)
- [ClickCease: Click Fraud Threshold](https://support.clickcease.com/hc/en-us/articles/11197181935633-Click-Fraud-Threshold)
- [ClickCease: Fraud Analytics' Blocked IPs](https://support.clickcease.com/hc/en-us/articles/11197136105873-Fraud-Analytics-Blocked-IPs)
- [Fraud Blocker: What is my Fraud Score?](https://fraudblocker.com/help/en/articles/6732598-what-is-my-fraud-score)
- [Lunio](https://www.lunio.ai/) · [Lunio: Google 500 IP exclusion limit](https://www.lunio.ai/blog/google-500-ip-exclusion-limit)
- [TrafficGuard: Excluding IPs and the 500 limit](https://www.trafficguard.ai/blog/how-to-exclude-ip-addresses-in-google-ads)
- [Google Ads Help: Exclude IP addresses](https://support.google.com/google-ads/answer/2456098?hl=en)
- [Spider AF: Multiple clicks click fraud](https://spideraf.com/articles/multiple-clicks-click-fraud-how-to-stop-repeat-clicks-from-draining-your-ppc)
- [ClickPatrol](https://clickpatrol.com/)
- [Uber Base: Data table](https://base.uber.com/6d2425e9f/p/901301-data-table) · [Drawer](https://base.uber.com/6d2425e9f/v/0/p/43156e-drawer) · [Superdesign: Uber Base breakdown](https://superdesign.dev/blog/uber-design-system)
- ClickGuard: [Features](https://www.clickguard.com/features) · [Click forensics](https://www.clickguard.com/use-cases/click-forensics) · [Threat analytics](https://www.clickguard.com/use-cases/threat-analytics)
