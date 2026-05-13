import { BaseService } from "@/lib/services/base-service"
import { CrawlJob } from "@/models/crawl-job.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { keywordListId: string; workspaceId: string; triggeredBy: string }
type Output = { id: string; status: string }

export class CreateCrawlJobService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()
      const job = await CrawlJob.create({
        keywordListId: input.keywordListId,
        workspaceId: input.workspaceId,
        triggeredBy: input.triggeredBy,
        status: "pending",
      })
      return { id: job._id.toString(), status: job.status }
    } catch (error) {
      this.handleError(error)
    }
  }
}
