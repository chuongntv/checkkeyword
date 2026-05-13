import { BaseService } from "@/lib/services/base-service"
import { Workspace } from "@/models/workspace.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { workspaceId: string; name?: string; domain?: string }
type Output = { id: string; name: string; domain: string }

function normalizeDomain(domain: string) {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase()
}

export class UpdateWorkspaceService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()
      const updates: Partial<{ name: string; domain: string }> = {}
      if (input.name) updates.name = input.name
      if (input.domain) updates.domain = normalizeDomain(input.domain)

      const ws = await Workspace.findByIdAndUpdate(input.workspaceId, updates, { new: true })
      if (!ws) throw new Error("Workspace not found")
      return { id: ws._id.toString(), name: ws.name, domain: ws.domain }
    } catch (error) {
      this.handleError(error)
    }
  }
}
