---
phase: 4
title: "Workspace Management"
status: pending
priority: P1
effort: "4h"
dependencies: [2, 3]
---

# Phase 4: Workspace Management

## Overview

Workspace = one tracked domain (like Google Search Console property). Users create multiple workspaces, invite collaborators with roles (editor/viewer), and switch via URL path. All workspace data is isolated by membership check.

## Requirements

- Functional: Create/edit/delete workspace, add/remove members by email, role assignment, workspace switcher in sidebar
- Non-functional: Owner can delete; editors can manage keyword lists + trigger crawls; viewers are read-only; all API routes verify membership

## Architecture

### Permission Matrix

| Action | Owner | Editor | Viewer |
|--------|-------|--------|--------|
| View results | ✓ | ✓ | ✓ |
| Trigger crawl | ✓ | ✓ | ✗ |
| Manage keyword lists | ✓ | ✓ | ✗ |
| Manage members | ✓ | ✗ | ✗ |
| Delete workspace | ✓ | ✗ | ✗ |

### URL Structure

Selected workspace in URL: `/workspaces/[workspaceId]/...` — no global state needed.

### API Routes

```
GET    /api/workspaces                         → list user's workspaces
POST   /api/workspaces                         → create
GET    /api/workspaces/[id]                    → detail
PATCH  /api/workspaces/[id]                   → update name/domain (owner/editor)
DELETE /api/workspaces/[id]                   → delete (owner only)
POST   /api/workspaces/[id]/members           → add member by email (owner)
PATCH  /api/workspaces/[id]/members/[uid]     → change role (owner)
DELETE /api/workspaces/[id]/members/[uid]     → remove member (owner)
```

## Related Code Files

- Create: `app/(dashboard)/workspaces/page.tsx`
- Create: `app/(dashboard)/workspaces/new/page.tsx`
- Create: `app/(dashboard)/workspaces/[workspaceId]/layout.tsx`
- Create: `app/(dashboard)/workspaces/[workspaceId]/settings/page.tsx`
- Create: `app/api/workspaces/route.ts`
- Create: `app/api/workspaces/[id]/route.ts`
- Create: `app/api/workspaces/[id]/members/route.ts`
- Create: `app/api/workspaces/[id]/members/[userId]/route.ts`
- Create: `lib/auth/workspace-guard.ts`
- Create: `lib/services/workspace/add-workspace-member-service.ts`
- Create: `lib/services/workspace/remove-workspace-member-service.ts`
- Create: `lib/services/workspace/update-member-role-service.ts`
- Create: `components/workspace/workspace-switcher.tsx`
- Create: `components/workspace/member-list.tsx`

## Implementation Steps

1. **`workspace-guard.ts`** — shared permission checker for all workspace API routes:
   ```typescript
   import { auth } from '@/lib/auth/get-server-session'
   import { Workspace } from '@/models/workspace.model'
   import { connectDB } from '@/lib/db/mongoose'
   
   type Role = 'viewer' | 'editor' | 'owner'
   const roleRank: Record<Role, number> = { viewer: 0, editor: 1, owner: 2 }
   
   export async function requireWorkspaceAccess(workspaceId: string, minRole: Role = 'viewer') {
     const session = await auth()
     if (!session) throw Object.assign(new Error('UNAUTHORIZED'), { status: 401 })
     await connectDB()
     const ws = await Workspace.findById(workspaceId)
     if (!ws) throw Object.assign(new Error('NOT_FOUND'), { status: 404 })
   
     const userId = session.user.id
     if (ws.ownerId.toString() === userId) return { workspace: ws, role: 'owner' as Role, session }
   
     const member = ws.members.find(m => m.userId.toString() === userId)
     if (!member || roleRank[member.role as Role] < roleRank[minRole])
       throw Object.assign(new Error('FORBIDDEN'), { status: 403 })
   
     return { workspace: ws, role: member.role as Role, session }
   }
   ```

2. **`GetWorkspacesService`** — find workspaces where `ownerId = userId OR members.userId = userId`, sorted `createdAt: -1`. Return minimal fields (id, name, domain, role).

3. **`CreateWorkspaceService`** — normalize domain (strip protocol/trailing slash, lowercase), create with empty `members: []`.

4. **`AddWorkspaceMemberService`** — lookup invited user by email, check not already a member, push to `members` array. Throw `USER_NOT_FOUND` if email not registered.

5. **`DeleteWorkspaceService`** — delete workspace + cascade: `KeywordList.deleteMany({ workspaceId })`, `CrawlJob.deleteMany({ workspaceId })`, `SerpResult.deleteMany({ workspaceId })`.

6. **API route pattern** (consistent across all workspace routes):
   ```typescript
   // app/api/workspaces/[id]/route.ts
   export async function DELETE(req: Request, { params }: { params: { id: string } }) {
     try {
       const { session } = await requireWorkspaceAccess(params.id, 'owner')
       await new DeleteWorkspaceService().call({ workspaceId: params.id })
       return NextResponse.json({ ok: true })
     } catch (err: any) {
       return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
     }
   }
   ```

7. **Workspace list page** (`workspaces/page.tsx`) — table: Name, Domain, Role badge (Owner/Editor/Viewer), Members count, Created. Action dropdown: Open, Settings, Delete (owner only).

8. **Create workspace** — modal `Dialog` with name + domain fields. Client component calling `POST /api/workspaces`, optimistic update of list.

9. **Settings page** — two tabs:
   - "General": Edit name + domain (PATCH), danger zone: Delete workspace
   - "Members": Invite by email + role select, member table with role change + remove

10. **`WorkspaceSwitcher` component** — dropdown in sidebar showing current workspace name + domain, list of other workspaces to navigate to. Uses `useRouter` to navigate to `/workspaces/[id]/keywords`.

11. **`[workspaceId]/layout.tsx`** — server component: fetch workspace (with membership check), pass to client layout as prop. 404 redirect if not found/no access.

## Success Criteria

- [ ] Owner creates workspace → appears in list
- [ ] Owner invites editor by email → editor sees workspace
- [ ] Editor can trigger crawl, cannot manage members
- [ ] Viewer cannot trigger crawl (403)
- [ ] Non-member cannot access `/api/workspaces/[id]` (403)
- [ ] Delete workspace → all child data removed
- [ ] Invite non-existent email → 404 "User not registered"
- [ ] Workspace switcher navigates correctly

## Risk Assessment

- **Cascade delete** — do in service layer (not Mongoose hooks) for clarity; wrap in try/catch, partial failures should be logged not swallowed
- **Domain normalization** — apply same normalization when matching workspace domain in crawler results
