# EmitMail — Documentation Engine
### An open-source alternative of Resend that works on the Resend platform

> 📚 **Official Documentation:** [https://emitmail.vercel.app](https://emitmail.vercel.app)

[![Official Docs](https://img.shields.io/badge/Documentation-emitmail.vercel.app-FF6600.svg)](https://emitmail.vercel.app)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black.svg)](https://nextjs.org/)
[![Fumadocs](https://img.shields.io/badge/Fumadocs-16.1-blue.svg)](https://fumadocs.vercel.app/)
[![MDX](https://img.shields.io/badge/MDX-3.0-yellow.svg)](https://mdxjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg)](https://tailwindcss.com/)

The **EmitMail Documentation** (`apps/docs`) is the official developer documentation website for EmitMail. Built with Next.js 16 and Fumadocs (`fumadocs-ui`, `fumadocs-mdx`), it provides an interactive documentation layout modeled on Cloudflare Docs.

---

## Key Capabilities

- **Interactive Code Blocks:** Every code snippet and DNS record contains an interactive one-click copy button with instant visual feedback.
- **Category Navigation:** Structured into 5 core categories in `meta.json`:
  1. `Introduction` — Architecture, ESP overview, Resend drop-in compatibility.
  2. `Installation` — Prerequisites, Docker Compose deployment, VPS firewalls.
  3. `Setup` — 10/10 Outbound DNS, Reverse DNS (PTR), Inbound Mailboxes, API Keys.
  4. `Example (Resend)` — Resend NPM SDK integration, Next.js React Email, cURL, Inbound replies.
  5. `Contributions` — Monorepo setup, Backend API, Delivery Worker, Dashboard, Docs.
- **Provider-Neutral DNS Instructions:** Universal DNS setup instructions applicable to any provider (Cloudflare, AWS Route 53, Namecheap, Porkbun, Google Cloud DNS).
- **Searchable Documentation:** Built-in static search with instant indexing.

---

## Directory Layout

```text
apps/docs/
├── app/
│   ├── layout.tsx           # Root HTML layout and Fumadocs RootProvider
│   ├── page.tsx             # Documentation homepage
│   └── docs/
│       ├── layout.tsx       # DocsLayout wrapper with sidebar navigation
│       └── [[...slug]]/
│           └── page.tsx     # Dynamic MDX page renderer
├── content/
│   └── docs/                # MDX documentation content files
│       ├── meta.json        # Sidebar categories and page hierarchy
│       ├── index.mdx        # Introduction
│       ├── prerequisites.mdx# System requirements
│       ├── dns-records.mdx  # 10/10 deliverability DNS guide
│       ├── contributing.mdx # Contribution overview & monorepo guide
│       └── ...
├── lib/
│   └── source.ts            # Fumadocs loader configuration
├── source.config.ts         # Fumadocs MDX collection definition
├── package.json
└── tsconfig.json
```

---

## Local Development & Setup

### 1. Start Documentation Server
```bash
# From repository root:
pnpm dev:docs

# Or directly in apps/docs:
pnpm dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

### 2. Verify Build
Ensure all MDX pages compile and generate static routes with zero errors:
```bash
pnpm build:docs
```

---

## License

This documentation engine is part of the EmitMail platform and is licensed under the **[Apache License 2.0](../../LICENSE)**.

