import { BaseService } from "@/lib/services/base-service"
import { KeywordList } from "@/models/keyword-list.model"
import { CrawlJob } from "@/models/crawl-job.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { workspaceId: string }
type Output = {
  id: string; name: string; keywords: string[]; keywordCount: number; countries: string[]; createdAt: Date
  latestCrawlJob: { id: string; status: string; createdAt: string } | null
}[]

export class GetKeywordListsService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    await connectDB()
    const lists = await KeywordList.find({ workspaceId: input.workspaceId }).sort({ createdAt: -1 }).lean()

    const listIds = lists.map((l) => l._id)
    const latestJobs = await CrawlJob.find({ keywordListId: { $in: listIds } })
      .sort({ createdAt: -1 })
      .lean()

    const latestJobMap = new Map<string, any>()
    for (const job of latestJobs) {
      const key = job.keywordListId.toString()
      if (!latestJobMap.has(key)) latestJobMap.set(key, job)
    }

    return lists.map((kl) => ({
      id: kl._id.toString(),
      name: kl.name,
      keywords: kl.keywords,
      keywordCount: kl.keywords.length,
      countries: kl.countries,
      createdAt: kl.createdAt,
      latestCrawlJob: latestJobMap.has(kl._id.toString())
        ? {
            id: latestJobMap.get(kl._id.toString())._id.toString(),
            status: latestJobMap.get(kl._id.toString()).status,
            createdAt: latestJobMap.get(kl._id.toString()).createdAt,
          }
        : null,
    }))
  }
}
