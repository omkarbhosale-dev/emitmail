# EmitMail Core API (`apps/api`)

EmitMail is a modern, self-hosted, open-source Email Service Provider (ESP) platform—a lightweight, 100% tenant-owned alternative to Resend, SendGrid, and Mailgun.

This package (`apps/api`) provides the core backend services:
- **Single Global Root `.env` Architecture**: Zero per-app environment files. All services (API, Dashboard, Worker, Database, Redis) read exclusively from the root `emitmail/.env`.
- **Dynamic Master MTA Infrastructure (`ServerConfig`)**: Full tenant autonomy. Self-hosters bring their own VPS and hostname with dynamic database-backed server configuration and pre-flight DNS verification checklists.
- **Authentication & Authorization**: JWT-based session security for dashboard administration with mandatory initial password reset (`mustChangePassword: true`).
- **User Settings**: Profile, email, and timezone management.
- **Multi-Domain Cryptography**: Automatic 2048-bit RSA DKIM keypair generation, AES-256-GCM private key envelope encryption, and single-line DNS TXT record formatting.
- **Live Public DNS Verification Engine**: Uncached DNS verification directly querying Cloudflare (`1.1.1.1`) and Google (`8.8.8.8`) for DKIM, Return-Path SPF, Return-Path MX bounce routing, and DMARC.
- **API Key & Secret Infrastructure**: High-entropy prefix-based API keys (`emit_live_...`) and secrets (`emit_sec_...`) with SHA-256 one-way hashing, domain scoping, and toggleable activation.

---

## 1. Single Root `.env` Architecture

Self-hosted users and developers only ever configure **ONE** `.env` file at the root of the monorepo:
```
emitmail/
├── .env                <-- The ONLY .env file across the entire stack
├── .env.example        <-- Monorepo master template
├── docker-compose.dev.yml
├── apps/
│   ├── api/            <-- Reads ../../.env automatically
│   ├── dashboard/
│   └── worker/
```

### 1.1 Master Configuration (`.env.example`)
Copy `.env.example` to `.env` in the repository root:
```bash
cp .env.example .env
```

```ini
# Environment
NODE_ENV=development

# Service Ports & URLs
PORT=4000
API_PORT=4000
DASHBOARD_PORT=3000
DOCS_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# PostgreSQL Database
POSTGRES_USER=emitmail
POSTGRES_PASSWORD=emitmail_pass
POSTGRES_DB=emitmail
DATABASE_URL=postgresql://emitmail:emitmail_pass@localhost:5432/emitmail?schema=public

# Redis Broker / Cache
REDIS_PASSWORD=emitmail_redis_pass
REDIS_URL=redis://localhost:6379

# Security & Secrets
JWT_SECRET=emitmail_super_secret_jwt_key_change_in_prod_2026
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Master Self-Hosted Mail Server Configuration
MAIL_SERVER_HOSTNAME=mail.yourdomain.com
SPF_INCLUDE_DOMAIN=_spf.yourdomain.com
VPS_PUBLIC_IPV4=0.0.0.0
```

---

## 2. Self-Hoster Infrastructure Prerequisites

Before adding sending domains, configure your Master Mail Server Hostname and VPS Reverse DNS. This establishes your server as a legitimate MTA and prevents Gmail/Outlook from rejecting outgoing email:

| Record Type | Host / IP | Target Value | Description |
| :--- | :--- | :--- | :--- |
| **A Record** | `mail.yourdomain.com` | `YOUR_VPS_PUBLIC_IP` | Directs inbound and outbound SMTP mail routing to your VPS. |
| **TXT (SPF)** | `_spf.yourdomain.com` | `v=spf1 ip4:YOUR_VPS_PUBLIC_IP -all` | Authorizes your VPS IP to send mail. Sender domains will include this record (`include:_spf.yourdomain.com`). |
| **PTR (rDNS)** | `YOUR_VPS_PUBLIC_IP` | `mail.yourdomain.com` | Configured in your VPS provider's control panel (Hetzner, DigitalOcean, AWS, OVH, Linode). Reverse DNS is strictly enforced by major inbox providers. |

