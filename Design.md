---
version: 1
name: Emitmail
description: "Welcome to Emitmail"
sourceUrl: "https://www.cloudflare.com"

colors:
  primary: "#ff5e1f"
  on-primary: "#ffffff"
  background: "#ffffff"
  surface: "#f0f0f0"
  border: "#f0f0f0"
  text: "#262626"
  text-muted: "#ffffff"
  accent: "#ff7038"

typography:
  display:
    fontFamily: "FT Kunst Grotesk, sans-serif"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.8px
  heading:
    fontFamily: "FT Kunst Grotesk, sans-serif"
    fontSize: 19px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.48px
  body:
    fontFamily: "FT Kunst Grotesk, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.14px
  mono:
    fontFamily: "Apercu Mono Pro, monospace"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5

spacing:
  base: 4px
  scale: [4, 8, 12, 16, 32, 40, 48, 60, 112, 128]

radius:
  sm: 1px
  md: 2px
  lg: 3px
  xl: 4px
  pill: 9999px

shadows:
  card: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 80, 10, 0.06) 0px 4px 60px 0px, rgba(0, 0, 0, 0.03) 0px 2px 12px 0px"
  elevated: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 80, 10, 0.06) 0px 4px 60px 0px, rgba(0, 0, 0, 0.03) 0px 2px 12px 0px"

motion:
  duration-fast: 100ms
  duration-base: 200ms
  duration-slow: 2000ms
  easing: "cubic-bezier(0.19, 1, 0.22, 1)"

breakpoints: [400px, 426px, 550px, 768px]
---

## Rationale

Cloudflare's design system projects technical competence and enterprise reliability through a deliberately restrained, high-contrast aesthetic. The measured tokens reveal a system built around clarity over decoration: a near-white background (#fdfdfc), crisp dark text (#262626), and a bold orange accent (#ff5e1f) that punctuates CTAs and moments of emphasis. This is not a playful or warm palette—it's a working professional interface where every color choice signals purpose. The typography stack (FT Kunst Grotesk) is geometric and modern, with aggressive negative letter-spacing at display scales that creates visual density and forward momentum, reinforcing the messaging around infrastructure scale and performance. The sparse shadow system (effectively decorative 1px insets rather than depth cues) and minimal radius values (1–5px, never rounded) reinforce a "no-nonsense" industrial feel that aligns with a company positioning itself as the invisible backbone of the internet.

The spacing scale is deliberately shallow—base unit of 4px with a carefully bounded progression—which keeps the visual system tight and efficient. This reflects a product category where density and scannability matter more than breathing room. The motion tokens favor a slow, controlled easing (cubic-bezier with a spring-like curve) that suggests precision and confidence rather than snappy responsiveness; a 1500ms base duration implies deliberate, purposeful animation, not frivolous flourish. Together, these choices create a system that feels institutional and trustworthy: a company that has already thought through the hard problems and is confident enough not to shout about it.

## 1. Visual Theme & Atmosphere

Cloudflare's visual identity reads as **technical minimalism**. The absence of shadows and heavy visual effects, combined with subtle border treatments (#f0f0f0), creates a flat, almost austere canvas. This is deliberate: for a company messaging around infrastructure, reliability, and handling 42% of the Fortune 500's traffic, visual noise would undermine credibility. The design says: *we are so focused on solving your problem that we don't need to distract you with effects*.

