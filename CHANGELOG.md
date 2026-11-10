# Changelog

All notable changes to **EmitMail** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-10

### EmitMail v1.0.0 — General Availability (GA)

Initial public production release of **EmitMail**: an open-source, self-hosted Email Service Provider (ESP) designed for high deliverability, primary inbox placement, and cryptographically verified sender identity.

---

### 🚀 Outbound SMTP Delivery Engine
- **Direct MX Dispatch:** High-throughput transactional transmission worker powered by BullMQ and Redis with automated MX host discovery and round-robin connection pooling.
- **Strict rDNS & EHLO Alignment:** Outbound envelopes strictly align with server FQDN (`mail.<domain>`) and forward/reverse DNS (rDNS/PTR) records to prevent spam folder placement.
- **Custom Return-Path Envelope Routing:** Dedicated envelope bounce routing via `send.<domain>` with RFC 3463 bounce code classification (5.x.x permanent failure vs 4.x.x transient retry).
- **Exponential Retry & Jitter Pipeline:** Intelligent retry worker preventing downstream destination MTA rate limits and greylisting delays.
- **Idempotency Safeguards:** Built-in idempotency key resolution ensuring zero duplicate transmissions.

---

### 🛡️ Cryptographic Domain Identity & Deliverability
- **2048-bit RSA DKIM Signing:** Per-tenant 2048-bit RSA key pair generator with AES-256-GCM envelope encryption at rest. Outbound messages are digitally signed with `esp._domainkey`.
- **Custom Return-Path SPF:** Enforces strict HardFail (`v=spf1 ... -all`) on return-path envelopes without interfering with root domain SPF records.
- **Strict DMARC Policy Enforcement:** Default verification policy set to `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;` ensuring maximum sender authority and spoofing protection.
- **Dual-Resolver DNS Inspector:** Real-time DNS verification polling against Google DNS (`8.8.8.8`) and Cloudflare DNS (`1.1.1.1`) with one-click copyable record parameters.

---

### 📬 Inbound Mail Processing & Webhooks
- **Native Inbound SMTP Receiver:** Embedded SMTP daemon listening on port 25 (and 2525) for raw message ingestion.
- **Streaming Multipart MIME Parser:** Full extraction of headers, `text/plain` bodies, sanitized HTML markup, and binary attachments.
- **Virtual Mailboxes:** Provision domain mailboxes (`support@`, `sales@`, `hello@`) with automatic thread grouping and `In-Reply-To` / `References` tracking.
- **Event-Driven Webhook Delivery:** Real-time event webhooks for message dispatch, delivery confirmation, bounces, spam complaints, and inbound replies with HMAC-SHA256 signature verification.

---

### 💻 Developer Experience & Resend SDK Compatibility
- **Scoped API Tokens:** Fine-grained API key credentials (`em_live_...`) with instant revocation and role-based permissions (`mail:send`, `domains:read`, `inbox:read`, `webhooks:manage`).
- **Resend-Compatible REST API:** Drop-in endpoint compatibility supporting standard JSON payloads (`from`, `to`, `subject`, `html`, `reply_to`, `headers`).
- **Interactive Developer Console:** Fast, high-density dark UI built with Tailwind CSS, Bricolage Grotesque typography, and Cloudflare Orange (`#FF6600`) tokens.
- **Self-Hosted Zero-Downtime Updater:** Container image upgrade daemon with automated container health polling and rollback fallbacks.
