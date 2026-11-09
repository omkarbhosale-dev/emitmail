# EmitMail Dashboard — Design System & UI Architecture (`DESIGN.md`)

## 1. Design Philosophy & Visual Reference

The EmitMail Dashboard is built on **Cloudflare's Kumo Design System** (`@cloudflare/kumo`) and directly mirrors the **Cloudflare Dashboard ("Account Home" v2)** aesthetic in both Dark and Light modes.

Key visual signatures:
- **Ultra-Clean Contrast:** Pitch-black canvas (`bg-kumo-canvas`) with subtle dark-charcoal cards (`bg-kumo-base`) in Dark Mode; crisp warm off-white canvas with pure white cards in Light Mode.
- **Signature Cloudflare Colors:**
  - **Cloudflare Orange Theme:** Vibrant brand orange (`text-cf-orange`, `bg-cf-orange`) used for brand identity, onboarding banners, status highlights, and active sidebar navigation icons.
  - **Cloudflare Action Blue:** High-contrast royal blue (`text-cf-blue`, `bg-cf-blue`) for primary action buttons (`btn-cf-primary`), unread notification badges, and active search/focus rings.
- **1px Hairline Precision:** Structural separation achieved through ultra-thin hairline borders (`border-kumo-hairline`) rather than heavy drop shadows.
- **Component Stack:** `@cloudflare/kumo` (Base UI primitives + Tailwind CSS v4) paired with `@phosphor-icons/react` icons and `facehash` avatar graphics.

---

## 2. Core Golden Rules (Strict Enforcement)

1. **Use Kumo Semantic Tokens + Cloudflare Tokens:** Always use Kumo semantic utility classes (`bg-kumo-canvas`, `bg-kumo-base`, `text-kumo-default`, `border-kumo-hairline`) alongside registered Cloudflare theme tokens (`bg-cf-orange`, `text-cf-orange`, `text-cf-blue`, `btn-cf-primary`, `btn-cf-secondary`, `bg-cf-sidebar-active`).
2. **NEVER Use Raw Tailwind Grayscale/Blue Classes:** Avoid hardcoded classes like `bg-zinc-900` or `text-gray-500` in layout markup so that switching `data-mode="dark"` and `data-mode="light"` works automatically without manual theme overrides.
3. **Theme Switching Via Data Attributes:** Theme mode is controlled at the root element level via `data-mode="dark"` and `data-mode="light"` powered by CSS custom properties.
4. **Tailwind-First Styling (Conservative Approach):**
   - **Prefer Standard Tailwind Classes by Default:** Use existing Tailwind utility classes whenever they provide an acceptable match for the design (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `p-4`, `gap-4`, `rounded-lg`, `max-w-xl`, etc.).
   - **No Arbitrary Pixel Typography or Spacing:** Never use arbitrary pixel classes (such as `text-[13px]`, `text-[11px]`, or `p-[13px]`) when standard Tailwind scale utilities (`text-sm`, `text-xs`, `p-3.5`) serve the layout cleanly.
   - **Custom Utilities Only When Genuinely Necessary:** Add a reusable utility to `globals.css` only when the existing design requires a value meaningfully different from available utilities, using the nearest utility would noticeably alter the UI, and a reusable class is beneficial.
   - **Dynamic Inline Styling:** Retain inline `style={{ ... }}` when values genuinely depend on runtime calculations or dynamic data (e.g. Cartesian chart points, progress percentages). Do not force dynamic values into static classes.
5. **Always Use `cn()` for Class Composition:** Import `cn` from `@/lib/utils` to merge conditional Tailwind classes safely.
6. **Root Portal Isolation:** Floating overlays (Dialogs, Popovers, Select menus, Dropdowns, Command Palettes) portal to `document.body`. The application root container (`AppShell`) preserves `className="isolate"` (`isolation: isolate`).
7. **Application Implementation is the Source of Truth:** Documentation strictly describes what exists in the active codebase. Never document hypothetical, planned, or unverified features as implemented reality.

---

## 3. Complete Cloudflare Color Palette & Token Reference

### 3.1 Cloudflare Brand & Action Palette

| Token Name | CSS Variable | Tailwind Utility | Light Mode Hex | Dark Mode Hex | UI Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloudflare Action Blue** | `--color-cf-blue` | `text-cf-blue` / `bg-cf-blue` | `#0051C3` | `#0066FF` | Primary button fill (`btn-cf-primary`), inbox unread badge, focus rings |
| **Cloudflare Blue Hover** | `--color-cf-blue-hover` | `hover:bg-cf-blue-hover` | `#0043A6` | `#0052CC` | Hover state for primary action buttons |
| **Cloudflare Primary Orange** | `--color-cf-orange` | `bg-cf-orange` / `text-cf-orange` | `#FF6600` | `#FF6600` | Setup wizard CTAs, brand icon box, active tab indicators |
| **Cloudflare Classic Orange** | `--color-cf-orange-brand` | `text-cf-orange-brand` | `#F6821F` | `#F6821F` | Brand logo mark, primary brand accent |
| **Cloudflare Orange Hover** | `--color-cf-orange-hover` | `hover:bg-cf-orange-hover` | `#E65C00` | `#FF7A1A` | Hover state for orange CTA buttons |
| **Cloudflare Amber** | `--color-cf-amber` | `text-cf-amber` / `bg-cf-amber` | `#FBAD41` | `#FBBF24` | Warning badges, pending domain verification, warning toasts |
| **Cloudflare Orange Tint** | `--color-cf-orange-tint` | `bg-cf-orange-tint` | `#FFF3EB` | `#2A1205` | Setup callout background, MX Priority badge, update banners |
| **Cloudflare Orange Border** | `--color-cf-orange-border` | `border-cf-orange-border` | `#FFD4B8` | `#5C280B` | Border for orange-tinted callouts and banners |
| **Analytics Chart Blue** | `--color-cf-chart-blue` | `text-cf-chart-blue` | `#0051C3` | `#3B82F6` | Outbound dispatched timeseries line & area gradient |
| **Success Emerald** | `--color-cf-success` | `text-cf-success` / `bg-cf-success` | `#059669` | `#34D399` | 250 OK delivery rate, active status dots, verified domain badges |
| **Sidebar Active Item** | `--color-cf-sidebar-active` | `bg-cf-sidebar-active` | `#EFEFEF` | `#1C1C1E` | Active navigation item background in sidebar |
| **Banner Outer Background**| `--color-cf-banner-outer-bg`| `bg-cf-banner-outer-bg` | `#F7F7F7` | `#080808` | Notification banner outer wrapper surface |
| **Banner Outer Border** | `--color-cf-banner-outer-border`| `border-cf-banner-outer-border`| `#E5E5E5`| `#1A1A1A`| Notification banner outer boundary border |

