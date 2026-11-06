# EmitMail Dashboard — Design System & UI Architecture (`DESIGN.md`)

## 1. Design Philosophy & Visual Reference
The EmitMail Dashboard is built on **Cloudflare's Kumo Design System** (`@cloudflare/kumo`) and directly mirrors the **Cloudflare Dashboard ("Account Home" v2)** aesthetic in both Dark and Light modes.

Key visual signatures from the Cloudflare UI:
- **Ultra-Clean Contrast:** Pitch-black canvas (`#050505`) with subtle dark-charcoal cards (`#0C0C0C`) in Dark Mode; crisp warm off-white canvas (`#FBFBFB`) with pure white cards (`#FFFFFF`) in Light Mode.
- **Signature Cloudflare Orange Theme:** Vibrant orange (`#FF6600` / `#F6821F`) used for brand logos, primary callout CTAs, featured graphic tiles, and active focus accents.
- **1px Hairline Precision:** Structural separation achieved through ultra-thin `1px` borders (`#1E1E1E` in Dark, `#E5E5E5` in Light) rather than heavy drop shadows.
- **Double-Ring Featured Banners:** Major callout cards feature an inner card border surrounded by a subtle outer 4px offset ring (`rounded-2xl`).
- **Component Library:** `@cloudflare/kumo` (Base UI primitives + Tailwind CSS v4) paired with `@phosphor-icons/react`.

---

## 2. Core Golden Rules (Strict Enforcement)

1. **Use Kumo Semantic Tokens + Cloudflare Orange Tokens:** Always use Kumo semantic utility classes (`bg-kumo-canvas`, `bg-kumo-base`, `text-kumo-default`, `border-kumo-hairline`) alongside our registered Cloudflare Orange theme tokens (`bg-cf-orange`, `text-cf-orange`, `border-cf-orange`).
2. **NEVER Use Raw Tailwind Grayscale/Blue Classes:** Avoid hardcoded classes like `bg-zinc-900` or `text-gray-500` in components so that switching `data-mode="dark"` and `data-mode="light"` works automatically without `dark:` prefixes.
3. **NEVER Use the `dark:` Variant:** Theme switching is handled entirely by CSS custom properties (`light-dark()` / `[data-mode="dark"]`).
4. **Always Use `cn()` for Class Composition:** Import `cn` from `@cloudflare/kumo` to merge conditional classes safely.
5. **Root Portal Isolation:** Kumo floating elements (Dialogs, Popovers, Select menus, Dropdowns, Command Palettes) portal to `document.body`. The application root container (`#root` or `<main>`) **must** have `className="isolate"` (`isolation: isolate`).
6. **`<Text>` Component Constraint:** Kumo's `<Text>` component enforces strict typographic scales and **does not accept a `className` prop**. Wrap `<Text>` inside a `<span>` or `<div>` when layout or positioning classes are needed.

---

## 3. Complete Cloudflare Color Palette & Token Reference

### 3.1 Cloudflare Orange & Brand Accent Palette
Used for the EmitMail brand logo, primary feature CTAs (e.g., *"Send Test Email"*, *"Verify Domain"*), promotional/onboarding banners, and active indicators:

| Token Name | CSS Variable | Tailwind Utility | Light Mode Hex | Dark Mode Hex | UI Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloudflare Primary Orange** | `--color-cf-orange` | `bg-cf-orange` / `text-cf-orange` | `#FF6600` | `#FF6600` | Primary orange CTA buttons (`Learn more` style), graphic tile fills |
| **Cloudflare Classic Orange** | `--color-cf-orange-brand` | `text-cf-orange-brand` | `#F6821F` | `#F6821F` | Top-left Brand Mark / Cloud Logo, primary brand icon |
| **Cloudflare Orange Hover** | `--color-cf-orange-hover` | `hover:bg-cf-orange-hover` | `#E65C00` | `#FF7A1A` | Hover state for primary orange buttons |
| **Cloudflare Amber / Light** | `--color-cf-amber` | `text-cf-amber` / `bg-cf-amber` | `#FBAD41` | `#FBBF24` | Secondary logo cloud accent, rate-limit / retry warnings |
| **Cloudflare Orange Tint** | `--color-cf-orange-tint` | `bg-cf-orange-tint` | `#FFF3EB` | `#2A1205` | Subtle orange badge backgrounds, active onboarding highlights |
| **Cloudflare Orange Border** | `--color-cf-orange-border` | `border-cf-orange-border` | `#FFD4B8` | `#5C280B` | Border for orange-tinted callouts and banners |
| **Analytics Chart Blue** | `--color-cf-chart-blue` | `text-cf-chart-blue` | `#0051C3` | `#3B82F6` | Timeseries chart line & area fill (e.g., Total Requests / Emails Sent) |

