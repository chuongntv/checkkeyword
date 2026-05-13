"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, List, Play, Trash2, BarChart3 } from "lucide-react"
import { CrawlStatusBadge } from "@/components/keyword-list/crawl-status-badge"
import { CountrySelector } from "@/components/keyword-list/country-selector"
import { KeywordTextarea } from "@/components/keyword-list/keyword-textarea"

type KeywordList = {
  id: string; name: string; keywords: string[]; keywordCount: number; countries: string[]
  latestCrawlJob: { id: string; status: string; createdAt: string } | null
}

export default function KeywordsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params)
  const [lists, setLists] = useState<KeywordList[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newKeywords, setNewKeywords] = useState("")
  const [newCountries, setNewCountries] = useState<string[]>(["vn"])
  const [creating, setCreating] = useState(false)

  async function fetchLists() {
    const res = await fetch(`/api/workspaces/${workspaceId}/keyword-lists`)
    if (res.ok) setLists(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchLists() }, [workspaceId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const keywords = [...new Set(newKeywords.split("\n").map((k) => k.trim()).filter(Boolean))]
    const res = await fetch(`/api/workspaces/${workspaceId}/keyword-lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        keywords,
        countries: newCountries.length ? newCountries : ["vn"],
      }),
    })
    if (res.ok) {
      setDialogOpen(false)
      setNewName("")
      setNewKeywords("")
      setNewCountries(["vn"])
      fetchLists()
    }
    setCreating(false)
  }

  async function handleTriggerCrawl(listId: string) {
    await fetch(`/api/workspaces/${workspaceId}/keyword-lists/${listId}/crawl`, { method: "POST" })
    fetchLists()
  }

  async function handleDelete(listId: string) {
    if (!confirm("Xóa danh sách từ khóa này và toàn bộ dữ liệu crawl?")) return
    await fetch(`/api/workspaces/${workspaceId}/keyword-lists/${listId}`, { method: "DELETE" })
    fetchLists()
  }

  if (loading) return <p className="text-muted-foreground">Đang tải...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Danh sách từ khóa</h1>
          <p className="text-muted-foreground mt-1">{lists.length} danh sách</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />Tạo danh sách
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo danh sách từ khóa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên</label>
                <Input placeholder="Từ khóa của tôi" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Từ khóa (mỗi dòng một từ)</label>
                <KeywordTextarea value={newKeywords} onChange={setNewKeywords} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quốc gia</label>
                <CountrySelector value={newCountries} onChange={setNewCountries} />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Đang tạo..." : "Tạo danh sách"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Chưa có danh sách từ khóa</h3>
            <p className="text-sm text-muted-foreground mb-4">Tạo danh sách từ khóa để bắt đầu theo dõi thứ hạng SERP</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Tạo danh sách
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Từ khóa</TableHead>
                  <TableHead>Quốc gia</TableHead>
                  <TableHead>Crawl gần nhất</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <TableRow
                    key={list.id}
                    className="cursor-pointer"
                    onClick={() => window.location.href = `/workspaces/${workspaceId}/keywords/${list.id}/results`}
                  >
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {list.keywords.slice(0, 5).map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                        {list.keywords.length > 5 && (
                          <Badge variant="outline" className="text-xs">+{list.keywords.length - 5} khác</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{list.countries.join(", ")}</TableCell>
                    <TableCell>
                      <CrawlStatusBadge status={(list.latestCrawlJob?.status as any) ?? null} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/workspaces/${workspaceId}/keywords/${list.id}/results`}>
                          <Button variant="default" size="sm"><BarChart3 className="h-3 w-3 mr-1" />Kết quả</Button>
                        </Link>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => handleTriggerCrawl(list.id)}
                          disabled={list.latestCrawlJob?.status === "pending" || list.latestCrawlJob?.status === "running"}
                        >
                          <Play className="h-3 w-3 mr-1" />Crawl
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(list.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
