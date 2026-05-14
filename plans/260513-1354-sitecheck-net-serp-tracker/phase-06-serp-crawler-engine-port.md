---
phase: 6
title: "SERP Crawler Engine (Port)"
status: pending
priority: P1
effort: "6h"
dependencies: [5]
---

# Phase 6: SERP Crawler Engine (Port)

## Overview

Port the existing crawler logic from `/Users/elknowsdev/Documents/CODE/meo/sitecheck/src/app/controller/crawler.js` into a TypeScript BullMQ worker. The worker consumes jobs from the `serp-crawl` queue, crawls Google SERP per keyword, saves `SerpResult` documents, and updates `CrawlJob` status.

## Requirements

- Functional: BullMQ worker processes crawl jobs, crawls each keyword sequentially within a job, saves results with position of tracked domain, handles retries and CAPTCHA
- Non-functional: Worker runs as a separate process (not in Next.js), concurrency=3 (matches original), browser profile pool (max 50 slots), proxy rotation per retry

## Architecture

```
worker/
├── serp-crawl-worker.ts          # BullMQ Worker entrypoint
├── crawler/
│   ├── crawl-keyword.ts          # per-keyword crawl (ported from crawler.js)
│   ├── browser-profile-pool.ts   # ported from UserDataPool.js
│   ├── proxy-reader.ts           # reads proxies from DB (not file)
│   ├── captcha-solver.ts         # ported from twoCaptcha.js
│   ├── google-url-builder.ts     # builds Google search URL with country params
│   └── extract-serp-results.ts   # extract domains + links from page
└── worker-startup.ts             # connect DB + Redis, start worker
```

### Key Changes vs Original

| Original | New |
|----------|-----|
| `proxy.txt` file | MongoDB `Proxy` collection |
| `node-cron` scheduler | BullMQ Worker |
| `Domain` model (one doc per keyword) | `SerpResult` model (per keyword per run) |
| No position tracking | Finds domain position in results |
| Country = hardcoded | `countries` array from KeywordList |
| `user_data/` on filesystem | Same filesystem pattern, `WORKER_DATA_DIR` env |

### Google URL Construction by Country