### 3.2 Surface & Background Hierarchy (Exact Cloudflare Dashboard Match)

| Semantic Token | CSS Variable | Light Mode Hex | Dark Mode Hex | Cloudflare Dashboard Element |
| :--- | :--- | :--- | :--- | :--- |
| `bg-kumo-canvas` | `--color-kumo-canvas` | `#FBFBFB` | `#050505` | Main page background & Left Sidebar background |
| `bg-kumo-base` | `--color-kumo-base` | `#FFFFFF` | `#0C0C0C` | Analytics cards, Top Header bar, Banner inner card, Command search bar |
| `bg-kumo-elevated` | `--color-kumo-elevated` | `#F4F4F5` | `#141414` | Quick-action pill cards (*"Ship something new"*), Sidebar active item pill (`#1C1C1E` dark / `#EFEFEF` light) |
| `bg-kumo-recessed` | `--color-kumo-recessed` | `#F2F2F2` | `#080808` | Code blocks, DKIM/SPF raw TXT payload viewers, kbd shortcut caps (`Ctrl` `K`) |
| `bg-kumo-tint` | `--color-kumo-tint` | `#F5F5F5` | `#161616` | Hover state on list rows (`Domains / omkarbhosale.dev`), table row hover |
| `bg-kumo-control` | `--color-kumo-control` | `#FFFFFF` | `#0F0F0F` | Sidebar `"Quick search..."` input, Hero `"Search"` input, Select triggers |
| `bg-kumo-interact` | `--color-kumo-interact` | `#E4E4E7` | `#262626` | Active/pressed button states, `"New"` pill badge in sidebar |

### 3.3 Typography & Icon Hierarchy

| Semantic Token | Light Mode Hex | Dark Mode Hex | Cloudflare Dashboard Usage |
| :--- | :--- | :--- | :--- |
| `text-kumo-strong` | `#111111` | `#FFFFFF` | Hero greeting (*"Coffee and code?"*), KPI numbers (`4.33k`), Bold breadcrumbs (`DNS / **Records**`) |
| `text-kumo-default` | `#1F1F1F` | `#E5E5E5` | Sidebar links (`Domains`, `Compute`), primary list items (`omkarbhosale.dev`) |
| `text-kumo-subtle` | `#686868` | `#8E8E93` | Sidebar section headers (`Build`, `Protect & connect`), card subtext, `Recents >` column headers |
| `text-kumo-muted` | `#9CA3AF` | `#52525B` | Right chevrons (`>`), placeholder text (`Search`), subtle ellipsis (`...`) icons |

### 3.4 Borders, Dividers & Double-Rings

| Semantic Token | Light Mode Hex | Dark Mode Hex | Cloudflare Dashboard Usage |
| :--- | :--- | :--- | :--- |
| `border-kumo-hairline` | `#E5E5E5` | `#1E1E1E` | Top bar bottom border, Sidebar right border, horizontal list dividers under `Recents` |
| `border-kumo-line` | `#D4D4D8` | `#262626` | Search input borders, `Last 24 hours` dropdown button border, pill borders |
| `ring-cf-banner-outer` | `#F0F0F0` | `#121212` | Outer double-border frame around featured callout banners |

### 3.5 Telemetry & Status Colors (Metrics & Badges)

| Status / Metric | Token / Badge Variant | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Positive Delta / Delivered** | `green` / `text-cf-success` | `#0D9488` / `#10B981` | `#34D399` | Metric growth indicator (`↗ 0.4%`), Verified DKIM/SPF badge, `250 OK` |
| **Queued / Processing** | `blue` / `bg-kumo-brand` | `#155DFC` | `#3B82F6` | BullMQ worker active state, timeseries line chart |
| **Warning / Retrying** | `orange` / `text-cf-amber` | `#D97706` | `#FBBF24` | Deferred email delivery, DNS propagation pending |
| **Bounce / Error / Failed** | `red` / `text-kumo-danger` | `#DC2626` | `#F87171` | Hard bounce (`550`), DKIM signature failure, revoked API key |

