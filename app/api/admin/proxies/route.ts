import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-guard"
import { ProxyModel } from "@/models/proxy.model"
import { BulkImportProxiesService } from "@/lib/services/admin/bulk-import-proxies-service"
import { connectDB } from "@/lib/db/mongoose"

export async function GET() {
  try {
    await requireAdmin()
    await connectDB()
    const proxies = await ProxyModel.find().select("-password").sort({ createdAt: -1 }).lean()
    return NextResponse.json(proxies.map((p) => ({
      id: p._id.toString(), host: p.host, port: p.port, username: p.username,
      countries: p.countries, isActive: p.isActive, createdAt: p.createdAt,
    })))
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()

    // Bulk import
    if (body.raw) {
      const service = new BulkImportProxiesService()
      const result = await service.call({ raw: body.raw, countries: body.countries ?? ["global"] })
      return NextResponse.json(result, { status: 201 })
    }

    // Single proxy
    await connectDB()
    const proxy = await ProxyModel.create({
      host: body.host, port: body.port, username: body.username || "",
      password: body.password || "", countries: body.countries ?? ["global"], isActive: true,
    })
    return NextResponse.json({ id: proxy._id.toString() }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
