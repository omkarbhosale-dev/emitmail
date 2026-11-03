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

**EmitMail** is a sovereign, production-grade Email Service Provider (ESP) and Inbound Mailbox Engine. Built with Node.js, TypeScript, PostgreSQL, Redis, and BullMQ, EmitMail gives developers and engineering teams 100% control over email deliverability, 2048-bit RSA DKIM keys, inbound routing, and operational privacy—without artificial sending limits or monthly SaaS invoices.

EmitMail provides **100% drop-in compatibility with the official Resend SDK (`resend` npm package)** and REST API endpoints, allowing you to switch by simply changing the `baseUrl`.

---

## Key Features

- **100% Resend SDK Compatibility:** Drop-in replacement for the official `resend` NPM package. Just set `baseUrl: "https://your-api.com"` (or `http://localhost:4000`) and use your `em_live_...` API key.
- **2048-Bit RSA DKIM Key Generation:** Enterprise-grade cryptographic key generation (SPKI/PKCS#8) with AES-256-GCM encrypted database storage and multi-chunk DNS TXT verification.
- **10/10 Inbox Deliverability Architecture:** Direct Port 25 SMTP handshake with recipient MTAs, dedicated Return-Path (`bounces@send.<domain>`) SPF & MX alignment, strict DMARC (`p=reject`), and rDNS (PTR) validation.
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

## Setting Up the Entire Project

Follow these steps to set up and run the entire EmitMail ecosystem locally:

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

The default values in `.env.example` work out-of-the-box for local development:
```bash
# Service Ports
PORT=4000
API_PORT=4000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
INBOUND_SMTP_PORT=2525

# PostgreSQL & Redis
DATABASE_URL=postgresql://emitmail:emitmail_pass@localhost:5432/emitmail?schema=public
REDIS_URL=redis://localhost:6379

# Cryptography & Security
JWT_SECRET=emitmail_super_secret_jwt_key_change_in_prod_2026
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Mail Server Hostname & Return-Path
MAIL_SERVER_HOSTNAME=mail.yourdomain.com
SMTP_EHLO_HOSTNAME=mail.yourdomain.com
RETURN_PATH_SUBDOMAIN=send
```

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

# Seed default admin user (admin / emitmail)
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
| **Dashboard** | [http://localhost:3000](http://localhost:3000) | Username: `admin` \| Password: `emitmail` |
| **Backend API** | [http://localhost:4000](http://localhost:4000) | Healthcheck: `http://localhost:4000/api/v1/health` |
| **Inbound SMTP** | `localhost:2525` | Accepts incoming SMTP mail traffic |
| **Documentation** | [http://localhost:3001](http://localhost:3001) | Complete interactive guide |

---

## Using the Official Resend SDK

EmitMail is 100% compatible with the official `resend` NPM package:

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
  html: '<strong>Drop-in Resend compatibility working seamlessly!</strong>',
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

Deploy EmitMail to any Linux VPS (Ubuntu, Debian) with Docker Compose in under 2 minutes:

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
- **10/10 Deliverability DNS Setup**: [http://localhost:3001/docs/dns-records](http://localhost:3001/docs/dns-records)
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

