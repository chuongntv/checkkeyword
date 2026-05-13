import { BaseService } from "@/lib/services/base-service"
import { User } from "@/models/user.model"
import { Workspace } from "@/models/workspace.model"
import { CrawlJob } from "@/models/crawl-job.model"
import { SerpResult } from "@/models/serp-result.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = void
type Output = { users: number; workspaces: number; crawlJobs: number; serpResults: number }

export class GetSystemStatsService extends BaseService<Input, Output> {
  async call(): Promise<Output> {
    await connectDB()
    const [users, workspaces, crawlJobs, serpResults] = await Promise.all([
      User.countDocuments(),
      Workspace.countDocuments(),
      CrawlJob.countDocuments(),
      SerpResult.countDocuments(),
    ])
    return { users, workspaces, crawlJobs, serpResults }
  }
}
