import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-guard"
import { GetAllWorkspacesService } from "@/lib/services/admin/get-all-workspaces-service"

export async function GET() {
  try {
    await requireAdmin()
    const service = new GetAllWorkspacesService()
    const workspaces = await service.call()
    return NextResponse.json(workspaces)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
