---
phase: 1
title: "Project Setup & Infrastructure"
status: pending
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Project Setup & Infrastructure

## Overview

Bootstrap the Next.js 15 project with TypeScript, shadcn/ui (shadcn-admin template), configure ESLint/Prettier, set up folder structure, connect MongoDB and Redis clients, and wire environment variables.

## Requirements

- Functional: Working Next.js dev server with shadcn-admin layout rendered, MongoDB + Redis connections verified
- Non-functional: TypeScript strict mode, env validation at startup, no secrets in code

## Architecture

```
sitecheck_net/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # login, signup pages (unauthenticated)
│   ├── (dashboard)/            # protected workspace UI
│   ├── (admin)/                # admin-only pages
│   └── api/                    # API route handlers
├── lib/
│   ├── db/
│   │   ├── mongoose.ts         # singleton connection
│   │   └── redis.ts            # BullMQ/ioredis singleton
│   ├── services/
│   │   └── base-service.ts     # BaseService<TInput, TOutput>
│   └── auth/
│       └── auth-options.ts     # NextAuth config
├── models/                     # Mongoose schemas
├── components/                 # shadcn/ui + custom components
├── hooks/                      # React hooks
├── types/                      # TypeScript interfaces
└── docker-compose.yml
```

## Related Code Files

- Create: `app/layout.tsx`, `app/(auth)/login/page.tsx`
- Create: `lib/db/mongoose.ts`, `lib/db/redis.ts`
- Create: `lib/services/base-service.ts`
- Create: `.env.example`, `docker-compose.yml`
- Create: `components/layout/sidebar.tsx`, `components/layout/header.tsx`

## Implementation Steps

1. **Bootstrap Next.js project**
   ```bash
   npx create-next-app@latest . \
     --typescript --tailwind --eslint \
     --app --src-dir=no --import-alias "@/*"
   ```

2. **Install core dependencies**
   ```bash
   npm install mongoose ioredis bullmq next-auth bcryptjs
   npm install @types/bcryptjs
   # shadcn
   npx shadcn@latest init
   npx shadcn@latest add button card table badge input form dialog dropdown-menu avatar sidebar sheet tabs
   ```

3. **Configure shadcn-admin layout** — Reference https://github.com/satnaing/shadcn-admin for sidebar/header patterns. Implement `AppSidebar` with nav items: Dashboard, Workspaces, Admin (conditional on `session.user.isAdmin`).

4. **MongoDB singleton** (`lib/db/mongoose.ts`)
   ```typescript
   import mongoose from 'mongoose'
   
   declare global { var mongoose: { conn: typeof import('mongoose') | null; promise: Promise<typeof import('mongoose')> | null } }
   
   let cached = global.mongoose ?? { conn: null, promise: null }
   global.mongoose = cached
   
   export async function connectDB() {
     if (cached.conn) return cached.conn
     if (!cached.promise) {
       cached.promise = mongoose.connect(process.env.MONGODB_URI!)
     }
     cached.conn = await cached.promise
     return cached.conn
   }
   ```

5. **Redis singleton** (`lib/db/redis.ts`)
   ```typescript
   import IORedis from 'ioredis'
   let client: IORedis | null = null
   export function getRedis() {
     if (!client) client = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })
     return client
   }
   ```

6. **BaseService** (`lib/services/base-service.ts`)
   ```typescript
   export abstract class BaseService<TInput, TOutput> {
     abstract call(input: TInput): Promise<TOutput>
     
     protected handleError(error: unknown): never {
       if (error instanceof Error) throw new ServiceError(error.message, error)
       throw new ServiceError('Unknown error')
     }
   }
   
   export class ServiceError extends Error {
     constructor(message: string, public originalError?: Error, public code?: string) {
       super(message)
       this.name = 'ServiceError'
     }
   }
   ```

7. **Environment validation** — `lib/env.ts` checks required vars on import: `MONGODB_URI`, `REDIS_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAILS`. Throw descriptive error on missing.

8. **`.env.example`**
   ```
   MONGODB_URI=mongodb://mongo:27017/sitecheck
   REDIS_URL=redis://redis:6379
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=change-me-in-production
   ADMIN_EMAILS=admin@example.com
   TWO_CAPTCHA_API_KEY=
   TWO_CAPTCHA_ENABLED=false
   CHROME_PATH=/usr/bin/google-chrome-stable
   USER_PROFILE_SLOTS=50
   ```

9. **tsconfig.json** — ensure `strict: true`, path alias `@/*` maps to root.

10. **Verify** — `npm run dev`, check `/` redirects to `/login`, MongoDB + Redis connect logs appear in console.

## Success Criteria

- [ ] `npm run dev` starts without errors
- [ ] MongoDB connection established (log on boot)
- [ ] Redis connection established
- [ ] shadcn-admin sidebar layout renders on dashboard route
- [ ] `BaseService` compiles with TypeScript strict mode
- [ ] `.env.example` covers all required vars
- [ ] No hardcoded credentials anywhere

## Risk Assessment

- **Chrome path in Docker** — must match installed binary path in Dockerfile; use `CHROME_PATH` env var
- **Mongoose global cache** — required in Next.js dev (hot reload breaks connections without it)