---

## 4. Global Stylesheet (`src/app/globals.css`)

```css
@import "tailwindcss";
@import "@cloudflare/kumo/styles/tailwind";

/* Scan Kumo compiled components for Tailwind v4 utilities */
@source "../node_modules/@cloudflare/kumo/dist/**/*.{js,jsx,ts,tsx}";

@theme {
  --color-cf-orange: var(--cf-orange);
  --color-cf-orange-brand: var(--cf-orange-brand);
  --color-cf-orange-hover: var(--cf-orange-hover);
  --color-cf-amber: var(--cf-amber);
  --color-cf-orange-tint: var(--cf-orange-tint);
  --color-cf-orange-border: var(--cf-orange-border);
  --color-cf-chart-blue: var(--cf-chart-blue);
  --color-cf-success: var(--cf-success);
}

:root,
[data-mode="light"] {
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

[data-mode="dark"] {
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

@layer base {
  html, body {
    @apply bg-kumo-canvas text-kumo-default antialiased selection:bg-cf-orange/20 selection:text-cf-orange;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }
}
```

---

## 5. Exact Cloudflare UI Layout & Component Blueprints

### 5.1 Top Global Header Bar (`h-12`)
- **Structure:** Full-width top bar spanning above both the sidebar and main canvas (`h-12 bg-kumo-canvas border-b border-kumo-hairline px-4 flex items-center justify-between sticky top-0 z-30`).
- **Left Cluster (Brand + Account Switcher):**
  - EmitMail Logo Icon rendered in **Cloudflare Orange** (`#F6821F` + `#FBAD41`).
  - Workspace / Account Switcher button (`Hello.omkarbhosale...` style) with `CaretUpDown` (`↕`) icon in `text-kumo-subtle`.
- **Right Cluster (Global Actions):**
  - `"Ask AI"` / `"Docs"` button with `<Sparkle />` icon (`text-xs font-medium text-kumo-default hover:text-kumo-strong`).
  - `"Support"` dropdown trigger with `<Question />` icon.
  - **Theme Toggle Button:** Square ghost button (`<Sun />` / `<Moon />`) toggling `data-mode="dark"` and `data-mode="light"`.
  - User Profile Avatar button (`<User />` icon).

### 5.2 Left Navigation Sidebar (`w-60 shrink-0`)
- **Container:** `w-60 bg-kumo-canvas border-r border-kumo-hairline flex flex-col justify-between select-none`.
- **Sidebar Quick Search:**
  - Placed at the top of the sidebar (`px-3 pt-3 pb-2`).
  - Input trigger styled with `bg-kumo-control border border-kumo-line rounded-lg px-3 py-1.5 text-xs text-kumo-subtle flex items-center justify-between` with `<MagnifyingGlass />` on the left and `Ctrl K` text on the right.
- **Navigation Items & Section Groups:**
  - **Active Item State:** Rounded pill container (`bg-[var(--cf-sidebar-active)] text-kumo-strong font-medium rounded-lg px-3 py-2`).
  - **Default Item State:** `text-kumo-default hover:bg-kumo-tint rounded-lg px-3 py-1.5 text-[13px] flex items-center justify-between group`.
  - **Section Dividers & Category Labels:** Horizontal `border-t border-kumo-hairline my-2` followed by category header (`text-[11px] font-medium text-kumo-subtle px-3 py-1.5`, e.g., `Send & Monitor`, `Infrastructure`, `Developer`).
  - **"New" Feature Pill Badge:** Compact rounded pill next to new nav items (`bg-kumo-interact text-kumo-strong text-[10px] font-medium px-1.5 py-0.5 rounded-full`).
