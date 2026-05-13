import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAccess } from "@/lib/auth/workspace-guard"
import { verifyKeywordListBelongsToWorkspace } from "@/lib/auth/verify-keyword-list-owner"
import { SerpResult } from "@/models/serp-result.model"
import { connectDB } from "@/lib/db/mongoose"
import { Types } from "mongoose"

export type Trend = "up" | "down" | "same" | "new" | "lost"

function calcTrend(current: number | null, previous: number | null): Trend {
  if (current === null && previous === null) return "same"
  if (current === null) return "lost"
  if (previous === null) return "new"
  if (current < previous) return "up"
  if (current > previous) return "down"
  return "same"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lid: string; jobId: string }> }
) {
  try {
    const { id, lid, jobId } = await params
    await requireWorkspaceAccess(id)
    await verifyKeywordListBelongsToWorkspace(lid, id)

    await connectDB()
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get("page") ?? "1", 10)
    const rawLimit = parseInt(url.searchParams.get("limit") ?? "50", 10)
    const limit = Math.min(Math.max(rawLimit, 1), 200)
    const search = url.searchParams.get("search") || undefined
    const skip = (page - 1) * limit

    const match: Record<string, unknown> = { crawlJobId: new Types.ObjectId(jobId) }
    if (search) match.keyword = { $regex: search, $options: "i" }

    const [results, total] = await Promise.all([
      SerpResult.find(match).sort({ crawledAt: 1 }).skip(skip).limit(limit).lean(),
      SerpResult.countDocuments(match),
    ])

    return NextResponse.json({
      results: results.map((r) => ({
        id: r._id.toString(),
        keyword: r.keyword,
        position: r.position,
        previousPosition: r.previousPosition,
        trend: calcTrend(r.position, r.previousPosition),
        links: r.links,
        domains: r.domains,
        crawledAt: r.crawledAt,
      })),
      total,
      page,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
