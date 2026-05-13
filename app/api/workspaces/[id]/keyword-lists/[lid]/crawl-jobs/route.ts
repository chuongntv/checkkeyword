import { NextResponse } from "next/server"
import { requireWorkspaceAccess } from "@/lib/auth/workspace-guard"
import { verifyKeywordListBelongsToWorkspace } from "@/lib/auth/verify-keyword-list-owner"
import { ListCrawlJobsService } from "@/lib/services/crawl-job/list-crawl-jobs-service"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; lid: string }> }) {
  try {
    const { id, lid } = await params
    await requireWorkspaceAccess(id)
    await verifyKeywordListBelongsToWorkspace(lid, id)

    const service = new ListCrawlJobsService()
    const jobs = await service.call({ keywordListId: lid })
    return NextResponse.json(jobs)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