- **EmitMail Sidebar Navigation Map:**
  - **Account home** (`<House />`)
  - **Recents** (`<ClockCounterClockwise />`)
  - **Domains** (`<Globe />`) — *e.g., omkarbhosale.dev*
  - **Observability** `New` (`<Pulse />`) — *BullMQ & Worker Telemetry*
  - *Section: Send & Route*
    - **Email Activity** (`<EnvelopeSimple />`)
    - **Queue Engine** (`<Stack />`)
    - **Templates** (`<FileCode />`)
    - **Broadcasts** (`<Megaphone />`)
  - *Section: Protect & Configure*
    - **DKIM & DNS Security** (`<ShieldCheck />`)
    - **API Keys & SMTP** (`<Key />`)
    - **Webhooks** (`<PlugsConnected />`)
    - **Suppressed List** (`<Prohibit />`)
  - *Bottom Navigation (in order):*
    1. **Update** (`<RefreshCw />` - Lucide `refresh-cw`): Triggers EmitMail Upgrade & Version Manager modal / route.
    2. **Settings** (`<Gear />`): Navigates to `/settings`.
    3. **User Profile**: Administrator account card with Facehash avatar and account popover menu.
    4. **Collapse Toggle**: Bottom collapse sidebar toggle bar (`<PanelLeftClose />` / `<PanelLeftOpen />`).

### 5.3 Hero Command Section ("Account Home" Pattern)
When landing on the main overview dashboard, replicate Cloudflare's centered command layout:
1. **Top Floating Onboarding Pill:**
   - Centered pill (`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-kumo-base border border-kumo-line text-xs font-medium text-kumo-strong shadow-2xs`)
   - Example for EmitMail: `"Configure DKIM & BullMQ workers for EmitMail"` with orange/monochrome provider icons.
2. **Hero Greeting Heading:**
   - Centered `text-3xl font-semibold tracking-tight text-kumo-strong my-5` (e.g., `"Coffee and code?"` or `"Ready to dispatch?"`).
3. **Hero Global Command Search Bar:**
   - Centered wide search bar (`max-w-3xl mx-auto w-full bg-kumo-control border border-kumo-line rounded-full px-4 py-2.5 flex items-center justify-between focus-within:border-cf-orange`).
   - Left `<MagnifyingGlass className="text-kumo-subtle" />` + `"Search messages, domains, or API keys..."`.
   - Right keyboard badge caps: `<kbd className="px-1.5 py-0.5 text-[11px] bg-kumo-recessed border border-kumo-line rounded text-kumo-subtle font-mono">Ctrl</kbd>` + `<kbd>K</kbd>`.

### 5.4 Three-Column Quick Access Grid (`Domains`, `Workers / Queues`, `Recents`)
Directly below the hero search bar (`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto w-full my-8`):
- **Column 1 (`Domains >`):** Lists verified domains (e.g., `<Globe /> omkarbhosale.dev >`) with subtle hover states.
- **Column 2 (`Workers / Queue >`):** Displays an interactive action button card (`bg-kumo-elevated hover:bg-kumo-interact border border-kumo-hairline rounded-xl p-4 flex items-center justify-center gap-2 text-xs font-medium text-kumo-default`, e.g., `<RocketLaunch /> Dispatch test email`).
- **Column 3 (`Recents`):** Vertical list divided by `border-b border-kumo-hairline` showing two-tone breadcrumb links (`text-kumo-subtle` category + `font-semibold text-kumo-strong` target):
  - `DNS /` **Records** `>`
  - `Domains /` **omkarbhosale.dev** `>`
  - `Queues /` **BullMQ Workers** `>`
  - `API Keys /` **Production** `>`

### 5.5 Double-Ring Cloudflare Orange Callout Banner
Matches the `"Meet the Agentic Internet Builders IRL"` banner from the screenshots:
- **Outer Ring Container:** `p-1.5 rounded-2xl bg-[var(--cf-banner-outer-bg)] border border-[var(--cf-banner-outer-border)]`
- **Inner Card:** `bg-kumo-base border border-kumo-hairline rounded-xl p-3 flex items-center justify-between gap-4`
- **Left Visual Tile:** `w-20 h-20 rounded-lg bg-cf-orange shrink-0 overflow-hidden relative flex items-center justify-center` (Features halftone/globe orange vector pattern).
- **Center Copy:** Bold heading (`text-sm font-semibold text-kumo-strong`) + 2-line muted description (`text-xs text-kumo-subtle`).
- **Right Action CTA:** Solid Cloudflare Orange button (`bg-cf-orange hover:bg-cf-orange-hover text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer`).