### 3.2 Surface & Background Hierarchy

| Semantic Token | CSS Variable | Light Mode Hex | Dark Mode Hex | Cloudflare Dashboard Element |
| :--- | :--- | :--- | :--- | :--- |
| `bg-kumo-canvas` | `--color-kumo-canvas` | `#FBFBFB` | `#050505` | Main application canvas & Left Sidebar background |
| `bg-kumo-base` | `--color-kumo-base` | `#FFFFFF` | `#0C0C0C` | KPI cards, timeseries charts, table containers, modal bodies |
| `bg-kumo-elevated` | `--color-kumo-elevated` | `#F4F4F5` | `#141414` | Quick action cards, hover states, filter pills, secondary buttons (`btn-cf-secondary`) |
| `bg-kumo-recessed` | `--color-kumo-recessed` | `#F2F2F2` | `#080808` | Table header row background, code blocks, `Ctrl K` keyboard shortcut caps |
| `bg-kumo-tint` | `--color-kumo-tint` | `#F5F5F5` | `#161616` | Table row hover state, sidebar item hover state |
| `bg-kumo-control` | `--color-kumo-control` | `#FFFFFF` | `#0F0F0F` | Sidebar domain dropdown trigger, search input backgrounds, select controls |
| `bg-kumo-interact` | `--color-kumo-interact` | `#E4E4E7` | `#262626` | Active/pressed button states, modal action triggers |

### 3.3 Typography & Icon Hierarchy

| Semantic Token | Light Mode Hex | Dark Mode Hex | Cloudflare Dashboard Usage |
| :--- | :--- | :--- | :--- |
| `text-kumo-strong` | `#111111` | `#FFFFFF` | Page titles (`h1`), hero greetings, KPI metrics, table primary cells |
| `text-kumo-default` | `#1F1F1F` | `#E5E5E5` | Sidebar navigation labels, table primary text, input values |
| `text-kumo-subtle` | `#686868` | `#8E8E93` | Card headers, table column headers, secondary descriptions, axis labels |
| `text-kumo-muted` | `#9CA3AF` | `#52525B` | Carets, icons, placeholder text, inactive pagination arrows |

### 3.4 Borders & Dividers

| Semantic Token | Light Mode Hex | Dark Mode Hex | Cloudflare Dashboard Usage |
| :--- | :--- | :--- | :--- |
| `border-kumo-hairline` | `#E5E5E5` | `#1E1E1E` | Sidebar right border, card outer borders, table row dividers, modal borders |
| `border-kumo-line` | `#D4D4D8` | `#262626` | Input borders, dropdown borders, secondary button outlines |
| `border-kumo-danger` | `#DC2626` | `#F87171` | Hard bounce badges, offline health indicators, destructive actions |
| `border-kumo-danger-tint` | `#FEF2F2` | `#2B1111` | Destructive banner backgrounds |

### 3.5 Telemetry & Status Badges (`StatusBadge`)

| Status / Variant | Background | Text Color | Border | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **`success`** | `bg-cf-success/10` | `text-cf-success` | `border-cf-success/25` | `Delivered`, `Verified`, `Connected`, `250 OK` |
| **`warning`** | `bg-cf-amber/10` | `text-cf-amber` | `border-cf-amber/25` | `Pending`, `Suppressed`, `Retrying` |
| **`danger`** | `bg-kumo-danger/10` | `text-kumo-danger` | `border-kumo-danger/25` | `Bounced`, `Failed`, `Offline`, `Revoked` |
| **`info`** | `bg-cf-blue/10` | `text-cf-blue` | `border-cf-blue/25` | `Queued`, `Sending` (with animated pulse dot) |
| **`neutral`** | `bg-kumo-recessed` | `text-kumo-subtle` | `border-kumo-hairline` | `Draft`, `Inactive`, `Archived` |

---

## 4. Global Stylesheet Reference (`apps/dashboard/app/globals.css`)

