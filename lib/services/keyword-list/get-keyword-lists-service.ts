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

    const results = []
    for (const kl of lists) {
      const job = latestJobMap.get(kl._id.toString())
      results.push({
        id: kl._id.toString(),
        name: kl.name,
        keywords: kl.keywords,
        keywordCount: kl.keywords.length,
        countries: kl.countries,
        createdAt: kl.createdAt,
        latestCrawlJob: job
          ? { id: job._id.toString(), status: job.status, createdAt: job.createdAt }
          : null,
      })
    }
    return results
  }
}
