import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-guard"
import { connectDB } from "@/lib/db/mongoose"
import { User } from "@/models/user.model"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    await connectDB()

    if (typeof body.disabled === "boolean") {
      const user = await User.findByIdAndUpdate(id, { disabled: body.disabled }, { new: true })
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
      return NextResponse.json({ id: user._id.toString(), disabled: user.disabled })
    }

    return NextResponse.json({ error: "Invalid update" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    await connectDB()
    const user = await User.findByIdAndDelete(id)
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
