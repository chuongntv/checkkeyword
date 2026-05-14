import { auth } from "@/lib/auth/get-server-session"
import { Workspace, IWorkspace } from "@/models/workspace.model"
import { connectDB } from "@/lib/db/mongoose"

type Role = "viewer" | "editor" | "owner"
const roleRank: Record<Role, number> = { viewer: 0, editor: 1, owner: 2 }

type WorkspaceAccessResult = {
  workspace: IWorkspace
  role: Role
  session: NonNullable<Awaited<ReturnType<typeof auth>>>
}

export async function requireWorkspaceAccess(
  workspaceId: string,
  minRole: Role = "viewer"
): Promise<WorkspaceAccessResult> {
  const session = await auth()
  if (!session) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 })

  await connectDB()
  const ws = await Workspace.findById(workspaceId)
  if (!ws) throw Object.assign(new Error("NOT_FOUND"), { status: 404 })

  const userId = session.user.id

  // Admin bypass — full access to all workspaces
  if (session.user.isAdmin) {
    return { workspace: ws, role: "owner", session }
  }

  // Owner check
  if (ws.ownerId.toString() === userId) {
    return { workspace: ws, role: "owner", session }
  }

  // Member check
  const member = ws.members.find((m) => m.userId.toString() === userId)
  if (!member || roleRank[member.role as Role] < roleRank[minRole]) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 })
  }

  return { workspace: ws, role: member.role as Role, session }
}
