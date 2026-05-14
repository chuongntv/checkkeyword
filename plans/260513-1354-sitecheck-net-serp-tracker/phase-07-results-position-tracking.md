---
phase: 7
title: "Results & Position Tracking"
status: pending
priority: P1
effort: "4h"
dependencies: [6]
---

# Phase 7: Results & Position Tracking

## Overview

The core results UI: a table showing each keyword's current position, previous position, trend indicator, all result links/domains, and crawl timestamp. Supports viewing results per crawl job and browsing history.

## Requirements

- Functional: Results table with all specified columns, position trend (up/down/new/-), links/domains expandable, crawl history list, re-trigger from results page
- Non-functional: Paginated table (50 rows default), no real-time needed (poll-based), position displayed as number or "-" if not found

## Architecture

### Results Table Columns

| Column | Value | Notes |
|--------|-------|-------|
| # | Row index | 1-based |
| Keyword | keyword text | |
| Previous Position | number or "-" | from `previousPosition` field |
| Current Position | number or "-" | from `position` field |
| Trend | ↑ / ↓ / — / NEW | computed from prev vs current |
| Links | expandable list | `links[]` field |
| Domains | expandable list | `domains[]` field |
| Crawled At | datetime | `crawledAt` field |

### Trend Calculation

```typescript
function calcTrend(current: number | null, previous: number | null): 'up' | 'down' | 'same' | 'new' | 'lost' {
  if (current === null && previous === null) return 'same'
  if (current === null && previous !== null) return 'lost'   // was found, now gone
  if (current !== null && previous === null) return 'new'    // first time found
  if (current < previous!) return 'up'     // lower number = better position
  if (current > previous!) return 'down'
  return 'same'
}
```

### API Routes

```
GET /api/workspaces/[id]/keyword-lists/[lid]/crawl-jobs
    → list of CrawlJobs for this list (id, status, createdAt, keywordCount)

GET /api/workspaces/[id]/keyword-lists/[lid]/crawl-jobs/[jobId]/results
    → SerpResults for this job (paginated)
    query: ?page=1&limit=50&search=keyword
```

## Related Code Files

- Create: `app/(dashboard)/workspaces/[workspaceId]/keywords/[listId]/results/page.tsx`
- Create: `app/(dashboard)/workspaces/[workspaceId]/keywords/[listId]/results/[jobId]/page.tsx`
- Create: `app/api/workspaces/[id]/keyword-lists/[lid]/crawl-jobs/route.ts`
- Create: `app/api/workspaces/[id]/keyword-lists/[lid]/crawl-jobs/[jobId]/results/route.ts`
- Create: `lib/services/serp-result/get-serp-results-service.ts`
- Create: `lib/services/crawl-job/list-crawl-jobs-service.ts`
- Create: `components/results/serp-results-table.tsx`
- Create: `components/results/position-trend-badge.tsx`
- Create: `components/results/links-expandable.tsx`
- Create: `components/results/crawl-job-history.tsx`

## Implementation Steps

1. **`GetSerpResultsService`** — paginated query + previousPosition:
   ```typescript
   type Input = { crawlJobId: string; page: number; limit: number; search?: string }
   type Output = { results: SerpResultRow[]; total: number; page: number }
   
   async call(input: Input) {
     await connectDB()
     const skip = (input.page - 1) * input.limit
     const match: Record<string, unknown> = { crawlJobId: new Types.ObjectId(input.crawlJobId) }
     if (input.search) match.keyword = { $regex: input.search, $options: 'i' }
   
     const [results, total] = await Promise.all([
       SerpResult.find(match).sort({ crawledAt: 1 }).skip(skip).limit(input.limit),
       SerpResult.countDocuments(match),
     ])
   
     return {
       results: results.map(r => ({
         id: r._id.toString(),
         keyword: r.keyword,
         position: r.position,
         previousPosition: r.previousPosition,
         trend: calcTrend(r.position, r.previousPosition),
         links: r.links,
         domains: r.domains,
         crawledAt: r.crawledAt,
       })),
       total,
       page: input.page,
     }
   }
   ```

2. **`ListCrawlJobsService`** — list jobs for a keyword list, newest first, with summary:
   ```typescript
   const jobs = await CrawlJob.find({ keywordListId })
     .sort({ createdAt: -1 })
     .limit(20)
     .select('status createdAt completedAt triggeredBy')
   ```

3. **Results page** (`results/[jobId]/page.tsx`) — server component fetching initial page, client table for pagination/search.

4. **`SerpResultsTable` component**:
   - shadcn `Table` with all 8 columns
   - Sticky `#` and `Keyword` columns on mobile
   - Search input (debounced, updates query param)
   - Client-side pagination with `?page=N`
   - Export to CSV button (client-side, using results data)

5. **`PositionTrendBadge` component**:
   ```typescript
   const TREND_CONFIG = {
     up:   { icon: '↑', label: '', className: 'text-green-600' },
     down: { icon: '↓', label: '', className: 'text-red-600' },
     same: { icon: '—', label: '', className: 'text-muted-foreground' },
     new:  { icon: '★', label: 'NEW', className: 'text-blue-600' },
     lost: { icon: '✗', label: 'LOST', className: 'text-orange-600' },
   }
   ```
   Show: `currentPosition (↑ from previousPosition)` or just `-` if null.

6. **`LinksExpandable` component** — display first 3 domains inline, "Show all X" expands to full list in a scrollable sheet/popover. Shows unique domains, not all links.

7. **`CrawlJobHistory` component** — sidebar or top section of results page listing past jobs:
   - Date/time, status badge, keyword count
   - Click to navigate to that job's results
   - "Run new crawl" button at top

8. **Results page with no job selected** (`results/page.tsx`) — redirect to latest completed job if exists, else show "No crawls yet" with trigger button.

9. **CSV export** — client-side: `Blob` with `text/csv`, columns matching table. Filename: `{workspaceDomain}-{listName}-{date}.csv`.

10. **Position "-" display** — `null` position → display "-" in both current and previous columns. Trend for null/null = "—".

## Success Criteria

- [ ] Results table shows all 8 columns
- [ ] `position=null` → "-" displayed
- [ ] `previousPosition=3, position=1` → ↑ trend (green)
- [ ] `previousPosition=null, position=5` → ★ NEW
- [ ] `position=null, previousPosition=5` → ✗ LOST
- [ ] Search filters by keyword text
- [ ] Pagination works (50 rows per page)
- [ ] CSV export downloads correct file
- [ ] CrawlJob history navigates between runs
- [ ] Admin can view any workspace results (phase 8 dependency)

## Risk Assessment

- **Large result sets** — 500 keywords × many runs = large `serpresults` collection; index `(workspaceId, keyword, crawledAt)` covers history queries
- **Previous position accuracy** — `previousPosition` is denormalized at crawl time by worker; if worker is updated to recalculate, old records are unaffected
