"use client"

import Link from "next/link"
import { CrawlStatusBadge } from "@/components/keyword-list/crawl-status-badge"

type CrawlJob = { id: string; status: string; createdAt: string; completedAt: string | null }

export function CrawlJobHistory({ jobs, currentJobId, workspaceId, listId }: {
  jobs: CrawlJob[]; currentJobId?: string; workspaceId: string; listId: string
}) {
  if (jobs.length === 0) return <p className="text-sm text-muted-foreground">Chưa có lịch sử crawl</p>

  return (
    <div className="space-y-2">
      {jobs.map((job) => {
        const date = new Date(job.createdAt)
        const isActive = job.id === currentJobId
        return (
          <Link
            key={job.id}
            href={`/workspaces/${workspaceId}/keywords/${listId}/results/${job.id}`}
            className={`block p-2 rounded-md text-sm hover:bg-accent ${isActive ? "bg-accent" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
              <CrawlStatusBadge status={job.status as any} />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
