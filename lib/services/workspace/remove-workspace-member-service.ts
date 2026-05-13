import { BaseService, ServiceError } from "@/lib/services/base-service"
import { Workspace } from "@/models/workspace.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { workspaceId: string; userId: string }
type Output = { removed: boolean }

export class RemoveWorkspaceMemberService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()
      const ws = await Workspace.findById(input.workspaceId)
      if (!ws) throw new ServiceError("Workspace not found")

      ws.members = ws.members.filter((m) => m.userId.toString() !== input.userId)
      await ws.save()
      return { removed: true }
    } catch (error) {
      this.handleError(error)
    }
  }
}
