import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAccess } from "@/lib/auth/workspace-guard"
import { RemoveWorkspaceMemberService } from "@/lib/services/workspace/remove-workspace-member-service"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const { id, userId } = await params
    await requireWorkspaceAccess(id, "owner")

    const service = new RemoveWorkspaceMemberService()
    await service.call({ workspaceId: id, userId })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
