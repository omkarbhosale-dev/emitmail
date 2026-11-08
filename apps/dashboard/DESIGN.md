# EmitMail Dashboard — Design System & UI Architecture (`DESIGN.md`)

## 1. Design Philosophy & Visual Reference
The EmitMail Dashboard is built on **Cloudflare's Kumo Design System** (`@cloudflare/kumo`) and directly mirrors the **Cloudflare Dashboard ("Account Home" v2)** aesthetic in both Dark and Light modes.

Key visual signatures:
- **Ultra-Clean Contrast:** Pitch-black canvas (`#050505`) with subtle dark-charcoal cards (`#0C0C0C`) in Dark Mode; crisp warm off-white canvas (`#FBFBFB`) with pure white cards (`#FFFFFF`) in Light Mode.
- **Signature Cloudflare Colors:**
  - **Cloudflare Orange Theme:** Vibrant orange (`#FF6600` / `#F6821F`) used for brand logos, onboarding banners, graphic tiles, and active sidebar icons.
  - **Cloudflare Action Blue:** High-contrast royal blue (`#0066FF` in Dark / `#0051C3` in Light) for primary action buttons (`btn-cf-primary`), unread notification badges, and active search/focus rings.
- **1px Hairline Precision:** Structural separation achieved through ultra-thin `1px` borders (`#1E1E1E` in Dark, `#E5E5E5` in Light) rather than heavy drop shadows.
- **Component Stack:** `@cloudflare/kumo` (Base UI primitives + Tailwind CSS v4) paired with `@phosphor-icons/react` and `facehash` avatars.

---

## 2. Core Golden Rules (Strict Enforcement)

