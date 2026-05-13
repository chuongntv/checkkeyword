"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Search, FileText } from "lucide-react"

type Stats = { users: number; workspaces: number; crawlJobs: number; serpResults: number }

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats)
  }, [])

  const cards = [
    { title: "Người dùng", value: stats?.users ?? "—", icon: Users },
    { title: "Workspace", value: stats?.workspaces ?? "—", icon: Building2 },
    { title: "Crawl Jobs", value: stats?.crawlJobs ?? "—", icon: Search },
    { title: "Kết quả SERP", value: stats?.serpResults ?? "—", icon: FileText },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tổng quan quản trị</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
