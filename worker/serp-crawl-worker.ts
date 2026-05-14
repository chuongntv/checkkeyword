import { Worker } from "bullmq"
import { CrawlJob } from "@/models/crawl-job.model"
import { SerpResult } from "@/models/serp-result.model"
import { connectDB } from "@/lib/db/mongoose"
import { getRedis } from "@/lib/db/redis"
import { crawlKeyword } from "./crawler/crawl-keyword"
import { Types } from "mongoose"
import pAll from "p-all"

const KEYWORD_CONCURRENCY = 3
const JOB_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour

export function startSerpWorker() {
  const worker = new Worker(
    "serp-crawl",
    async (job) => {
      const { crawlJobId, keywords, countries, domain, workspaceId, keywordListId } = job.data

      console.log(`[Worker] Starting job ${crawlJobId} with ${keywords.length} keywords`)
      await connectDB()
      const startedAt = new Date()
      await CrawlJob.findByIdAndUpdate(crawlJobId, { status: "running", startedAt })

      const country = countries[0] ?? "vn"

      const tasks = keywords.map((keyword: string) => async () => {
        // Check 1-hour limit before each keyword
        if (Date.now() - startedAt.getTime() > JOB_TIMEOUT_MS) {
          console.log(`[Worker] Job ${crawlJobId} exceeded 1h limit, skipping remaining keywords`)
          return
        }

        try {
          const result = await crawlKeyword(keyword, domain, country, crawlJobId)
          await SerpResult.create({
            crawlJobId: new Types.ObjectId(crawlJobId),
            workspaceId: new Types.ObjectId(workspaceId),
            keywordListId: new Types.ObjectId(keywordListId),
            keyword,
            domain,
            position: result.position,
            previousPosition: null,
            links: result.links,
            domains: result.domains,
            googleUrl: result.googleUrl,
            crawledAt: new Date(),
          })
          console.log(`[Worker] Saved result for "${keyword}" — position: ${result.position ?? "not found"}`)
        } catch (err) {
          console.error(`[Worker] Failed to crawl "${keyword}":`, err)
        }
      })

      await pAll(tasks, { concurrency: KEYWORD_CONCURRENCY })

      // Backfill previousPosition
      await backfillPreviousPosition(crawlJobId, workspaceId, keywordListId)

      // Mark as failed if timed out, otherwise done
      const elapsed = Date.now() - startedAt.getTime()
      if (elapsed > JOB_TIMEOUT_MS) {
        await CrawlJob.findByIdAndUpdate(crawlJobId, { status: "failed", completedAt: new Date() })
        console.log(`[Worker] Job ${crawlJobId} marked as failed (exceeded 1h limit)`)
      } else {
        await CrawlJob.findByIdAndUpdate(crawlJobId, { status: "done", completedAt: new Date() })
        console.log(`[Worker] Job ${crawlJobId} completed`)
      }
    },
    {
      connection: getRedis(),
      concurrency: 1,
    }
  )

  worker.on("failed", async (job, err) => {
    if (job) {
      await connectDB()
      await CrawlJob.findByIdAndUpdate(job.data.crawlJobId, { status: "failed" })
    }
    console.error("[Worker] Job failed:", err)
  })

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`)
  })

  return worker
}

async function backfillPreviousPosition(crawlJobId: string, workspaceId: string, keywordListId: string) {
  const currentJob = await CrawlJob.findById(crawlJobId)
  if (!currentJob) return

  const previousJob = await CrawlJob.findOne({
    workspaceId,
    keywordListId,
    status: "done",
    _id: { $lt: currentJob._id },
  }).sort({ createdAt: -1 })

  if (!previousJob) return

  const currentResults = await SerpResult.find({ crawlJobId }).lean()
  for (const result of currentResults) {
    const prevResult = await SerpResult.findOne({
      keyword: result.keyword,
      workspaceId,
      crawlJobId: previousJob._id,
    }).lean()

    if (prevResult && prevResult.position !== null) {
      await SerpResult.findByIdAndUpdate(result._id, { previousPosition: prevResult.position })
    }
  }
}
