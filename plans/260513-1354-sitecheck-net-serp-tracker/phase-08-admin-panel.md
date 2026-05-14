---
phase: 8
title: "Admin Panel"
status: pending
priority: P2
effort: "4h"
dependencies: [4, 7]
---

# Phase 8: Admin Panel

## Overview

Admin panel accessible only to users listed in `ADMIN_EMAILS` env var. Provides user management, workspace oversight, and full data visibility. Admin can view any workspace's data without being a member.

## Requirements

- Functional: User list with status, workspace list across all users, view any workspace's keyword lists + results, impersonate workspace view (read-only)
- Non-functional: All admin routes guard `session.user.isAdmin`, no admin-specific DB schema changes needed

## Architecture

```
app/(admin)/
├── layout.tsx                 ← isAdmin guard, redirect /dashboard if not admin
├── page.tsx                   ← admin dashboard (stats overview)
├── users/
│   ├── page.tsx               ← all users table
│   └── [userId]/page.tsx      ← user detail + workspaces
└── workspaces/
    ├── page.tsx               ← all workspaces table
    └── [workspaceId]/page.tsx ← workspace detail (read-only view)

app/api/admin/
├── stats/route.ts             ← system overview counts
├── users/route.ts             ← list all users
├── users/[userId]/route.ts    ← user detail, disable/enable
├── workspaces/route.ts        ← list all workspaces
└── workspaces/[id]/route.ts   ← workspace + keyword lists + jobs
```

### Admin Navigation (sidebar)

Admin section appears in sidebar only when `session.user.isAdmin`. Items:
- System Stats
- Users
- All Workspaces
- Proxy Settings (links to Phase 9)

## Related Code Files

- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/page.tsx`
- Create: `app/(admin)/users/page.tsx`
- Create: `app/(admin)/users/[userId]/page.tsx`
- Create: `app/(admin)/workspaces/page.tsx`
- Create: `app/(admin)/workspaces/[workspaceId]/page.tsx`
- Create: `app/api/admin/stats/route.ts`
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/[userId]/route.ts`
- Create: `app/api/admin/workspaces/route.ts`
- Create: `app/api/admin/workspaces/[id]/route.ts`
- Create: `lib/auth/admin-guard.ts`
- Create: `lib/services/admin/get-all-users-service.ts`
- Create: `lib/services/admin/get-all-workspaces-service.ts`
- Create: `lib/services/admin/get-system-stats-service.ts`
- Create: `lib/services/admin/disable-user-service.ts`

## Implementation Steps

1. **`admin-guard.ts`** — shared helper for all admin API routes:
   ```typescript
   import { auth } from '@/lib/auth/get-server-session'
   
   export async function requireAdmin() {
     const session = await auth()
     if (!session) throw Object.assign(new Error('UNAUTHORIZED'), { status: 401 })
     if (!session.user.isAdmin) throw Object.assign(new Error('FORBIDDEN'), { status: 403 })
     return session
   }
   ```

2. **`(admin)/layout.tsx`** — server component:
   ```typescript
   import { auth } from '@/lib/auth/get-server-session'
   import { redirect } from 'next/navigation'
   
   export default async function AdminLayout({ children }) {
     const session = await auth()
     if (!session?.user.isAdmin) redirect('/dashboard')
     return <AdminShell session={session}>{children}</AdminShell>
   }
   ```

3. **`GetSystemStatsService`** — parallel counts for dashboard:
   ```typescript
   const [userCount, workspaceCount, crawlJobCount, serpResultCount] = await Promise.all([
     User.countDocuments(),
     Workspace.countDocuments(),
     CrawlJob.countDocuments(),
     SerpResult.countDocuments(),
   ])
   ```

4. **Admin dashboard** (`(admin)/page.tsx`) — 4 stat cards: Total Users, Total Workspaces, Total Crawl Jobs, Total SERP Results. Plus recent crawl jobs table (last 20 across all users).

5. **`GetAllUsersService`** — paginated user list, no password field, include workspace count:
   ```typescript
   User.aggregate([
     { $lookup: { from: 'workspaces', localField: '_id', foreignField: 'ownerId', as: 'ownedWorkspaces' } },
     { $addFields: { workspaceCount: { $size: '$ownedWorkspaces' } } },
     { $project: { password: 0, ownedWorkspaces: 0 } },
     { $sort: { createdAt: -1 } }
   ])
   ```

6. **Users table** — columns: Name, Email, Workspace Count, Joined, Actions. Actions: View Workspaces, Disable Account (sets `isDisabled: true` on User — add field to model).

7. **`DisableUserService`** — sets `User.isDisabled = true`. Also add check in `authorize()` in NextAuth: return null if `user.isDisabled`.

8. **`GetAllWorkspacesService`** — all workspaces with owner name, member count, keyword list count:
   ```typescript
   Workspace.aggregate([
     { $lookup: { from: 'users', localField: 'ownerId', foreignField: '_id', as: 'owner' } },
     { $lookup: { from: 'keywordlists', localField: '_id', foreignField: 'workspaceId', as: 'lists' } },
     { $addFields: {
       ownerName: { $arrayElemAt: ['$owner.name', 0] },
       ownerEmail: { $arrayElemAt: ['$owner.email', 0] },
       listCount: { $size: '$lists' },
       memberCount: { $size: '$members' }
     }},
     { $project: { owner: 0, lists: 0 } }
   ])
   ```

9. **Admin workspace view** (`/admin/workspaces/[workspaceId]/page.tsx`) — read-only view of workspace: owner info, member list, keyword lists, recent crawl jobs. Reuses regular workspace components but passes `isAdminView=true` prop to hide action buttons.

10. **Admin user detail** (`/admin/users/[userId]/page.tsx`) — user info + list of owned workspaces + workspaces they're a member of. Link to each workspace's admin view.

## Success Criteria

- [ ] Non-admin session → `/admin` redirects to `/dashboard`
- [ ] Admin sees user list with workspace counts
- [ ] Admin can view any workspace without being a member
- [ ] Disable user → that user cannot login
- [ ] System stats cards show correct counts
- [ ] Admin sidebar section visible only to admins
- [ ] Admin API routes return 403 for non-admins

## Risk Assessment

- **`isDisabled` field** — needs to be added to User model (Phase 2 update) and checked in `auth-options.ts` authorize callback
- **Admin impersonation** — admin view is read-only (no write actions); label as "Admin View" to avoid confusion
