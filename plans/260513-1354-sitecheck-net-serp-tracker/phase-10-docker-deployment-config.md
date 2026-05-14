---
phase: 10
title: "Docker (Local Dev) & PM2 Deployment Config"
status: pending
priority: P2
effort: "2h"
dependencies: [6, 9]
---

# Phase 10: Docker (Local Dev) & PM2 Deployment Config

## Overview

Two distinct environments:
- **Local development** — Docker Compose runs MongoDB + Redis only; app and worker run natively via `npm run dev` / `npm run worker`
- **Dev/Production server** — native install, MongoDB + Redis on host, app + worker managed by PM2 (mirrors original `ecosystem.config.js` pattern from sitecheck)

No Dockerfile needed for the application itself.

## Requirements

- Functional: `docker-compose up` starts MongoDB + Redis for local dev; `pm2 start ecosystem.config.js` manages app + worker on server
- Non-functional: PM2 auto-restart on crash, log rotation, `.env` never committed, `NEXTAUTH_SECRET` 32+ chars

## Architecture

```
Local Dev                          Production Server
─────────────────────              ──────────────────────────────
docker-compose.yml                 MongoDB (native/systemd)
  └─ mongo:7                       Redis (native/systemd)
  └─ redis:7-alpine                Node.js (via nvm/fnm)
                                   PM2
npm run dev     → Next.js :3000      └─ app  (next start)
npm run worker  → BullMQ worker      └─ worker (tsx/node)
```

## Related Code Files

- Create: `docker-compose.yml` — local dev services (mongo + redis only)
- Create: `ecosystem.config.js` — PM2 process config
- Create: `.env.example`
- Create: `app/api/health/route.ts`
- Modify: `package.json` — scripts for dev, build, start, worker

## Implementation Steps

1. **`docker-compose.yml`** — local dev only, **no app/worker containers**:
   ```yaml
   version: '3.9'
   
   services:
     mongo:
       image: mongo:7
       restart: unless-stopped
       ports:
         - "27017:27017"          # exposed to host for local dev
       volumes:
         - mongo_data:/data/db
       environment:
         MONGO_INITDB_DATABASE: sitecheck
   
     redis:
       image: redis:7-alpine
       restart: unless-stopped
       ports:
         - "6379:6379"            # exposed to host for local dev
       volumes:
         - redis_data:/data
   
   volumes:
     mongo_data:
     redis_data:
   ```
   
   Usage: `docker-compose up -d` → then `npm run dev` + `npm run worker` separately.

2. **`ecosystem.config.js`** — PM2 process config for server (matches original pattern):
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'sitecheck-app',
         script: 'node_modules/.bin/next',
         args: 'start',
         cwd: './',
         instances: 1,
         autorestart: true,
         watch: false,
         max_memory_restart: '1G',
         env: {
           NODE_ENV: 'production',
           PORT: 3000,
         },
         log_date_format: 'YYYY-MM-DD HH:mm:ss',
       },
       {
         name: 'sitecheck-worker',
         script: 'worker/worker-startup.js',   // compiled JS in prod
         cwd: './',
         instances: 1,
         autorestart: true,
         watch: false,
         max_memory_restart: '2G',             // crawler uses more memory
         env: {
           NODE_ENV: 'production',
         },
         log_date_format: 'YYYY-MM-DD HH:mm:ss',
       },
     ],
   }
   ```

3. **`package.json` scripts**
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build && tsc -p tsconfig.worker.json",
       "start": "next start",
       "worker": "tsx watch worker/worker-startup.ts",
       "worker:build": "tsc -p tsconfig.worker.json",
       "pm2:start": "pm2 start ecosystem.config.js",
       "pm2:stop": "pm2 stop ecosystem.config.js",
       "pm2:restart": "pm2 restart ecosystem.config.js",
       "pm2:logs": "pm2 logs"
     }
   }
   ```

