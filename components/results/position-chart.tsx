"use client"

import { useMemo } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type TimelineEntry = {
  date: string; position: number | null; previousPosition: number | null; jobId: string
}
type KeywordData = { keyword: string; history: TimelineEntry[] }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-background p-2 shadow-md text-sm">
      <p className="font-medium">{formatDate(label)}</p>
      <p className="text-orange-600">Vị trí: {d.position ?? "Không tìm thấy"}</p>
      {d.previousPosition != null && (
        <p className="text-muted-foreground text-xs">Trước đó: {d.previousPosition}</p>
      )}
    </div>
  )
}

export function PositionChart({
  keywords,
  selectedKeyword,
  onSelectKeyword,
}: {
  keywords: KeywordData[]
  selectedKeyword: string | null
  onSelectKeyword: (kw: string) => void
}) {
  const selectedData = keywords.find((d) => d.keyword === selectedKeyword)

  const chartData = useMemo(() => {
    if (!selectedData) return []
    return selectedData.history.map((h, i) => ({
      date: h.date,
      position: h.position ?? null,
      previousPosition: h.previousPosition,
      index: i + 1,
      label: `Lần ${i + 1}`,
    }))
  }, [selectedData])

  if (!selectedData || chartData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Chọn từ khóa để xem biểu đồ vị trí</p>
        </CardContent>
      </Card>
    )
  }

  const positions = chartData.filter((d) => d.position !== null).map((d) => d.position!)
  const best = positions.length > 0 ? Math.min(...positions) : null
  const worst = positions.length > 0 ? Math.max(...positions) : null
  const avg = positions.length > 0 ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1) : "—"
  const totalChecks = chartData.length

  // Determine y-axis domain (inverted: lower position = better)
  const yMin = best !== null ? Math.max(1, best - 2) : 1
  const yMax = worst !== null ? worst + 3 : 50

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">{selectedData.keyword}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Xu hướng vị trí qua {totalChecks} lần kiểm tra</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="text-center">
              <p className="text-muted-foreground">Tốt nhất</p>
              <p className={`font-semibold ${best && best <= 3 ? "text-green-600" : best && best <= 10 ? "text-orange-600" : "text-red-600"}`}>
                {best ?? "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">TB</p>
              <p className="font-semibold">{avg}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Xấu nhất</p>
              <p className="font-semibold">{worst ?? "—"}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => new Date(v).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              reversed
              tick={{ fontSize: 11 }}
              tickLine={false}
              label={{ value: "Vị trí", angle: 90, position: "insideLeft", style: { fontSize: 11 } }}
              allowDataOverflow
            />
            <Tooltip content={<CustomTooltip />} />
            {best && <ReferenceLine y={best} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} />}
            <Line
              type="monotone"
              dataKey="position"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#f97316", strokeWidth: 2, stroke: "#fff" }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Keyword selector chips */}
        {keywords.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
            {keywords.map((kw) => {
              const latestPos = kw.history[kw.history.length - 1]?.position
              return (
                <button
                  key={kw.keyword}
                  onClick={() => onSelectKeyword(kw.keyword)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    kw.keyword === selectedKeyword
                      ? "bg-orange-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {kw.keyword} {latestPos != null ? `(#${latestPos})` : ""}
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