### 5.6 Analytics Section & KPI Timeseries Cards
Matches the bottom `"Analytics"` row in the screenshots:
- **Section Header Bar:**
  - Left: `text-base font-semibold text-kumo-strong` (`"Analytics"`).
  - Right Controls: Timeframe selector button (`<CalendarBlank /> Last 24 hours` inside `bg-kumo-base border border-kumo-line rounded-lg px-3 py-1.5 text-xs font-medium text-kumo-strong`), plus `<Plus />` and `<ArrowsClockwise />` icon buttons.
- **Two-Column Analytics Card Grid (`grid-cols-1 lg:grid-cols-2 gap-4`):**
  - Card Container: `bg-kumo-base border border-kumo-hairline rounded-xl p-5 flex flex-col justify-between min-h-[260px]`.
  - Top Row: Metric Title (`text-xs text-kumo-subtle`, e.g., `"Total emails dispatched"` or `"Worker invocations"`) + top-right `<DotsThree />` menu button.
  - KPI Value Row: Large number (`text-2xl font-bold text-kumo-strong tracking-tight`, e.g., `4.33k`) + inline green delta (`text-xs font-medium text-cf-success ml-2`, e.g., `↗ 0.4%`).
  - Chart Area: Right-aligned Y-axis labels (`120`, `90`, `60`) with horizontal dashed/hairline gridlines (`border-kumo-hairline`) and a crisp blue timeseries spike/line (`--cf-chart-blue`).

---

## 6. Technical Data & Typography Rules

