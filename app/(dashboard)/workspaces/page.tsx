"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Plus, Building2, Settings, List } from "lucide-react"

type Workspace = { id: string; name: string; domain: string; role: string }

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDomain, setNewDomain] = useState("")
  const [creating, setCreating] = useState(false)

  async function fetchWorkspaces() {
    const res = await fetch("/api/workspaces")
    if (res.ok) setWorkspaces(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchWorkspaces() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, domain: newDomain }),
    })
    if (res.ok) {
      setDialogOpen(false)
      setNewName("")
      setNewDomain("")
      fetchWorkspaces()
    }
    setCreating(false)
  }

  if (loading) return <p className="text-muted-foreground">Đang tải...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Workspace</h1>
          <p className="text-muted-foreground mt-1">{workspaces.length} workspace</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />Tạo workspace
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo Workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên</label>
                <Input placeholder="Trang web của tôi" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên miền</label>
                <Input placeholder="example.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Đang tạo..." : "Tạo Workspace"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {workspaces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Chưa có workspace</h3>
            <p className="text-sm text-muted-foreground mb-4">Tạo workspace đầu tiên để bắt đầu theo dõi thứ hạng SERP</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Tạo Workspace
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
                  <TableHead>Tên miền</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaces.map((ws) => (
                  <TableRow key={ws.id} className="cursor-pointer" onClick={() => window.location.href = `/workspaces/${ws.id}/keywords`}>
                    <TableCell className="font-medium">{ws.name}</TableCell>
                    <TableCell className="text-muted-foreground">{ws.domain}</TableCell>
                    <TableCell><Badge variant={ws.role === "owner" ? "default" : "outline"}>{ws.role}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/workspaces/${ws.id}/keywords`}>
                          <Button variant="default" size="sm"><List className="h-3 w-3 mr-1" />Từ khóa</Button>
                        </Link>
                        <Link href={`/workspaces/${ws.id}/settings`}>
                          <Button variant="outline" size="sm"><Settings className="h-3 w-3 mr-1" />Cài đặt</Button>
                        </Link>
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
