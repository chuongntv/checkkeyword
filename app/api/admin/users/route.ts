import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-guard"
import { GetAllUsersService } from "@/lib/services/admin/get-all-users-service"

export async function GET() {
  try {
    await requireAdmin()
    const service = new GetAllUsersService()
    const users = await service.call()
    return NextResponse.json(users)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
