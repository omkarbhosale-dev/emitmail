# Contributing to EmitMail
### An open-source alternative of Resend that works on the Resend platform

Thank you for your interest in contributing to **EmitMail**! EmitMail is a sovereign, self-hosted Email Service Provider (ESP) and Inbound Mailbox Engine built as an open-source alternative to Resend that works seamlessly with the official Resend SDK.

This document outlines our development workflow, repository structure, environment configuration, and submission guidelines.

---

## 1. Monorepo Anatomy

EmitMail is structured as a unified monorepo managed with `pnpm` workspaces:

```text
emitmail/
├── apps/
│   ├── api/            # Express REST API, Prisma ORM, Inbound SMTP receiver (Port 4000 & 2525)
│   ├── worker/         # Decoupled BullMQ background delivery engine (Direct MTA on Port 25)
│   ├── dashboard/      # Next.js 16 Web UI with Cloudflare Kumo design tokens (Port 3000)
│   └── docs/           # Next.js 16 + Fumadocs interactive documentation (Port 3001)
├── packages/
│   ├── database/       # Shared database schemas and Prisma utilities
│   ├── queue/          # Shared BullMQ queue schemas and payload types
│   └── shared/         # Shared TypeScript utilities, constants, and validators
├── docker/             # Production Dockerfiles (Dockerfile.api, Dockerfile.worker)
├── scripts/            # Deliverability test suites and queue worker simulation scripts
├── docker-compose.yml  # Multi-container production deployment stack
└── docker-compose.dev.yml # Local development infrastructure (PostgreSQL 16 & Redis 7)
```

---

## 2. Setting Up the Local Development Environment

Follow these steps to run the entire project locally:

### 2.1 Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **pnpm**: `v9.x` or higher (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker & Docker Compose**: For local PostgreSQL 16 and Redis 7
- **Git**: For version control

### 2.2 Clone & Install
```bash
git clone https://github.com/omkarbhosale-dev/emitmail.git
cd emitmail
pnpm install
```

### 2.3 Configure Environment Variables
Copy `.env.example` to `.env` in the repository root:
```bash
cp .env.example .env
```
EmitMail uses a **single global root `.env` architecture**—all apps (`api`, `worker`, `dashboard`, `docs`) read exclusively from this single root file.

### 2.4 Start Development Database & Redis
```bash
# Launch PostgreSQL 16 and Redis 7 containers
pnpm dev:docker

# Verify health
docker compose -f docker-compose.dev.yml ps
```

### 2.5 Database Setup
```bash
# Generate Prisma Client
pnpm db:generate

# Push relational schema to PostgreSQL
pnpm db:push

# Set INITIAL_ADMIN_PASSWORD in the root .env, then seed the administrator
pnpm db:seed
```

---

## 3. Running Services Locally

You can run individual services depending on which component you are working on:

| Command | Service | Local URL / Port | Description |
| :--- | :--- | :--- | :--- |
| `pnpm dev:api` | **Backend API** | `http://localhost:4000` | Express REST API & Inbound SMTP (Port 2525) |
| `pnpm dev:worker` | **Delivery Worker** | Console (Background) | BullMQ worker consuming queues & direct MTA delivery |
| `pnpm dev:dashboard` | **Dashboard UI** | `http://localhost:3000` | Next.js 16 App Router + Cloudflare Kumo design tokens |
| `pnpm dev:docs` | **Documentation** | `http://localhost:3001` | Fumadocs MDX documentation site |

---

## 4. Component Contribution Guides

### 4.1 Backend API (`apps/api`)
- **Tech Stack**: Express, TypeScript, Prisma ORM, BullMQ, Redis, Zod, Nodemailer, `smtp-server`.
- **Database Models**: Defined in `apps/api/prisma/schema.prisma`. After modifying models, always run `pnpm db:push` (in development) or `pnpm db:migrate` (for production migrations).
- **2048-bit RSA DKIM Cryptography**: Keys are generated using `crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })` and encrypted at rest with AES-256-GCM. Multi-chunk DNS resolution handles the 255-character string chunk limit of DNS UDP packets.
- **Inbound SMTP Server**: Runs on port 2525 (mapped to 25 in production). Handles `onRcptTo` recipient validation, alias matching, and streams raw MIME into `mailparser`.
- **Resend Compatibility**: `POST /emails` and `POST /api/v1/emails` validate `em_live_...` Bearer API keys and enqueue outbound jobs to BullMQ.
- **Testing**: Run integration workflow tests with `pnpm test:workflow`.

