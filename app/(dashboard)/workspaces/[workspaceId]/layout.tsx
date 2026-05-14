import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/get-server-session"
import { connectDB } from "@/lib/db/mongoose"
import { Workspace } from "@/models/workspace.model"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { workspaceId } = await params
  await connectDB()
  const ws = await Workspace.findById(workspaceId).lean()

  if (!ws) redirect("/workspaces")

  const isAdmin = session.user.isAdmin
  const isOwner = ws.ownerId.toString() === session.user.id
  const isMember = ws.members.some((m) => m.userId.toString() === session.user.id)
  if (!isOwner && !isMember && !isAdmin) redirect("/workspaces")

  return <>{children}</>
}
