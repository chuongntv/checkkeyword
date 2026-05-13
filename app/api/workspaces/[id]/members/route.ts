import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAccess } from "@/lib/auth/workspace-guard"
import { AddWorkspaceMemberService } from "@/lib/services/workspace/add-workspace-member-service"
import { User } from "@/models/user.model"
import { connectDB } from "@/lib/db/mongoose"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireWorkspaceAccess(id, "owner")

    const body = await request.json()
    if (!body.email || !body.role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 })
    }

    await connectDB()
    const targetUser = await User.findOne({ email: body.email.toLowerCase() })
    if (!targetUser) {
      return NextResponse.json({ error: "User not registered" }, { status: 404 })
    }

    const service = new AddWorkspaceMemberService()
    await service.call({ workspaceId: id, userId: targetUser._id.toString(), role: body.role })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err: any) {
    if (err.message === "ALREADY_MEMBER") {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
