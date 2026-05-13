import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-guard"
import { GetSystemStatsService } from "@/lib/services/admin/get-system-stats-service"

export async function GET() {
  try {
    await requireAdmin()
    const service = new GetSystemStatsService()
    const stats = await service.call()
    return NextResponse.json(stats)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
