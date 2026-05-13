"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

type Proxy = { id: string; host: string; port: number; username: string; countries: string[]; isActive: boolean }

export default function AdminProxiesPage() {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const router = useRouter()

  async function fetchProxies() {
    const res = await fetch("/api/admin/proxies")
    if (res.ok) setProxies(await res.json())
  }

  useEffect(() => { fetchProxies() }, [])

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/admin/proxies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    })
    fetchProxies()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this proxy?")) return
    await fetch(`/api/admin/proxies/${id}`, { method: "DELETE" })
    fetchProxies()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Proxies</h1>
          <p className="text-muted-foreground mt-1">{proxies.filter((p) => p.isActive).length} active proxies</p>
        </div>
        <Button onClick={() => router.push("/admin/proxies/new")}><Plus className="h-4 w-4 mr-2" />Add Proxies</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Host:Port</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Countries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proxies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">{p.host}:{p.port}</TableCell>
                  <TableCell>{p.username ? "***" : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">{p.countries.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}</div>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => handleToggle(p.id, p.isActive)} className="cursor-pointer">
                      <Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
