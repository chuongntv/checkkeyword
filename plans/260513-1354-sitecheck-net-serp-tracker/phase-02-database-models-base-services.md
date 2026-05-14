---
phase: 2
title: "Database Models & Base Services"
status: pending
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Database Models & Base Services

## Overview

Define all Mongoose schemas and implement the service layer (BaseService subclasses) for each domain entity. This phase establishes the data contract the entire application builds on.

## Requirements

- Functional: All collections with proper indexes, ObjectId refs, TypeScript interfaces for every model
- Non-functional: Indexes on hot query paths, `models.X || model('X', schema)` pattern to prevent Next.js hot-reload issues, timestamps on all models

## Architecture

### Data Model

```
User
  _id, email, name, password (bcrypt), createdAt, updatedAt

Workspace
  _id, name, domain, ownerId (→User), members ([{userId, role:'viewer'|'editor'}])

KeywordList
  _id, workspaceId (→Workspace), name, keywords ([String]), countries ([String])
  // countries: ['vn'] | ['global'] | ['us','uk',...] — extensible

CrawlJob
  _id, keywordListId (→KeywordList), workspaceId (→Workspace), triggeredBy (→User)
  status: 'pending'|'running'|'done'|'failed'
  queueJobId: String (BullMQ job ID)
  startedAt, completedAt

SerpResult
  _id, crawlJobId (→CrawlJob), workspaceId (→Workspace), keywordListId (→KeywordList)
  keyword: String
  domain: String              // workspace domain being tracked
  position: Number | null     // null = not found
  previousPosition: Number | null  // denormalized from prior run
  links: [String]             // all result URLs
  domains: [String]           // all result hostnames
  googleUrl: String
  crawledAt: Date

Proxy
  _id, host, port, username, password
  countries: [String]         // ISO codes this proxy serves
  isActive: Boolean
```

### Key Indexes

```javascript
SerpResult.index({ crawlJobId: 1 })
SerpResult.index({ workspaceId: 1, keyword: 1, crawledAt: -1 })  // position history

CrawlJob.index({ keywordListId: 1, status: 1 })
CrawlJob.index({ workspaceId: 1, createdAt: -1 })

KeywordList.index({ workspaceId: 1 })

Workspace.index({ ownerId: 1 })
Workspace.index({ 'members.userId': 1 })
```

## Related Code Files

- Create: `models/user.model.ts`
- Create: `models/workspace.model.ts`
- Create: `models/keyword-list.model.ts`
- Create: `models/crawl-job.model.ts`
- Create: `models/serp-result.model.ts`
- Create: `models/proxy.model.ts`
- Create: `types/models.ts`
- Create: `lib/services/workspace/create-workspace-service.ts`
- Create: `lib/services/workspace/get-workspaces-service.ts`
- Create: `lib/services/workspace/update-workspace-service.ts`
- Create: `lib/services/workspace/delete-workspace-service.ts`
- Create: `lib/services/workspace/add-workspace-member-service.ts`
- Create: `lib/services/workspace/remove-workspace-member-service.ts`
- Create: `lib/services/keyword-list/create-keyword-list-service.ts`
- Create: `lib/services/keyword-list/get-keyword-lists-service.ts`
- Create: `lib/services/crawl-job/create-crawl-job-service.ts`
- Create: `lib/services/serp-result/get-serp-results-service.ts`
- Create: `lib/services/proxy/get-proxies-for-country-service.ts`

## Implementation Steps

1. **User model** (`models/user.model.ts`)
   ```typescript
   import { Schema, model, models, Document } from 'mongoose'
   
   export interface IUser extends Document {
     email: string; name: string; password: string
     createdAt: Date; updatedAt: Date
   }
   
   const UserSchema = new Schema<IUser>({
     email: { type: String, required: true, unique: true, lowercase: true },
     name: { type: String, required: true },
     password: { type: String, required: true, select: false },
   }, { timestamps: true })
   
   export const User = models.User || model<IUser>('User', UserSchema)
   ```