```css
@import "tailwindcss";

@theme {
  --font-bricolage: "Arial", "Helvetica Neue", sans-serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  
  /* Surfaces & Backgrounds */
  --color-kumo-canvas: var(--kumo-canvas);
  --color-kumo-base: var(--kumo-base);
  --color-kumo-elevated: var(--kumo-elevated);
  --color-kumo-recessed: var(--kumo-recessed);
  --color-kumo-tint: var(--kumo-tint);
  --color-kumo-control: var(--kumo-control);
  --color-kumo-interact: var(--kumo-interact);
  
  /* Typography & Foreground */
  --color-kumo-strong: var(--kumo-strong);
  --color-kumo-default: var(--kumo-default);
  --color-kumo-subtle: var(--kumo-subtle);
  --color-kumo-muted: var(--kumo-muted);
  
  /* Hairlines & Borders */
  --color-kumo-hairline: var(--kumo-hairline);
  --color-kumo-line: var(--kumo-line);
  --color-kumo-danger: var(--kumo-danger);
  --color-kumo-danger-tint: var(--kumo-danger-tint);

  /* Cloudflare Brand Tokens */
  --color-cf-blue: var(--cf-blue);
  --color-cf-blue-hover: var(--cf-blue-hover);
  --color-cf-orange: var(--cf-orange);
  --color-cf-orange-brand: var(--cf-orange-brand);
  --color-cf-orange-hover: var(--cf-orange-hover);
  --color-cf-amber: var(--cf-amber);
  --color-cf-orange-tint: var(--cf-orange-tint);
  --color-cf-orange-border: var(--cf-orange-border);
  --color-cf-chart-blue: var(--cf-chart-blue);
  --color-cf-success: var(--cf-success);
  --color-cf-sidebar-active: var(--cf-sidebar-active);
  --color-cf-banner-outer-bg: var(--cf-banner-outer-bg);
  --color-cf-banner-outer-border: var(--cf-banner-outer-border);

  @keyframes skeleton {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
}

:root {
  color-scheme: dark;
  --kumo-canvas: #050505;
  --kumo-base: #0C0C0C;
  --kumo-elevated: #141414;
  --kumo-recessed: #080808;
  --kumo-tint: #161616;
  --kumo-control: #0F0F0F;
  --kumo-interact: #262626;
  --kumo-strong: #FFFFFF;
  --kumo-default: #E5E5E5;
  --kumo-subtle: #8E8E93;
  --kumo-muted: #52525B;
  --kumo-hairline: #1E1E1E;
  --kumo-line: #262626;
  --kumo-danger: #F87171;
  --kumo-danger-tint: #2B1111;
  --cf-blue: #0066FF;
  --cf-blue-hover: #0052CC;
  --cf-orange: #FF6600;
  --cf-orange-brand: #F6821F;
  --cf-orange-hover: #FF7A1A;
  --cf-amber: #FBBF24;
  --cf-orange-tint: #2A1205;
  --cf-orange-border: #5C280B;
  --cf-chart-blue: #3B82F6;
  --cf-success: #34D399;
  --cf-sidebar-active: #1C1C1E;
  --cf-banner-outer-bg: #080808;
  --cf-banner-outer-border: #1A1A1A;
}

[data-mode="light"] {
  color-scheme: light;
  --kumo-canvas: #FBFBFB;
  --kumo-base: #FFFFFF;
  --kumo-elevated: #F4F4F5;
  --kumo-recessed: #F2F2F2;
  --kumo-tint: #F5F5F5;
  --kumo-control: #FFFFFF;
  --kumo-interact: #E4E4E7;
  --kumo-strong: #111111;
  --kumo-default: #1F1F1F;
  --kumo-subtle: #686868;
  --kumo-muted: #9CA3AF;
  --kumo-hairline: #E5E5E5;
  --kumo-line: #D4D4D8;
  --kumo-danger: #DC2626;
  --kumo-danger-tint: #FEF2F2;
  --cf-blue: #0051C3;
  --cf-blue-hover: #0043A6;
  --cf-orange: #FF6600;
  --cf-orange-brand: #F6821F;
  --cf-orange-hover: #E65C00;
  --cf-amber: #FBAD41;
  --cf-orange-tint: #FFF3EB;
  --cf-orange-border: #FFD4B8;
  --cf-chart-blue: #0051C3;
  --cf-success: #059669;
  --cf-sidebar-active: #EFEFEF;
  --cf-banner-outer-bg: #F7F7F7;
  --cf-banner-outer-border: #E5E5E5;
}

@layer base {
  html, body {
    @apply bg-kumo-canvas text-kumo-default antialiased selection:bg-cf-blue/20 selection:text-cf-blue;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }
}

.font-logo {
  font-family: var(--font-bricolage), system-ui, sans-serif;
}

/* Reusable Semantic Utilities for High-Density UI Elements */
@utility text-2xs {
  font-size: 0.625rem;
  line-height: 0.875rem;
}

@utility active-press {
  &:active {
    transform: scale(0.99);
  }
}

/* Explicit Cloudflare Button System - Linear Tailwind Scale */
.btn-cf-primary {
  background-color: var(--cf-blue);
  color: #FFFFFF;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.45rem 0.95rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.25);
  transition: all 120ms ease;
  cursor: pointer;
  user-select: none;
}
.btn-cf-primary:hover {
  background-color: var(--cf-blue-hover);
}
.btn-cf-primary:active {
  transform: scale(0.99);
}
.btn-cf-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-cf-primary:focus-visible {
  outline: 2px solid var(--cf-blue);
  outline-offset: 1px;
}

.btn-cf-secondary {
  background-color: var(--kumo-elevated);
  color: var(--kumo-strong);
  border: 1px solid var(--kumo-line);
  font-weight: 500;
  border-radius: 0.375rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.45rem 0.95rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  transition: all 120ms ease;
  cursor: pointer;
  user-select: none;
}
.btn-cf-secondary:hover {
  background-color: var(--kumo-interact);
  border-color: var(--kumo-line);
}
.btn-cf-secondary:active {
  transform: scale(0.99);
}
.btn-cf-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-cf-secondary:focus-visible {
  outline: 2px solid var(--kumo-line);
  outline-offset: 1px;
}
```

### 4.1 Custom Utilities in `globals.css` & Justifications

Only reusable utilities that meet strict architectural criteria are defined in `globals.css`:

1. **`.btn-cf-primary`:** Standard Cloudflare Action Blue primary action button. Encapsulates hover (`--cf-blue-hover`), active press (`scale(0.99)`), focus-visible ring, disabled state, and elevation shadow for primary calls to action.
2. **`.btn-cf-secondary`:** Elevated surface neutral secondary button with theme-adaptive border (`--kumo-line`), hover surface (`--kumo-interact`), active press, and focus ring.
3. **`.font-logo`:** Encapsulates the Bricolage / system brand font declaration for the EmitMail navigation brand mark.
4. **`.text-2xs` (`0.625rem` / 10px):** Reusable micro-scale typography utility for `<kbd>` keyboard shortcuts (`Ctrl K`, `ESC`) and compact uppercase role tags (`ADMIN`, `MEMBER`, `VIEW ONLY`) where standard `text-xs` (12px) causes visual crowding and boundary clipping.
5. **`.active-press`:** Reusable micro-interaction utility for tactile 1% click compression (`transform: scale(0.99)`), replacing aggressive and bouncy 5% scaling (`active:scale-95`) without reintroducing arbitrary bracket classes into TSX markup.

### 4.2 Guidelines for Introducing Future Custom Utilities

To prevent design system fragmentation and avoid overengineering, developers must adhere to the following checklist before adding any new utility to `globals.css`:

1. **Standard Tailwind Check:** Can an existing Tailwind utility (e.g. `text-sm`, `p-4`, `max-w-xl`, `rounded-lg`) satisfy the design requirement without noticeable visual divergence? If yes, always use the standard Tailwind class.
2. **Meaningful Difference:** Does the design strictly require a value that differs meaningfully from available Tailwind utilities? If using the nearest class causes an unacceptable layout or visual mismatch, a utility may be considered.
3. **Reusability Across Views:** Is this utility required across multiple views or components? Single-use or one-off values should not be added as global utility classes.
4. **No Specificity Bloat:** Never declare `!important` inside custom utilities. All custom classes must remain safely overrideable by standard Tailwind utilities.

---

## 5. Application Shell & Navigation Architecture

### 5.1 Application Shell Architecture (`AppShell.tsx`)

The dashboard features a modern, headerless desktop layout paired with a dedicated mobile header and drawer:

