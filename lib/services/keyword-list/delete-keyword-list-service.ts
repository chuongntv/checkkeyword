import { BaseService } from "@/lib/services/base-service"
import { KeywordList } from "@/models/keyword-list.model"
import { CrawlJob } from "@/models/crawl-job.model"
import { SerpResult } from "@/models/serp-result.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { listId: string }
type Output = { deleted: boolean }

export class DeleteKeywordListService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()

      const crawlJobs = await CrawlJob.find({ keywordListId: input.listId }).select("_id").lean()
      const cjIds = crawlJobs.map((cj) => cj._id)

      await SerpResult.deleteMany({ crawlJobId: { $in: cjIds } })
      await CrawlJob.deleteMany({ keywordListId: input.listId })
      await KeywordList.findByIdAndDelete(input.listId)

      return { deleted: true }
    } catch (error) {
      this.handleError(error)
    }
  }
}