4. **Worker TypeScript compilation** — worker runs as plain Node.js in prod (no tsx runtime). Add `tsconfig.worker.json`:
   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "outDir": "./worker-dist",
       "rootDir": "./",
       "module": "commonjs",
       "noEmit": false
     },
     "include": ["worker/**/*", "lib/**/*", "models/**/*", "types/**/*"]
   }
   ```
   Update `ecosystem.config.js` `script` to `worker-dist/worker/worker-startup.js`.

5. **`.env.example`** (complete template):
   ```
   # Database
   MONGODB_URI=mongodb://localhost:27017/sitecheck
   REDIS_URL=redis://localhost:6379
   
   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=change-me-must-be-32-chars-minimum
   
   # Admin
   ADMIN_EMAILS=admin@example.com
   
   # Crawler
   CHROME_PATH=/usr/bin/google-chrome-stable
   USER_PROFILE_SLOTS=50
   WORKER_DATA_DIR=./worker/user_data
   TWO_CAPTCHA_API_KEY=
   TWO_CAPTCHA_ENABLED=false
   TWO_CAPTCHA_TIMEOUT_MS=360000
   TWO_CAPTCHA_POLL_INTERVAL_MS=5000
   
   # App
   PORT=3000
   ```

6. **`.gitignore` additions**:
   ```
   .env
   .env.local
   .env.production
   worker/user_data/
   worker-dist/
   .next/
   node_modules/
   ```

7. **Health check route** (`app/api/health/route.ts`):
   ```typescript
   export async function GET() {
     return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
   }
   ```
   Used by PM2 or reverse proxy (nginx) for uptime monitoring.

8. **Server deployment workflow**:
   ```bash
   # First time setup on server
   git clone <repo> && cd sitecheck_net
   cp .env.example .env && nano .env     # fill in real values
   npm ci
   npm run build                          # builds Next.js + compiles worker
   pm2 start ecosystem.config.js
   pm2 save                               # persist across server reboot
   pm2 startup                            # enable PM2 on boot
   
   # Deploy update
   git pull
   npm ci
   npm run build
   pm2 restart ecosystem.config.js
   ```

9. **Local dev workflow** (README note):
   ```bash
   # Start MongoDB + Redis
   docker-compose up -d
   
   # Terminal 1: Next.js app
   npm run dev
   
   # Terminal 2: BullMQ worker (hot reload)
   npm run worker
   ```

10. **Security notes for server**:
    - MongoDB bind to `127.0.0.1` only (not `0.0.0.0`) — edit `/etc/mongod.conf`
    - Redis bind to `127.0.0.1` — edit `/etc/redis/redis.conf` + add `requirepass`
    - Reverse proxy (nginx) in front of Next.js on port 3000
    - `NEXTAUTH_SECRET` minimum 32 characters: `openssl rand -base64 32`
    - `.env` never committed, copied manually on server

## Success Criteria

- [ ] `docker-compose up -d` starts mongo + redis, `npm run dev` connects to them
- [ ] `npm run build` compiles both Next.js and worker TypeScript
- [ ] `pm2 start ecosystem.config.js` starts both `sitecheck-app` and `sitecheck-worker`
- [ ] PM2 auto-restarts processes on crash
- [ ] `/api/health` returns 200
- [ ] Worker picks up queued jobs after `pm2 start`
- [ ] `pm2 logs` shows logs from both processes
- [ ] `.env` excluded from git

## Risk Assessment

- **Worker tsconfig paths** — `@/models/...` aliases must resolve in compiled output; use `tsconfig-paths` or replace aliases with relative paths in worker code
- **PM2 + ES modules** — if Next.js output uses ESM, worker must also be ESM or keep CommonJS; use `"module": "commonjs"` in `tsconfig.worker.json` to avoid mismatch
- **MongoDB on server without Docker** — if server uses Docker for mongo, `MONGODB_URI` still points to `localhost:27017`; no change needed in ecosystem config
