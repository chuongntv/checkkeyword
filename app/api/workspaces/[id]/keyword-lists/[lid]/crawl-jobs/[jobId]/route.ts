import { NextResponse } from "next/server"
import { requireWorkspaceAccess } from "@/lib/auth/workspace-guard"
import { verifyKeywordListBelongsToWorkspace } from "@/lib/auth/verify-keyword-list-owner"
import { CancelCrawlJobService } from "@/lib/services/crawl-job/cancel-crawl-job-service"
import { RetryCrawlJobService } from "@/lib/services/crawl-job/retry-crawl-job-service"

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string; lid: string; jobId: string }> }) {
  try {
    const { id, lid, jobId } = await params
    await requireWorkspaceAccess(id, "editor")
    await verifyKeywordListBelongsToWorkspace(lid, id)

    const service = new CancelCrawlJobService()
    await service.call({ crawlJobId: jobId, keywordListId: lid })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; lid: string; jobId: string }> }) {
  try {
    const { id, lid, jobId } = await params
    const { session } = await requireWorkspaceAccess(id, "editor")
    await verifyKeywordListBelongsToWorkspace(lid, id)

    const service = new RetryCrawlJobService()
    const result = await service.call({
      crawlJobId: jobId,
      keywordListId: lid,
      workspaceId: id,
      userId: session.user.id,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