- **Primary UI Font:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif`.
- **Monospace Font:** `JetBrains Mono`, `Fira Code`, `ui-monospace`, `monospace`.
- **Strict Monospace Rule:** All Message IDs (`msg_...`), API Key prefixes (`em_live_...`), DKIM TXT records, Webhook secrets (`whsec_...`), SMTP status codes (`250 2.0.0 OK`), and keyboard shortcuts (`Ctrl K`) must use `font-mono` and Kumo's `InlineCopyText` where copyable.

### 6.1 Standardized Dashboard Typography Scale

To ensure application-wide readability and consistent visual hierarchy, all views adhere to the following scale:

| Element Role | Target Size | Font Weight | Semantic Token | Example Context |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `22px–24px` (`text-[22px] sm:text-[24px]`) | 600 (`font-semibold`) | `text-kumo-strong` | Top page header (`h1`), tracking-tight |
| **Page Description** | `13px–14px` (`text-[13px] sm:text-[14px]`) | 400 (`font-normal`) | `text-kumo-subtle` | Subtitle under page header |
| **Section Heading** | `15px–16px` (`text-[15px] sm:text-[16px]`) | 500 (`font-medium`) | `text-kumo-strong` | Status Distribution, Domain Performance |
| **Card / KPI Title** | `14px–15px` (`text-[13px] sm:text-[14px]`) | 500 (`font-medium`) | `text-kumo-subtle` | Upper card labels |
| **Primary Metric (KPI)** | `24px–26px` (`text-[22px] sm:text-[24px]`) | 600 (`font-semibold`) | `text-kumo-strong font-mono` | Prominent metric values |
| **KPI Supporting Text** | `12px–13px` (`text-[12px] sm:text-[13px]`) | 400 (`font-normal`) | `text-kumo-subtle` | Description under KPI metric value |
| **Chart Heading** | `15px` (`text-[14px] sm:text-[15px]`) | 500 (`font-medium`) | `text-kumo-strong` | Outbound dispatches / Inbound volume |
| **Chart Axis Labels** | `11px–12px` (`text-[11px] sm:text-[12px]`) | 400 (`font-mono`) | `text-kumo-subtle` | X-axis dates & Y-axis grid numbers |
| **Table Column Headers** | `13px` (`text-[13px]`) | 500 (`font-medium`) | `text-kumo-subtle` | Data table header row (`th`) |
| **Table Primary Content** | `13px–14px` (`text-[13px] sm:text-[14px]`) | 500 (`font-medium`) | `text-kumo-strong` | Domain names, recipient emails |
| **Table Numeric / Monospace** | `13px–14px` (`text-[13px] sm:text-[14px]`) | 400–600 (`font-mono`) | `text-kumo-default` / `strong` | Sent, Delivered, Bounces, Rates |
| **Status Labels & Badges** | `11px–12px` (`text-[11px] sm:text-[12px]`) | 500 (`font-medium`) | Semantic variants | Active, Verified, Optimal, Suppressed |
| **Security Banner Heading** | `14px–15px` (`text-[14px] sm:text-[15px]`) | 500 (`font-medium`) | `text-kumo-strong` | Security & Cryptographic Auth callouts |
| **Security Banner Copy** | `13px–14px` (`text-[13px] sm:text-[14px]`) | 400 (`font-normal`) | `text-kumo-subtle` | Explanatory security banner body |
| **Empty-State Heading** | `15px–16px` (`text-[15px] sm:text-[16px]`) | 600 (`font-semibold`) | `text-kumo-strong` | Empty state primary title |
| **Empty-State Copy** | `13px–14px` (`text-[13px] sm:text-[14px]`) | 400 (`font-normal`) | `text-kumo-subtle` | Empty state instructions & descriptions |
| **Action Buttons (Normal)** | `13px` (`text-[13px]`) | 500 (`font-medium`) | `btn-cf-primary` / `btn-cf-secondary` | Primary & secondary toolbars (`h-8`) |
| **System Indicators** | `12px–13px` (`text-[12px] sm:text-[13px]`) | 500 (`font-medium font-mono`)| `text-kumo-default` | DB, Redis, Worker status pills |
| **Micro-Metadata / Footers** | `12px` (`text-[12px]`) | 400 (`font-normal`) | `text-kumo-subtle` | Aggregated domain footnote |

### 6.2 Onboarding Wizard & Form Standards

To ensure a first-class SaaS onboarding experience for email infrastructure configuration:

- **Layout & Composition:** Centered, focused card container (`max-w-3xl w-full bg-kumo-base border border-kumo-line rounded-2xl shadow-xl overflow-hidden`) centered in a full-height canvas (`min-h-screen bg-kumo-canvas`).
- **Progress Stepper:** Compact horizontal indicator placed in the card header (`bg-kumo-recessed/40 px-5 sm:px-8 py-3.5 border-b border-kumo-hairline`) featuring numbered circle badges (`w-6 h-6 rounded-full`), distinct orange active state (`bg-cf-orange text-white`), green completion checkmark (`bg-cf-success/20 text-cf-success`), and a subtle divider connector.
- **Form Typography:**
  - Main Step Heading: `20px–22px` (`text-[20px] sm:text-[22px] font-semibold text-kumo-strong tracking-tight`).
  - Supporting Description: `13px–14px` (`text-[13px] sm:text-[14px] text-kumo-subtle leading-relaxed`).
  - Field Labels: `13px–14px` (`text-[13px] sm:text-[14px] font-medium text-kumo-strong`).
  - Helper Descriptions: `12px–13px` (`text-[12px] sm:text-[13px] text-kumo-subtle leading-normal`).
- **Input Dimensions:** `h-11` (~44px) with rounded corners (`rounded-xl`), leading icon offset (`pl-10 pr-4`), monospace input font (`font-mono text-[14px] sm:text-[15px]`), and focus ring border in Cloudflare Orange (`focus:border-cf-orange`).
- **Information Banner:** Orange deliverability callout with double-tint treatment (`bg-cf-orange-tint/70 border border-cf-orange-border p-4 sm:p-4.5 rounded-xl`), `Sparkle` icon, bold orange title (`14px–15px`), and inline monospace code snippet.
- **DNS Records Preview:** Dynamic 3-card grid (`grid-cols-1 sm:grid-cols-3 gap-2.5`) with uppercase category labels (`11px font-medium text-kumo-subtle uppercase`) and distinct color-coded monospace hosts (Orange for EHLO, Blue for Return-Path, Strong for SPF).
- **Simplified 3-Column DNS Records Table with Click-to-Copy (Step 2):**
  - **Main Heading & Status:** `20px–22px font-semibold text-kumo-strong tracking-tight` with neutral icon container (`w-7 h-7 bg-kumo-control border border-kumo-line/80 text-kumo-muted`), paired with a compact domain status card featuring lightweight status indicator (`1.5px` dot, soft amber/green text, no heavy borders/pills), monospace domain name, and `btn-cf-secondary` propagation trigger.
  - **Streamlined 3-Column Layout (Zero Button Clutter, Full Content Focus):**
    - The table utilizes `table-fixed w-full` with 3 columns summing to 100%:
      - `Type`: `20%` clean neutral text labels (`text-[12px] sm:text-[13px] font-mono font-medium text-kumo-strong truncate block`).
      - `Host / Name`: `26%` exact hostname (`text-[13px] font-mono font-medium text-kumo-strong truncate block`).
      - `Value / Content`: `54%` generous width for clean inline monospace DNS value (`text-[12px] sm:text-[13px] font-mono text-kumo-default truncate block`).
  - **Click-to-Copy Cell Interaction:**
    - Every table cell is interactive and clickable (`cursor-pointer hover:bg-kumo-control/50 transition-colors`).
    - **Hover Cue:** Contextual copy icon (`opacity-0 group-hover/cell:opacity-100 transition-opacity`) appears smoothly on hover with a native tooltip.
    - **Click Feedback:** Clicking any cell copies the complete, unclipped value (Type, Hostname, or complete DNS Value) and immediately triggers a subtle green `Copied` badge (`bg-cf-success/10 text-cf-success`) alongside toast confirmation.
  - **Handling of Long DNS Values:** Zero silent truncation or key modification; values truncate visually with ellipsis inside bounded cells to prevent table blowout, while preserving 100% exact full-value clipboard copies.
  - **Row Styling:** `py-3 px-4` comfortable row heights with subtle horizontal row separators (`divide-y divide-kumo-hairline`).
  - **Responsive Behavior:** Wizard card container dynamically expands to `max-w-4xl` for Step 2 while remaining `max-w-[680px]` for Step 1. All 3 columns fit comfortably on desktop without horizontal scrolling.
  - **Reverse DNS (PTR) Callout:** Secondary blue-tinted notice card (`bg-cf-blue-tint/15 border border-cf-blue-border/30 p-3 sm:p-3.5 rounded-xl`) placed directly beneath the table with inline code highlights.

### 6.3 Settings Page Layout & Lightweight Semantic Badges

To deliver a readable, balanced administrative experience for workspace and security configuration:

- **Layout & Centering:** Centered canvas container (`max-w-5xl mx-auto w-full space-y-6`) positioned cleanly within the scrollable content area.
- **Page Header:**
  - Standardized title (`text-[22px] sm:text-[24px] font-semibold text-kumo-strong tracking-tight`).
  - Clear subtitle (`text-[13px] sm:text-[14px] text-kumo-subtle mt-1 leading-normal`).
  - Co-aligned tab switcher (`flex items-center gap-1.5 p-1 bg-kumo-elevated rounded-xl border border-kumo-hairline`) using `text-[13px] font-medium` pill buttons.
- **Section Cards:**
  - Card containers use consistent sizing (`bg-kumo-base border border-kumo-hairline rounded-xl p-5 sm:p-6 space-y-5 shadow-2xs`).
  - Card Header: `w-9 h-9` icon container paired with `text-[15px] sm:text-[16px] font-semibold` titles and `text-[12px] sm:text-[13px]` subtitles.
  - Section actions (Setup Wizard, Refresh Diagnostics, Add Member) align horizontally with section headers.
- **Form Controls & Password Inputs:**
  - Form labels: `text-[13px] font-medium text-kumo-strong mb-1.5 block`.
  - Inputs: `h-10 text-[13px] sm:text-[14px] font-mono px-3.5 pr-10 rounded-lg bg-kumo-control border border-kumo-line`.
  - Password toggle icons: centered right-aligned buttons (`right-3 top-1/2 -translate-y-1/2`).
  - Primary button: `btn-cf-primary px-4 py-2 text-[13px] font-medium shadow-xs disabled:opacity-40`.
- **Infrastructure Diagnostics Grid:**
  - 6-tile grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5`).
  - Balanced tiles with equal heights and padding (`p-4 rounded-xl bg-kumo-recessed border border-kumo-hairline flex flex-col justify-between space-y-2`).
  - Category labels: `text-[11px] sm:text-[12px] text-kumo-subtle uppercase tracking-wider font-semibold font-mono`.
  - Technical values: `text-[13px] sm:text-[14px] font-mono font-semibold text-kumo-strong truncate`.