- **Root Container:** `isolate h-screen w-screen overflow-hidden bg-kumo-canvas text-kumo-default flex flex-col`.
- **Global Context Providers Stack:**
  - `ToastProvider`: Manages floating toast notifications with 4s auto-dismiss.
  - `VersionProvider`: Queries `/api/v1/system/version` and manages update state.
  - `AuthProvider`: Manages current user session, permissions, and logout routines.
- **Top Update Banner (`SystemUpdateBanner.tsx`):**
  - Rendered at the top of the shell when an update is available (`isUpdateAvailable === true` and not dismissed).
  - Background: Gradient from `cf-orange/10` via `cf-orange/5` to transparent with bottom border `cf-orange/20`.
  - Content: Animated pulse icon, version tag, "Download & Install Update" button, and dismiss `X` button.
- **Desktop Shell (`hidden lg:flex`):**
  - **No Global Desktop Header:** The top header bar is deliberately omitted on desktop to maximize vertical canvas space and mirror Cloudflare Account Home v2.
  - **Full-Height Sidebar:** Persistent fixed left sidebar running the entire height of the viewport (`h-full lg:flex`).
  - **Scrollable Main Canvas:** Independent scrollable viewport (`flex-1 min-w-0 overflow-y-auto bg-kumo-canvas`).
  - **Centered Content Container:** All views are centered within `w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5`.
- **Mobile Shell (`lg:hidden`):**
  - **Mobile Header (`h-12 border-b border-kumo-hairline bg-kumo-base/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between`):**
    - Left: Hamburger drawer trigger (`List` icon).
    - Center: Brand mark with `PaperPlaneTilt` icon in orange box + `emitmail` logo.
    - Right: Quick search shortcut button opening the command palette.
  - **Mobile Slide-Over Drawer:**
    - Backdrop: `fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity`.
    - Sliding Panel: `fixed inset-y-0 left-0 z-50 w-72 bg-kumo-canvas border-r border-kumo-hairline p-4`.

### 5.2 Navigation Sidebar (`Sidebar.tsx`)

- **Dimensions:**
  - Expanded Desktop: `w-64`.
  - Collapsed Desktop: `w-16`.
  - Mobile Drawer: `w-72`.
- **Sidebar Collapse / Expand Edge Toggle:**
  - Positioned on the desktop sidebar right edge:
    - Expanded: `absolute top-3.5 right-2.5 z-30 p-1.5 rounded-md text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-elevated`.
    - Collapsed: `absolute top-3.5 -right-3.5 z-30 w-7 h-7 rounded-md bg-kumo-base border border-kumo-line shadow-xs text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-elevated`.
  - Icon: `PanelLeftClose` when expanded, `PanelLeftOpen` when collapsed.
- **Top Brand Section (`mb-7`):**
  - Brand Link: `flex items-center gap-2.5 group cursor-pointer`.
  - Brand Mark: `w-8 h-8 rounded-lg bg-cf-orange flex items-center justify-center text-white shrink-0 shadow-xs` with `PaperPlaneTilt` (weight fill).
  - Wordmark: `font-logo font-extrabold tracking-tight text-xl text-cf-orange leading-none truncate` (`emitmail`).
- **Workspace Actions (`mb-7`):**
  1. **Domain Selector Dropdown (`mb-3.5`):**
     - Button: `w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-kumo-control hover:bg-kumo-elevated border border-kumo-line text-xs font-medium text-kumo-strong shadow-2xs`.
     - Left indicator: `w-5 h-5 rounded-md bg-cf-orange/15 text-cf-orange font-bold text-xs flex items-center justify-center shrink-0` showing the uppercase initial of the active domain or `Plus` icon.
     - Center text: Truncated active domain name.
     - Right icon: `CaretUpDown`.
     - Dropdown menu: `rounded-xl bg-kumo-base border border-kumo-hairline shadow-xl py-1 text-xs z-40` with verified checkmark and "+ Manage all domains" link to `/domains`.
  2. **Quick Search Button:**
     - Button: `w-full bg-kumo-control hover:bg-kumo-elevated border border-kumo-line rounded-lg px-2.5 py-2 text-xs text-kumo-subtle flex items-center justify-between hover:border-cf-orange transition-colors group shadow-2xs`.
     - Left: `MagnifyingGlass` + `"Quick search..."`.
     - Right: `<kbd className="px-1.5 py-0.5 text-xs font-mono text-kumo-muted bg-kumo-recessed border border-kumo-hairline rounded">Ctrl K</kbd>`.
- **Primary Navigation Map (7 Routes, `space-y-2`):**
  1. **Home** (`/`, `House`) — Central command hub, onboarding status, and 30-day analytics.
  2. **Email** (`/emails`, `EnvelopeSimple`) — Processed outbox telemetry, delivery rates, and send test email.
  3. **Inbox** (`/inbox`, `Tray`) — Real-time inbound mailboxes with blue unread badge (`bg-cf-blue text-white text-xs font-bold min-w-5 h-5 rounded-full`).
  4. **Analytics** (`/analytics`, `ChartLineUp`) — 30-day volume breakdown, bounce rates, and deliverability trends.
  5. **Domains** (`/domains`, `Globe`) — Domain verification, DKIM, SPF, and DMARC status.
  6. **API Keys** (`/api-keys`, `Key`) — REST API credentials and SDK bearer tokens.
  7. **Webhooks** (`/webhooks`, `PlugsConnected`) — Real-time event webhooks with `Live` badge (`bg-cf-orange-tint text-cf-orange border border-cf-orange-border/40 text-xs font-semibold px-1.5 py-0.5 rounded-full`).
- **Navigation Item States:**
  - **Active:** `bg-cf-sidebar-active text-kumo-strong font-medium shadow-2xs rounded-lg px-3 py-2 text-sm flex items-center justify-between` with `text-cf-orange` filled icon.
  - **Default:** `text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong rounded-lg px-3 py-2 text-sm flex items-center justify-between transition-colors`.
