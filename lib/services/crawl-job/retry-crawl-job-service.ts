import { BaseService, ServiceError } from "@/lib/services/base-service"
import { CrawlJob } from "@/models/crawl-job.model"
import { SerpResult } from "@/models/serp-result.model"
import { KeywordList } from "@/models/keyword-list.model"
import { Workspace } from "@/models/workspace.model"
import { connectDB } from "@/lib/db/mongoose"
import { Queue } from "bullmq"
import { getRedis } from "@/lib/db/redis"

type Input = { crawlJobId: string; keywordListId: string; workspaceId: string; userId: string }
type Output = { crawlJobId: string }

export class RetryCrawlJobService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    await connectDB()

    const job = await CrawlJob.findOne({
      _id: input.crawlJobId,
      keywordListId: input.keywordListId,
      workspaceId: input.workspaceId,
    })

    if (!job) throw new ServiceError("Không tìm thấy crawl job")
    if (job.status !== "done" && job.status !== "failed") {
      throw new ServiceError("Chỉ có thể thử lại job đã hoàn thành hoặc thất bại")
    }

    // Delete old SerpResults for this job
    await SerpResult.deleteMany({ crawlJobId: job._id })

    // Reset job status
    await CrawlJob.findByIdAndUpdate(job._id, {
      status: "pending",
      startedAt: null,
      completedAt: null,
    })

    // Re-queue with same job ID
    const list = await KeywordList.findById(input.keywordListId)
    const workspace = await Workspace.findById(input.workspaceId).select("domain")
    if (!list || !workspace) throw new ServiceError("Không tìm thấy dữ liệu")

    const queue = new Queue("serp-crawl", { connection: getRedis() })
    const queueJob = await queue.add(
      "crawl",
      {
        crawlJobId: job._id.toString(),
        keywords: list.keywords,
        countries: list.countries,
        domain: workspace.domain,
        workspaceId: input.workspaceId,
        keywordListId: input.keywordListId,
      },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    )

    await CrawlJob.findByIdAndUpdate(job._id, { queueJobId: queueJob.id?.toString() })
    return { crawlJobId: job._id.toString() }
  }
}