- **Lightweight Semantic Badge System:**
  All badges use restrained, low-opacity fills and soft borders to avoid competing with data:
  - **Success / Connected / Active:** `bg-cf-success/10 text-cf-success border border-cf-success/20 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full`.
  - **Warning / Pending / Action Required:** `bg-cf-amber/10 text-cf-amber border border-cf-amber/20 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full`.
  - **Error / Failed:** `bg-kumo-danger-tint text-kumo-danger border border-kumo-danger/20 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full`.
  - **Informational / Network Ports:** `bg-cf-blue-tint/60 text-cf-blue border border-cf-blue-border/40 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full`.
  - **Neutral / Path:** `bg-kumo-elevated text-kumo-subtle border border-kumo-hairline text-[11px] font-mono font-medium px-2 py-0.5 rounded-full`.
  - **Accent / Admin Roles:** `bg-cf-orange/10 text-cf-orange border border-cf-orange/20 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full`.

### 6.4 Settings → Team & Roles Standards

To establish an authoritative, clean role-based access control and member directory:

- **Introductory Card (Team Members & Role Access):**
  - Section title: `text-[15px] sm:text-[16px] font-semibold text-kumo-strong`.
  - RBAC Active status indicator: Lightweight badge with amber/orange status dot (`<span className="w-1.5 h-1.5 rounded-full bg-cf-orange" /> RBAC Active`).
  - Description: Readable body copy (`text-[13px] text-kumo-subtle max-w-xl leading-relaxed mt-1`).
  - Action button: Vertically aligned `btn-cf-primary` with `UserPlus` icon (`px-4 py-2 text-[13px] font-medium`).