```typescript
// google-url-builder.ts
const COUNTRY_PARAMS: Record<string, string> = {
  vn: 'gl=vn&hl=vi',
  us: 'gl=us&hl=en',
  uk: 'gl=gb&hl=en',
  global: '',
}

export function buildGoogleUrl(keyword: string, country: string): string {
  const q = keyword.split(' ').join('+')
  const params = COUNTRY_PARAMS[country] ?? ''
  return `https://www.google.com/search?q=${q}&num=100${params ? '&' + params : ''}`
}
```

### Position Detection

After extracting all result links, check if any link's hostname matches workspace `domain`:

```typescript
export function findDomainPosition(links: string[], targetDomain: string): number | null {
  const normalized = normalizeDomain(targetDomain)
  for (let i = 0; i < links.length; i++) {
    try {
      const hostname = new URL(links[i]).hostname.replace(/^www\./, '')
      if (hostname === normalized) return i + 1  // 1-based position
    } catch { continue }
  }
  return null
}
```

## Related Code Files

- Create: `worker/serp-crawl-worker.ts`
- Create: `worker/worker-startup.ts`
- Create: `worker/crawler/crawl-keyword.ts` (port of `crawler.js:mainWithRetry`)
- Create: `worker/crawler/browser-profile-pool.ts` (port of `UserDataPool.js`)
- Create: `worker/crawler/proxy-reader.ts` (reads from MongoDB Proxy collection)
- Create: `worker/crawler/captcha-solver.ts` (port of `twoCaptcha.js`)
- Create: `worker/crawler/google-url-builder.ts`
- Create: `worker/crawler/extract-serp-results.ts`
- Modify: `package.json` — add `worker` script

## Implementation Steps

1. **Worker dependencies**
   ```bash
   npm install bullmq puppeteer-real-browser puppeteer-extra puppeteer-extra-plugin-stealth p-all
   npm install --save-dev @types/node
   ```

2. **`serp-crawl-worker.ts`** — main BullMQ worker:
   ```typescript
   import { Worker } from 'bullmq'
   import { getRedis } from '@/lib/db/redis'
   import { connectDB } from '@/lib/db/mongoose'
   import { CrawlJob } from '@/models/crawl-job.model'
   import { SerpResult } from '@/models/serp-result.model'
   import { crawlKeyword } from './crawler/crawl-keyword'
   import pAll from 'p-all'
   
   const CONCURRENCY = 3
   
   export function startSerpWorker() {
     const worker = new Worker('serp-crawl', async (job) => {
       const { crawlJobId, keywords, countries, domain, workspaceId, keywordListId } = job.data
   
       await CrawlJob.findByIdAndUpdate(crawlJobId, { status: 'running', startedAt: new Date() })
   
       const country = countries[0] ?? 'vn'  // MVP: use first country
       const tasks = keywords.map(keyword => async () => {
         const result = await crawlKeyword(keyword, domain, country, crawlJobId)
         await SerpResult.create({
           crawlJobId, workspaceId, keywordListId, keyword, domain,
           position: result.position,
           previousPosition: null,  // populated by GetSerpResultsService
           links: result.links,
           domains: result.domains,
           googleUrl: result.googleUrl,
           crawledAt: new Date(),
         })
       })
   
       await pAll(tasks, { concurrency: CONCURRENCY })
       await CrawlJob.findByIdAndUpdate(crawlJobId, { status: 'done', completedAt: new Date() })
     }, {
       connection: getRedis(),
       concurrency: 1,  // one job at a time (keywords run in parallel within job)
     })
   
     worker.on('failed', async (job, err) => {
       if (job) await CrawlJob.findByIdAndUpdate(job.data.crawlJobId, { status: 'failed' })
       console.error('[Worker] Job failed:', err)
     })
   
     return worker
   }
   ```

3. **`crawl-keyword.ts`** — port of `mainWithRetry()`:
   - Same constants: `MAX_RETRIES=30`, `RETRY_DELAY=15000`, `DOMAINS_TARGET=50`, `MAX_PAGES=30`
   - Accept `domain` parameter for position detection
   - Use `buildGoogleUrl(keyword, country)` for URL
   - Use `proxyReader` from DB instead of `proxy.txt`
   - Return `{ position, links, domains, googleUrl }`

4. **`browser-profile-pool.ts`** — direct port of `UserDataPool.js` to TypeScript:
   - `acquire(jobKey)` → scan `WORKER_DATA_DIR/profile-1..N`, find unlocked slot, create `.lock` file
   - `release(jobKey)` → unlink `.lock` file
   - `MAX_SLOTS` from `USER_PROFILE_SLOTS` env (default 50)
   - Use `WORKER_DATA_DIR` env var (default `./worker/user_data`)

5. **`proxy-reader.ts`** — replaces `proxy.txt` file reading:
   ```typescript
   import { Proxy } from '@/models/proxy.model'
   import { connectDB } from '@/lib/db/mongoose'
   
   export async function getProxiesForCountry(country: string) {
     await connectDB()
     const proxies = await Proxy.find({ countries: country, isActive: true })
     // Shuffle for load distribution
     return proxies.sort(() => Math.random() - 0.5)
   }
   ```
   
   Fallback: if no DB proxies found, check `PROXY_FILE` env for backward compat with `proxy.txt`.

6. **`captcha-solver.ts`** — direct TypeScript port of `twoCaptcha.js`:
   - `solveCaptchaIfPresent(page)` → detect reCAPTCHA / image captcha, call 2Captcha API if `TWO_CAPTCHA_ENABLED=true`
   - Same poll interval/timeout behavior

7. **`extract-serp-results.ts`** — page scraping logic ported from `fetchData()`:
   - Selector: `a[jsname="UWckNb"]` (organic results)
   - Remove ad elements: `#tvcap`, `#tadsb`
   - Extract hostnames, deduplicate, filter YouTube
   - Return `{ links: string[], domains: string[] }`

8. **`worker-startup.ts`** — entry point for the worker process:
   ```typescript
   import { connectDB } from '../lib/db/mongoose'
   import { startSerpWorker } from './serp-crawl-worker'
   
   async function main() {
     await connectDB()
     console.log('[Worker] MongoDB connected')
     startSerpWorker()
     console.log('[Worker] SERP crawl worker started')
   }
   
   main().catch(console.error)
   ```

9. **`package.json` scripts**
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "worker": "tsx watch worker/worker-startup.ts",
       "worker:prod": "node dist/worker/worker-startup.js"
     }
   }
   ```
   Install `tsx` for TypeScript execution: `npm install -D tsx`.

10. **`previousPosition` backfill** — after saving all SerpResults for a job, run a single aggregation to find each keyword's previous result and update `previousPosition` field. Call this at end of worker job processing.

## Success Criteria

- [ ] Worker starts without errors: `npm run worker`
- [ ] Trigger crawl job → worker picks it up within 10 seconds
- [ ] Each keyword crawled, `SerpResult` created with `position` (or `null` if not found)
- [ ] `previousPosition` populated from prior run
- [ ] `CrawlJob.status` transitions: `pending → running → done`
- [ ] Failed crawl → `CrawlJob.status = 'failed'`
- [ ] Proxy rotation works from DB proxies
- [ ] CAPTCHA solver activates when `TWO_CAPTCHA_ENABLED=true`
- [ ] Browser profile pool limits to `USER_PROFILE_SLOTS` concurrent profiles

## Risk Assessment

- **`puppeteer-real-browser` in Docker** — requires Chrome installed; Dockerfile must install `google-chrome-stable`
- **Google selector change** — `a[jsname="UWckNb"]` may change; make selector configurable via `GOOGLE_RESULT_SELECTOR` env var
- **Worker crash mid-job** — BullMQ `attempts: 3` handles retries; CrawlJob status will be `failed` after exhaustion; partial SerpResults remain (acceptable for MVP)
- **Worker TypeScript** — use `tsx` in dev, compile to JS for production Docker image