> **Tip**: You can view this live checklist and update your server hostname at any time via `GET /api/v1/server-config` and `PATCH /api/v1/server-config`.

---

## 3. Quickstart & Workflow Commands

All commands can be run either from the **monorepo root** or within `apps/api`.

### 3.1 Start Infrastructure Containers (PostgreSQL & Redis)
From the repository root:
```bash
# Start PostgreSQL 16 & Redis 7 in the background
pnpm dev:docker
# OR: docker compose -f docker-compose.dev.yml up -d
```

Verify containers are running:
```bash
docker ps
```

### 3.2 Install Dependencies & Setup Database
```bash
# 1. Install monorepo dependencies
pnpm install

# 2. Generate Prisma Client (reads root .env automatically)
pnpm db:generate

# 3. Synchronize database schema (creates users, domains, api_keys, server_config)
pnpm db:push

# 4. (Optional) Run explicit database seed
pnpm db:seed
```

### 3.3 Start the Development Server
```bash
# From repository root:
pnpm dev:api

# OR from inside apps/api:
pnpm dev
```
The server will boot on `http://localhost:4000`. On boot, the server automatically executes:
- `ensureDefaultAdminExists()`: Creates admin account (`admin` / `emitmail` with `mustChangePassword: true`) if none exists.
- `ensureServerConfigExists()`: Initializes master `ServerConfig` from root `.env` values.

### 3.4 Stopping the Server & Managing Processes
To stop the development server:
- **Terminal**: Press `Ctrl + C` (triggers graceful shutdown, closing HTTP server, PostgreSQL, and Redis connections).
- **Background / Windows PowerShell**:
  ```powershell
  # Locate process listening on port 4000
  Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object OwningProcess

  # Stop process by ID
  Stop-Process -Id <PID> -Force
  ```
- **Stop Docker Containers**:
  ```bash
  pnpm dev:docker:down
  # OR: docker compose -f docker-compose.dev.yml down
  ```

---

## 4. Cryptographic Security Standards

- **DKIM Key Generation**: Native 2048-bit RSA keypairs generated on domain creation via `node:crypto.generateKeyPairSync`.
- **Private Key Encryption (At Rest)**: Private keys are encrypted using AES-256-GCM with a 96-bit random initialization vector (`iv`), 128-bit authentication tag (`authTag`), and 256-bit key derived from `ENCRYPTION_KEY`. Stored as `iv:authTag:ciphertext`.
- **Public Key Formatting**: Strips PEM headers (`BEGIN/END`) and whitespace so keys can be copied directly into a single DNS TXT record.
- **API Key & Secret Hashing**: API keys (`emit_live_...`) and secrets (`emit_sec_...`) are hashed using SHA-256 (`keyHash`, `secretHash`). Raw secrets are returned strictly once during generation and never stored in plain text.

---

## 5. API Reference

All responses follow a consistent JSON envelope:
- **Success**: `{ "success": true, "message": "...", "data": { ... } }`
- **Error**: `{ "success": false, "message": "...", "errors": [ { "path": "...", "message": "..." } ] }`

### 5.1 System Health & Version (`/api/v1`)

#### `GET /api/v1/health`
Checks database and Redis connectivity.
- **Auth**: None (Public)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Health check status",
  "data": {
    "status": "healthy",
    "uptime": 12.34,
    "timestamp": "2026-10-23T18:30:00.000Z",
    "services": {
      "database": "connected",
      "redis": "connected"
    }
  }
}
```

#### `GET /api/v1/system/version`
Returns the running EmitMail server version and checks for published GitHub releases with semantic versioning analysis. Results are cached in Redis with a 6-hour TTL (`emitmail:system:latest_release`) to prevent GitHub rate limits. Degrades gracefully in offline or restricted environments.
- **Auth**: None (Public)
- **Query Parameters**:
  - `force` (optional, boolean): Set `?force=true` to bypass Redis cache and query GitHub API immediately.
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "System version and update information retrieved successfully",
  "data": {
    "currentVersion": "0.1.0",
    "latestVersion": "1.0.0",
    "hasUpdate": true,
    "isMajor": true,
    "releaseName": "EmitMail v1.0.0 — Production Release",
    "publishedAt": "2026-10-23T10:00:00Z",
    "releaseUrl": "https://github.com/emitmail/emitmail/releases/tag/v1.0.0",
    "releaseNotes": "## What's Changed\n* Added Resend SDK compatibility...\n* Master MTA dynamic DNS pre-flight engine",
    "updateCommand": "docker compose pull && docker compose up -d"
  }
}
```

