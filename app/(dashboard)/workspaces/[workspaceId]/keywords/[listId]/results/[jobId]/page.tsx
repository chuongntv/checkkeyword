"use client"

import { useEffect, useState, use, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PositionTrendBadge } from "@/components/results/position-trend-badge"
import { LinksExpandable } from "@/components/results/links-expandable"
import { ExpandableList } from "@/components/results/expandable-list"
import { CrawlJobHistory } from "@/components/results/crawl-job-history"
import { KeywordTimelineView } from "@/components/results/keyword-timeline-view"
import { Play, Download, TableIcon, BarChart3 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Trend = "up" | "down" | "same" | "new" | "lost"
type SerpResult = {
  id: string; keyword: string; position: number | null; previousPosition: number | null
  trend: Trend; links: string[]; domains: string[]; crawledAt: string
}
type CrawlJob = { id: string; status: string; createdAt: string; completedAt: string | null }

export default function JobResultsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; listId: string; jobId: string }>
}) {
  const { workspaceId, listId, jobId } = use(params)
  const [results, setResults] = useState<SerpResult[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [jobs, setJobs] = useState<CrawlJob[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table")

  const fetchResults = useCallback(async (p: number, s?: string) => {
    const params = new URLSearchParams({ page: String(p), limit: "50" })
    if (s) params.set("search", s)
    const res = await fetch(
      `/api/workspaces/${workspaceId}/keyword-lists/${listId}/crawl-jobs/${jobId}/results?${params}`
    )
    if (res.ok) {
      const data = await res.json()
      setResults(data.results)
      setTotal(data.total)
      setPage(data.page)
    }
    setLoading(false)
  }, [workspaceId, listId, jobId])

  const fetchJobs = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/keyword-lists/${listId}/crawl-jobs`)
    if (res.ok) setJobs(await res.json())
  }, [workspaceId, listId])

  useEffect(() => {
    fetchResults(1)
    fetchJobs()
  }, [workspaceId, listId, jobId, fetchResults, fetchJobs])

  function handleSearch(value: string) {
    setSearch(value)
    fetchResults(1, value || undefined)
  }

  function handleExportCSV() {
    const rows = [
      ["#", "Từ khóa", "Vị trí", "Vị trí trước", "Xu hướng", "Tên miền", "Links"].join(","),
      ...results.map((r, i) =>
        [i + 1, `"${r.keyword}"`, r.position ?? "-", r.previousPosition ?? "-", r.trend, `"${r.domains.join("; ")}"`, `"${r.links.join("; ")}"`].join(",")
      ),
    ]
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `serp-results-${jobId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleRetry(retryJobId: string) {
    if (!confirm("Thử lại job này? Kết quả cũ sẽ bị ghi đè.")) return
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/keyword-lists/${listId}/crawl-jobs/${retryJobId}`,
        { method: "POST" }
      )
      if (res.ok) {
        fetchJobs()
      } else {
        const data = await res.json()
        alert(data.error || "Lỗi khi thử lại")
      }
    } catch { alert("Lỗi kết nối") }
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Crawl History */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lịch sử crawl</CardTitle>
          </CardHeader>
          <CardContent>
            <CrawlJobHistory
              jobs={jobs}
              currentJobId={jobId}
              workspaceId={workspaceId}
              listId={listId}
              onRetry={handleRetry}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main: Results */}
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Kết quả SERP</h2>
            <p className="text-sm text-muted-foreground">{total} từ khóa</p>
          </div>
          <div className="flex gap-2">
            {/* View toggle */}
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="h-3 w-3 mr-1" />Bảng
              </Button>
              <Button
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("timeline")}
              >
                <BarChart3 className="h-3 w-3 mr-1" />Theo dõi
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-3 w-3 mr-1" />CSV
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                await fetch(`/api/workspaces/${workspaceId}/keyword-lists/${listId}/crawl?killExisting=true`, { method: "POST" })
                fetchJobs()
              }}
            >
              <Play className="h-3 w-3 mr-1" />Crawl mới
            </Button>
          </div>
        </div>

        {viewMode === "timeline" ? (
          <KeywordTimelineView workspaceId={workspaceId} listId={listId} />
        ) : (
          <>
            <div className="mb-4">
              <Input
                placeholder="Tìm kiếm từ khóa..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {loading ? (
              <p className="text-muted-foreground">Đang tải kết quả...</p>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Từ khóa</TableHead>
                        <TableHead className="w-32">Vị trí</TableHead>
                        <TableHead className="w-32">Trước đó</TableHead>
                        <TableHead>Tên miền</TableHead>
                        <TableHead>Links</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((r, i) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-muted-foreground">{(page - 1) * 50 + i + 1}</TableCell>
                          <TableCell className="font-medium">{r.keyword}</TableCell>
                          <TableCell>
                            <PositionTrendBadge
                              trend={r.trend}
                              position={r.position}
                              previousPosition={r.previousPosition}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.previousPosition ?? "—"}</TableCell>
                          <TableCell><LinksExpandable domains={r.domains} /></TableCell>
                          <TableCell><ExpandableList items={r.links} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchResults(page - 1, search || undefined)}>
                      Trước
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      Trang {page} / {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchResults(page + 1, search || undefined)}>
                      Tiếp
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
