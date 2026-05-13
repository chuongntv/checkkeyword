import { auth } from "@/lib/auth/get-server-session"

export async function requireAdmin() {
  const session = await auth()
  if (!session) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 })
  if (!session.user.isAdmin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 })
  return session
}
