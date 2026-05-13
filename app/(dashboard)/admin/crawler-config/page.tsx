"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Save, Loader2 } from "lucide-react"

type Configs = Record<string, string>

export default function SiteConfigPage() {
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

  async function handleSave() {
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

  const registrationOn = configs.registrationEnabled === "true"

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Site Configuration</h1>
      <div className="space-y-6 max-w-lg">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Registration</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Allow new registrations</p>
                <p className="text-sm text-muted-foreground">When disabled, new users cannot sign up</p>
              </div>
              <Button
                variant={registrationOn ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setConfigs({ ...configs, registrationEnabled: registrationOn ? "false" : "true" })
                }}
              >
                {registrationOn ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Crawler</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Domains Target (per keyword crawl)</label>
              <Input
                type="number"
                value={configs.maxDomainsTarget ?? ""}
                onChange={(e) => setConfigs({ ...configs, maxDomainsTarget: e.target.value })}
                min="1"
                max="500"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? "Saving..." : "Save All"}
          </Button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>
    </div>
  )
}