2. **Workspace model** — embed `members` as subdoc `[{ userId: ObjectId, role: 'viewer'|'editor' }]`. Owner = `ownerId` field (not in members array).

3. **KeywordList model** — `keywords: [String]`, `countries: [String]`. Cascade hook: `pre('deleteOne')` removes CrawlJobs + SerpResults.

4. **CrawlJob model** — `queueJobId: String` stores BullMQ job ID. Add `startedAt`/`completedAt` for duration tracking.

5. **SerpResult model** — `position: Number | null`, `previousPosition: Number | null` (denormalized). `crawledAt: Date` (not timestamps — this is the actual crawl time, not document create time).

6. **Proxy model** — `countries: [String]`, `isActive: { type: Boolean, default: true }`, `username`/`password` for authenticated proxies.

7. **Service pattern** — each service file exports ONE class extending `BaseService`:
   ```typescript
   // lib/services/workspace/create-workspace-service.ts
   import { BaseService } from '../base-service'
   import { Workspace } from '@/models/workspace.model'
   import { connectDB } from '@/lib/db/mongoose'
   
   type Input = { name: string; domain: string; ownerId: string }
   type Output = { id: string; name: string; domain: string }
   
   export class CreateWorkspaceService extends BaseService<Input, Output> {
     async call(input: Input): Promise<Output> {
       try {
         await connectDB()
         const ws = await Workspace.create({
           name: input.name,
           domain: normalizeDomain(input.domain),
           ownerId: input.ownerId,
           members: [],
         })
         return { id: ws._id.toString(), name: ws.name, domain: ws.domain }
       } catch (error) {
         this.handleError(error)
       }
     }
   }
   
   function normalizeDomain(domain: string) {
     return domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
   }
   ```

8. **`GetSerpResultsService`** — aggregation pipeline for position + previousPosition:
   ```typescript
   // For each keyword in latest CrawlJob, find previous CrawlJob's SerpResult for same keyword
   // Use $lookup with pipeline for efficiency (avoid N+1)
   const results = await SerpResult.aggregate([
     { $match: { crawlJobId: new Types.ObjectId(crawlJobId) } },
     { $lookup: {
       from: 'serpresults',
       let: { kw: '$keyword', ws: '$workspaceId' },
       pipeline: [
         { $match: { $expr: { $and: [
           { $eq: ['$keyword', '$$kw'] },
           { $eq: ['$workspaceId', '$$ws'] },
           { $lt: ['$crawledAt', previousJobStartedAt] }
         ]}}},
         { $sort: { crawledAt: -1 } },
         { $limit: 1 }
       ],
       as: 'previousResult'
     }},
     { $addFields: { previousPosition: { $ifNull: [{ $arrayElemAt: ['$previousResult.position', 0] }, null] } } },
     { $project: { previousResult: 0 } }
   ])
   ```

9. **`GetProxiesForCountryService`** — `Proxy.find({ countries: countryCode, isActive: true })`, return shuffled array.

10. **Cascade deletes** — Implement in service layer (`DeleteWorkspaceService` removes all child records), not Mongoose hooks, for better testability.

## Success Criteria

- [ ] All 6 models compile with `tsc --noEmit`
- [ ] Indexes present in MongoDB after first connection
- [ ] `CreateWorkspaceService.call()` creates document and returns typed output
- [ ] `GetSerpResultsService` returns `previousPosition` via aggregation (no N+1)
- [ ] `User.password` field has `select: false` (not returned by default)
- [ ] No `any` types in model files

## Risk Assessment

- **`previousPosition` aggregation** — `previousJobStartedAt` must be passed from caller; alternatively query the previous CrawlJob's `startedAt` inside the service itself
- **models re-import** — always use `models.X || model('X', schema)` pattern; never `model('X', schema)` directly
