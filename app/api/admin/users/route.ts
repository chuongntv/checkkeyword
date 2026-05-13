import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-guard"
import { GetAllUsersService } from "@/lib/services/admin/get-all-users-service"
import { connectDB } from "@/lib/db/mongoose"
import { User } from "@/models/user.model"
import bcrypt from "bcryptjs"

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

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const { name, email, password } = await req.json()
    if (!name || !email || !password) {
      return NextResponse.json({ error: "name, email, password required" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    await connectDB()
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed })

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