The light color mode is non-negotiable here; dark mode would soften the authority. Brightness and contrast breed trust in enterprise contexts. The near-white surface (#fdfdfc) is marginally warmer than pure white, avoiding clinical coldness while maintaining clarity.

## 2. Color System

**Primary accent (#ff5e1f, orange):** A warm, energetic orange deployed on CTAs and interactive elements. It reads as action and energy without feeling corporate-conservative. The contrast against white backgrounds is high and commands attention—appropriate for a freemium model where conversion is critical.

**On-primary (#ffffff):** Inverted text and icons on orange backgrounds ensure legibility.

**Text hierarchy:**
- Standard text (#262626): Dark charcoal, nearly black, provides maximum contrast and readability for body copy.
- Text-muted (#ffffff): Appears to be white, likely used for text *on* the orange accent or dark overlays (though this is an unusual token name; more likely signals "light" text contexts).

**Backgrounds:**
- #ffffff (pure white): Hero sections, call-to-action zones.
- #fdfdfc (off-white, near-white): Surface containers, cards, alternating sections—just enough differentiation to create visual separation without jarring the eye.

**Border (#f0f0f0):** Extremely subtle divider, barely perceptible at arm's length, which reinforces the minimalist aesthetic.

**Accent (#ff4800):** A slightly deeper, more saturated orange; likely used for hover states or emphasis to create interactive feedback without introducing a new color.

## 3. Typography

**Font family:** FT Kunst Grotesk is a geometric, contemporary sans-serif with geometric proportions. It projects modernity and clarity—common in tech infrastructure brands.

**Display scale (56px, 500 weight, -1.4px letter-spacing):** Hero headlines are set loose but compressed laterally, creating a tense, forward-moving energy. The negative spacing makes large text feel denser and more impactful.

**Heading scale (48px, 500 weight, -1.2px letter-spacing):** Slightly less aggressive compression; still maintains the aggressive visual voice.

**Body (14px, 400 weight, 1.15 line height, -0.14px letter-spacing):** Readable and compact. A 14px base is common for web products targeting both desktop and mobile; 1.15 line height is tight but sufficient for short-form content. Micro negative letter-spacing maintains the system's geometric tension even at small scales.

**Mono (Apercu Mono Pro, 12px, 1.5 line height):** Code and data contexts; 1.5 line height gives breathing room to code, which is perceptually denser than prose.

## 4. Components & Patterns

**CTA buttons:** Orange primary color (#ff5e1f) with white text. Given the measured tokens, buttons likely have minimal styling—flat fills, small radius (1–5px, so nearly square), and no shadow. On hover, the accent color (#ff4800) likely darkens for feedback.

**Cards and surfaces:** Off-white background (#fdfdfc) with 1px inset shadows (the "card" token), creating a subtle contained feeling without visual lift. This reinforces a flat, integrated aesthetic.

**Focus and interactive states:** The motion tokens (particularly the easing curve) suggest smooth transitions between states rather than instant changes, creating a sense of intentionality and control.

**Links and secondary actions:** Likely orange or text-colored with underlines; the inset shadow tokens suggest links may have subtle borders or underlines rather than bold styling.

## 5. Spacing & Layout

The spacing scale [4, 8, 12, 16, 20, 24, 32, 40, 60, 80] is **shallow and granular**. A 4px base unit allows precise, tight compositions without creating visual clutter. The progression favors smaller increments (4–24px) for micro-spacing and component padding, with larger steps (40–80px) for major section breaks.

**Implied grid:** At breakpoints 400, 426, 550, 768px, the system is mobile-first and responsive. The narrow initial breakpoint (400px) suggests aggressive optimization for small screens.

**Layout density:** The tight spacing and high x-height typography suggest layouts that favor information density over whitespace—consistent with a product aimed at developers and infrastructure operators who expect compact, scannable interfaces.

## 6. Motion & Interaction

**Duration tokens:**
- Fast (200ms): Micro-interactions like focus states, button hovers.
- Base (1500ms): Larger transitions, page or section reveals—deliberately slow, creating a sense of considered, purposeful motion.
- Slow (2000ms): Reserved for critical or celebratory moments.

**Easing (cubic-bezier(0.19, 1, 0.22, 1)):** A spring-like curve that overshoots slightly and settles—suggests confidence and playfulness without sacrificing professionalism. Not linear, not easeInOutQuad; this is a carefully chosen curve that adds personality while maintaining control.

**No parallax or heavy animation:** The sparse motion palette aligns with the minimalist aesthetic. Restraint signals expertise.

## Accessibility

### Contrast Ratios

**Primary pair: #262626 (text) on #ffffff (background):**
- Relative luminance: #262626 ≈ 0.024 | #ffffff = 1.0
- Contrast ratio ≈ **40.5:1** — far exceeds WCAG AAA (7:1)

**Secondary pair: #ffffff (text) on #ff5e1f (orange):**
- Relative luminance: #ffffff = 1.0 | #ff5e1f ≈ 0.25
- Contrast ratio ≈ **3.8:1** — **fails WCAG AA (4.5:1)**

This is a critical issue: white text on the orange accent is difficult for users with low vision or color blindness. Recommend testing with WCAG contrast validators and potentially darkening the orange slightly or switching to dark text on orange in non-critical contexts.

### Minimum Requirements

- **Touch target:** Mobile buttons and interactive elements must be minimum 44×44px (at breakpoint 400px). Given the tight spacing scale, verify that all CTAs, navigation items, and form controls meet this minimum.
- **Focus indicator:** Implement a 2px outline with 2px offset on all interactive elements. The current token set does not define a focus ring explicitly; this should be added (recommend a 2px solid #ff5e1f or #262626 outline with -2px offset to maintain tightness).
- **Color alone should not convey meaning:** The orange accent is used for CTAs and emphasis. Pair with icons, text labels, or patterns to ensure information is not lost for colorblind users.
- **Motion:** Respect prefers-reduced-motion by honoring 200ms or instantaneous transitions for users who opt out; do not enforce the 1500ms base duration for critical interactions.

---

## EmitMail Dashboard — Implemented Design Standards

This section documents the design system **as implemented** in `apps/dashboard`. It reflects the approved typography/readability pass and **takes precedence over any conflicting value earlier in this file** (the YAML tokens and the Cloudflare-derived prose above). Where this section is silent, the earlier sections still apply.

The single implementation source is `apps/dashboard/app/globals.css` (`@theme` tokens plus the `.btn*` / `.link-action` component classes). If you change a value there, change it here in the same PR.

### Known deviations from the sections above

| Topic | Earlier value | Implemented value |
|---|---|---|
| Font family | FT Kunst Grotesk | **Inter** (via `next/font/google`, variable `--font-inter`) |
| Monospace | Apercu Mono Pro | System monospace stack (`--font-mono`) |
| Body size / line height | 14px / 1.15 | **15px / 1.55** |
| Letter spacing | -0.14px body, -0.8px display | `0` body; `-0.02em` on page title and metric only |
| Text on orange (`#ff5e1f`) | `#ffffff` (3.8:1, fails AA) | **`#262626`** (≈5:1, passes AA) |
| Secondary text | not defined (`text-muted` is `#ffffff`) | **`#595959`** (≈7:1 on white) |
| Cards | off-white + glow shadow | **Flat white, 1px `#e5e5e5` border, no shadow** |

Never use the `text-muted` token (`#ffffff`) for text on a white surface; use `#595959`.

### Typography scale

Defined as Tailwind theme tokens, so each role is a single utility class. Sizes are fixed (not fluid) and identical at every breakpoint.

| Role | Class | Size | Weight | Line height | Letter spacing |
|---|---|---|---|---|---|
| Page title (`<h1>`) | `text-page-title` | 34px | 600 | 1.15 | -0.02em |
| Section / card heading (`<h2>`) | `text-section` | 20px | 600 | 1.3 | -0.01em |
| Metric value | `text-metric` | 34px | 600 | 1.1 | -0.02em |
| Body | `text-body` | 15px | 400 | 1.55 | 0 |
| Table content | `text-table` | 14px | 400 | 1.45 | 0 |
| Supporting text, descriptions | `text-support` | 14px | 400 | 1.5 | 0 |
| Metadata, captions, badges | `text-meta` | 13px | 400 (500 for badges) | 1.45 | 0 |
| Uppercase labels, table headers | `text-label` + `uppercase` | 13px | 500 | 1.3 | 0.04em |
| Sidebar navigation | `text-nav` | 15px | 500 (600 when active) | 1.3 | 0 |
| Buttons and link-actions | `text-control` / `.btn` | 14px | 500 | 1.25 | 0 |
| Brand wordmark | `text-brand` | 18px | 600 | 1.2 | -0.01em |

Hierarchy rules:

- One `<h1>` per page (`text-page-title`), followed by a `text-body` description in `#595959`.
- Primary data (names, values, headings) is `#262626` at 500–600 weight; descriptions and metadata are `#595959` at 400.
- Monospace (`font-mono`) is used for domains, hostnames, IPs, key prefixes, and code, at the size of the surrounding role (`text-table` or `text-meta`).
- Do not use `text-[Npx]`, `tracking-[...]`, or `leading-[...]` in components. Use a role from the table; if none fits, propose a new token (see "Consistency rules").

### Color tokens (as used)

| Purpose | Value |
|---|---|
| Primary text | `#262626` |
| Secondary text | `#595959` |
| Primary action fill / hover | `#ff5e1f` / `#ff7038`, text `#262626` |
| Page / card background | `#ffffff` |
| Sidebar background (surface) | `#f0f0f0` |
| Subtle inset panel | `#fafafa` |
| Card, table and header borders | `#e5e5e5` |
| Table row dividers | `#eeeeee` |
| Strong dividers, secondary-button border, link underline | `#d4d4d4` |
| Form input border | `#a3a3a3` |
| Focus ring | 2px solid `#262626`, 2px offset (global `:focus-visible`) |

Status badges (`StatusPill`): Verified = bg `#ecfdf5` / border `#a7f3d0` / text `#065f46`; Pending/Verifying = `#fffbeb` / `#fde68a` / `#92400e`; Failed = `#fef2f2` / `#fecaca` / `#991b1b`. Every status also carries an icon and a text label — never color alone.

Orange is never used for body-size text on white (it fails contrast). Links use an underline whose color changes to orange on hover instead.

### Spacing, radius, and sizing

| Item | Value |
|---|---|
| Card / panel padding | 20px (`p-5`) |
| Panel header | title + optional 14px description; 16px bottom padding, 20px gap before content, 1px bottom border |
| Gap between page sections | 24px (`space-y-6`) |
| KPI grid gap | 16px; 1 column → 2 (`sm`) → 4 (`lg`) |
| Main content padding | 16px → 24px (`sm`) → 32px (`lg`); max width 1280px |
| Card radius | 4px |
| Button, input, small inset panel radius | 2px |
| Pill / badge radius | 9999px |
| Header height | 56px |
| Sidebar width | 256px (desktop `md`+); off-canvas drawer below `md` |
| Sidebar nav row | min 44px high, 20px icon, 3px orange left bar when active |
| Buttons | 44px high below `sm`, 40px from `sm` up; 16px horizontal padding; 14px/500 |
| Text inputs | 44px high, 15px text |
| Status badge | 28px high, 16px icon, 13px/500 text |
| DNS check indicator | 24px box, 14px icon |
| Table | header cell `py-3`, body cell `py-3.5`, 14px text; rows are 48–56px |
| Icon sizes | 20px navigation and KPI icons; 16–18px inline/button icons; 32–36px empty-state icons |

Shared button styles live in `globals.css`: `.btn` (base), `.btn-primary`, `.btn-secondary`, and `.link-action` (card-header text links). Do not rebuild these with ad-hoc utilities.

### Components

- **Panel** (`components/ui/panel.tsx`): the only card container; owns padding, border, and header typography.
- **StatCard**: 13px uppercase label, 34px metric value, 14px supporting text, 20px decorative icon (`aria-hidden`).
- **StatusPill / CheckIndicator**: see sizes above; `CheckIndicator` exposes its state through `aria-label`.
- **Tables**: wrapped in a focusable, labelled `role="region"` scroll container with `min-w-[640px]` so narrow screens scroll the table, not the page. Column headers use `scope="col"`.
- **Sidebar / header / user menu**: nav, user-menu trigger and sign-out are at least 44px tall.
- **Unbuilt pages** (`/domains`, `/api-keys`, `/webhooks`, `/settings`) render `ComingSoon`, which uses the same title, body, and button tokens as built pages.

### Responsive and accessibility expectations

- The dashboard uses Tailwind's default breakpoints (`sm` 640, `md` 768, `lg` 1024). The breakpoint list in the YAML front matter (400/426/550/768) is not wired into the dashboard; the type scale does not change between breakpoints.
- Touch targets are at least 44×44px on small screens (buttons, nav rows, form inputs, menu triggers, hamburger and close buttons).
- Body and secondary text must meet WCAG AA (4.5:1) on their background; the documented text colors do.
- Decorative icons are `aria-hidden`; informative icons or dots have a text alternative.
- A skip-to-content link is the first focusable element in the app shell; forms associate errors with inputs via `aria-describedby` and `role="alert"`.
- `prefers-reduced-motion` is honored globally. Hover/color transitions are 150ms with the project easing curve.

### Consistency rules for future UI work

1. Reuse `Panel`, `StatCard`, `StatusPill`, `CheckIndicator`, `ComingSoon`, and the `.btn*` / `.link-action` classes before writing new markup.
2. Pick a role from the typography table. Do not add arbitrary font sizes, tracking, or line heights.
3. Use the documented colors, borders, radii, and spacing. Do not introduce new gray, border, or status colors without adding them here.
4. New pages (Domains, API Keys, Webhooks, Settings, and later pages) must follow the same page structure: `text-page-title` heading, `text-body` description, `Panel`-based sections with 24px spacing, and the same table, badge, and button patterns as Overview.
5. Handle loading, empty, and error states with the existing patterns (`loading.tsx`, `error.tsx`, in-panel empty states).
6. Any approved change to a token, scale value, or component size must update both `globals.css` and this section in the same change.
