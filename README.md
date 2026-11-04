# EmitMail
### An open-source alternative of Resend that works on the Resend platform

> 📚 **Official Documentation:** [https://emitmail.vercel.app](https://emitmail.vercel.app)

[![Official Docs](https://img.shields.io/badge/Documentation-emitmail.vercel.app-FF6600.svg)](https://emitmail.vercel.app)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Client Libraries: MIT](https://img.shields.io/badge/Client%20SDKs-MIT-green.svg)](LICENSE-MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20%20%7C%20v22-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black.svg)](https://nextjs.org/)

**EmitMail** is self-hosted software for sending email and receiving messages into mailboxes you manage. Built with Node.js, TypeScript, PostgreSQL, Redis, and BullMQ, it gives operators control over the application and its data. Operators remain responsible for server security, DNS, IP reputation, and delivery configuration.

EmitMail supports common email sending requests through REST endpoints and the official Resend Node.js SDK when configured with a custom `baseUrl`. API behavior may differ from Resend; check the features your application uses before migrating.

---

## Key Features

- **Resend Node.js SDK:** Configure the official `resend` package with your EmitMail API base URL and API key. See the SDK guide for an example.
- **2048-Bit RSA DKIM Key Generation:** Enterprise-grade cryptographic key generation (SPKI/PKCS#8) with AES-256-GCM encrypted database storage and multi-chunk DNS TXT verification.
- **Email authentication support:** DKIM key generation and DNS checks for records used by your sending configuration. These checks cannot guarantee inbox placement; IP reputation and recipient policies also matter.
- **Inbound Mailbox Engine (`/inbox`):** Embedded ESMTP server running on port 2525 (mapped to port 25 in production). Supports domain aliases (`support@yourdomain.com`), catch-all routing (`*@yourdomain.com`), rich HTML parsing, and dashboard replies.
- **Decoupled Background Delivery Pipeline:** Asynchronous job processing powered by BullMQ and Redis with automatic exponential backoff retries and bounce tracking.
- **Real-Time Webhook Engine:** Subscribe to `email.sent`, `email.delivered`, `email.bounced`, and `inbound.email.received` with cryptographic HMAC-SHA256 signature verification.
- **Cloudflare Kumo Dashboard:** Next.js 16 single-page application built on Cloudflare's `@cloudflare/kumo` design system with instant Light/Dark mode switching and Phosphor Icons.
- **Interactive Documentation:** Next.js 16 + Fumadocs developer documentation with one-click copy buttons and complete setup guides.

---

## Architecture Overview

EmitMail is structured as a unified monorepo managed with `pnpm` workspaces:

```text
emitmail/
├── apps/
│   ├── api/            # Express REST API, Prisma ORM, Inbound SMTP receiver (Port 4000 / 2525)
│   ├── worker/         # Decoupled BullMQ background delivery engine (Port 25 direct MTA)
│   ├── dashboard/      # Next.js 16 Web UI with Cloudflare Kumo design tokens (Port 3000)
│   └── docs/           # Next.js 16 + Fumadocs interactive documentation engine (Port 3001)
├── packages/           # Shared packages and type definitions
├── docker/             # Production Dockerfiles (Dockerfile.api, Dockerfile.worker)
├── scripts/            # Deliverability test suites and queue worker simulation scripts
├── docker-compose.yml  # Multi-container production deployment stack
└── docker-compose.dev.yml # Local development infrastructure (PostgreSQL 16 & Redis 7)
```

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             EmitMail Monorepo                               │
│                                                                             │
│   ┌────────────────────┐                   ┌────────────────────────────┐   │
│   │  apps/dashboard    │ ──(HTTP/REST)───► │  apps/api                  │   │
│   │  (Next.js + Kumo)  │                   │  (Express + Prisma)        │   │
│   │  Port 3000         │                   │  Port 4000                 │   │
│   └────────────────────┘                   └──────┬──────────────┬──────┘   │
│                                                   │              │          │
│                                           (BullMQ │              │ (Prisma) │
│                                             Jobs) │              │          │
│                                                   ▼              ▼          │
│   ┌────────────────────┐                   ┌──────────────┐ ┌───────────┐   │
│   │  apps/docs         │                   │ Redis        │ │ PostgreSQL│   │
│   │  (Fumadocs Engine) │                   │ Port 6379    │ │ Port 5432 │   │
│   │  Port 3001         │                   └──────┬───────┘ └─────▲─────┘   │
│   └────────────────────┘                          │               │         │
│                                            (Pulls │               │         │
│                                             Jobs) │               │ Updates │
│                                                   ▼               │ Status  │
│                                            ┌──────────────┐       │         │
│                                            │ apps/worker  │───────┘         │
│                                            │ (Direct MTA) │                 │
│                                            └──────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quickstart: Zero-Friction Self-Hosting

The fastest way to deploy EmitMail on any Linux VPS or server is using our idempotent `install.sh` script, which automatically resolves port conflicts, generates cryptographically secure secrets, and pulls pre-built GitHub Container Registry (GHCR) images:

```bash
git clone https://github.com/omkarbhosale-dev/emitmail.git
cd emitmail
chmod +x install.sh
./install.sh
```

Once installed, open the Dashboard URL entered during setup and sign in as `admin` using the unique one-time password printed by the installer. You will be required to change it before using protected features. The **Interactive Onboarding Setup Wizard** will automatically detect your VPS public IP, prompt for your domain, and auto-provision your 2048-bit RSA DKIM, SPF, DMARC, and MX DNS records.

---

## Setting Up the Monorepo for Local Development

If you are developing or contributing to EmitMail locally:

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **pnpm**: `v9.x` or higher (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker & Docker Compose**: Required for PostgreSQL 16 and Redis 7
- **Git**: For source control

### 2. Clone the Repository
```bash
git clone https://github.com/omkarbhosale-dev/emitmail.git
cd emitmail
```

### 3. Install Monorepo Dependencies
```bash
pnpm install
```

### 4. Configure Environment Variables
Copy the root `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Before running `pnpm db:seed`, set `INITIAL_ADMIN_PASSWORD` to a unique value of at least 16 characters in `.env`.

### 5. Start Local PostgreSQL & Redis
Launch the containerized development database and Redis instances:
```bash
pnpm dev:docker
```
Verify containers are running:
```bash
docker compose -f docker-compose.dev.yml ps
```

### 6. Initialize & Seed Database
Generate the Prisma client, push the schema to PostgreSQL, and seed the default administrator:
```bash
# Generate Prisma Client
pnpm db:generate

# Push relational schema to PostgreSQL
pnpm db:push

# Set a unique initial admin password in .env before seeding, then seed the administrator
pnpm db:seed
```

### 7. Run All Services
Open separate terminal tabs (or run in background) to start the apps:

```bash
# Terminal 1: Backend API (Express on Port 4000, Inbound SMTP on Port 2525)
pnpm dev:api

# Terminal 2: Delivery Worker (BullMQ direct MTA dispatch engine)
pnpm dev:worker

# Terminal 3: Dashboard UI (Next.js on Port 3000)
pnpm dev:dashboard

# Terminal 4: Documentation (Fumadocs on Port 3001)
pnpm dev:docs
```

### 8. Access the Applications
| App | Local URL | Default Credentials / Notes |
| :--- | :--- | :--- |
| **Dashboard** | [http://localhost:3000](http://localhost:3000) | Username: `admin` \| Password: set `INITIAL_ADMIN_PASSWORD` in `.env` |
| **Backend API** | [http://localhost:4000](http://localhost:4000) | Healthcheck: `http://localhost:4000/api/v1/health` |
| **Inbound SMTP** | `localhost:2525` | Accepts incoming SMTP mail traffic |
| **Documentation** | [http://localhost:3001](http://localhost:3001) | Complete interactive guide |

---

## Using the Official Resend SDK

The official `resend` Node.js package can send requests to EmitMail when configured with a custom base URL. Review the SDK guide and confirm that the API features you need are supported:

```bash
npm install resend
```

```typescript
import { Resend } from 'resend';

const resend = new Resend('em_live_your_api_key_here', {
  baseUrl: 'http://localhost:4000', // Or your production EmitMail domain
});

const { data, error } = await resend.emails.send({
  from: 'notifications@yourdomain.com',
  to: 'customer@example.com',
  subject: 'Welcome to EmitMail',
  html: '<strong>Email queued by EmitMail.</strong>',
});

console.log('Dispatched Email ID:', data?.id);
```

### Via cURL
```bash
curl -X POST "http://localhost:4000/emails" \
  -H "Authorization: Bearer em_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Acme <hello@yourdomain.com>",
    "to": ["user@example.com"],
    "subject": "Hello from EmitMail REST API",
    "html": "<p>Sent directly through EmitMail!</p>"
  }'
```

---

## Production Deployment with Docker Compose

Deploy EmitMail on a supported Linux VPS with Docker Compose:

```bash
# Clone and enter repo
git clone https://github.com/omkarbhosale-dev/emitmail.git
cd emitmail

# Configure production environment
cp .env.example .env
nano .env

# Build and start all production containers
docker compose up --build -d
```

The production `docker-compose.yml` mounts:
- Port `4000`: API REST Gateway
- Port `25`: Raw Inbound Port 25 SMTP Mail Receiver
- Internal: PostgreSQL 16 & Redis 7

---

## Documentation

Full interactive documentation is included in `apps/docs`:
- **Architecture & Introduction**: [http://localhost:3001/docs](http://localhost:3001/docs)
- **Email DNS Setup**: [http://localhost:3001/docs/dns-records](http://localhost:3001/docs/dns-records)
- **Reverse DNS (PTR) Guide**: [http://localhost:3001/docs/reverse-dns-ptr](http://localhost:3001/docs/reverse-dns-ptr)
- **Inbound Mailbox Setup**: [http://localhost:3001/docs/inbox-mailbox-setup](http://localhost:3001/docs/inbox-mailbox-setup)
- **Resend SDK Examples**: [http://localhost:3001/docs/resend-npm-sdk](http://localhost:3001/docs/resend-npm-sdk)
- **Contribution Guides**: [http://localhost:3001/docs/contributing](http://localhost:3001/docs/contributing)

---

## Contributing

We welcome contributions from developers across all skill levels! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for local environment setup, architecture deep-dives, coding rules, and pull request guidelines.

---

## License

EmitMail is open-source software licensed as follows:

- **Core Server, Engine & Web Applications (`apps/api`, `apps/worker`, `apps/dashboard`, `apps/docs`):** Licensed under the **[Apache License 2.0](LICENSE)** (see [LICENSE-APACHE](LICENSE-APACHE)).
- **Client Libraries & SDKs (`packages/`):** Licensed under the **[MIT License](LICENSE-MIT)** to allow friction-free embedding into any commercial or proprietary application without licensing constraints.

See [LICENSE](LICENSE), [LICENSE-APACHE](LICENSE-APACHE), [LICENSE-MIT](LICENSE-MIT), and [NOTICE](NOTICE) for complete licensing terms.

