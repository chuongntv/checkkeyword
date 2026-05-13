import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/get-server-session"
import { GetWorkspacesService } from "@/lib/services/workspace/get-workspaces-service"
import { CreateWorkspaceService } from "@/lib/services/workspace/create-workspace-service"

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const service = new GetWorkspacesService()
    const workspaces = await service.call({ userId: session.user.id })
    return NextResponse.json(workspaces)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    if (!body.name || !body.domain) {
      return NextResponse.json({ error: "Name and domain are required" }, { status: 400 })
    }

    const service = new CreateWorkspaceService()
    const workspace = await service.call({
      name: body.name,
      domain: body.domain,
      ownerId: session.user.id,
    })

    return NextResponse.json(workspace, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
