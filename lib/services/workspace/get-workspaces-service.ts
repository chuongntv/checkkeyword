import { BaseService } from "@/lib/services/base-service"
import { Workspace } from "@/models/workspace.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { userId: string }
type Output = { id: string; name: string; domain: string; role: string }[]

export class GetWorkspacesService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    await connectDB()
    const owned = await Workspace.find({ ownerId: input.userId }).lean()
    const memberOf = await Workspace.find({ "members.userId": input.userId }).lean()

    const results = [
      ...owned.map((ws) => ({ id: ws._id.toString(), name: ws.name, domain: ws.domain, role: "owner" })),
      ...memberOf.map((ws) => ({
        id: ws._id.toString(),
        name: ws.name,
        domain: ws.domain,
        role: ws.members.find((m) => m.userId.toString() === input.userId)?.role ?? "viewer",
      })),
    ]

    return results
  }
}
