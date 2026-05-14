---
phase: 5
title: "Keyword List Management"
status: pending
priority: P1
effort: "3h"
dependencies: [4]
---

# Phase 5: Keyword List Management

## Overview

Each workspace holds multiple keyword lists. A list has a name, comma-separated keywords, and country config (Vietnam/Global presets, extensible to multi-country). Users can trigger crawl runs per list and see status.

## Requirements

- Functional: CRUD keyword lists, comma-separated keyword parsing, country selector, trigger crawl button, double-trigger prevention, status polling
- Non-functional: Max 500 keywords per list (server-enforced), countries stored as ISO code array

## Architecture

### Country Config

Stored as `countries: [String]`:
- `['vn']` → Vietnam, adds `&gl=vn&hl=vi` to Google search URL
- `['global']` → no geo params
- Future: `['us', 'uk']` → multi-country (crawl once per country)

### Keyword Parsing (server-side)

```typescript
function parseKeywords(raw: string): string[] {
  return [...new Set(raw.split(',').map(k => k.trim()).filter(Boolean))]
}
```

Note: No lowercasing — preserve original case for brand names.

### API Routes

```
GET    /api/workspaces/[id]/keyword-lists              → list
POST   /api/workspaces/[id]/keyword-lists              → create
GET    /api/workspaces/[id]/keyword-lists/[lid]        → detail + latest CrawlJob status
PATCH  /api/workspaces/[id]/keyword-lists/[lid]        → update
DELETE /api/workspaces/[id]/keyword-lists/[lid]        → delete (cascade)
POST   /api/workspaces/[id]/keyword-lists/[lid]/crawl  → trigger crawl
```

## Related Code Files

- Create: `app/(dashboard)/workspaces/[workspaceId]/keywords/page.tsx`
- Create: `app/(dashboard)/workspaces/[workspaceId]/keywords/[listId]/page.tsx`
- Create: `app/api/workspaces/[id]/keyword-lists/route.ts`
- Create: `app/api/workspaces/[id]/keyword-lists/[lid]/route.ts`
- Create: `app/api/workspaces/[id]/keyword-lists/[lid]/crawl/route.ts`
- Create: `lib/services/keyword-list/create-keyword-list-service.ts`
- Create: `lib/services/keyword-list/get-keyword-lists-service.ts`
- Create: `lib/services/keyword-list/update-keyword-list-service.ts`
- Create: `lib/services/keyword-list/delete-keyword-list-service.ts`
- Create: `lib/services/keyword-list/trigger-crawl-service.ts`
- Create: `components/keyword-list/country-selector.tsx`
- Create: `components/keyword-list/keyword-textarea.tsx`
- Create: `components/keyword-list/crawl-status-badge.tsx`

## Implementation Steps

1. **`CreateKeywordListService`**
   ```typescript
   type Input = { workspaceId: string; name: string; rawKeywords: string; countries: string[] }
   
   async call(input: Input): Promise<Output> {
     await connectDB()
     const keywords = parseKeywords(input.rawKeywords)
     if (keywords.length > 500) throw new ServiceError('Max 500 keywords per list', undefined, 'LIMIT_EXCEEDED')
     const list = await KeywordList.create({
       workspaceId: input.workspaceId,
       name: input.name,
       keywords,
       countries: input.countries.length ? input.countries : ['vn'],
     })
     return { id: list._id.toString(), name: list.name, keywordCount: keywords.length }
   }
   ```

2. **`TriggerCrawlService`** — creates CrawlJob + enqueues BullMQ job:
   ```typescript
   import { Queue } from 'bullmq'
   import { getRedis } from '@/lib/db/redis'
   
   export class TriggerCrawlService extends BaseService<Input, Output> {
     async call({ keywordListId, workspaceId, userId }: Input) {
       await connectDB()
       
       // Prevent double-trigger
       const running = await CrawlJob.findOne({ keywordListId, status: { $in: ['pending', 'running'] } })
       if (running) throw new ServiceError('A crawl is already running for this list', undefined, 'ALREADY_RUNNING')
       
       const list = await KeywordList.findById(keywordListId)
       const workspace = await Workspace.findById(workspaceId).select('domain')
       if (!list || !workspace) throw new ServiceError('Not found')
       
       const job = await CrawlJob.create({ keywordListId, workspaceId, triggeredBy: userId, status: 'pending' })
       
       const queue = new Queue('serp-crawl', { connection: getRedis() })
       const queueJob = await queue.add('crawl', {
         crawlJobId: job._id.toString(),
         keywords: list.keywords,
         countries: list.countries,
         domain: workspace.domain,
         workspaceId,
         keywordListId,
       }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
       
       await CrawlJob.findByIdAndUpdate(job._id, { queueJobId: queueJob.id })
       return { crawlJobId: job._id.toString() }
     }
   }
   ```

3. **`DeleteKeywordListService`** — cascade: `CrawlJob.deleteMany({ keywordListId })` then `SerpResult.deleteMany({ keywordListId })` then `KeywordList.findByIdAndDelete`.

4. **`GetKeywordListsService`** — for each list, join latest CrawlJob (status, createdAt). Use `$lookup` aggregation.

5. **Crawl API route** (`/crawl/route.ts`):
   ```typescript
   export async function POST(req, { params }) {
     try {
       await requireWorkspaceAccess(params.id, 'editor')
       const service = new TriggerCrawlService()
       const result = await service.call({
         keywordListId: params.lid,
         workspaceId: params.id,
         userId: session.user.id
       })
       return NextResponse.json(result, { status: 201 })
     } catch (err: any) {
       return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
     }
   }
   ```

6. **`CountrySelector` component** — toggle buttons: "🇻🇳 Việt Nam" (`vn`) and "🌐 Global" (`global`). Uses shadcn `ToggleGroup`. Stores as `countries` string array. Comment: designed for multi-country via ToggleGroup multi-select in future.

7. **`KeywordTextarea` component** — `<Textarea>` with `placeholder="seo tools, rank tracker, ..."`. Below: live count label "X keywords detected" (parse on change). Max 500 warning.

8. **Keyword lists table** — columns: Name, Keywords count, Countries, Last Run (relative time), Status badge, Actions. Trigger crawl button per row (disabled when running/pending).

9. **`CrawlStatusBadge` component** — maps status to shadcn Badge variant:
   - `pending` → secondary "Queued"
   - `running` → default (blue) "Running..."
   - `done` → outline green "Done"
   - `failed` → destructive "Failed"

10. **Status polling** — on keyword list detail page, when `status` is `pending`/`running`: poll `GET /api/.../keyword-lists/[lid]` every 5 seconds via `useEffect` + `setInterval`. Stop on `done`/`failed`. No WebSocket needed for MVP.

## Success Criteria

- [ ] Create list with 100 keywords → all saved (deduped)
- [ ] Country defaults to "Việt Nam"
- [ ] Trigger crawl → CrawlJob created, status `pending`
- [ ] 501 keywords → 400 "Max 500 keywords"
- [ ] Double-trigger while running → 409 "A crawl is already running"
- [ ] Status badge updates via polling
- [ ] Delete list → cascades CrawlJobs + SerpResults
- [ ] Viewer role → trigger button disabled/hidden

## Risk Assessment

- **Queue unavailable** — if Redis down, `TriggerCrawlService` throws; return 503 "Service unavailable"
- **Keyword normalization** — no lowercasing for brand names; just trim + dedup
