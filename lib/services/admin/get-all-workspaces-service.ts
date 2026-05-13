import { BaseService } from "@/lib/services/base-service"
import { Workspace } from "@/models/workspace.model"
import { connectDB } from "@/lib/db/mongoose"

type Output = {
  id: string; name: string; domain: string; ownerName: string; ownerEmail: string
  memberCount: number; listCount: number; createdAt: string
}[]

export class GetAllWorkspacesService extends BaseService<void, Output> {
  async call(): Promise<Output> {
    await connectDB()
    const results = await Workspace.aggregate([
      { $lookup: { from: "users", localField: "ownerId", foreignField: "_id", as: "owner" } },
      { $lookup: { from: "keywordlists", localField: "_id", foreignField: "workspaceId", as: "lists" } },
      {
        $addFields: {
          ownerName: { $arrayElemAt: ["$owner.name", 0] },
          ownerEmail: { $arrayElemAt: ["$owner.email", 0] },
          listCount: { $size: "$lists" },
          memberCount: { $size: "$members" },
        },
      },
      { $project: { owner: 0, lists: 0 } },
      { $sort: { createdAt: -1 } },
    ])
    return results.map((w: any) => ({
      id: w._id.toString(),
      name: w.name,
      domain: w.domain,
      ownerName: w.ownerName,
      ownerEmail: w.ownerEmail,
      memberCount: w.memberCount,
      listCount: w.listCount,
      createdAt: w.createdAt.toISOString(),
    }))
  }
}