- **Flexible Spacer:** `flex-1 min-h-6` pushing bottom section to the base.
- **Bottom Section (`space-y-2 pt-2`):**
  1. **Settings Navigation Link:** `Settings` (`/settings`, `Gear` icon).
  2. **Hairline Separator:** Thin horizontal divider (`border-t border-kumo-hairline my-1 mx-0.5`), displayed **only** when an update is available (`isUpdateAvailable === true`).
  3. **Prominent "Update Available" Button:**
     - Conditionally displayed **only** when `isUpdateAvailable === true`.
     - Container: `w-full relative flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-kumo-base hover:bg-kumo-elevated border border-kumo-hairline hover:border-kumo-line transition-all shadow-2xs`.
     - Content: `DownloadIcon` + `"Update Available"` in `text-sm font-semibold text-kumo-strong`.
     - Status Indicator: Vertically centered on the right (`absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-2.5 h-2.5 rounded-full bg-cf-success/15 ring-1 ring-cf-success/25`), with a `w-1.5 h-1.5 rounded-full bg-cf-success` center core.
     - Action: Opens the `UpgradeModal`.
  4. **Transparent Account Row:**
     - Container: Completely borderless, backgroundless transparent horizontal row (`w-full flex items-center justify-between px-1.5 py-1.5 rounded-lg hover:bg-kumo-tint/60 transition-colors text-left select-none`).
     - Avatar: Circular Facehash avatar (`w-8 h-8 rounded-full overflow-hidden`).
     - Identity: Label `"Account"` in `text-sm font-semibold text-kumo-strong leading-tight`, user email or handle in `text-xs text-kumo-muted truncate mt-0.5`.
     - Right: `CaretUpDown` icon in `text-kumo-muted`.
     - Upward Popover Menu: Anchored upward (`bottom-full left-0 mb-2 w-full rounded-xl bg-kumo-base border border-kumo-hairline shadow-xl py-1 text-xs z-50`):
       - Header: Facehash (`w-8 h-8`), user full name, role badge (`ADMIN`, `MEMBER`, `VIEW ONLY`), and email.
       - Nav Link: Workspace Settings (`/settings`).
       - Theme Toggle: Interactive button toggling dark/light mode with `Sun`/`Moon` icons.
       - Log Out: `text-kumo-danger hover:bg-kumo-danger-tint` action button.
  5. **Current Version Indicator:** Centered subtle version string at the very bottom: `Version v0.30.8` (`text-center text-xs text-kumo-subtle select-none pt-2 pb-0.5 font-normal tracking-wide`), sourced dynamically from `/api/v1/system/version` with fallback to `0.30.8`.

---

## 6. Standardized Dashboard Typography Scale

All views strictly adhere to standard Tailwind typography classes:

| Element Role | Tailwind Typography Classes | Font Family & Weight | Semantic Token | Associated Utilities | Example Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `text-xl sm:text-2xl` | `font-sans font-semibold` | `text-kumo-strong` | `tracking-tight leading-tight` | Top page header (`Processed Emails`, `Domains`) |
| **Page Description** | `text-xs sm:text-sm` | `font-sans font-normal` | `text-kumo-subtle` | `leading-normal` | Subtitle under page header |
| **Section Heading** | `text-sm sm:text-base` | `font-sans font-semibold` | `text-kumo-strong` | `leading-snug` | Analytics section, Service status header |
| **Card / KPI Title** | `text-xs sm:text-sm` | `font-sans font-medium` | `text-kumo-subtle` | `leading-normal` | Upper card labels (`Emails Sent`, `Delivery Rate`) |
| **Primary Metric (KPI)** | `text-2xl sm:text-3xl` | `font-mono font-semibold` | `text-kumo-strong` | `tracking-tight leading-none` | Prominent metric values (`4,330`, `99.8%`) |
| **KPI Supporting Text** | `text-xs` | `font-sans font-normal` | `text-kumo-subtle` | `leading-normal` | Description under KPI metric value |
| **Chart Heading** | `text-xs sm:text-sm` | `font-sans font-medium` | `text-kumo-subtle` | `leading-snug` | Total emails dispatched / Inbound volume |
| **Chart Axis / Timeframe** | `text-xs` | `font-mono font-normal` | `text-kumo-muted` | `leading-none select-none` | 30-day view badge, X/Y axis labels |
| **Table Column Headers** | `text-xs sm:text-sm` | `font-sans font-medium` | `text-kumo-subtle` | `select-none` | Data table header row (`th`) |
| **Table Primary Content** | `text-xs sm:text-sm` | `font-sans font-medium` | `text-kumo-strong` | `leading-normal` | Domain names, recipient emails, key names |
| **Table Secondary Metadata** | `text-xs` | `font-sans font-normal` | `text-kumo-subtle` | `leading-normal` | Email subjects, token scopes, footnotes |
| **Monospace Technical Data** | `text-xs` | `font-mono font-normal` | `text-kumo-default` / `strong` | `truncate` | Message IDs, token prefixes, DNS hostnames |
| **Status Labels & Badges** | `text-xs` | `font-sans font-medium` | Semantic variants | `leading-none select-none` | Delivered, Queued, Verified, Suppressed |
| **Form Input Text** | `text-xs sm:text-sm` | `font-sans font-normal` | `text-kumo-strong` | `leading-normal` | Input controls, textareas, select menus |
| **Form Labels** | `text-xs sm:text-sm` | `font-sans font-medium` | `text-kumo-strong` | `leading-normal block` | Input labels |
| **Action Buttons (Normal)** | `text-xs sm:text-sm` | `font-sans font-medium` | `btn-cf-primary` / `secondary` | `leading-none select-none` | Primary & secondary toolbar buttons |
| **Micro Badges & Footers** | `text-xs` | `font-mono font-normal` | `text-kumo-muted` | `leading-normal` | Version string, attempt count, kbd caps |

### Linear Scale Reference

The EmitMail platform enforces a linear, predictable typography hierarchy using standard Tailwind classes:

