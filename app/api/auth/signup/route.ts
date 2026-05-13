import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { SignupService } from "@/lib/services/auth/signup-service"
import { ServiceError } from "@/lib/services/base-service"
import { getCrawlerConfig } from "@/lib/services/admin/get-crawler-config-service"

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(request: NextRequest) {
  try {
    const regEnabled = await getCrawlerConfig("registrationEnabled")
    if (regEnabled !== "true") {
      return NextResponse.json({ error: "Registration is currently disabled" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e) => e.message).join(", ") },
        { status: 400 }
      )
    }

    const service = new SignupService()
    const result = await service.call(parsed.data)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ServiceError && error.code === "EMAIL_EXISTS") {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
