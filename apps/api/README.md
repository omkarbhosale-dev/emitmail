# EmitMail — Backend API
### An open-source alternative of Resend that works on the Resend platform

> 📚 **Official Documentation:** [https://emitmail.vercel.app](https://emitmail.vercel.app)

[![Official Docs](https://img.shields.io/badge/Documentation-emitmail.vercel.app-FF6600.svg)](https://emitmail.vercel.app)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20%20%7C%20v22-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-blue.svg)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

The **EmitMail Backend API** (`apps/api`) provides the REST API, authentication, database access through Prisma, DKIM key generation, DNS checks, and an inbound SMTP receiver on port 2525. It supports common email sending requests used by the Resend Node.js SDK; see the API and SDK guides for current behavior.

---

## Key Capabilities

- **Resend SDK support:** Provides email send endpoints for common use with the official `resend` package. Compatibility is not complete across every SDK feature.
- **2048-Bit RSA DKIM Key Generation:** Generates cryptographically secure 2048-bit RSA key pairs (`modulusLength: 2048`) on domain registration and encrypts private keys at rest using AES-256-GCM.
- **Multi-Chunk DNS Verifier:** Implements RFC 4408 / 6376 compliant DNS string-chunk joining to verify 400+ character 2048-bit DKIM records across edge nameservers (`1.1.1.1` and `8.8.8.8`).
- **Inbound SMTP Receiver:** Embedded ESMTP server running on port 2525 (mapped to 25 in Docker) with dynamic `onRcptTo` alias and catch-all validation, raw MIME stream parsing via `mailparser`, and BullMQ queue dispatch.
- **Single Global Root `.env` Architecture:** Reads all configuration from the root `emitmail/.env` file with Zod runtime validation.
- **Decoupled Asynchronous Dispatch:** Enqueues outbound email jobs into BullMQ (`email-delivery-queue`) so the HTTP API does not wait for SMTP delivery.

---

## Directory Layout

```text
apps/api/
├── prisma/
│   ├── schema.prisma        # PostgreSQL database schema
│   └── seed.ts              # Creates the first admin with a forced-change temporary password
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

The first admin is `admin` with temporary password `emitmail`. The account must change this password before using other protected endpoints.

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
Set `TEST_ADMIN_PASSWORD` in the root `.env` to a value of at least 8 characters other than `emitmail`. The workflow changes the temporary admin password to this test password on its first run and reuses it on later runs.

---

## License

This service is part of the EmitMail core platform and is licensed under the **[Apache License 2.0](../../LICENSE)**.
