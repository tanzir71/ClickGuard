# 03 · Brand Extraction & Design Tokens

Extracted from the live CSS on **clickguard.com** (Webflow stylesheet `clickguard-staging.webflow.shared…min.css` and the `WebFont.load` config), 17 Sep 2026. The values in §1 are **verbatim from their CSS variables**. §2 onward turns them into a **product UI** token set. The marketing site is display-heavy; a monitoring table needs density.

---

## 1. What ClickGuard's site actually uses (verbatim)

### 1.1 Typography
| Role | Value |
|---|---|
| Primary and secondary family | **Host Grotesk** (Google Fonts, weights 400–800) |
| Mono / label face | **Aux Mono**, UPPERCASE, used for tags, small benefit labels, stat arrows (`.typeface-aux`, `.tag.is-secondary`) |
| Body | 1rem / 1.4em / weight 500 |
| H1 | 4.5rem / .94em / 500 / −.03em |
| H2 | 4rem / 1.2em / 500 / −.02em |
| H5 | 1.5rem / 1.4em / 400 / +.01em |
| H6 | 2rem / 1.06em / 500 / −.02em |
| text-size-small | .9rem / 1.2em / 400 / −.01em |
| text-size-extra-small | .875rem / 1.3em / 400 |
| text-size-xxs | .75rem / 1.2em / 400 |

Character: medium weights (500) even for headlines, tight negative tracking on large sizes, and mono uppercase micro-labels. It reads technical and calm, not aggressive.

### 1.2 Colour (named variables, with usage count in CSS)
| Variable | Hex | Uses | Role on site |
|---|---|---|---|
| `blue-100` | `#554BFD` | 49 | Brand indigo: links, accents, focus, glows |
| `blue-650` | `#111553` | 48 | **Ink**: headings, body text, dark sections, secondary button border |
| `white` | `#FFFFFF` | 45 | Surfaces |
| `greyscale-0` | `#FAFAFA` | 39 | Page background |
| `default-filet` | `#D9D8EA` | 25 | Hairline borders ("filet"), slightly violet-tinted |
| `blue-10` | `#EEEDFF` | 19 | Tag background, soft indigo tint |
| `greyscale-10` | `#E1E1E1` | 13 | Dividers |
| `grey-outlines` | `#9391BD` | 13 | Outline strokes, violet-grey |
| `lemon-25` | `#EEFF9D` | 12 | **Primary CTA fill** |
| `lemon-100` | `#BAE101` | 9 | CTA border, lime glow |
| `greyscale-60` | `#616064` | 6 | Secondary text |
| `greyscale-36` | `#9F9EA3` | 5 | Tertiary / disabled text |
| `lemon-10` | `#F9FFDC` | 4 | Faint lime tint |
| `greyscale-3` | `#F2F2F2` | 3 | Mono tag background |
| `greyscale-20` | `#C8C8C8` | 2 | |
| `greyscale-100` | `#04020A` | 1 | Near-black |

### 1.3 Shape, elevation, components
- **Radii in use:** `1.5rem` (cards, most common), `100vw` (pill buttons), `.5rem` (tags), `1rem`, `.85rem`, `.25rem`.
- **Shadows:** soft and tinted with brand colour, never grey-black:
  `0 2px 12px #1115530F` · `0 12px 35px #11155314` · `0 4px 20px #554BFD1C` · lime CTA glow `0 4px 6px #D2FB0C66`.
- **Primary button (`.button`):** height 2.25rem, pill, `lemon-25` fill, 1px `lemon-100` border, `blue-650` text, 14px / 500, padding .5rem 1.5rem, lime glow shadow, 0.3s colour/background/radius transition.
- **Secondary (`.button.is-secondary`):** transparent, 1px `blue-650` border, no shadow. Also has `is-small`, `is-large`, `is-text`, `is-icon` variants.
- **Tag (`.tag`):** `blue-10` background, 14px, radius .5rem, padding .125rem .5rem. **`.tag.is-secondary`:** `greyscale-3` background, Aux Mono, 12px uppercase.
- Motion stack on marketing: GSAP + ScrollTrigger, Lenis smooth scroll, and a "Radar" Lottie. (Not needed in product; keep motion subtle.)
- Tone of copy: "clarity, control, and confidence", "clean traffic", ROI-led. Terms: *invalid traffic (IVT), click fraud, bots, click farms, VPN abuse, emulator traffic, device spoofing, data centers, proxy networks, repeat offenders, behavioral fingerprinting, GCLID, referrer, device fingerprint, bounce rate, time on site, mouse movement, scroll depth*.

---

## 2. Product token set (PROPOSAL)

Principles: keep brand DNA (Host Grotesk, navy ink, indigo accent, lime CTA, violet-tinted hairlines, mono labels), but (a) shrink the type scale for density, (b) add **semantic status colours** the site lacks, (c) use the Uber-style rule that **colour means status**, and the chrome stays neutral.

### 2.1 Tier structure
```
primitive  →  semantic  →  component
--cg-color-indigo-500 → --cg-color-accent → --cg-button-primary-bg (only where needed)
```
Components consume **semantic** tokens only. Lint rule: no hex, rgb, or px literals outside `packages/tokens` (see 08).

