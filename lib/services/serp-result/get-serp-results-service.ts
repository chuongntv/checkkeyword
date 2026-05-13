import { BaseService } from "@/lib/services/base-service"
import { SerpResult, ISerpResult } from "@/models/serp-result.model"
import { CrawlJob } from "@/models/crawl-job.model"
import { connectDB } from "@/lib/db/mongoose"
import { Types } from "mongoose"

type Input = { crawlJobId: string }
type Output = {
  keyword: string
  domain: string
  position: number | null
  previousPosition: number | null
  links: string[]
  domains: string[]
  googleUrl: string
  crawledAt: Date
}[]

export class GetSerpResultsService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()
      const jobId = new Types.ObjectId(input.crawlJobId)

      // Find previous crawl job for same workspace to compute previousPosition
      const currentJob = await CrawlJob.findById(input.crawlJobId).lean()
      if (!currentJob) throw new Error("Crawl job not found")

      const previousJob = await CrawlJob.findOne({
        workspaceId: currentJob.workspaceId,
        status: "done",
        _id: { $lt: currentJob._id },
      }).sort({ createdAt: -1 }).lean()

      const previousCutoff = previousJob?.startedAt ?? new Date(0)

      const results = await SerpResult.aggregate<ISerpResult>([
        { $match: { crawlJobId: jobId } },
        {
          $lookup: {
            from: "serpresults",
            let: { kw: "$keyword", ws: "$workspaceId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$keyword", "$$kw"] },
                      { $eq: ["$workspaceId", "$$ws"] },
                      { $lt: ["$crawledAt", previousCutoff] },
                    ],
                  },
                },
              },
              { $sort: { crawledAt: -1 } },
              { $limit: 1 },
            ],
            as: "previousResult",
          },
        },
        {
          $addFields: {
            previousPosition: {
              $ifNull: [{ $arrayElemAt: ["$previousResult.position", 0] }, null],
            },
          },
        },
        { $project: { previousResult: 0 } },
      ])

      return results.map((r) => ({
        keyword: r.keyword,
        domain: r.domain,
        position: r.position,
        previousPosition: r.previousPosition,
        links: r.links,
        domains: r.domains,
        googleUrl: r.googleUrl,
        crawledAt: r.crawledAt,
      }))
    } catch (error) {
      this.handleError(error)
    }
  }
}