---

### 5.2 Authentication (`/api/v1/auth`)

#### `POST /api/v1/auth/login`
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "username": "admin",
  "password": "emitmail"
}
```
- **Response `200 OK`**: Returns `accessToken` (valid for 7 days) and `user` object.

#### `GET /api/v1/auth/me`
- **Auth**: `Bearer <accessToken>`
- **Response `200 OK`**: Current authenticated profile.

#### `POST /api/v1/auth/change-password`
- **Auth**: `Bearer <accessToken>`
- **Request Body**:
```json
{
  "currentPassword": "emitmail",
  "newPassword": "NewSecurePassword#2026",
  "confirmPassword": "NewSecurePassword#2026"
}
```
- **Response `200 OK`**: Sets `mustChangePassword: false`.

---

### 5.3 Master Server Configuration (`/api/v1/server-config`)

#### `GET /api/v1/server-config`
Returns active MTA server hostnames and the Master DNS checklist.
- **Auth**: `Bearer <accessToken>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Master server configuration retrieved successfully",
  "data": {
    "serverConfig": {
      "id": "master",
      "mailServerHostname": "mail.yourdomain.com",
      "spfIncludeDomain": "_spf.yourdomain.com",
      "vpsPublicIpv4": "198.51.100.1",
      "isConfigured": true,
      "updatedAt": "2026-10-23T18:45:00.000Z"
    },
    "masterDnsChecklist": [
      {
        "type": "A",
        "host": "mail.yourdomain.com",
        "value": "198.51.100.1",
        "purpose": "Mail Server Inbound & Outbound Hostname",
        "instructions": "Add an A record on your master DNS provider pointing 'mail.yourdomain.com' to '198.51.100.1'."
      },
      {
        "type": "TXT",
        "host": "_spf.yourdomain.com",
        "value": "v=spf1 ip4:198.51.100.1 -all",
        "purpose": "Master SPF Authority Record",
        "instructions": "Add a TXT record for '_spf.yourdomain.com' so sender domains can include your mail cluster authorized IP."
      },
      {
        "type": "PTR",
        "ip": "198.51.100.1",
        "value": "mail.yourdomain.com",
        "purpose": "VPS Reverse DNS (rDNS)",
        "instructions": "Set the reverse DNS (PTR) record for IP '198.51.100.1' to 'mail.yourdomain.com' in your VPS provider panel."
      }
    ]
  }
}
```

#### `PATCH /api/v1/server-config`
Updates master MTA hostname and IP, and dynamically refreshes `MX` and `SPF` records for any `PENDING` domains.
- **Auth**: `Bearer <accessToken>`
- **Request Body**:
```json
{
  "mailServerHostname": "mail.acme.com",
  "spfIncludeDomain": "_spf.acme.com",
  "vpsPublicIpv4": "203.0.113.10"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Server configuration updated successfully. Pending domain records refreshed.",
  "data": {
    "serverConfig": {
      "id": "master",
      "mailServerHostname": "mail.acme.com",
      "spfIncludeDomain": "_spf.acme.com",
      "vpsPublicIpv4": "203.0.113.10",
      "isConfigured": true,
      "updatedAt": "2026-10-23T18:50:00.000Z"
    },
    "masterDnsChecklist": [ ... ],
    "refreshedPendingDomainsCount": 2
  }
}
```

---

### 5.4 User Settings (`/api/v1/users`)

#### `GET /api/v1/users/settings`
- **Auth**: `Bearer <accessToken>`
- **Response `200 OK`**: Profile settings.

#### `PATCH /api/v1/users/settings`
- **Auth**: `Bearer <accessToken>`
- **Request Body** (optional fields):
```json
{
  "fullName": "Admin User",
  "email": "admin@example.com",
  "timezone": "UTC"
}
```

---

### 5.5 Domain Management (`/api/v1/domains`)

#### `POST /api/v1/domains`
Registers a new sender domain and generates 2048-bit RSA keys using active `ServerConfig`.
- **Auth**: `Bearer <accessToken>`
- **Request Body**:
```json
{
  "domainName": "example.com",
  "dkimSelector": "esp",
  "returnPathSubdomain": "send"
}
```
- **Response `201 Created`**: Returns domain with 4 DNS records (DKIM, Return-Path SPF, Return-Path MX, DMARC) based on tenant ServerConfig.

#### `GET /api/v1/domains`
Lists registered domains.
- **Auth**: `Bearer <accessToken>`
- **Query Parameters**: `status` (`PENDING` | `VERIFIED` | `FAILED`), `search`.

#### `GET /api/v1/domains/:id`
Retrieves domain details including `dnsRecords` array.
- **Auth**: `Bearer <accessToken>`

#### `POST /api/v1/domains/:id/verify`
Live uncached DNS resolution via Cloudflare (`1.1.1.1`) and Google (`8.8.8.8`).
- **Auth**: `Bearer <accessToken>`

#### `DELETE /api/v1/domains/:id`
Deletes domain and cascades associated API keys.
- **Auth**: `Bearer <accessToken>`

---

### 5.6 API Keys & SDK Handshake (`/api/v1/api-keys`)

#### `POST /api/v1/api-keys`
Generates a new API Key & Secret pair.
- **Auth**: `Bearer <accessToken>`
- **Request Body**:
```json
{
  "name": "Production Mailer",
  "domainId": null,
  "expiresAt": null
}
```
- **Response `201 Created`**: Returns raw `apiKey` and `apiSecret` (shown once).

#### `GET /api/v1/api-keys`
Lists all API keys (never returns hashes or secrets).
- **Auth**: `Bearer <accessToken>`

#### `PATCH /api/v1/api-keys/:id/toggle`
Toggles key active/paused status.
- **Auth**: `Bearer <accessToken>`

#### `DELETE /api/v1/api-keys/:id`
Permanently revokes and deletes the API key.
- **Auth**: `Bearer <accessToken>`

#### `POST /api/v1/api-keys/verify-credentials` (Public SDK Handshake)
Verifies SDK credentials and returns key authorization scope.
- **Headers Option 1**:
  - `x-api-key: emit_live_...`
  - `x-api-secret: emit_sec_...`
- **Headers Option 2**:
  - `Authorization: Bearer <apiKey>:<apiSecret>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "API credentials verified successfully",
  "data": {
    "authenticated": true,
    "keyId": "e9a8b7c6-d5e4-3210-fedc-ba9876543210",
    "keyName": "Production Mailer",
    "keyPrefix": "emit_live_a1b2c3d4",
    "scope": "ALL_VERIFIED_DOMAINS",
    "scopedDomainId": null
  }
}
```

---

## 6. Postman Collection

Import `apps/api/EmitMail.postman_collection.json` into Postman.

The collection is pre-configured with 7 folders:
1. `0. System Health` (Health checks + Version & Update engine)
2. `1. Authentication`
3. `2. Server Configuration & Pre-Flight Checks`
4. `3. User Settings`
5. `4. Domains`
6. `5. API Keys`

### Automatic Variable Chaining
Test scripts inside the collection automatically store runtime variables:
- `accessToken` on `POST /api/v1/auth/login`
- `domainId` on `POST /api/v1/domains`
- `keyId`, `apiKey`, and `apiSecret` on `POST /api/v1/api-keys`

This allows you to execute end-to-end flows in Postman without manually copying tokens or IDs.
