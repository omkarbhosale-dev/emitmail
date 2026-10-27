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
  - *Footer:* **Manage account** (`<Gear />`) + Bottom collapse sidebar toggle bar (`<SidebarSimple />`).

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
- **Monospace Font:** `JetBrains Mono`, `Fira Code`, `monospace`.
- **Strict Monospace Rule:** All Message IDs (`msg_...`), API Key prefixes (`em_live_...`), DKIM TXT records, Webhook secrets (`whsec_...`), SMTP status codes (`250 2.0.0 OK`), and keyboard shortcuts (`Ctrl K`) must use `font-mono` and Kumo's `InlineCopyText` where copyable.

---

## 7. Implementation Checklist for Every View

- [ ] Both `data-mode="dark"` and `data-mode="light"` match the Cloudflare screenshots seamlessly without any `dark:` Tailwind classes.
- [ ] Primary brand accents and featured CTAs use `--cf-orange` (`#FF6600`) and `--cf-orange-brand` (`#F6821F`).
- [ ] Root container includes `className="isolate"`.
- [ ] All `<Input>`, `<Select>`, and `<Combobox>` components include accessible `label` or `aria-label` props.
- [ ] Lists and tables use `1px` `border-kumo-hairline` dividers and two-tone breadcrumb text (`Category /` **Target**).