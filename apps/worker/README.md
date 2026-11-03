# EmitMail — Delivery Worker Engine
### An open-source alternative of Resend that works on the Resend platform

> 📚 **Official Documentation:** [https://emitmail.vercel.app](https://emitmail.vercel.app)

[![Official Docs](https://img.shields.io/badge/Documentation-emitmail.vercel.app-FF6600.svg)](https://emitmail.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-v20%20%7C%20v22-green.svg)](https://nodejs.org/)
[![BullMQ](https://img.shields.io/badge/BullMQ-6.4-red.svg)](https://bullmq.io/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

The **EmitMail Delivery Worker** (`apps/worker`) is the decoupled, high-performance background execution engine of EmitMail. It handles direct MX transmission, 2048-bit DKIM signature generation, bounce tracking, inbound email stream ingestion, and real-time HMAC-SHA256 webhook dispatches.

---

## Key Capabilities

- **Decoupled Architecture:** Runs independently from the REST API, reading delivery jobs from Redis (`email-delivery-queue`) using BullMQ.
- **Direct MTA Port 25 Delivery:** Queries recipient domain `MX` records (`dns.promises.resolveMx`) and establishes direct TLS SMTP connections to destination mail servers (Google Workspace, Microsoft 365, ProtonMail).
- **2048-Bit DKIM Signing:** Decrypts the sender domain's private key using AES-256-GCM and computes RFC 6376 cryptographic signatures on outgoing MIME messages.
- **Strict Return-Path Alignment:** Routes envelope bounce messages through a dedicated subdomain (`bounces@send.<domain>`) for strict SPF alignment.
- **Inbound Stream Worker:** Consumes raw email payloads from `inbound-email-queue`, parses attachments and HTML, and saves them to PostgreSQL.
- **Webhook Telemetry Engine:** Dispatches cryptographically signed HTTP webhooks (`X-EmitMail-Signature`) with automatic exponential backoff retry schedules.

---

## Directory Layout

```text
apps/worker/
├── src/
│   ├── config/              # Redis and PostgreSQL database connections
│   │   ├── db.ts            # Prisma client instance
│   │   └── env.ts           # Zod environment schema
│   ├── workers/             # BullMQ Worker implementations
│   │   ├── emailDelivery.worker.ts # Direct SMTP delivery consumer
│   │   └── inboundEmail.worker.ts  # Inbound email processing & webhook dispatch
│   ├── services/            # Core transmission services
│   │   ├── mxResolver.service.ts   # Recipient MX DNS resolution
│   │   ├── smtpTransport.service.ts# Direct MTA TLS handshake
│   │   └── webhookDispatcher.service.ts # Signed webhook publisher
│   ├── utils/               # DKIM signing and deliverability verification
│   │   ├── dkimSigner.ts    # Nodemailer 2048-bit DKIM signer
│   │   └── deliverabilityCheck.ts  # FCrDNS (PTR) preflight validator
│   └── index.ts             # Worker service entry point
├── package.json
└── tsconfig.json
```

---

## Local Development & Setup

### 1. Start Infrastructure
Make sure PostgreSQL and Redis are running:
```bash
# In repository root
pnpm dev:docker
```

### 2. Generate Prisma Client
```bash
pnpm db:generate
```

### 3. Start Delivery Worker
```bash
# From repository root:
pnpm dev:worker

# Or directly in apps/worker:
pnpm dev
```

---

## Worker Configuration

Worker behavior is configured via the root `.env`:

```bash
# Concurrency: Number of parallel delivery jobs per worker process
WORKER_CONCURRENCY=10

# Master Mail Server Hostname (used in SMTP EHLO/HELO greeting)
SMTP_EHLO_HOSTNAME=mail.yourdomain.com
MAIL_SERVER_HOSTNAME=mail.yourdomain.com

# Dedicated Bounce Subdomain
RETURN_PATH_SUBDOMAIN=send

# Fallback direct MX delivery
DIRECT_MX_FALLBACK=true
```

---

## Local Simulation & Testing

You can simulate the entire queue-to-delivery flow locally without sending real emails:

```bash
# Test Resend SDK Queue -> Worker -> Delivery flow
pnpm test:resend-worker

# Run full deliverability and security check
pnpm test:deliverability
```

