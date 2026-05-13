"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const COUNTRY_OPTIONS = [
  { code: "vn", label: "Vietnam" },
  { code: "us", label: "United States" },
  { code: "uk", label: "United Kingdom" },
  { code: "sg", label: "Singapore" },
  { code: "global", label: "Global" },
]

export default function NewProxyPage() {
  const router = useRouter()
  const [countries, setCountries] = useState<string[]>(["vn"])
  const [host, setHost] = useState("")
  const [port, setPort] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [bulkRaw, setBulkRaw] = useState("")
  const [saving, setSaving] = useState(false)

  function toggleCountry(code: string) {
    setCountries((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])
  }

  async function handleSingle(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/admin/proxies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port: parseInt(port), username, password, countries }),
    })
    router.push("/admin/proxies")
  }

  async function handleBulk(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/admin/proxies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: bulkRaw, countries }),
    })
    router.push("/admin/proxies")
  }

  const countrySelector = (
    <div className="flex gap-2 flex-wrap">
      {COUNTRY_OPTIONS.map((opt) => (
        <Button key={opt.code} type="button" variant={countries.includes(opt.code) ? "default" : "outline"} size="sm"
          onClick={() => toggleCountry(opt.code)}>{opt.label}</Button>
      ))}
    </div>
  )

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add Proxies</h1>
      <div className="mb-4"><label className="text-sm font-medium">Countries</label><div className="mt-2">{countrySelector}</div></div>
      <Tabs defaultValue="single">
        <TabsList><TabsTrigger value="single">Single</TabsTrigger><TabsTrigger value="bulk">Bulk Import</TabsTrigger></TabsList>
        <TabsContent value="single" className="mt-4">
          <Card><CardContent>
            <form onSubmit={handleSingle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Host</label><Input value={host} onChange={(e) => setHost(e.target.value)} required /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Port</label><Input type="number" value={port} onChange={(e) => setPort(e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Username</label><Input value={username} onChange={(e) => setUsername(e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Password</label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Add Proxy"}</Button>
            </form>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="bulk" className="mt-4">
          <Card><CardContent>
            <form onSubmit={handleBulk} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Proxies (one per line)</label>
                <textarea className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={"proxy1.example.com:8080:user:pass\nproxy2.example.com:3128:user:pass"}
                  value={bulkRaw} onChange={(e) => setBulkRaw(e.target.value)} required />
                <p className="text-sm text-muted-foreground">Format: host:port or host:port:username:password</p>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>{saving ? "Importing..." : "Import"}</Button>
            </form>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
