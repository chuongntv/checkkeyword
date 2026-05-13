"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type WorkspaceDetail = {
  id: string; name: string; domain: string; role: string; memberCount: number; createdAt: string
}

type Member = { userId: string; email: string; name: string; role: string }

export default function WorkspaceSettingsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params)
  const router = useRouter()
  const [ws, setWs] = useState<WorkspaceDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [name, setName] = useState("")
  const [domain, setDomain] = useState("")
  const [saving, setSaving] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("viewer")
  const [inviting, setInviting] = useState(false)

  async function fetchWorkspace() {
    const res = await fetch(`/api/workspaces/${workspaceId}`)
    if (res.ok) {
      const data = await res.json()
      setWs(data)
      setName(data.name)
      setDomain(data.domain)
    }
  }

  useEffect(() => { fetchWorkspace() }, [workspaceId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, domain }),
    })
    setSaving(false)
    fetchWorkspace()
  }

  async function handleDelete() {
    if (!confirm("Delete this workspace and all its data? This cannot be undone.")) return
    const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" })
    if (res.ok) router.push("/workspaces")
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    setInviteEmail("")
    setInviting(false)
    fetchWorkspace()
  }

  async function handleRemoveMember(userId: string) {
    await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" })
    fetchWorkspace()
  }

  if (!ws) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">{ws.name}</h1>
      <p className="text-muted-foreground mb-6">{ws.domain}</p>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>Update workspace name and domain</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Domain</label>
                  <Input value={domain} onChange={(e) => setDomain(e.target.value)} required />
                </div>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
              </form>
            </CardContent>
          </Card>

          {ws.role === "owner" && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Deleting this workspace removes all keyword lists, crawl jobs, and SERP results.
                </p>
                <Button variant="destructive" onClick={handleDelete}>Delete Workspace</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-4">
          {ws.role === "owner" && (
            <Card>
              <CardHeader>
                <CardTitle>Invite Member</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="rounded-md border px-3 text-sm"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <Button type="submit" disabled={inviting}>{inviting ? "..." : "Invite"}</Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{ws.memberCount} member(s)</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