1. **Use Kumo Semantic Tokens + Cloudflare Tokens:** Always use Kumo semantic utility classes (`bg-kumo-canvas`, `bg-kumo-base`, `text-kumo-default`, `border-kumo-hairline`) alongside our registered Cloudflare theme tokens (`bg-cf-orange`, `text-cf-orange`, `text-cf-blue`, `btn-cf-primary`, `btn-cf-secondary`).
2. **NEVER Use Raw Tailwind Grayscale/Blue Classes:** Avoid hardcoded classes like `bg-zinc-900` or `text-gray-500` in components so that switching `data-mode="dark"` and `data-mode="light"` works automatically without `dark:` prefixes.
3. **NEVER Use the `dark:` Variant in Markup:** Theme switching is handled entirely by CSS custom properties (`[data-mode="dark"]` / `[data-mode="light"]`).
4. **Always Use Standard Tailwind Typography Classes:** All typography must use standard Tailwind utility classes (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`). Never use arbitrary pixel classes (e.g., `text-[13px]`) or custom utilities (e.g., `text-2xs`).
5. **Always Use `cn()` for Class Composition:** Import `cn` from `@/lib/utils` or `@cloudflare/kumo` to merge conditional classes safely.
6. **Root Portal Isolation:** Kumo floating elements (Dialogs, Popovers, Select menus, Dropdowns, Command Palettes) portal to `document.body`. The application root container (`#root` or `<main>`) **must** have `className="isolate"` (`isolation: isolate`).
7. **Application Implementation is the Source of Truth:** Documentation describes the implemented reality of the application. Never invent fictional or unapproved patterns.

---

## 3. Complete Cloudflare Color Palette & Token Reference

### 3.1 Cloudflare Brand & Action Palette

| Token Name | CSS Variable | Tailwind Utility | Light Mode Hex | Dark Mode Hex | UI Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloudflare Action Blue** | `--color-cf-blue` | `text-cf-blue` / `bg-cf-blue` | `#0051C3` | `#0066FF` | Primary button fill (`btn-cf-primary`), inbox unread badge, focus rings |
| **Cloudflare Blue Hover** | `--color-cf-blue-hover` | `hover:bg-cf-blue-hover` | `#0043A6` | `#0052CC` | Hover state for primary action buttons |
| **Cloudflare Primary Orange** | `--color-cf-orange` | `bg-cf-orange` / `text-cf-orange` | `#FF6600` | `#FF6600` | Setup wizard CTAs, brand icon box, inbound chart stroke |
| **Cloudflare Classic Orange** | `--color-cf-orange-brand` | `text-cf-orange-brand` | `#F6821F` | `#F6821F` | Brand logo mark, primary brand accent |
| **Cloudflare Orange Hover** | `--color-cf-orange-hover` | `hover:bg-cf-orange-hover` | `#E65C00` | `#FF7A1A` | Hover state for orange CTA buttons |
| **Cloudflare Amber** | `--color-cf-amber` | `text-cf-amber` / `bg-cf-amber` | `#FBAD41` | `#FBBF24` | Warning badges, pending domain verification, soft alert borders |
| **Cloudflare Orange Tint** | `--color-cf-orange-tint` | `bg-cf-orange-tint` | `#FFF3EB` | `#2A1205` | Setup callout background, version update pill background |
| **Cloudflare Orange Border** | `--color-cf-orange-border` | `border-cf-orange-border` | `#FFD4B8` | `#5C280B` | Border for orange-tinted callouts and banners |
| **Analytics Chart Blue** | `--color-cf-chart-blue` | `text-cf-chart-blue` | `#0051C3` | `#3B82F6` | Outbound dispatched timeseries line & area gradient |
| **Success Emerald** | `--color-cf-success` | `text-cf-success` / `bg-cf-success` | `#059669` | `#34D399` | 250 OK delivery rate, active status dots, verified domain badges |

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
| **`success`** | `bg-emerald-500/10` | `text-emerald-600` / `dark:text-emerald-400` | `border-emerald-500/25` | `Delivered`, `Verified`, `Connected`, `250 OK` |
| **`warning`** | `bg-amber-500/10` | `text-amber-600` / `dark:text-amber-400` | `border-amber-500/25` | `Pending`, `Suppressed`, `Retrying` |
| **`danger`** | `bg-rose-500/10` | `text-rose-600` / `dark:text-rose-400` | `border-rose-500/25` | `Bounced`, `Failed`, `Offline`, `Revoked` |
| **`info`** | `bg-blue-500/10` | `text-blue-600` / `dark:text-blue-400` | `border-blue-500/25` | `Queued`, `Sending` (with animated pulse dot) |
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
```

---

## 5. Application Shell & Layout Blueprints

### 5.1 Application Shell Architecture (`AppShell.tsx`)

The dashboard features a modern, headerless desktop layout paired with a dedicated mobile header and drawer:

- **Desktop Shell (`hidden lg:flex`):**
  - **No Global Desktop Header:** The top header bar is deliberately omitted on desktop to maximize vertical canvas space and mirror Cloudflare Account Home v2.
  - **Full-Height Sidebar:** Persistent fixed left sidebar running the entire height of the viewport (`h-full lg:flex`).
  - **Scrollable Main Canvas:** Independent scrollable viewport (`flex-1 min-w-0 overflow-y-auto bg-kumo-canvas`).
  - **Centered Content Container:** All views are centered within `w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col`.
- **Mobile Shell (`lg:hidden`):**
  - **Mobile Header (`h-12 border-b border-kumo-hairline bg-kumo-canvas px-4 flex items-center justify-between`):**
    - Left: Hamburger drawer trigger (`List` icon, 20px).
    - Center: Brand mark with `PaperPlaneTilt` icon in orange box + `emitmail` logo.
    - Right: Quick search shortcut button opening the command palette.
  - **Mobile Slide-Over Drawer:**
    - Backdrop: `fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity`.
    - Sliding Panel: `fixed inset-y-0 left-0 z-50 w-72 bg-kumo-canvas border-r border-kumo-hairline p-4`.

### 5.2 Navigation Sidebar (`Sidebar.tsx`)

- **Dimensions:**
  - Expanded Desktop: `w-64` (`256px`).
  - Collapsed Desktop: `w-16` (`64px`).
  - Mobile Drawer: `w-72` (`288px`).
- **Sidebar Collapse / Expand Edge Toggle:**
  - Positioned on the desktop sidebar right edge:
    - Expanded: `absolute top-3.5 right-2.5 z-30 p-1.5 rounded-md text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-elevated`.
    - Collapsed: `absolute top-3.5 -right-3.5 z-30 w-7 h-7 rounded-md bg-kumo-base border border-kumo-line shadow-xs text-kumo-subtle hover:text-kumo-strong hover:bg-kumo-elevated`.
  - Icon: `PanelLeftClose` (18px) when expanded, `PanelLeftOpen` (16px) when collapsed.
- **Top Brand Section (`mb-7`):**
  - Brand Link: `flex items-center gap-2.5 group cursor-pointer`.
  - Brand Mark: `w-8 h-8 rounded-lg bg-cf-orange flex items-center justify-center text-white shrink-0 shadow-xs` with `PaperPlaneTilt` (18px, weight fill).
  - Wordmark: `font-logo font-extrabold tracking-tight text-xl text-cf-orange leading-none truncate` (`emitmail`).
- **Workspace Actions (`mb-7`):**
  1. **Domain Selector Dropdown (`mb-3.5`):**
     - Button: `w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-kumo-control hover:bg-kumo-elevated border border-kumo-line text-xs font-medium text-kumo-strong shadow-2xs`.
     - Left indicator: `w-5 h-5 rounded-md bg-cf-orange/15 text-cf-orange font-bold text-xs flex items-center justify-center shrink-0` showing the uppercase initial of the active domain or `Plus` icon.
     - Center text: Truncated active domain name (e.g. `omkarbhosale.dev`).
     - Right icon: `CaretUpDown` (14px).
     - Dropdown menu: `rounded-xl bg-kumo-base border border-kumo-hairline shadow-xl py-1 text-xs z-40` with verified checkmark and "+ Manage all domains" link to `/domains`.
  2. **Quick Search Button:**
     - Button: `w-full bg-kumo-control hover:bg-kumo-elevated border border-kumo-line rounded-lg px-2.5 py-2 text-xs text-kumo-subtle flex items-center justify-between hover:border-cf-orange transition-colors group shadow-2xs`.
     - Left: `MagnifyingGlass` (15px) + `"Quick search..."`.
     - Right: `<kbd className="px-1.5 py-0.5 text-xs font-mono text-kumo-muted bg-kumo-recessed border border-kumo-hairline rounded">Ctrl K</kbd>`.
- **Primary Navigation Map (7 Routes, `space-y-2`):**
  1. **Home** (`/`, `House`) — Central command hub, onboarding, and 30-day analytics.
  2. **Email** (`/emails`, `EnvelopeSimple`) — Processed outbox telemetry, delivery rates, and send test email.
  3. **Inbox** (`/inbox`, `Tray`) — Real-time inbound mailboxes with blue unread badge (`bg-[#0066FF] text-white text-xs font-bold min-w-5 h-5 rounded-full`).
  4. **Analytics** (`/analytics`, `ChartLineUp`) — 30-day volume breakdown, bounce rates, and deliverability trends.
  5. **Domains** (`/domains`, `Globe`) — Domain verification, DKIM, SPF, and DMARC status.
  6. **API Keys** (`/api-keys`, `Key`) — REST API credentials and SDK bearer tokens.
  7. **Webhooks** (`/webhooks`, `PlugsConnected`) — Real-time event webhooks with `Live` badge (`bg-cf-orange-tint text-cf-orange border border-cf-orange-border/40 text-xs font-semibold px-1.5 py-0.5 rounded-full`).
- **Navigation Item States:**
  - **Active:** `bg-[var(--cf-sidebar-active)] text-kumo-strong font-medium shadow-2xs rounded-lg px-3 py-2 text-sm flex items-center justify-between` with `text-cf-orange` filled icon.
  - **Default:** `text-kumo-default hover:bg-kumo-tint hover:text-kumo-strong rounded-lg px-3 py-2 text-sm flex items-center justify-between transition-colors`.
- **Flexible Spacer:** `flex-1 min-h-6` pushing bottom section to the base.
- **Bottom Section (`space-y-2 pt-2`):**
  1. **Settings Navigation Link:** `Settings` (`/settings`, `Gear` icon).
  2. **Hairline Separator:** Thin horizontal divider (`border-t border-kumo-hairline my-1 mx-0.5`), displayed **only** when an update is available (`isUpdateAvailable === true`).
  3. **Prominent "Update Available" Button:**
     - Conditionally displayed **only** when `isUpdateAvailable === true`.
     - Container: `w-full relative flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-kumo-base hover:bg-kumo-elevated border border-kumo-hairline hover:border-kumo-line transition-all shadow-2xs`.
     - Content: `DownloadIcon` (16px) + `"Update Available"` in `text-sm font-semibold text-kumo-strong`.
     - Subtle Status Indicator: Vertically centered on the right (`absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-2.5 h-2.5 rounded-full bg-cf-success/15 ring-1 ring-cf-success/25`), with a `w-1.5 h-1.5 rounded-full bg-emerald-600` dark-green center core.
     - Action: Opens the Upgrade & Version Manager modal.
  4. **Transparent Account Row:**
     - Container: Completely borderless, backgroundless transparent horizontal row (`w-full flex items-center justify-between px-1.5 py-1.5 rounded-lg hover:bg-kumo-tint/60 transition-colors text-left select-none`).
     - Avatar: Circular Facehash avatar (32px, `rounded-full overflow-hidden`).
     - Identity: Label `"Account"` in `text-sm font-semibold text-kumo-strong leading-tight`, user email in `text-xs text-kumo-muted truncate mt-0.5`.
     - Right: `CaretUpDown` (16px) icon in `text-kumo-muted`.
     - Upward Popover Menu: Anchored upward (`bottom-full left-0 mb-2 w-full rounded-xl bg-kumo-base border border-kumo-hairline shadow-xl py-1 text-xs z-50`):
       - Header: Facehash (32px), user full name, role badge (`ADMIN`, `MEMBER`, `VIEW ONLY`), and email.
       - Nav Link: Workspace Settings (`/settings`).
       - Theme Toggle: Interactive button toggling dark/light mode with `Sun`/`Moon` icons.
       - Log Out: `text-red-500 hover:bg-red-500/10` action button.
  5. **Current Version Indicator:** Centered subtle version string at the very bottom: `Version v0.30.8` (`text-center text-xs text-kumo-subtle select-none pt-2 pb-0.5 font-normal tracking-wide`).

### 5.3 Hero Command Section (`HomeView.tsx`)

- **Top Floating Status / Update Pill:**
  - Conditionally rendered when an update is available: `inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cf-orange-tint border border-cf-orange-border text-xs font-medium text-cf-orange hover:bg-cf-orange hover:text-white transition-all shadow-2xs`.
  - Animated pulsing indicator dot: `animate-ping bg-cf-orange`.
  - Text: `EmitMail v0.30.8 is available — View upgrade notes` with `ArrowSquareOut` icon.
- **Hero Greeting:**
  - Centered: `text-2xl sm:text-3xl font-semibold tracking-tight text-kumo-strong mt-3 mb-4` (`"Welcome to EmitMail"`).
- **Centered Global Command Search Bar:**
  - Dimensions: `max-w-xl mx-auto w-full bg-kumo-control/60 hover:bg-kumo-control/90 border border-kumo-hairline hover:border-kumo-line focus-within:border-cf-blue/70 rounded-full px-4 py-2 sm:py-2.5 flex items-center justify-between transition-all shadow-2xs`.
  - Left: `MagnifyingGlass` (16px) + `"Search messages, domains, or API keys..."` in `text-xs text-kumo-subtle`.
  - Right: Keycap badges `<kbd className="px-1.5 py-0.5 text-xs font-mono bg-kumo-elevated border border-kumo-hairline rounded text-kumo-subtle">Ctrl</kbd> <kbd>K</kbd>`.
- **Onboarding Callout Banner:**
  - Displayed if the mail server or domains are unconfigured: `max-w-4xl mx-auto w-full mt-5 rounded-xl border border-cf-orange/30 bg-cf-orange-tint/80 p-4 sm:p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left shadow-2xs`.
  - Left: Orange globe icon container (`w-9 h-9 rounded-lg bg-cf-orange/15 text-cf-orange`) + Heading `"Action Required: Complete Mail Server & Domain Setup"` + description.
  - Right: Primary CTA button (`bg-cf-orange hover:bg-cf-orange-hover text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs`) linking to `/onboarding`.

### 5.4 Three-Column Quick Access Grid (`grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5`)

- **Column 1 (`Domains`):**
  - Header: `"DOMAINS"` uppercase tracking label with top-right `"View all >"` link.
  - List: Up to 3 configured domains showing globe icon, domain name, and verified/pending status pill (`bg-cf-success/10 text-cf-success` or `bg-cf-amber/10 text-cf-amber`).
  - Action: Bottom `+ Add Domain` button (`bg-kumo-elevated hover:bg-kumo-interact border border-kumo-hairline rounded-lg py-1.5 text-xs font-medium text-kumo-default`).
- **Column 2 (`Quick Actions`):**
  - Header: `"QUICK ACTIONS"` uppercase tracking label.
  - Items: List of 3 fast-access actions (`Inbox`, `Emails`, `API Keys`) with `w-7 h-7 rounded-md bg-cf-blue/10 text-cf-blue` icons, titles, subtitles, and chevron right icons.
- **Column 3 (`Recents`):**
  - Header: `"RECENTS"` uppercase tracking label + `"Activity"`.
  - Feed: Live activity feed across inbox messages, dispatched emails, verified domains, and API keys with relative monospace timestamps (`formatRelativeTime`, e.g., `Just now`, `5m ago`, `2h ago`).

### 5.5 Analytics KPI Summary Cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4`)

Four telemetry summary cards displayed above the timeseries charts:
1. **Emails Sent:**
   - Label: `text-xs sm:text-sm font-medium text-kumo-subtle` + `DotsThree` menu icon.
   - Metric: `text-2xl sm:text-3xl font-semibold tracking-tight text-kumo-strong font-mono leading-none` (e.g., `4,330`) + `↗ Active` in `text-xs font-medium text-cf-success`.
   - Subtext: `text-xs text-kumo-subtle font-normal mt-1` (e.g., `4,321 delivered`).
2. **Delivery Rate:**
   - Metric: `text-2xl sm:text-3xl font-semibold tracking-tight text-kumo-strong font-mono leading-none` (e.g., `99.8%` or `—`) + `250 OK` badge.
   - Presentation Rule: Displays `—` and `"No data yet"` when total volume is 0.
   - Subtext: `4,321 of 4,330 delivered` (or `"Requires at least 1 dispatch"`).
3. **Bounce Rate:**
   - Metric: `text-2xl sm:text-3xl font-semibold tracking-tight text-kumo-strong font-mono leading-none` (e.g., `0.2%` or `—`) + amber bounce count badge.
   - Subtext: `Hard bounces: 9` (or `"No bounces recorded"`).
4. **Service Status:**
   - Infrastructure health list for `Database`, `Redis`, and `Worker`.
   - Each item shows a `w-1.5 h-1.5 rounded-full` indicator dot (green `bg-cf-success` when connected/running, red `bg-kumo-danger` when offline/stopped) and monospace status label (`Connected`, `Running`, `Offline`).

### 5.6 Interactive Timeseries Charts (`grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5`)

Two interactive SVG timeseries chart cards with real data, animated line strokes, and hover tooltips:
- **Card Container:** `bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-4.5 flex flex-col justify-between min-h-[240px] relative overflow-hidden group hover:border-kumo-line/80 transition-colors`.
- **Chart 1 (Total emails dispatched):**
  - Header: `"Total emails dispatched"` + `"30-day view"`.
  - Metric: Large count in `text-2xl sm:text-3xl font-semibold text-kumo-strong font-mono leading-none` + `↗ Live` badge.
  - Stroke & Gradient: Action Blue line (`var(--cf-chart-blue)`), gradient fill (`chartBlueGrad`).
- **Chart 2 (Inbound email volume):**
  - Header: `"Inbound email volume"` + `Tray` orange icon + `"30-day view"`.
  - Metric: Large count in `text-2xl sm:text-3xl font-semibold text-kumo-strong font-mono leading-none` + `↗ Receiving` / unread badge.
  - Stroke & Gradient: Cloudflare Orange line (`var(--cf-orange)`), gradient fill (`chartOrangeGrad`).
- **Interaction:**
  - Invisible hover hitbox columns over SVG coordinates.
  - Active hover point: animated pulse indicator dot.
  - Boundary-aware floating tooltip card showing exact value and date label.

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

| Tailwind Class | Linear Font Size | Line Height | Typical Application |
| :--- | :--- | :--- | :--- |
| `text-xs` | `0.75rem` (`12px`) | `1rem` (`16px`) | Badges, metadata, table headers, kbd shortcuts, axis labels, version |
| `text-sm` | `0.875rem` (`14px`) | `1.25rem` (`20px`) | Navigation links, table cells, form inputs, button labels, card subtitles |
| `text-base` | `1rem` (`16px`) | `1.5rem` (`24px`) | Section headers, body prose, large button labels |
| `text-lg` | `1.125rem` (`18px`) | `1.75rem` (`28px`) | Modal headers (mobile), promo callouts |
| `text-xl` | `1.25rem` (`20px`) | `1.75rem` (`28px`) | Page titles (`h1`), brand logo text, dialog titles |
| `text-2xl` | `1.5rem` (`24px`) | `2rem` (`32px`) | Prominent dashboard KPI numbers, setup wizard headings |
| `text-3xl` | `1.875rem` (`30px`) | `2.25rem` (`36px`) | Hero greeting headers (`"Welcome to EmitMail"`) |

---

## 7. Component Systems & Interaction Standards

### 7.1 Buttons & Action Controls

- **Cloudflare Action Blue Button (`btn-cf-primary`):**
  - Class: `btn-cf-primary` (`bg-[#0066FF] hover:bg-[#0052CC]` in Dark / `bg-[#0051C3] hover:bg-[#0043A6]` in Light).
  - Geometry: `rounded-md font-medium text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 text-white shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer select-none`.
  - Usage: Primary page actions (`Send Email`, `Create API key`, `Verify Domain`).
- **Cloudflare Secondary Elevated Button (`btn-cf-secondary`):**
  - Class: `btn-cf-secondary` (`bg-[#141414] hover:bg-[#1E1E22] border border-[#2B2B2B]` in Dark / `bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-[#D4D4D8]` in Light).
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
  - Container: `bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-4.5 sm:p-5 shadow-2xs hover:border-kumo-line/80 transition-colors`.
  - Hierarchy: Header label in `text-xs sm:text-sm font-medium text-kumo-subtle`, metric in `text-2xl sm:text-3xl font-semibold text-kumo-strong font-mono leading-none`, footer subtext in `text-xs text-kumo-subtle font-normal mt-1`.
- **Interactive Quick-Action Card:**
  - Container: `bg-kumo-base border border-kumo-hairline rounded-xl p-4 sm:p-4.5 flex flex-col justify-between hover:border-kumo-line/80 transition-colors`.
- **Callout / Security Banner:**
  - Container: `p-4 rounded-xl bg-kumo-base border border-kumo-hairline flex items-start gap-3.5 shadow-2xs`.
  - Left icon: `p-2 rounded-lg bg-cf-blue/10 text-cf-blue shrink-0 mt-0.5` with `ShieldCheck` (20px, weight fill).
  - Content: Title in `text-sm sm:text-base font-medium text-kumo-strong`, body copy in `text-xs sm:text-sm text-kumo-subtle leading-relaxed`.

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
  - Dropdown Caret: `CaretDown` (12px) absolute right (`right-2.5 top-1/2 -translate-y-1/2 text-kumo-muted pointer-events-none`).
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
- **Command Palette:** Centered floating modal with instant search input (`h-12 border-b border-kumo-hairline px-4 text-sm`), category list headers (`text-xs text-kumo-subtle uppercase px-3 py-1.5`), and keyboard navigation.

---

## 8. Onboarding Wizard & Settings Page Standards

### 8.1 Setup Wizard (`/onboarding`)

- **Card Container:** Centered `max-w-3xl w-full bg-kumo-base border border-kumo-line rounded-2xl shadow-xl overflow-hidden` in `min-h-screen bg-kumo-canvas`.
- **Progress Stepper:** Header indicator with numbered badges (`w-6 h-6 rounded-full text-xs font-semibold`), orange active state (`bg-cf-orange text-white`), and green completion checkmarks (`bg-cf-success/20 text-cf-success`).
- **3-Column DNS Records Table with Click-to-Copy:**
  - Layout: `table-fixed w-full` summing to 100%:
    - `Type`: `20%` neutral label (`text-xs sm:text-sm font-mono font-medium text-kumo-strong truncate`).
    - `Host / Name`: `26%` exact hostname (`text-xs sm:text-sm font-mono font-medium text-kumo-strong truncate`).
    - `Value / Content`: `54%` full monospace DNS record (`text-xs sm:text-sm font-mono text-kumo-default truncate`).
  - Interaction: Every cell is interactive (`cursor-pointer hover:bg-kumo-control/50`). Clicking copies complete unclipped value and triggers green `Copied` badge (`text-xs font-semibold bg-cf-success/10 text-cf-success`).

### 8.2 Settings Page (`/settings`)

- **Container:** Centered canvas `max-w-5xl mx-auto w-full space-y-6`.
- **Header:** Title in `text-xl sm:text-2xl font-semibold text-kumo-strong tracking-tight`, description in `text-xs sm:text-sm text-kumo-subtle`, and tab switcher in `p-1 bg-kumo-elevated rounded-xl border border-kumo-hairline`.
- **Cards:** `bg-kumo-base border border-kumo-hairline rounded-xl p-5 sm:p-6 space-y-5 shadow-2xs`.
- **Diagnostics Grid:** 6-tile grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5`) with equal-height tiles (`p-4 rounded-xl bg-kumo-recessed border border-kumo-hairline`).

### 8.3 Team & Roles Directory

- **Role Cards (Admin, Member, Viewer):** 3-column equal-height grid (`grid-cols-1 md:grid-cols-3 gap-3.5`), title in `text-sm sm:text-base font-semibold font-mono`.
- **Member Rows:** `divide-y divide-kumo-hairline`, Facehash avatar (40px), role badge, status dot, and action buttons (`Role` toggle, `Reset` credentials, `Trash`).

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
- [ ] Desktop layout has no top header bar; sidebar is full-height and main content scrolls independently.
- [ ] Sidebar includes exactly 7 primary routes (`Home`, `Email`, `Inbox`, `Analytics`, `Domains`, `API Keys`, `Webhooks`).
- [ ] Bottom sidebar section follows exact order: `Settings`, conditional hairline divider, conditional `Update Available` button, transparent `Account` row, and centered `Version v0.30.8` string.
- [ ] `Update Available` button and its preceding divider are conditionally displayed only when `isUpdateAvailable === true`.
- [ ] Account row has no card container, border, or background; Facehash avatar is circular (32px).
- [ ] Primary buttons use `btn-cf-primary` (Cloudflare Action Blue) and `btn-cf-secondary` (neutral elevated).
- [ ] Root container preserves `className="isolate"` for proper portal stacking.
