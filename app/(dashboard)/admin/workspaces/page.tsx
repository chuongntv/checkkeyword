"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Workspace = {
  id: string; name: string; domain: string; ownerName: string; ownerEmail: string
  memberCount: number; listCount: number; createdAt: string
}

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  useEffect(() => { fetch("/api/admin/workspaces").then((r) => r.json()).then(setWorkspaces) }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Workspaces</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Lists</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell className="font-medium">{ws.name}</TableCell>
                  <TableCell>{ws.domain}</TableCell>
                  <TableCell>{ws.ownerName} <span className="text-muted-foreground text-xs">({ws.ownerEmail})</span></TableCell>
                  <TableCell>{ws.memberCount}</TableCell>
                  <TableCell><Badge variant="outline">{ws.listCount}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(ws.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
