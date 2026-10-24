FROM node:20-alpine AS base

# Install OpenSSL for Prisma engine & curl/wget for healthchecks
RUN apk add --no-cache openssl libc6-compat wget curl
RUN npm install -g pnpm@10

WORKDIR /app

# Stage 1: Install workspace dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY apps/docs/package.json ./apps/docs/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile

# Stage 2: Build API
COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN pnpm build

EXPOSE 4000

# Push DB schema on container boot if needed, then launch API server
CMD ["sh", "-c", "npx prisma db push --schema=./prisma/schema.prisma --skip-generate && node dist/index.js"]
