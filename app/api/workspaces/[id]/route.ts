import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAccess } from "@/lib/auth/workspace-guard"
import { UpdateWorkspaceService } from "@/lib/services/workspace/update-workspace-service"
import { DeleteWorkspaceService } from "@/lib/services/workspace/delete-workspace-service"
import { auth } from "@/lib/auth/get-server-session"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const { workspace, role } = await requireWorkspaceAccess((await params).id)
    return NextResponse.json({
      id: workspace._id.toString(),
      name: workspace.name,
      domain: workspace.domain,
      role,
      isAdmin: session?.user?.isAdmin ?? false,
      memberCount: workspace.members.length,
      createdAt: workspace.createdAt,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireWorkspaceAccess(id, "editor")

    const body = await request.json()
    const service = new UpdateWorkspaceService()
    const result = await service.call({ workspaceId: id, name: body.name, domain: body.domain })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireWorkspaceAccess(id, "owner")

    const service = new DeleteWorkspaceService()
    await service.call({ workspaceId: id })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
