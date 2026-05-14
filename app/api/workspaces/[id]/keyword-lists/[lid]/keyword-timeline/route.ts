import { NextResponse } from "next/server"
import { requireWorkspaceAccess } from "@/lib/auth/workspace-guard"
import { verifyKeywordListBelongsToWorkspace } from "@/lib/auth/verify-keyword-list-owner"
import { connectDB } from "@/lib/db/mongoose"
import { CrawlJob } from "@/models/crawl-job.model"
import { SerpResult } from "@/models/serp-result.model"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; lid: string }> }) {
  try {
    const { id, lid } = await params
    await requireWorkspaceAccess(id)
    await verifyKeywordListBelongsToWorkspace(lid, id)
    await connectDB()

    const jobs = await CrawlJob.find({ keywordListId: lid, status: "done" })
      .sort({ createdAt: 1 })
      .lean()

    if (jobs.length === 0) {
      return NextResponse.json({ keywords: [] })
    }

    const jobIds = jobs.map((j) => j._id)
    const results = await SerpResult.find({ crawlJobId: { $in: jobIds } }).lean()

    // Group by keyword
    const keywordMap = new Map<string, { date: string; position: number | null; previousPosition: number | null; jobId: string }[]>()
    for (const r of results) {
      if (!keywordMap.has(r.keyword)) keywordMap.set(r.keyword, [])
      const job = jobs.find((j) => j._id.toString() === r.crawlJobId.toString())
      keywordMap.get(r.keyword)!.push({
        date: job?.createdAt?.toISOString() ?? r.crawledAt.toISOString(),
        position: r.position,
        previousPosition: r.previousPosition,
        jobId: r.crawlJobId.toString(),
      })
    }

    const keywords = Array.from(keywordMap.entries()).map(([keyword, history]) => ({
      keyword,
      history: history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))

    return NextResponse.json({ keywords })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
