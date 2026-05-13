"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { CrawlStatusBadge } from "@/components/keyword-list/crawl-status-badge"
import { List } from "lucide-react"
import { Button } from "@/components/ui/button"

type CrawlJob = { id: string; status: string; createdAt: string; completedAt: string | null }

export default function ResultsIndexPage({
  params,
}: {
  params: Promise<{ workspaceId: string; listId: string }>
}) {
  const { workspaceId, listId } = use(params)
  const router = useRouter()
  const [jobs, setJobs] = useState<CrawlJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/keyword-lists/${listId}/crawl-jobs`)
      .then((r) => r.json())
      .then((data) => {
        setJobs(data)
        // Redirect to latest done job if exists
        const latestDone = data.find((j: CrawlJob) => j.status === "done")
        if (latestDone) {
          router.replace(`/workspaces/${workspaceId}/keywords/${listId}/results/${latestDone.id}`)
        }
        setLoading(false)
      })
  }, [workspaceId, listId])

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-1">No crawl results yet</h3>
        <p className="text-sm text-muted-foreground mb-4">Trigger a crawl from the keyword list page to see results here</p>
      </CardContent>
    </Card>
  )
}