- **Role Permission Cards (Admin, Member, Viewer):**
  - Equal-height 3-column grid (`grid-cols-1 md:grid-cols-3 gap-3.5`).
  - Card container: `p-4 sm:p-4.5 rounded-xl bg-kumo-base border border-kumo-hairline flex flex-col justify-between space-y-2.5 h-full shadow-2xs`.
  - Icon container: `w-7 h-7 rounded-lg border` with semantic role coloring (Orange for Admin, Blue for Member, Muted/Neutral for Viewer).
  - Role title: `text-[14px] sm:text-[15px] font-semibold text-kumo-strong font-mono`.
  - Capability badge: Lightweight badge aligned to top-right (`Full Access`, `Standard Ops`, `Read-Only`).
  - Role description: Balanced `text-[13px] text-kumo-subtle leading-relaxed`.
- **Active Team Members Section:**
  - Card Header: `text-[12px] sm:text-[13px] font-semibold text-kumo-strong uppercase tracking-wider font-mono` with dynamic member count and right-aligned `Refresh` button.
  - Member Rows: Balanced padding (`p-4 sm:p-4.5`), dividing lines (`divide-y divide-kumo-hairline`), and subtle row hover (`hover:bg-kumo-tint/30`).
  - Identity & Avatar: `w-10 h-10` Facehash avatar, `text-[13px] sm:text-[14px] font-semibold text-kumo-strong` name, lightweight `You` pill (`bg-cf-orange/10 text-cf-orange border border-cf-orange/20 text-[10px]`), and uppercase role badge.
  - Metadata Line: Monospace line with email, dot separator, and `@{username}` (`text-[12px] text-kumo-subtle mt-1 font-mono flex items-center gap-2.5`).
  - Security Status Indicator: Lightweight semantic badge with color status dot (`<span className="w-1.5 h-1.5 rounded-full bg-cf-success" /> Active` or amber dot for `Initial Password`).
  - Row Actions: `Role` toggle, `Reset` credential button (`bg-kumo-elevated text-kumo-default hover:text-cf-orange border border-kumo-hairline shadow-2xs` with `Key` icon), and `Trash` button with danger hover.

---

## 7. Implementation Checklist for Every View

- [ ] Both `data-mode="dark"` and `data-mode="light"` match the Cloudflare screenshots seamlessly without any `dark:` Tailwind classes.
- [ ] Primary brand accents and featured CTAs use `--cf-orange` (`#FF6600`) and `--cf-orange-brand` (`#F6821F`).
- [ ] Root container includes `className="isolate"`.
- [ ] All `<Input>`, `<Select>`, and `<Combobox>` components include accessible `label` or `aria-label` props.
- [ ] Lists and tables use `1px` `border-kumo-hairline` dividers and two-tone breadcrumb text (`Category /` **Target**).