| Tailwind Class | Relative Rem | Equivalent Baseline | Line Height Class | Linear Scale Level | Typical Application |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-xs` | `0.75rem` | `12px` | `leading-4` (`1rem`) | Micro / Badges | Badges, metadata, table headers, kbd shortcuts, axis labels, version |
| `text-sm` | `0.875rem` | `14px` | `leading-5` (`1.25rem`) | Body / Standard | Navigation links, table cells, form inputs, button labels, card subtitles |
| `text-base` | `1rem` | `16px` | `leading-6` (`1.5rem`) | Body / Prominent | Section headers, body prose, large button labels |
| `text-lg` | `1.125rem` | `18px` | `leading-7` (`1.75rem`) | Display / Subheading | Modal headers (mobile), promo callouts |
| `text-xl` | `1.25rem` | `20px` | `leading-7` (`1.75rem`) | Display / Title | Page titles (`h1`), brand logo text, dialog titles |
| `text-2xl` | `1.5rem` | `24px` | `leading-8` (`2rem`) | Display / Hero KPI | Prominent dashboard KPI numbers, setup wizard headings |
| `text-3xl` | `1.875rem` | `30px` | `leading-9` (`2.25rem`) | Display / Super Hero | Hero greeting headers (`"Welcome to EmitMail"`) |

### Linear Typography Enforcement Rules

1. **No Arbitrary Pixel Sizes:** Never use arbitrary pixel classes (such as `text-[13px]`, `text-[11px]`, `text-[9px]`). Every text element must snap to the nearest standard Tailwind step (`text-xs` or `text-sm`).
2. **No Custom Fractional Rem Utilities:** Never introduce custom typography utilities (such as `text-2xs` or `0.8125rem`). Standard `text-xs` serves all micro-label requirements.
3. **No Numeric Font Weights:** Always use semantic Tailwind weight classes (`font-normal`, `font-medium`, `font-semibold`, `font-bold`, `font-extrabold`) rather than raw numbers (`400`, `500`, `600`, `700`).
4. **Standardized Line Heights:** Always use Tailwind leading utilities (`leading-none`, `leading-tight`, `leading-snug`, `leading-normal`, `leading-relaxed`) to preserve vertical rhythm.

---

## 7. Component Systems & Interaction Standards

### 7.1 Buttons & Action Controls

- **Cloudflare Action Blue Button (`btn-cf-primary`):**
  - Class: `btn-cf-primary` (`bg-cf-blue hover:bg-cf-blue-hover text-white`).
  - Geometry: `rounded-md font-medium text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer select-none`.
  - Usage: Primary page actions (`Send Email`, `Create API key`, `Verify Domain`).
- **Cloudflare Secondary Elevated Button (`btn-cf-secondary`):**
  - Class: `btn-cf-secondary` (`bg-kumo-elevated hover:bg-kumo-interact border border-kumo-line text-kumo-strong`).
  - Geometry: `rounded-md font-medium text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer select-none`.
  - Usage: Secondary actions (`Check DNS Records`, `Filter`, `Cancel`).
- **Primary Orange CTA Button:**
  - Class: `bg-cf-orange hover:bg-cf-orange-hover text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-xs`.
  - Usage: Setup wizard triggers, high-priority onboarding callouts.
- **Icon / Refresh Button:**
  - Class: `p-2 rounded-lg bg-kumo-base hover:bg-kumo-elevated border border-kumo-line text-kumo-subtle hover:text-kumo-strong transition-colors cursor-pointer shadow-2xs`.
  - Animated refresh state: `ArrowsClockwise` with `animate-spin text-cf-blue`.

### 7.2 Cards & Surface Containers

- **Standard Data Card:**
  - Container: `bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-5 shadow-2xs hover:border-kumo-line/80 transition-colors`.
  - Hierarchy: Header label in `text-xs sm:text-sm font-medium text-kumo-subtle`, metric in `text-2xl sm:text-3xl font-semibold text-kumo-strong font-mono leading-none`, footer subtext in `text-xs text-kumo-subtle font-normal mt-1`.
- **Interactive Quick-Action Card:**
  - Container: `bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-4.5 flex flex-col justify-between hover:border-kumo-line/80 transition-colors`.
- **Callout / Security Banner:**
  - Container: `p-4 rounded-xl bg-kumo-base border border-kumo-hairline flex items-start gap-3.5 shadow-2xs`.
  - Left icon: `p-2 rounded-lg bg-cf-blue/10 text-cf-blue shrink-0 mt-0.5` with `ShieldCheck` (weight fill).
  - Content: Title in `text-sm sm:text-base font-medium text-kumo-strong`, body copy in `text-xs sm:text-sm text-kumo-subtle leading-relaxed`.
- **View-Only Mode Banner (`ViewOnlyBanner.tsx`):**
  - Rendered when user has `role === "VIEWER"`: `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-kumo-elevated border border-kumo-hairline text-kumo-subtle text-xs`.
  - Left: `Eye` icon in blue container.
  - Right: `Lock` icon with uppercase label `VIEW ONLY`.

### 7.3 Data Tables & Pagination

- **Table Container:** `bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs`.
- **Table Element:** `w-full text-left border-collapse` (or `table-fixed w-full` for bounded column layouts).
- **Header Row (`thead`):** `border-b border-kumo-hairline bg-kumo-recessed/40 text-kumo-subtle font-medium text-xs sm:text-sm py-2.5 px-4 select-none`.
- **Body Rows (`tbody`):** `divide-y divide-kumo-hairline text-xs sm:text-sm`.
  - Row Hover: `hover:bg-kumo-tint/40 transition-colors group cursor-pointer`.
  - Cell Padding: `py-3 px-4 align-middle`.
- **Pagination Footer Bar:**
  - Container: `px-4 py-3 border-t border-kumo-hairline bg-kumo-recessed/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-kumo-subtle select-none`.
  - Left count: `Showing 1–10 of 42 emails`.
  - Right controls: Page indicator (`Page 1 of 5`) + Previous/Next buttons (`px-2.5 py-1 text-xs font-medium rounded-md border border-kumo-line bg-kumo-base hover:bg-kumo-elevated text-kumo-strong disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs`).
  - Standard Page Size: `PAGE_SIZE = 10`.

### 7.4 Form Controls & Filter Bars

- **Text Inputs:**
  - Class: `h-9 sm:h-10 pl-3 pr-3 text-xs sm:text-sm bg-kumo-control hover:bg-kumo-elevated/50 border border-kumo-line rounded-lg text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue focus:ring-1 focus:ring-cf-blue/30 transition-colors shadow-2xs`.
- **Search Inputs with Leading Icon:**
  - Class: `pl-8 pr-7` with `MagnifyingGlass` absolute left (`left-3 top-1/2 -translate-y-1/2 text-kumo-muted`). Clear `X` button on right.
- **Select Dropdowns:**
  - Class: `h-9 bg-kumo-control hover:bg-kumo-elevated border border-kumo-line rounded-lg pl-3 pr-8 text-xs sm:text-sm text-kumo-strong appearance-none cursor-pointer focus:outline-none focus:border-cf-blue focus:ring-1 focus:ring-cf-blue/30 shadow-2xs`.
  - Dropdown Caret: `CaretDown` absolute right (`right-2.5 top-1/2 -translate-y-1/2 text-kumo-muted pointer-events-none`).
- **Segmented Filter Buttons:**
  - Container: `flex items-center gap-1 p-1 bg-kumo-control border border-kumo-line rounded-lg shadow-2xs overflow-x-auto`.
  - Active tab: `bg-kumo-elevated text-kumo-strong font-medium shadow-2xs border border-kumo-line/50 rounded-md px-3 py-1.5 text-xs sm:text-sm`.
  - Inactive tab: `text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-tint/50 font-normal rounded-md px-3 py-1.5 text-xs sm:text-sm`.

### 7.5 Status Indicators & Health Badges

- **Status Badge Component (`StatusBadge`):**
  - Structure: `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none transition-colors`.
  - Dot: `w-1.5 h-1.5 rounded-full shrink-0` (optional `animate-pulse` for queued/in-flight states).
- **Service Health Indicators:**
  - Structure: Pair of status dot (`w-1.5 h-1.5 rounded-full`) + service name (`Database`, `Redis`, `Worker`) + monospace status text (`Connected`, `Running`, `Offline`).
  - Colors: Connected/Running uses `bg-cf-success`, Offline/Stopped uses `bg-kumo-danger`.

### 7.6 Modal Dialogs & Command Palette

- **Root Isolation:** All floating overlays portal to `document.body` while the application root container preserves `className="isolate"`.
- **Backdrop:** `fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity`.
- **Dialog Container:** `bg-kumo-base border border-kumo-hairline rounded-2xl shadow-2xl overflow-hidden p-6 max-w-lg sm:max-w-2xl w-full mx-auto relative z-50 animate-in fade-in zoom-in-95 duration-150`.
- **Command Palette (`CommandPalette.tsx`):**
  - Shortcut: Global `Ctrl + K` / `Cmd + K` keybinding.
  - Search input: `h-12 border-b border-kumo-hairline px-4 text-sm`.
  - Actions list: Categorized items (`Action`, `Navigation`) with keyboard navigation and instant route switching.

---

## 8. Page-Specific UI Architectures

### 8.1 Setup Wizard & Onboarding (`/onboarding` & `OnboardingModal.tsx`)

- **Card Container:** Centered `max-w-4xl w-full bg-kumo-base border border-kumo-line rounded-2xl shadow-xl overflow-hidden` in `min-h-screen bg-kumo-canvas`.
- **Progress Stepper:** Header indicator with numbered badges (`w-6 h-6 rounded-full text-xs font-semibold`), orange active state (`bg-cf-orange text-white`), and green completion checkmarks (`bg-cf-success/20 text-cf-success`).
- **Step 1 — Server & Domain Parameters:**
  - Primary Sending Domain input (`*` required) + VPS Public Static IPv4 address input.
  - Auto-configured cluster records preview tiles: `Mail Server EHLO` (orange), `Return-Path Subdomain` (blue), and `Master SPF Host` (strong).
- **Step 2 — 3-Column DNS Records Table with Click-to-Copy:**
  - Layout: `table-fixed w-full` summing to 100%:
    - `Type` (`20%`): Clean monospace labels without bracket noise: `TXT`, `A Record`, `MX`. The MX record features a prominent highlighted badge: `<span className="bg-cf-orange-tint text-cf-orange border border-cf-orange-border">(Priority 10)</span>`.
    - `Host / Name` (`26%`): Exact hostname (`em._domainkey`, `send`, `_spf`, `_dmarc`, `mail...`, `@`).
    - `Value / Content` (`54%`): Full monospace cryptographic public key or target.
  - Clean Interaction: Every cell is interactive (`cursor-pointer hover:bg-kumo-control/50`). No distracting hover icon is rendered. Clicking any cell copies the full unclipped value and triggers the green `Copied` check badge alongside a `"Copied to Clipboard"` toast.
- **Proceed to Dashboard Gate:**
  - Disabled until domain DNS verification is confirmed (`createdDomain?.status === "VERIFIED"`).
  - Accessible wrapper pattern: Button has native `disabled`, `opacity-40`, and `pointer-events-none`.
  - Hover behaviour: Ban pointer (`cursor-not-allowed`) and native `title` hover tooltips are suppressed; wrapper displays a natural `cursor-pointer`.
  - Feedback on Attempted Click: Clicking or pressing Enter/Space while unverified displays a lightweight warning toast:
    - **Title:** `Confirm your domain`
    - **Message:** `Please verify your domain's DNS records before proceeding to the dashboard.`
    - **Type:** `warning` (subtle amber alert matching the design system).

