import { getCrawlerConfig } from "@/lib/services/admin/get-crawler-config-service"

export type CrawlJobStatus = "pending" | "running" | "done" | "failed" | "timeout"

export async function resolveJobStatus(
  job: { status: string; createdAt: string | Date }
): Promise<string> {
  const s = job.status
  if (s === "done" || s === "failed") return s
  if (s === "pending" || s === "running") {
    const timeoutMin = parseInt(await getCrawlerConfig("jobTimeoutMinutes"), 10) || 10
    const elapsed = Date.now() - new Date(job.createdAt).getTime()
    if (elapsed > timeoutMin * 60 * 1000) return "timeout"
  }
  return s
}
