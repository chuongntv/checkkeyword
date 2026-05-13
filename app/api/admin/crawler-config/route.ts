import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-guard"
import { getCrawlerConfigs } from "@/lib/services/admin/get-crawler-config-service"
import { upsertCrawlerConfig, seedDefaultConfigs } from "@/lib/services/admin/upsert-crawler-config-service"

export async function GET() {
  try {
    await requireAdmin()
    await seedDefaultConfigs()
    const configs = await getCrawlerConfigs()
    return NextResponse.json(configs)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json()
    const updates: Record<string, string> = body

    const results: Record<string, string> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== "string") continue
      const doc = await upsertCrawlerConfig(key, value)
      results[key] = doc.value
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
