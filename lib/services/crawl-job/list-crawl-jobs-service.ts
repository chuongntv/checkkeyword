import { BaseService } from "@/lib/services/base-service"
import { CrawlJob } from "@/models/crawl-job.model"
import { connectDB } from "@/lib/db/mongoose"
import { resolveJobStatus } from "@/lib/services/crawl-job/resolve-job-status"

type Input = { keywordListId: string; limit?: number }
type Output = { id: string; status: string; createdAt: string; completedAt: string | null }[]

export class ListCrawlJobsService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    await connectDB()
    const jobs = await CrawlJob.find({ keywordListId: input.keywordListId })
      .sort({ createdAt: -1 })
      .limit(input.limit ?? 20)
      .lean()

    const results = []
    for (const j of jobs) {
      results.push({
        id: j._id.toString(),
        status: await resolveJobStatus(j),
        createdAt: j.createdAt.toISOString(),
        completedAt: j.completedAt?.toISOString() ?? null,
      })
    }
    return results
  }
}
