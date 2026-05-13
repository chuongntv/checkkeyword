import { NextResponse } from "next/server"
import { requireWorkspaceAccess } from "@/lib/auth/workspace-guard"
import { verifyKeywordListBelongsToWorkspace } from "@/lib/auth/verify-keyword-list-owner"
import { TriggerCrawlService } from "@/lib/services/keyword-list/trigger-crawl-service"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; lid: string }> }) {
  try {
    const { id, lid } = await params
    const { session } = await requireWorkspaceAccess(id, "editor")
    await verifyKeywordListBelongsToWorkspace(lid, id)

    const service = new TriggerCrawlService()
    const result = await service.call({
      keywordListId: lid,
      workspaceId: id,
      userId: session.user.id,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    const status = err.code === "ALREADY_RUNNING" ? 409 : (err.status ?? 500)
    return NextResponse.json({ error: err.message }, { status })
  }
}
