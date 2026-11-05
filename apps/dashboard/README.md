# EmitMail — Web Dashboard
### An open-source alternative of Resend that works on the Resend platform

> 📚 **Official Documentation:** [https://emitmail.vercel.app](https://emitmail.vercel.app)

[![Official Docs](https://img.shields.io/badge/Documentation-emitmail.vercel.app-FF6600.svg)](https://emitmail.vercel.app)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Cloudflare Kumo](https://img.shields.io/badge/Design_System-Cloudflare_Kumo-F38020.svg)](https://github.com/cloudflare/kumo)

The **EmitMail Web Dashboard** (`apps/dashboard`) is a single-page management application for EmitMail. Built with Next.js 16 and React 19, it faithfully replicates the **Cloudflare Dashboard ("Account Home" v2)** aesthetic using Cloudflare's **Kumo Design System** (`@cloudflare/kumo`) and Phosphor Icons (`@phosphor-icons/react`).

---

## Key Capabilities

- **Cloudflare Account Home v2 Interface:** Ultra-clean contrast with pitch-black canvas (`#050505`) in Dark Mode and warm off-white (`#FBFBFB`) in Light Mode, 1px hairline borders, and signature Cloudflare Orange accents (`#FF6600`).
- **Domain Verification Drawer:** Add sending domains, view 2048-bit RSA DKIM public keys with single-line DNS TXT records, and run real-time DNS verifications.
- **Inbound Mailbox Console (`/inbox`):** Read incoming mail in real-time, search through messages, inspect parsed MIME headers, and reply directly from the dashboard.
- **API Key & Webhook Management:** Issue domain-scoped `em_live_...` API credentials, toggle key activation, and register HTTP webhook endpoints.
- **Outbound Email Explorer:** Inspect delivery logs, view bounce classifications, and inspect email payloads.
- **Live Version Checker:** Automatically checks for new EmitMail releases on GitHub and displays Cloudflare-style update notifications.

---

## Strict Design Architecture (`DESIGN.md`)

All dashboard components strictly adhere to the golden rules in `DESIGN.md`:
1. **Kumo Semantic Tokens Only:** Always use `bg-kumo-canvas`, `bg-kumo-base`, `bg-kumo-elevated`, `bg-kumo-recessed`, `text-kumo-strong`, `text-kumo-default`, `text-kumo-subtle`, `border-kumo-hairline` alongside Cloudflare Orange brand tokens (`bg-cf-orange`, `text-cf-orange`).
2. **Zero Raw Grays / Blues:** Never use `bg-zinc-900`, `bg-gray-100`, or `text-gray-500`.
3. **Zero `dark:` Prefixes:** Theme switching is automatic via CSS custom properties (`[data-mode="dark"]` and `light-dark()`).
4. **Root Portal Isolation:** The root container in `app/layout.tsx` must maintain `className="isolate"` for Kumo popovers and dialogs.
5. **The `<Text>` Constraint:** Kumo's `<Text>` component does not accept a `className` prop; wrap with `<span>` or `<div>`.

---

## Directory Layout

```text
apps/dashboard/
├── app/
│   ├── globals.css          # Kumo semantic CSS custom properties & theme
│   ├── layout.tsx           # Root layout, fonts, and isolate boundary
│   └── page.tsx             # Main dashboard view switcher
├── components/
│   ├── navigation/          # Left Sidebar, Header bar, User Profile menu
│   ├── modals/              # Send Test Email, Inbound Aliases, API Key dialogs
│   ├── ui/                  # Badges, copy buttons, search inputs, KPI tiles
│   └── views/               # Full-screen view pages
│       ├── HomeView.tsx     # Overview metrics, quick links, system updates
│       ├── DomainsView.tsx  # Domain list, DNS status, DKIM drawer
│       ├── ApiKeysView.tsx  # API key generation and management
│       ├── EmailsView.tsx   # Outbound dispatch logs and status
│       ├── InboxView.tsx    # Inbound email mailbox reader
│       ├── WebhooksView.tsx # Webhook subscriptions
│       ├── SettingsView.tsx # Server configuration and rDNS check
│       └── LoginView.tsx    # Admin login screen
├── lib/
│   └── api.ts               # Authenticated API client wrapper (`apiFetch`)
├── types/
│   └── index.ts             # Domain interfaces matching backend models
└── DESIGN.md                # Cloudflare Kumo design tokens & style bible
```

---

## Local Development & Setup

### 1. Configuration
The dashboard reads API connectivity from the root `.env` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### 2. Start Development Server
```bash
# From repository root:
pnpm dev:dashboard

# Or directly in apps/dashboard:
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Initial Login
The initial `admin` account uses the temporary password `emitmail`. Change it in dashboard Settings before using other protected features. This shared temporary password is intended only for first login.

---

## License

This application is part of the EmitMail core platform and is licensed under the **[Apache License 2.0](../../LICENSE)**.
