"use client"

import Link from "next/link"
import { CrawlStatusBadge } from "@/components/keyword-list/crawl-status-badge"
import { RotateCcw } from "lucide-react"

type CrawlJob = { id: string; status: string; createdAt: string; completedAt: string | null }

export function CrawlJobHistory({ jobs, currentJobId, workspaceId, listId, onRetry }: {
  jobs: CrawlJob[]; currentJobId?: string; workspaceId: string; listId: string
  onRetry?: (jobId: string) => void
}) {
  if (jobs.length === 0) return <p className="text-sm text-muted-foreground">Chưa có lịch sử crawl</p>

  return (
    <div className="space-y-2">
      {jobs.map((job) => {
        const date = new Date(job.createdAt)
        const isActive = job.id === currentJobId
        const canRetry = job.status === "done" || job.status === "failed"

        return (
          <div
            key={job.id}
            className={`flex items-center gap-1 p-2 rounded-md text-sm hover:bg-accent ${isActive ? "bg-accent" : ""}`}
          >
            <Link
              href={`/workspaces/${workspaceId}/keywords/${listId}/results/${job.id}`}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
                <CrawlStatusBadge status={job.status as any} />
              </div>
            </Link>
            {canRetry && onRetry && (
              <button
                onClick={(e) => { e.preventDefault(); onRetry(job.id) }}
                className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Thử lại"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
