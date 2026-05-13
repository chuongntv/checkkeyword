import { BaseService, ServiceError } from "@/lib/services/base-service"
import { CrawlJob } from "@/models/crawl-job.model"
import { connectDB } from "@/lib/db/mongoose"
import { Queue } from "bullmq"
import { getRedis } from "@/lib/db/redis"

type Input = { crawlJobId: string; keywordListId: string }
type Output = void

export class CancelCrawlJobService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    await connectDB()

    const job = await CrawlJob.findOne({
      _id: input.crawlJobId,
      keywordListId: input.keywordListId,
    })

    if (!job) throw new ServiceError("Không tìm thấy crawl job")
    if (job.status !== "pending" && job.status !== "running") {
      throw new ServiceError("Chỉ có thể hủy job đang chờ hoặc đang chạy")
    }

    // Remove from BullMQ queue
    if (job.queueJobId) {
      const queue = new Queue("serp-crawl", { connection: getRedis() })
      await queue.remove(job.queueJobId)
    }

    // Mark as failed in DB
    await CrawlJob.findByIdAndUpdate(job._id, {
      status: "failed",
      completedAt: new Date(),
    })
  }
}
