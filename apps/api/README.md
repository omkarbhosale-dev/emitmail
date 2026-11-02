# EmitMail — Backend API
### An open-source alternative of Resend that works on the Resend platform

[![Node.js](https://img.shields.io/badge/Node.js-v20%20%7C%20v22-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-blue.svg)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

The **EmitMail Backend API** (`apps/api`) serves as the central control plane and REST gateway for the EmitMail platform. It provides tenant authentication, database persistence via Prisma, automatic 2048-bit RSA DKIM key generation, live DNS verification, an embedded Inbound SMTP mail receiver (Port 2525), and 100% drop-in compatibility with the official Resend SDK.

---

## Key Capabilities

- **Resend Drop-in Compatibility:** Provides exact route and parameter compatibility with the official `resend` NPM package (`POST /emails`, `POST /api/v1/emails`, `GET /emails/:id`).
- **2048-Bit RSA DKIM Key Generation:** Generates cryptographically secure 2048-bit RSA key pairs (`modulusLength: 2048`) on domain registration and encrypts private keys at rest using AES-256-GCM.
- **Multi-Chunk DNS Verifier:** Implements RFC 4408 / 6376 compliant DNS string-chunk joining to verify 400+ character 2048-bit DKIM records across edge nameservers (`1.1.1.1` and `8.8.8.8`).
- **Inbound SMTP Receiver:** Embedded ESMTP server running on port 2525 (mapped to 25 in Docker) with dynamic `onRcptTo` alias and catch-all validation, raw MIME stream parsing via `mailparser`, and BullMQ queue dispatch.
- **Single Global Root `.env` Architecture:** Reads all configuration from the root `emitmail/.env` file with Zod runtime validation.
- **Decoupled Asynchronous Dispatch:** Enqueues outbound email jobs into BullMQ (`email-delivery-queue`) in `< 15ms`, isolating the HTTP API from mail transmission latencies.

---

## Directory Layout

```text
apps/api/
├── prisma/
│   ├── schema.prisma        # PostgreSQL database schema
│   ├── migrations/          # Version-controlled SQL migrations
│   └── seed.ts              # Default admin seed script (admin / emitmail)
├── src/
│   ├── config/              # Zod environment schema, Prisma DB, Redis client
│   ├── middlewares/         # JWT admin auth and Bearer em_live_ API key auth
│   ├── modules/             # Modular feature controllers and services
│   │   ├── auth/            # Admin authentication and session management
│   │   ├── domains/         # Domain registration, 2048-bit DKIM, DNS verifier
│   │   ├── api-keys/        # High-entropy API key generation and hashing
│   │   ├── emails/          # Outbound dispatch and Resend compatibility
│   │   ├── mailboxes/       # Inbound mailbox aliases and catch-all routes
│   │   ├── webhooks/        # HMAC-SHA256 signed event subscriptions
│   │   ├── analytics/       # Aggregated delivery statistics
│   │   └── system/          # Version checker and GitHub release proxy
│   ├── inbound/
│   │   └── smtp-receiver.ts # Embedded ESMTP receiver on port 2525
│   ├── queues/              # BullMQ queue producers
│   ├── utils/               # Cryptography and DKIM generator
│   ├── app.ts               # Express application initialization
│   └── index.ts             # Service entry point and graceful shutdown
└── test-standalone-workflow.ts # Integration test suite
```

---

## Local Development & Setup

### 1. Prerequisites & Environment
Ensure the root `.env` is configured and local Docker infrastructure is running:
```bash
# In repository root
pnpm dev:docker
```

### 2. Database Migrations & Seeding
From the repository root or within `apps/api`:
```bash
# Generate Prisma Client
pnpm db:generate

# Push schema changes to PostgreSQL
pnpm db:push

# Seed default admin account
pnpm db:seed
```

### 3. Start Development Server
```bash
# From repository root:
pnpm dev:api

# Or directly in apps/api:
pnpm dev
```
The API server starts listening on `http://localhost:4000`, with the embedded Inbound SMTP server on `0.0.0.0:2525`.

---

## Core API Endpoints

### Resend-Compatible Endpoints
- `POST /emails` or `POST /api/v1/emails` — Send an outbound email (Bearer `em_live_...`)
- `GET /emails/:id` — Retrieve delivery status for an email

### Management API (JWT Authenticated)
- `POST /api/v1/auth/login` — Administrator session authentication
- `GET /api/v1/domains` — List registered sending domains
- `POST /api/v1/domains` — Add domain & generate 2048-bit RSA DKIM key
- `POST /api/v1/domains/:id/verify` — Live public DNS verification
- `POST /api/v1/domains/:id/rotate-dkim` — Rotate / upgrade DKIM key to 2048-bit
- `GET /api/v1/api-keys` — List scoped API credentials
- `POST /api/v1/api-keys` — Generate `em_live_...` API key
- `GET /api/v1/mailboxes` — List inbound mailbox aliases
- `POST /api/v1/mailboxes` — Create inbound alias (`support`, `*` for catch-all)
- `GET /api/v1/inbound-emails` — Read incoming email threads and attachments
- `GET /api/v1/system/version` — Version check & GitHub release updater
- `GET /api/v1/health` — System healthcheck

---

## Testing

Run the end-to-end API integration workflow:
```bash
pnpm test:workflow
```