### 2.2 Primitive colours
| Token | Hex | Source |
|---|---|---|
| `ink-900` | `#111553` | site blue-650 |
| `ink-950` | `#04020A` | site greyscale-100 |
| `indigo-500` | `#554BFD` | site blue-100 |
| `indigo-600` | `#4136D9` | *new*, hover/pressed, text-on-tint (6.6:1 on indigo-50) |
| `indigo-50` | `#EEEDFF` | site blue-10 |
| `lime-400` | `#BAE101` | site lemon-100 |
| `lime-100` | `#EEFF9D` | site lemon-25 |
| `lime-50` | `#F9FFDC` | site lemon-10 |
| `violet-grey-300` | `#D9D8EA` | site default-filet |
| `violet-grey-500` | `#9391BD` | site grey-outlines |
| `grey-0` `#FAFAFA` · `grey-50` `#F2F2F2` · `grey-100` `#E1E1E1` · `grey-200` `#C8C8C8` · `grey-400` `#9F9EA3` · `grey-600` `#616064` | | site greyscale |
| `red-600` `#C42B3F` · `red-50` `#FDEEF0` | | *new* |
| `amber-700` `#8A5A00` · `amber-50` `#FFF4D6` · `amber-400` `#F5B524` (graphics only) | | *new* |
| `green-700` `#1B7A4E` · `green-50` `#E8F6EE` | | *new* |

Contrast checks (WCAG): ink-900/white 16.7 · indigo-500/white 5.5 · grey-600/white 6.2 · red-600/white 5.6 · red-600/red-50 5.0 · amber-700/amber-50 5.4 · green-700/green-50 4.8 · ink-900/lime-100 15.5. **grey-400 on white is 2.7, so use it only for disabled or decorative elements.**

### 2.3 Semantic colours
| Token | → | Use |
|---|---|---|
| `bg-canvas` | grey-0 | App background |
| `bg-surface` | white | Table, panels |
| `bg-subtle` | grey-50 | Row hover, mono chips |
| `bg-selected` | indigo-50 | Selected row |
| `border-default` | violet-grey-300 | Hairlines |
| `border-strong` | violet-grey-500 | Inputs, focus-adjacent |
| `text-primary` | ink-900 | |
| `text-secondary` | grey-600 | |
| `text-disabled` | grey-400 | |
| `accent` / `accent-hover` | indigo-500 / indigo-600 | Links, focus ring, active filter |
| `cta-bg` / `cta-border` | lime-100 / lime-400 | **One primary action per view** (Uber rule) |
| `status-blocked-fg/bg` | red-600 / red-50 | |
| `status-monitoring-fg/bg` | amber-700 / amber-50 | Suspicious, not yet blocked |
| `status-clean-fg/bg` | green-700 / green-50 | |
| `status-allowed-fg/bg` | indigo-600 / indigo-50 | Manually allowlisted |
| `status-neutral-fg/bg` | grey-600 / grey-50 | Pending sync, not connected |
| `source-paid` | indigo-500 | Paid visit dot (costs money) |
| `source-organic` | violet-grey-500 | Organic / direct / referral dot (hollow) |
| `risk-line` | ink-900 | Score line in journey strip |
| `risk-threshold` | red-600 (dashed) | Block threshold |

**PROPOSAL, open to change:** is `paid = indigo filled` and `unpaid = hollow` the right encoding? It makes paid visits (the ones that cost money) visually heavy, and the shape difference still works for colour-blind users.

### 2.4 Typography tokens (product scale, 4px baseline)
| Token | Size / line | Weight | Family | Use |
|---|---|---|---|---|
| `display` | 28 / 36 | 500, −0.02em | Host Grotesk | Page title |
| `heading-lg` | 20 / 28 | 500, −0.01em | Host Grotesk | Panel title (IP) |
| `heading-md` | 16 / 24 | 600 | Host Grotesk | Section title |
| `body-md` | 14 / 20 | 400 | Host Grotesk | Table cells, body |
| `body-sm` | 13 / 20 | 400 | Host Grotesk | Secondary cell lines |
| `label-md` | 14 / 20 | 500 | Host Grotesk | Buttons, inputs |
| `mono-sm` | 12 / 16 | 500, UPPERCASE, +0.04em | Mono | Column headers, eyebrow labels, status tags (brand echo of Aux Mono) |
| `mono-data` | 13 / 20 | 400, tabular | Mono | IPs, timestamps, GCLIDs, scores |
| `numeric-lg` | 24 / 32 | 500, tabular-nums | Host Grotesk | KPI numbers |

DECISION: mono family = **JetBrains Mono** (clear 0/O and 1/l for IPs), standing in for the licensed Aux Mono.

### 2.5 Spacing (4px base)
`space-0` 0 · `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 20 · `space-6` 24 · `space-8` 32 · `space-10` 40 · `space-12` 48
Table row heights: `row-compact` 40 · `row-default` 52 (two-line cell).

### 2.6 Radii
| Token | Value | Use | Brand link |
|---|---|---|---|
| `radius-sm` | 4 | Checkbox, mini chips | site .25rem |
| `radius-md` | 8 | Inputs, tags, menus | site .5rem tag |
| `radius-lg` | 16 | Panels, cards | shrunk from site 1.5rem for density |
| `radius-pill` | 999 | Buttons, status pills, filter chips | site 100vw buttons |

### 2.7 Elevation (brand-tinted, never grey)
- `shadow-sm`: `0 1px 2px #1115530F`
- `shadow-md`: `0 2px 12px #1115530F` (verbatim site)
- `shadow-lg`: `0 12px 35px #11155314` (verbatim site, for side panel and overlays)
- `focus-ring`: `0 0 0 3px #554BFD40`
- `shadow-cta`: `0 2px 6px #D2FB0C66` (reduced lime glow)

### 2.8 Motion
`duration-fast` 120ms · `duration-base` 200ms · `duration-slow` 300ms (site uses .3s) · `ease-standard` cubic-bezier(.2,0,0,1). Respect `prefers-reduced-motion`.

### 2.9 Dark mode
DECISION: out of scope for the deadline. Keep semantic tier so it can be added. The site's dark sections use `ink-900` as background, which is a natural dark theme later.
