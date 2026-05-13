import { BaseService, ServiceError } from "@/lib/services/base-service"
import { CrawlJob } from "@/models/crawl-job.model"
import { KeywordList } from "@/models/keyword-list.model"
import { Workspace } from "@/models/workspace.model"
import { connectDB } from "@/lib/db/mongoose"
import { Queue } from "bullmq"
import { getRedis } from "@/lib/db/redis"

type Input = { keywordListId: string; workspaceId: string; userId: string; killExisting?: boolean }
type Output = { crawlJobId: string }

export class TriggerCrawlService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()

      const running = await CrawlJob.findOne({
        keywordListId: input.keywordListId,
        status: { $in: ["pending", "running"] },
      })

      if (running) {
        if (!input.killExisting) {
          throw new ServiceError("A crawl is already running for this list", undefined, "ALREADY_RUNNING")
        }
        // Kill the old job: mark failed in DB and cancel in BullMQ
        await CrawlJob.findByIdAndUpdate(running._id, {
          status: "failed",
          completedAt: new Date(),
        })
        if (running.queueJobId) {
          const queue = new Queue("serp-crawl", { connection: getRedis() })
          await queue.remove(running.queueJobId)
        }
      }

      const list = await KeywordList.findById(input.keywordListId)
      const workspace = await Workspace.findById(input.workspaceId).select("domain")
      if (!list || !workspace) throw new ServiceError("Not found")

      const job = await CrawlJob.create({
        keywordListId: input.keywordListId,
        workspaceId: input.workspaceId,
        triggeredBy: input.userId,
        status: "pending",
      })

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
    } catch (error) {
      this.handleError(error)
    }
  }
}
