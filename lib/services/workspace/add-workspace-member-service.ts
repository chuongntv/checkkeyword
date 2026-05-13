import { BaseService, ServiceError } from "@/lib/services/base-service"
import { Workspace } from "@/models/workspace.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { workspaceId: string; userId: string; role: "viewer" | "editor" }
type Output = { added: boolean }

export class AddWorkspaceMemberService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()
      const ws = await Workspace.findById(input.workspaceId)
      if (!ws) throw new ServiceError("Workspace not found")

      const exists = ws.members.some((m) => m.userId.toString() === input.userId)
      if (exists) throw new ServiceError("User is already a member", undefined, "ALREADY_MEMBER")

      ws.members.push({ userId: input.userId as any, role: input.role })
      await ws.save()
      return { added: true }
    } catch (error) {
      this.handleError(error)
    }
  }
}
