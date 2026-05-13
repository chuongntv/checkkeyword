import { BaseService } from "@/lib/services/base-service"
import { Workspace } from "@/models/workspace.model"
import { CrawlJob } from "@/models/crawl-job.model"
import { KeywordList } from "@/models/keyword-list.model"
import { SerpResult } from "@/models/serp-result.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { workspaceId: string }
type Output = { deleted: boolean }

export class DeleteWorkspaceService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()

      // Cascade: delete all child keyword lists, crawl jobs, serp results
      const keywordLists = await KeywordList.find({ workspaceId: input.workspaceId }).select("_id").lean()
      const klIds = keywordLists.map((kl) => kl._id)

      const crawlJobs = await CrawlJob.find({ keywordListId: { $in: klIds } }).select("_id").lean()
      const cjIds = crawlJobs.map((cj) => cj._id)

      await SerpResult.deleteMany({ crawlJobId: { $in: cjIds } })
      await CrawlJob.deleteMany({ keywordListId: { $in: klIds } })
      await KeywordList.deleteMany({ workspaceId: input.workspaceId })
      await Workspace.findByIdAndDelete(input.workspaceId)

      return { deleted: true }
    } catch (error) {
      this.handleError(error)
    }
  }
}
