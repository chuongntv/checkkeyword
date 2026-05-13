import { BaseService } from "@/lib/services/base-service"
import { User } from "@/models/user.model"
import { connectDB } from "@/lib/db/mongoose"

type Output = { id: string; name: string; email: string; workspaceCount: number; createdAt: string }[]

export class GetAllUsersService extends BaseService<void, Output> {
  async call(): Promise<Output> {
    await connectDB()
    const results = await User.aggregate([
      { $lookup: { from: "workspaces", localField: "_id", foreignField: "ownerId", as: "ownedWorkspaces" } },
      { $addFields: { workspaceCount: { $size: "$ownedWorkspaces" } } },
      { $project: { password: 0, ownedWorkspaces: 0 } },
      { $sort: { createdAt: -1 } },
    ])
    return results.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      workspaceCount: u.workspaceCount,
      createdAt: u.createdAt.toISOString(),
    }))
  }
}
