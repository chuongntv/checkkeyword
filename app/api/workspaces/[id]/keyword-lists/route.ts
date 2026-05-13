import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAccess } from "@/lib/auth/workspace-guard"
import { GetKeywordListsService } from "@/lib/services/keyword-list/get-keyword-lists-service"
import { CreateKeywordListService } from "@/lib/services/keyword-list/create-keyword-list-service"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireWorkspaceAccess(id)

    const service = new GetKeywordListsService()
    const lists = await service.call({ workspaceId: id })
    return NextResponse.json(lists)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { session } = await requireWorkspaceAccess(id, "editor")

    const body = await request.json()
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const service = new CreateKeywordListService()
    const result = await service.call({
      workspaceId: id,
      name: body.name,
      keywords: body.keywords ?? [],
      countries: body.countries?.length ? body.countries : ["vn"],
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
