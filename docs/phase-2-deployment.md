<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Phase 2 Deployment & Operations Guide

> **Document ID:** HS-OPS-P2-001  
> **Status:** Phase 2 Complete  
> **Target Environments:** Local Development, Docker / Standalone Container, Vercel / Cloud Run  

---

## 1. Prerequisites & Environment Variables

Create `.env.local` based on `.env.example`:

```bash
# Server Runtime Environment
NODE_ENV=production
PORT=3000

# Upstream Environmental Data Provider Keys
DATA_GOV_IN_API_KEY=your_cpcb_datagov_key
OPENAQ_API_KEY=your_openaq_v3_key
OPEN_METEO_API_KEY=optional_commercial_key

# Google Gemini GenAI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Distributed Cache & Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Firebase Admin SDK (Server-Side)
FIREBASE_PROJECT_ID=hawasaathi-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@hawasaathi-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_public_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=hawasaathi-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=hawasaathi-prod
```

---

## 2. Build & Verification Commands

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Test execution (647 tests)
npx vitest run

# 4. Production Next.js build
npm run build

# 5. Production start
npm start
```

---

## 3. Containerized Deployment (Docker)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```
