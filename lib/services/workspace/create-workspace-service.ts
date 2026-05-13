import { BaseService, ServiceError } from "@/lib/services/base-service"
import { Workspace } from "@/models/workspace.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { name: string; domain: string; ownerId: string }
type Output = { id: string; name: string; domain: string }

function normalizeDomain(domain: string) {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase()
}

export class CreateWorkspaceService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()
      const ws = await Workspace.create({
        name: input.name,
        domain: normalizeDomain(input.domain),
        ownerId: input.ownerId,
        members: [],
      })
      return { id: ws._id.toString(), name: ws.name, domain: ws.domain }
    } catch (error) {
      this.handleError(error)
    }
  }
}
