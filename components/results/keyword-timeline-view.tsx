"use client"

import { useEffect, useState } from "react"
import { ArrowUp, ArrowDown, Minus, HelpCircle } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { PositionChart } from "./position-chart"

type TimelineEntry = {
  date: string; position: number | null; previousPosition: number | null; jobId: string
}
type KeywordData = { keyword: string; history: TimelineEntry[] }

function posColor(pos: number | null) {
  if (pos === null) return "text-muted-foreground bg-muted"
  if (pos <= 3) return "text-green-700 bg-green-50"
  if (pos <= 10) return "text-orange-700 bg-orange-50"
  return "text-red-700 bg-red-50"
}

function TrendIcon({ prev, curr }: { prev: number | null; curr: number | null }) {
  if (prev === null || curr === null) return <HelpCircle className="h-3 w-3 text-muted-foreground" />
  if (curr < prev) return <ArrowUp className="h-3 w-3 text-green-600" />
  if (curr > prev) return <ArrowDown className="h-3 w-3 text-red-600" />
  return <Minus className="h-3 w-3 text-muted-foreground" />
}

export function KeywordTimelineView({ workspaceId, listId }: { workspaceId: string; listId: string }) {
  const [data, setData] = useState<KeywordData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/keyword-lists/${listId}/keyword-timeline`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.keywords || [])
        setLoading(false)
        if (d.keywords?.length > 0 && !selectedKeyword) {
          setSelectedKeyword(d.keywords[0].keyword)
        }
      })
      .catch(() => setLoading(false))
  }, [workspaceId, listId])

  if (loading) return <p className="text-muted-foreground">Đang tải timeline...</p>
  if (data.length === 0) return <p className="text-muted-foreground">Chưa có dữ liệu timeline</p>

  const filtered = search
    ? data.filter((d) => d.keyword.toLowerCase().includes(search.toLowerCase()))
    : data

  const allDates = Array.from(new Set(data.flatMap((d) => d.history.map((h) => h.date.slice(0, 10))))).sort()
  const selectedData = data.find((d) => d.keyword === selectedKeyword)

  return (
    <div className="space-y-6">
      {/* Position Chart */}
      <PositionChart keywords={data} selectedKeyword={selectedKeyword} onSelectKeyword={setSelectedKeyword} />

      {/* Keyword selector */}
      <Input
        placeholder="Tìm kiếm từ khóa..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Timeline Table */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Từ khóa</TableHead>
              <TableHead className="text-center min-w-[80px] text-xs">Lần kiểm</TableHead>
              <TableHead className="text-center min-w-[80px] text-xs">TB vị trí</TableHead>
              <TableHead className="text-center min-w-[80px] text-xs">Tốt nhất</TableHead>
              {allDates.map((d) => (
                <TableHead key={d} className="text-center min-w-[100px] text-xs">
                  {new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((kw) => {
              const dateMap = new Map(kw.history.map((h) => [h.date.slice(0, 10), h]))
              const positions = kw.history.map((h) => h.position).filter((p): p is number => p !== null)
              const avg = positions.length > 0 ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1) : "—"
              const best = positions.length > 0 ? Math.min(...positions) : "—"
              const isSelected = kw.keyword === selectedKeyword

              return (
                <TableRow
                  key={kw.keyword}
                  className={`cursor-pointer hover:bg-accent/50 ${isSelected ? "bg-accent" : ""}`}
                  onClick={() => setSelectedKeyword(kw.keyword)}
                >
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    {kw.keyword}
                  </TableCell>
                  <TableCell className="text-center text-sm">{kw.history.length}</TableCell>
                  <TableCell className="text-center text-sm">{avg}</TableCell>
                  <TableCell className="text-center">
                    {typeof best === "number" ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${posColor(best)}`}>{best}</span>
                    ) : "—"}
                  </TableCell>
                  {allDates.map((d) => {
                    const entry = dateMap.get(d)
                    if (!entry) return <TableCell key={d} className="text-center text-muted-foreground">—</TableCell>
                    return (
                      <TableCell key={d} className="text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${posColor(entry.position)}`}>
                          {entry.position ?? "—"}
                          <TrendIcon prev={entry.previousPosition} curr={entry.position} />
                        </span>
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
