"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Save, Loader2 } from "lucide-react"

type Configs = Record<string, string>

const CONFIG_LABELS: Record<string, string> = {
  maxDomainsTarget: "Max Domains Target (per keyword crawl)",
}

export default function CrawlerConfigPage() {
  const [configs, setConfigs] = useState<Configs>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function fetchConfigs() {
    const res = await fetch("/api/admin/crawler-config")
    if (res.ok) setConfigs(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchConfigs() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const res = await fetch("/api/admin/crawler-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configs),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Crawler Configuration</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-6 max-w-md">
            {Object.entries(CONFIG_LABELS).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <Input
                  type="number"
                  value={configs[key] ?? ""}
                  onChange={(e) => setConfigs({ ...configs, [key]: e.target.value })}
                  min="1"
                  max="500"
                />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Save"}
              </Button>
              {saved && <span className="text-sm text-green-600">Saved!</span>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
