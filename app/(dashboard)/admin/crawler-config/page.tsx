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

  if (loading) return <p className="text-muted-foreground">Đang tải...</p>

  const registrationOn = configs.registrationEnabled === "true"

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Cấu hình hệ thống</h1>
      <div className="space-y-6 max-w-lg">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Đăng ký</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cho phép đăng ký mới</p>
                <p className="text-sm text-muted-foreground">Khi tắt, người dùng mới không thể đăng ký</p>
              </div>
              <Button
                variant={registrationOn ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setConfigs({ ...configs, registrationEnabled: registrationOn ? "false" : "true" })
                }}
              >
                {registrationOn ? "Bật" : "Tắt"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Crawler</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">Số tên miền tối đa (mỗi từ khóa)</label>
              <Input
                type="number"
                value={configs.maxDomainsTarget ?? ""}
                onChange={(e) => setConfigs({ ...configs, maxDomainsTarget: e.target.value })}
                min="1"
                max="500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Thời gian chờ tối đa (phút)</label>
              <p className="text-xs text-muted-foreground">Crawl job vượt quá thời gian này sẽ hiển thị trạng thái "Quá hạn"</p>
              <Input
                type="number"
                value={configs.jobTimeoutMinutes ?? ""}
                onChange={(e) => setConfigs({ ...configs, jobTimeoutMinutes: e.target.value })}
                min="1"
                max="120"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? "Đang lưu..." : "Lưu tất cả"}
          </Button>
          {saved && <span className="text-sm text-green-600">Đã lưu!</span>}
        </div>
      </div>
    </div>
  )
}
