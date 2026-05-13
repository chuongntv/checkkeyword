import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAccess } from "@/lib/auth/workspace-guard"
import { verifyKeywordListBelongsToWorkspace } from "@/lib/auth/verify-keyword-list-owner"
import { CrawlJob } from "@/models/crawl-job.model"
import { UpdateKeywordListService } from "@/lib/services/keyword-list/update-keyword-list-service"
import { DeleteKeywordListService } from "@/lib/services/keyword-list/delete-keyword-list-service"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; lid: string }> }) {
  try {
    const { id, lid } = await params
    await requireWorkspaceAccess(id)
    const list = await verifyKeywordListBelongsToWorkspace(lid, id)

    const latestJob = await CrawlJob.findOne({ keywordListId: lid }).sort({ createdAt: -1 }).lean()

    return NextResponse.json({
      id: list._id.toString(),
      name: list.name,
      keywords: list.keywords,
      countries: list.countries,
      keywordCount: list.keywords.length,
      latestCrawlJob: latestJob
        ? { id: latestJob._id.toString(), status: latestJob.status, createdAt: latestJob.createdAt }
        : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; lid: string }> }) {
  try {
    const { id, lid } = await params
    await requireWorkspaceAccess(id, "editor")
    await verifyKeywordListBelongsToWorkspace(lid, id)

    const body = await request.json()
    const service = new UpdateKeywordListService()
    const result = await service.call({
      listId: lid,
      name: body.name,
      rawKeywords: body.rawKeywords,
      countries: body.countries,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; lid: string }> }) {
  try {
    const { id, lid } = await params
    await requireWorkspaceAccess(id, "editor")
    await verifyKeywordListBelongsToWorkspace(lid, id)

    const service = new DeleteKeywordListService()
    await service.call({ listId: lid })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