### 4.2 Background Delivery Worker (`apps/worker`)
- **Tech Stack**: BullMQ `Worker`, Redis, Nodemailer direct transport, Prisma client.
- **Direct MTA Dispatch**: Worker resolves recipient MX records, decrypts the sender domain's DKIM private key, and attempts SMTP delivery on port 25. TLS behavior depends on negotiation and configuration.
- **Return-Path Alignment**: Configures bounce handling envelopes (`bounces@send.<domain>`) for strict SPF alignment.
- **Inbound & Webhooks**: Consumes incoming mail events and dispatches HTTP POST payloads with HMAC-SHA256 signatures (`X-EmitMail-Signature`).
- **Testing**: Run `pnpm test:resend-worker` to simulate the full Redis Queue -> Worker -> MTA dispatch pipeline.

### 4.3 Web Dashboard (`apps/dashboard`)
- **Tech Stack**: Next.js 16 (App Router), React 19, Tailwind CSS v4, `@cloudflare/kumo` v2, `@phosphor-icons/react`.
- **Strict Design Rules (`apps/dashboard/DESIGN.md`)**:
  - **Always Use Kumo Semantic Tokens**: `bg-kumo-canvas`, `bg-kumo-base`, `bg-kumo-elevated`, `bg-kumo-recessed`, `text-kumo-strong`, `text-kumo-default`, `text-kumo-subtle`, `border-kumo-hairline` alongside Cloudflare Orange tokens (`bg-cf-orange`, `text-cf-orange`).
  - **Zero Raw Tailwind Grays**: Never use `bg-zinc-900`, `bg-gray-100`, or `text-gray-500`.
  - **Zero `dark:` Prefixes**: Light and Dark mode switching is driven automatically by CSS custom properties (`[data-mode="dark"]`).
  - **Root Portal Isolation**: The root container in `app/layout.tsx` must maintain `className="isolate"` for Kumo popovers/modals.
  - **`<Text>` Constraint**: Do not pass `className` to Kumo's `<Text>` component; wrap with `<span>` or `<div>`.
- **API Client**: All calls go through `apiFetch<T>` in `lib/api.ts` with automatic JWT token attachment.

### 4.4 Documentation (`apps/docs`)
- **Tech Stack**: Next.js 16 + Fumadocs (`fumadocs-ui`, `fumadocs-mdx`).
- **Sidebar Ordering**: Managed in `apps/docs/content/docs/meta.json` using `---Category---` separators.
- **Components**: Use `<Callout>`, `<Steps>`, `<Step>`, `<Cards>`, and `<Card>`.
- **Standards**: Maintain provider-neutral DNS documentation ("Configure DNS", "DNS Only / Unproxied").
- **Verification**: Verify documentation builds with `pnpm build:docs`.

---

## 5. Development & Git Workflow

### 5.1 Branching Strategy
Create a descriptive branch for your changes:
```bash
git checkout -b feat/custom-webhook-retry-policy
# or
git checkout -b fix/dkim-txt-record-chunking
```

### 5.2 Conventional Commit Messages
We follow the Conventional Commits specification:
- `feat: add support for custom webhook headers`
- `fix: handle 2048-bit multi-chunk DKIM TXT strings in resolver`
- `docs: update setup guide with direct mx fallback details`
- `refactor: extract mx resolution into dedicated service`
- `test: add end-to-end resend sdk queue test`

### 5.3 Pull Request Checklist
Before opening a pull request, ensure:
1. `pnpm build:api` compiles with 0 TypeScript errors.
2. `pnpm build:worker` compiles with 0 TypeScript errors.
3. `pnpm build:dashboard` builds successfully.
4. `pnpm build:docs` generates all static MDX pages with 0 errors.
5. All new configuration options are documented in `.env.example`.
6. Your commit messages follow the Conventional Commits format.

---

## 6. Community & Questions

If you have questions, encounter a bug, or want to propose a new feature, please open an Issue or Discussion on GitHub:
👉 [https://github.com/omkarbhosale-dev/emitmail](https://github.com/omkarbhosale-dev/emitmail)

