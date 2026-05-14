---
phase: 9
title: "Proxy Management"
status: pending
priority: P2
effort: "2h"
dependencies: [8]
---

# Phase 9: Proxy Management

## Overview

Admin-only UI for managing proxies used by the SERP crawler. Proxies are stored in MongoDB with country assignments. Supports adding proxies in bulk (one per line format), activating/deactivating, and country mapping.

## Requirements

- Functional: List proxies, add proxy (form + bulk paste), edit country assignment, activate/deactivate, delete
- Non-functional: Admin only, proxy credentials not exposed in list view, format: `host:port:user:pass`

## Architecture

```
app/(admin)/proxies/
├── page.tsx             ← proxy list table
└── new/page.tsx         ← add proxies form (single + bulk)

app/api/admin/proxies/
├── route.ts             ← GET list, POST create
└── [id]/route.ts        ← PATCH update, DELETE

lib/services/admin/
├── create-proxy-service.ts
├── bulk-import-proxies-service.ts
├── update-proxy-service.ts
└── delete-proxy-service.ts
```

### Proxy Format (bulk input)

One proxy per line: `host:port:username:password`

For proxies with no auth: `host:port`

Country assignment via separate multi-select after parsing.

### Country List (MVP)

Dropdown with common options:
- Vietnam (`vn`)
- United States (`us`)
- United Kingdom (`uk`)
- Singapore (`sg`)
- Global (no restriction — `global`)

Add more later via env config.

## Related Code Files

- Create: `app/(admin)/proxies/page.tsx`
- Create: `app/(admin)/proxies/new/page.tsx`
- Create: `app/api/admin/proxies/route.ts`
- Create: `app/api/admin/proxies/[id]/route.ts`
- Create: `lib/services/admin/create-proxy-service.ts`
- Create: `lib/services/admin/bulk-import-proxies-service.ts`
- Create: `lib/services/admin/update-proxy-service.ts`
- Create: `lib/services/admin/delete-proxy-service.ts`
- Create: `components/admin/proxy-bulk-input.tsx`

## Implementation Steps

1. **`CreateProxyService`**
   ```typescript
   type Input = { host: string; port: string; username?: string; password?: string; countries: string[] }
   
   async call(input: Input) {
     await connectDB()
     const proxy = await Proxy.create({
       host: input.host.trim(),
       port: input.port.trim(),
       username: input.username?.trim() || undefined,
       password: input.password?.trim() || undefined,
       countries: input.countries,
       isActive: true,
     })
     return { id: proxy._id.toString() }
   }
   ```

2. **`BulkImportProxiesService`**
   ```typescript
   async call({ raw, countries }: Input) {
     const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
     const proxies = lines.map(line => {
       const parts = line.split(':')
       if (parts.length < 2) return null
       const [host, port, username, password] = parts
       return { host, port, username, password, countries, isActive: true }
     }).filter(Boolean)
   
     if (proxies.length === 0) throw new ServiceError('No valid proxy lines found')
     const result = await Proxy.insertMany(proxies, { ordered: false })  // skip duplicates
     return { imported: result.length, total: lines.length }
   }
   ```

3. **Proxy list table** — columns: Host:Port, Username (masked as `***`), Countries (badges), Status (Active/Inactive toggle), Actions (Edit, Delete). Password never shown.

4. **Add proxy form** — tabs: "Single" (form fields) and "Bulk Import" (textarea + country select). Bulk: parse on submit, show preview count before confirming.

5. **`ProxyBulkInput` component** — `<Textarea>` with placeholder `proxy.host.com:8080:username:password`. Live count below. Country multi-select (shadcn `MultiSelect` or `Combobox`).

6. **`UpdateProxyService`** — update `countries` array and/or `isActive` toggle. No editing host/port (delete and re-add).

7. **Proxy API routes** — all protected by `requireAdmin()`:
   ```typescript
   // GET /api/admin/proxies — list, mask password
   const proxies = await Proxy.find().select('-password').sort({ createdAt: -1 })
   ```

8. **Country assignment UX** — each proxy can serve multiple countries. When crawler needs a proxy for `vn`, it queries `{ countries: 'vn', isActive: true }`. If no proxy found for country, falls back to `global` proxies, then no proxy.

9. **Fallback logic in `proxy-reader.ts`** (update Phase 6):
   ```typescript
   let proxies = await Proxy.find({ countries: country, isActive: true })
   if (!proxies.length) proxies = await Proxy.find({ countries: 'global', isActive: true })
   // if still empty, return [] (crawl without proxy)
   ```

10. **Admin nav update** — add "Proxies" link to admin sidebar, badge with active proxy count.

## Success Criteria

- [ ] Admin can add proxy via form → appears in list
- [ ] Bulk import 10 proxies in one paste → all saved
- [ ] Invalid line in bulk → skipped, reported in response
- [ ] Toggle proxy inactive → crawler no longer uses it
- [ ] Non-admin access to `/admin/proxies` → redirect
- [ ] Password not returned in proxy list API
- [ ] Crawler uses correct proxies for country

## Risk Assessment

- **Proxy deduplication** — `insertMany` with `ordered: false` skips duplicates only if unique index exists on `(host, port)`; add this index to Proxy model
- **No proxy = no crawl failure** — if proxy list is empty, crawler proceeds without proxy (may get blocked by Google); this is acceptable behavior, log a warning
