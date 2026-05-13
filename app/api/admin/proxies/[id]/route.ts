import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-guard"
import { ProxyModel } from "@/models/proxy.model"
import { connectDB } from "@/lib/db/mongoose"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    await connectDB()
    const body = await request.json()
    const updates: Record<string, any> = {}
    if (body.countries !== undefined) updates.countries = body.countries
    if (body.isActive !== undefined) updates.isActive = body.isActive

    await ProxyModel.findByIdAndUpdate(id, updates)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    await connectDB()
    await ProxyModel.findByIdAndDelete(id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