### 8.2 Settings & Diagnostics (`/settings`)

- **Container:** Centered canvas `max-w-5xl mx-auto w-full space-y-6`.
- **Header:** Title in `text-xl sm:text-2xl font-semibold text-kumo-strong tracking-tight`, description in `text-xs sm:text-sm text-kumo-subtle`, and top tab switcher (`Settings & System Diagnostics` vs `Team & Roles`).
- **Overview Tab:**
  - **Account Security:** Password change form with current, new, and confirm inputs, reveal password eye toggles, and security checklist banner.
  - **Operator Identity Info:** Circular Facehash avatar (`w-10 h-10`), username, full name, email, and role.
  - **System Version & Updates:** Dynamic current version indicator, latest release check, and manual "Check for Updates" trigger. When an update is available, displays an orange `Update Available` status badge.
  - **Infrastructure Diagnostics:** 6 equal-height diagnostic cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5`) detailing Inbound Port 25, Submission Port 587, Database Engine, Redis Cluster, SSL/TLS Cipher, and DKIM Key Length.
  - **SMTP & API Endpoints:** Copyable endpoint callout rows for REST API Base, Inbound MX Endpoint, Outbound SMTP Relay, and Return-Path Domain.
  - **Appearance & Theme:** Three segmented theme selectors (`Dark`, `Light`, `System`).
- **Team & Roles Tab:**
  - **Role Guide Cards:** 3 equal-height guide cards (`Admin`, `Member`, `Viewer`) detailing permissions.
  - **Team Roster Table:** Directory displaying avatar, name, username, role badge, registration date, and actions (`Role` modifier modal, `Reset` credentials modal, `Delete` user modal).

### 8.3 Emails Telemetry View (`/emails`)

- **Header Toolbar:** Page title (`Processed Emails`), subtitle description, refresh button, and primary "Send Email" action button (`btn-cf-primary`).
- **Filter Bar:**
  - Search input with clear button.
  - Status filter dropdown (`All`, `Delivered`, `Queued`, `Bounced`, `Failed`).
  - Sending Domain filter dropdown.
- **Data Table:**
  - Columns: `Status` (StatusBadge with dot), `Recipient`, `Subject`, `Domain`, `Dispatched` (relative timestamp), and actions menu.
  - Interactive row click or actions modal displaying message details, headers, delivery attempts, and delivery logs.
  - Pagination footer bar with `PAGE_SIZE = 10`.

### 8.4 Inbound Mailboxes View (`/inbox`)

- **Directory Page (`/inbox`):**
  - Header with mailbox count, search input, refresh button, and "+ Create Mailbox" primary action button.
  - Table of active mailboxes: `Address` (`support@domain.com`), `Domain`, `Messages` count, `Unread` badge (`bg-cf-blue text-white rounded-full`), and delete action.
- **Mailbox Thread View (`/inbox/[mailboxId]`):**
  - List of received messages for the active mailbox. Unread messages feature bold text and blue dot indicator.
- **Message Detail View (`/inbox/[mailboxId]/[id]`):**
  - Sender header, recipient address, timestamp, raw headers inspection modal (`RawHeadersModal`), and sanitized HTML email body renderer (`EmailHtmlRenderer`).

### 8.5 Domains Management View (`/domains`)

- **Header Toolbar:** Page title (`Domains`), count badge, search filter, refresh button, and "+ Add Domain" button (`btn-cf-primary`).
- **Domains Table:**
  - Columns: `Domain Name` (with star shortcut), `Status` (`VERIFIED` green StatusBadge vs `PENDING` amber StatusBadge), `Outbound IP`, `DKIM Selector`, and 3-dots action menu (`Verify DNS Records`, `View Records`, `Delete Domain`).
- **Domain Details View (`/domains/[id]`):**
  - Full cryptographic records inspection: 2048-bit DKIM public key, Return-Path SPF, Master SPF, DMARC, A record, and MX record with click-to-copy and instant DNS propagation check button.

### 8.6 API Keys & Developer Tokens (`/api-keys`)

- **Header Toolbar:** Page title (`API Keys`), security description, refresh button, and "+ Create API Key" action button.
- **Security Callout:** Blue banner reminding operators that API keys carry dispatch privileges.
- **Keys Table:**
  - Columns: `Name`, `Key Prefix` (`em_live_...` in font-mono), `Scopes` (`Full Access`, `Send Only`, `Read Only`), `Created`, `Last Used`, and actions (`Delete`).
- **Creation Dialog:** Modal to name the key, assign granular permission scopes, set expiration, and copy the secret token once upon creation.

### 8.7 Webhooks & Event Subscriptions (`/webhooks`)

- **Header Toolbar:** Page title (`Webhooks`), `Live` pulse badge, refresh button, and "+ Add Webhook" button.
- **Endpoints Table:**
  - Columns: `Endpoint URL`, `Subscribed Events` (e.g. `email.delivered`, `email.bounced`), `Signing Secret` (with reveal/hide eye toggle), `Status`, and actions (`Test Webhook`, `Delete`).
- **Recent Deliveries Feed:**
  - Real-time HTTP delivery logs: Status code pill (`200 OK`, `500 Internal Error`), event type, latency, attempt timestamp, and "View Payload" modal.

### 8.8 30-Day Analytics Engine (`/analytics`)

- **Header Toolbar:** Page title (`Analytics & Telemetry`), 30-day timeframe badge, and refresh button.
- **Metric Cards Grid:** `Dispatched Emails`, `Delivery Rate`, `Hard Bounces`, `Soft Bounces`, `Spam Complaints`, `Open Rate`, and `Click Rate`.
- **Interactive Charts:**
  - Dispatch timeseries area chart with `chartBlueGrad` (`min-h-60`).
  - Inbound volume chart with `chartOrangeGrad` (`min-h-60`).
  - Bounce & complaint attribution breakdown bar charts.

---

## 9. Responsive Behavior Matrix

| Viewport | Breakpoint | Sidebar Behavior | Header Behavior | Grid Layouts |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile** | `< 640px` | Slide-over drawer (`w-72`) triggered by mobile menu | Compact header (`h-12`) with brand mark and search | Quick access: 1-col; KPI cards: 1-col; Charts: 1-col |
| **Tablet** | `640px – 1023px` | Slide-over drawer (`w-72`) triggered by mobile menu | Compact header (`h-12`) with brand mark and search | Quick access: 1-col; KPI cards: 2-col; Charts: 1-col |
| **Desktop** | `1024px – 1279px` | Persistent sidebar (`w-64` / `w-16` collapsed) | No top header; full vertical canvas | Quick access: 3-col; KPI cards: 4-col; Charts: 2-col |
| **Large Desktop**| `≥ 1280px` | Persistent sidebar (`w-64` / `w-16` collapsed) | No top header; centered `max-w-7xl` container | Quick access: 3-col; KPI cards: 4-col; Charts: 2-col |

---

## 10. Implementation Verification Checklist

- [ ] Both `data-mode="dark"` and `data-mode="light"` function automatically via CSS custom properties without `dark:` classes.
- [ ] No arbitrary pixel typography (e.g. `text-[13px]`) or custom font utilities (e.g. `text-2xs`) exist in documentation.
- [ ] All typography strictly adheres to the standard linear Tailwind scale (`text-xs` through `text-3xl`).
- [ ] Desktop layout has no top header bar; sidebar is full-height and main content scrolls independently.
- [ ] Sidebar includes exactly 7 primary routes (`Home`, `Email`, `Inbox`, `Analytics`, `Domains`, `API Keys`, `Webhooks`).
- [ ] Bottom sidebar section follows exact order: `Settings`, conditional hairline divider, conditional `Update Available` button, transparent `Account` row, and centered `Version v0.30.8` string.
- [ ] `Update Available` button and its preceding divider are conditionally displayed only when `isUpdateAvailable === true`.
- [ ] Account row has no card container, border, or background; Facehash avatar is circular (`w-8 h-8 rounded-full`).
- [ ] Primary buttons use `btn-cf-primary` (Cloudflare Action Blue) and `btn-cf-secondary` (neutral elevated) with linear `text-sm` sizing.
- [ ] Root container preserves `className="isolate"` for proper portal stacking.
- [ ] Onboarding DNS records table features clean record types (`TXT`, `A Record`, `MX (Priority 10)`) with no hover copy icon and no bracket noise on TXT rows.
- [ ] Onboarding "Proceed to Dashboard" button disabled state shows standard cursor (no ban pointer), suppresses native hover tooltips, and emits lightweight warning toast on attempted click.
- [ ] Settings diagnostics and team roster contain no obsolete badges (`Custom Password Active`, `Up to Date`, `RBAC Active`, capability badges).
