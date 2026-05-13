import { KeywordList } from "@/models/keyword-list.model"
import { connectDB } from "@/lib/db/mongoose"

export async function verifyKeywordListBelongsToWorkspace(listId: string, workspaceId: string) {
  await connectDB()
  const list = await KeywordList.findById(listId).lean()
  if (!list) throw Object.assign(new Error("NOT_FOUND"), { status: 404 })
  if (list.workspaceId.toString() !== workspaceId) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 })
  }
  return list
}
