import { BaseService } from "@/lib/services/base-service"
import { CrawlJob } from "@/models/crawl-job.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { keywordListId: string; limit?: number }
type Output = { id: string; status: string; createdAt: string; completedAt: string | null }[]

export class ListCrawlJobsService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    await connectDB()
    const jobs = await CrawlJob.find({ keywordListId: input.keywordListId })
      .sort({ createdAt: -1 })
      .limit(input.limit ?? 20)
      .lean()

    return jobs.map((j) => ({
      id: j._id.toString(),
      status: j.status,
      createdAt: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
      completedAt: j.completedAt?.toISOString?.() ?? null,
    }))
  }
}
